import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import {
  generateResponse,
  isAwaitingAdvisor,
  deactivateAdvisorMode,
  activateAdvisorMode,
  resetUserSession
} from './gemini';

// ── Configuración de tiempos de inactividad ──
// 5 minutos sin actividad para preguntar si necesita algo más
const INACTIVITY_PROMPT_MS = 5 * 60 * 1000;
// 3 minutos adicionales sin respuesta para cerrar la sesión
const INACTIVITY_CLOSE_MS = 3 * 60 * 1000;

interface UserTimers {
  promptTimer?: NodeJS.Timeout;
  closeTimer?: NodeJS.Timeout;
}

const userSessionTimers = new Map<string, UserTimers>();

/** Cancela todos los temporizadores de inactividad de un usuario */
function clearUserInactivityTimers(from: string) {
  const current = userSessionTimers.get(from);
  if (current) {
    if (current.promptTimer) clearTimeout(current.promptTimer);
    if (current.closeTimer) clearTimeout(current.closeTimer);
    userSessionTimers.delete(from);
  }
}

/** Programa o reinicia los temporizadores de inactividad tras una respuesta del bot */
function scheduleInactivityTimers(from: string, sock: any) {
  clearUserInactivityTimers(from);

  // 1. Temporizador de seguimiento (5 min)
  const promptTimer = setTimeout(async () => {
    // Si el usuario está hablando con un asesor, no enviar mensaje automático
    if (isAwaitingAdvisor(from)) return;

    try {
      await sock.sendMessage(from, {
        text: 'Hola 👋 ¿Hay algo más en lo que te pueda colaborar el día de hoy? ¡Estoy aquí para ayudarte! 💪'
      });
      console.log(`⏳ Mensaje de seguimiento por inactividad enviado a ${from}`);

      // 2. Temporizador de cierre definitivo (3 min adicionales)
      const closeTimer = setTimeout(async () => {
        if (isAwaitingAdvisor(from)) return;

        try {
          await sock.sendMessage(from, {
            text: 'Damos por finalizada tu consulta por el momento. Si necesitas algo más adelante, solo escríbenos. ¡Que tengas un excelente día y un gran entrenamiento! 🏋️‍♂️✨'
          });
          resetUserSession(from);
          clearUserInactivityTimers(from);
          console.log(`🔒 Sesión cerrada por inactividad para ${from}`);
        } catch (err) {
          console.error('Error enviando mensaje de cierre de sesión:', err);
        }
      }, INACTIVITY_CLOSE_MS);

      const timers = userSessionTimers.get(from);
      if (timers) {
        timers.closeTimer = closeTimer;
      }
    } catch (err) {
      console.error('Error enviando mensaje de inactividad:', err);
    }
  }, INACTIVITY_PROMPT_MS);

  userSessionTimers.set(from, { promptTimer });
}

// ── Caché de deduplicación de mensajes (Idempotencia) ──
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 1000;

function isDuplicateMessage(messageId: string | null | undefined): boolean {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;

  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    // Eliminar el primer elemento insertado
    const firstItem = processedMessageIds.values().next().value;
    if (firstItem) processedMessageIds.delete(firstItem);
  }
  return false;
}

// ── Control de Tasa (Rate Limiting) ──
const userRateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 10 * 1000; // Ventana de 10 segundos
const MAX_MESSAGES_PER_WINDOW = 5;

function checkRateLimit(from: string): boolean {
  const now = Date.now();
  const rateData = userRateLimits.get(from);

  if (!rateData || now > rateData.resetTime) {
    userRateLimits.set(from, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true; // Permitido
  }

  if (rateData.count >= MAX_MESSAGES_PER_WINDOW) {
    return false; // Bloqueado por exceso
  }

  rateData.count++;
  return true;
}

export async function startWhatsAppBot() {
  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if (qr) {
      console.log('Escanea este código QR con tu WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Conexión cerrada debido a:', lastDisconnect?.error, ', reconectando:', shouldReconnect);
      if (shouldReconnect) {
        startWhatsAppBot();
      }
    } else if (connection === 'open') {
      console.log('¡Bot conectado y listo para recibir mensajes!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg || !msg.message) return;

    const messageId = msg.key.id;
    // Evitar procesar mensajes duplicados por reconexión
    if (isDuplicateMessage(messageId)) {
      return;
    }

    const from = msg.key.remoteJid;
    if (!from) return;

    // Detectar texto
    const textMessage = msg.message.conversation || msg.message.extendedTextMessage?.text;

    // ── Comandos del asesor (mensajes enviados desde el propio WhatsApp del bot) ──
    if (msg.key.fromMe) {
      if (!textMessage) return;
      const cmd = textMessage.trim().toLowerCase();

      // !bot on → reactiva el bot para el chat abierto (el asesor terminó)
      if (cmd === '!bot on') {
        deactivateAdvisorMode(from);
        clearUserInactivityTimers(from);
        await sock.sendMessage(from, { text: '🤖 Bot reactivado para este chat.' });
        return;
      }

      // !bot off → pausa manualmente el bot para el chat abierto
      if (cmd === '!bot off') {
        activateAdvisorMode(from);
        clearUserInactivityTimers(from);
        await sock.sendMessage(from, { text: '⏸️ Bot pausado. Estás en modo asesor.' });
        return;
      }

      return; // ignorar otros mensajes propios
    }

    // ── Mensajes del usuario ──

    // Marcar mensaje como leído en WhatsApp
    sock.readMessages([msg.key]).catch(() => {});

    // 1. Manejo de mensajes multimedia no soportados directamente
    if (!textMessage) {
      if (msg.message.audioMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((res) => setTimeout(res, 1200));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '🎧 Por el momento no puedo escuchar notas de voz o audios. Por favor escríbeme tu duda en texto o escribe *"asesor"* para hablar con una persona de nuestro equipo. 💪'
        });
        return;
      }

      if (msg.message.imageMessage || msg.message.documentMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((res) => setTimeout(res, 1200));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '📷 ¡He recibido tu archivo o imagen! Si es un comprobante de pago o documento de inscripción, por favor escribe *"asesor"* para que nuestro personal lo revise de inmediato. 🏋️‍♂️'
        });
        return;
      }

      if (msg.message.stickerMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((res) => setTimeout(res, 1000));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '💪 ¡Con toda la energía para entrenar! Si tienes alguna duda sobre planes, clases u horarios, escríbela aquí.'
        });
        return;
      }

      return; // otros formatos no procesables
    }

    console.log(`Mensaje recibido de ${from}: ${textMessage}`);

    // 2. Control de ráfagas (Rate limit)
    if (!checkRateLimit(from)) {
      console.warn(`⚠️ Rate limit excedido para ${from}`);
      await sock.sendMessage(from, {
        text: '⏳ Has enviado varios mensajes seguidos. Por favor espera unos segundos antes de enviar tu siguiente consulta.'
      });
      return;
    }

    // 3. Reactivación manual con comando
    const cleanText = textMessage.trim().toLowerCase();
    if (cleanText === '!bot on' || cleanText === '!activar') {
      deactivateAdvisorMode(from);
      clearUserInactivityTimers(from);
      await sock.sendMessage(from, { text: '🤖 ¡Bot reactivado! Estoy listo para responder todas tus dudas.' });
      return;
    }

    // 4. Si el usuario está en modo asesor, el bot no interfiere
    if (isAwaitingAdvisor(from)) {
      console.log(`⏸️  Usuario ${from} en modo asesor — bot pausado.`);
      return;
    }

    // El usuario escribió un mensaje nuevo: cancelar temporizadores de inactividad previos
    clearUserInactivityTimers(from);

    // 5. Simular presencia humana: marcar "Escribiendo..." mientras la IA procesa
    await sock.sendPresenceUpdate('composing', from).catch(() => {});
    const startTime = Date.now();

    const aiResponse = await generateResponse(textMessage, from);

    // Asegurar un mínimo de 1.5s mostrando "escribiendo..." para que no parezca un script instantáneo
    const elapsed = Date.now() - startTime;
    const minTypingDelay = Math.max(0, 1500 - elapsed);
    if (minTypingDelay > 0) {
      await new Promise((res) => setTimeout(res, minTypingDelay));
    }

    await sock.sendPresenceUpdate('paused', from).catch(() => {});
    await sock.sendMessage(from, { text: aiResponse });

    // Si tras este mensaje el usuario pasó a modo asesor, no programar inactividad
    if (isAwaitingAdvisor(from)) {
      clearUserInactivityTimers(from);
    } else {
      // Programar los temporizadores de inactividad
      scheduleInactivityTimers(from, sock);
    }
  });
}

