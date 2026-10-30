import fs from 'fs';
import path from 'path';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import {
  generateResponse,
  isAwaitingAdvisor,
  deactivateAdvisorMode,
  activateAdvisorMode,
  resetUserSession,
} from './gemini';

const AUTH_DIR = path.resolve(process.cwd(), 'baileys_auth_info');

// ── Configuración de tiempos de inactividad ──
const INACTIVITY_PROMPT_MS = 5 * 60 * 1000;  // 5 min sin actividad del usuario
const INACTIVITY_CLOSE_MS  = 3 * 60 * 1000;  // +3 min → cerrar sesión
const ADVISOR_AUTO_RESUME_MS = 15 * 60 * 1000; // 15 min de silencio durante atención humana

interface UserTimers {
  promptTimer?: NodeJS.Timeout;
  closeTimer?: NodeJS.Timeout;
}

const userSessionTimers = new Map<string, UserTimers>();
const advisorInactivityTimers = new Map<string, NodeJS.Timeout>();

let currentSock: ReturnType<typeof makeWASocket> | null = null;

/** Cancela todos los temporizadores de inactividad de un usuario */
function clearUserInactivityTimers(from: string) {
  const current = userSessionTimers.get(from);
  if (current) {
    if (current.promptTimer) clearTimeout(current.promptTimer);
    if (current.closeTimer)  clearTimeout(current.closeTimer);
    userSessionTimers.delete(from);
  }
}

/** Cancela el temporizador de inactividad del asesor */
function clearAdvisorInactivityTimer(from: string) {
  const timer = advisorInactivityTimers.get(from);
  if (timer) {
    clearTimeout(timer);
    advisorInactivityTimers.delete(from);
  }
}

/** Programa auto-reactivación si el asesor y el cliente llevan 15 min sin hablar */
function scheduleAdvisorInactivityTimer(from: string) {
  clearAdvisorInactivityTimer(from);
  const timer = setTimeout(() => {
    if (isAwaitingAdvisor(from)) {
      console.log(`⏳ Auto-retomando conversación por inactividad del asesor para ${from}`);
      endAdvisorSessionAndResume(from);
    }
  }, ADVISOR_AUTO_RESUME_MS);
  advisorInactivityTimers.set(from, timer);
}

/** Programa o reinicia los temporizadores de inactividad tras una respuesta del bot */
function scheduleInactivityTimers(from: string, sock: ReturnType<typeof makeWASocket>) {
  clearUserInactivityTimers(from);

  const promptTimer = setTimeout(async () => {
    if (isAwaitingAdvisor(from)) return;
    try {
      await sock.sendMessage(from, {
        text: 'Hola 👋 ¿Hay algo más en lo que te pueda colaborar el día de hoy? ¡Estoy aquí para ayudarte! 💪',
      });
      console.log(`⏳ Seguimiento por inactividad enviado a ${from}`);

      const closeTimer = setTimeout(async () => {
        if (isAwaitingAdvisor(from)) return;
        try {
          await sock.sendMessage(from, {
            text: 'Damos por finalizada tu consulta por el momento. Si necesitas algo más adelante, solo escríbenos. ¡Que tengas un excelente día y un gran entrenamiento! 🏋️‍♂️✨',
          });
          resetUserSession(from);
          clearUserInactivityTimers(from);
          console.log(`🔒 Sesión cerrada por inactividad para ${from}`);
        } catch (err) {
          console.error('Error enviando mensaje de cierre:', err);
        }
      }, INACTIVITY_CLOSE_MS);

      const timers = userSessionTimers.get(from);
      if (timers) timers.closeTimer = closeTimer;
    } catch (err) {
      console.error('Error enviando mensaje de inactividad:', err);
    }
  }, INACTIVITY_PROMPT_MS);

  userSessionTimers.set(from, { promptTimer });
}

/**
 * Finaliza la atención humana del asesor y retoma el bot de manera 100% natural,
 * preguntando cordialmente si el usuario tiene alguna otra duda.
 */
export async function endAdvisorSessionAndResume(jid: string): Promise<boolean> {
  if (!currentSock) return false;
  clearAdvisorInactivityTimer(jid);
  deactivateAdvisorMode(jid);
  clearUserInactivityTimers(jid);

  const followUpMessage = 'Hola de nuevo 👋 Esperamos haber resuelto tu consulta. ¿Hay algo más en lo que te pueda colaborar el día de hoy? ¡Estoy aquí para ayudarte! 💪';
  try {
    await currentSock.sendMessage(jid, { text: followUpMessage });
    scheduleInactivityTimers(jid, currentSock);
    console.log(`🤖 Atención con asesor finalizada para ${jid}. Mensaje de seguimiento enviado.`);
    return true;
  } catch (err) {
    console.error('Error enviando mensaje de seguimiento tras asesor:', err);
    return false;
  }
}

// ── Caché de deduplicación de mensajes ──
const processedMessageIds = new Set<string>();
const MAX_PROCESSED_IDS = 1000;

function isDuplicateMessage(messageId: string | null | undefined): boolean {
  if (!messageId) return false;
  if (processedMessageIds.has(messageId)) return true;
  processedMessageIds.add(messageId);
  if (processedMessageIds.size > MAX_PROCESSED_IDS) {
    const first = processedMessageIds.values().next().value;
    if (first) processedMessageIds.delete(first);
  }
  return false;
}

// ── Control de Tasa (Rate Limiting) ──
const userRateLimits = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS    = 10 * 1000;
const MAX_MESSAGES_PER_WINDOW = 5;

function checkRateLimit(from: string): boolean {
  const now = Date.now();
  const rateData = userRateLimits.get(from);
  if (!rateData || now > rateData.resetTime) {
    userRateLimits.set(from, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (rateData.count >= MAX_MESSAGES_PER_WINDOW) return false;
  rateData.count++;
  return true;
}

// ── Estado del bot (exportado para /api/status y /health) ──
export interface BotStatusInfo {
  status: 'connecting' | 'open' | 'close' | 'qr_ready';
  lastQrRaw: string | null;
  connectedPhone: string | null;
  uptimeSeconds: number;
  activeSessionsCount: number;
}

let botState: BotStatusInfo['status'] = 'connecting';
let latestQrString: string | null = null;
let connectedUserPhone: string | null = null;
const botStartTime = Date.now();

export function getBotStatus(): BotStatusInfo {
  return {
    status: botState,
    lastQrRaw: latestQrString,
    connectedPhone: connectedUserPhone,
    uptimeSeconds: Math.floor((Date.now() - botStartTime) / 1000),
    activeSessionsCount: userSessionTimers.size,
  };
}

// ── Función principal del bot ──
export async function startWhatsAppBot(): Promise<void> {
  const { version } = await fetchLatestBaileysVersion();
  console.log(`📱 Usando Baileys v${version.join('.')}`);

  const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  currentSock = sock;

  // ── Eventos de conexión ──
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      botState = 'qr_ready';
      latestQrString = qr;
      console.log('📲 Escanea este código QR con tu WhatsApp:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      botState = 'close';
      currentSock = null;
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`🔌 Conexión cerrada (código ${statusCode}), reconectando: ${shouldReconnect}`);
      if (shouldReconnect) {
        botState = 'connecting';
        startWhatsAppBot();
      } else {
        console.log('🚪 Sesión de WhatsApp cerrada (logout). Limpiando credenciales y generando nuevo QR...');
        latestQrString = null;
        connectedUserPhone = null;
        try {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        } catch (rmErr) {
          console.warn('Advertencia limpiando auth dir:', rmErr);
        }
        botState = 'connecting';
        startWhatsAppBot();
      }
    } else if (connection === 'open') {
      botState = 'open';
      latestQrString = null;
      connectedUserPhone = sock.user?.id ? sock.user.id.split(':')[0] : null;
      console.log(`✅ Bot conectado como ${connectedUserPhone}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  // ── Recepción de mensajes ──
  sock.ev.on('messages.upsert', async (m) => {
    const msg = m.messages[0];
    if (!msg || !msg.message) return;

    // Ignorar grupos y estados
    const from = msg.key.remoteJid;
    if (!from) return;
    if (from.endsWith('@g.us') || from === 'status@broadcast') return;

    // Deduplicación
    if (isDuplicateMessage(msg.key.id)) return;

    const textMessage =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text;

    // ── Mensajes enviados desde el propio WhatsApp del bot (Asesor) ──
    if (msg.key.fromMe) {
      if (!textMessage) return;
      const cmd = textMessage.trim().toLowerCase();

      // Palabras que el asesor puede enviar en el chat para cerrar y que el bot retome cordialmente
      if (cmd === '!bot on' || cmd === '!listo' || cmd === '!cerrar' || cmd === '!terminar') {
        endAdvisorSessionAndResume(from);
        return;
      }

      // Si el asesor escribe normalmente al cliente, renovar el temporizador de inactividad de 15 min
      if (isAwaitingAdvisor(from)) {
        scheduleAdvisorInactivityTimer(from);
      }
      return; // no procesar mensajes propios
    }

    // ── Mensajes del usuario ──
    sock.readMessages([msg.key]).catch(() => {});

    // Manejo de multimedia no soportado
    if (!textMessage) {
      if (msg.message.audioMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '🎧 Por el momento no puedo escuchar notas de voz. Por favor escríbeme tu duda en texto o escribe *"asesor"* para hablar con alguien de nuestro equipo. 💪',
        });
        return;
      }
      if (msg.message.imageMessage || msg.message.documentMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((r) => setTimeout(r, 1200));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '📷 ¡He recibido tu archivo! Si es un comprobante de pago, escribe *"asesor"* para que nuestro personal lo revise. 🏋️‍♂️',
        });
        return;
      }
      if (msg.message.stickerMessage) {
        await sock.sendPresenceUpdate('composing', from).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
        await sock.sendPresenceUpdate('paused', from).catch(() => {});
        await sock.sendMessage(from, {
          text: '💪 ¡Con toda la energía! Si tienes alguna duda sobre planes, clases u horarios, escríbela aquí.',
        });
        return;
      }
      return;
    }

    console.log(`📨 Mensaje de ${from}: ${textMessage}`);

    // Rate limit
    if (!checkRateLimit(from)) {
      console.warn(`⚠️  Rate limit excedido para ${from}`);
      await sock.sendMessage(from, {
        text: '⏳ Has enviado varios mensajes seguidos. Por favor espera unos segundos antes de continuar.',
      });
      return;
    }

    // Si está en modo asesor, el cliente sigue hablando con el humano
    if (isAwaitingAdvisor(from)) {
      scheduleAdvisorInactivityTimer(from);
      console.log(`🧑‍💼 Usuario ${from} en conversación con asesor humano.`);
      return;
    }

    clearUserInactivityTimers(from);

    // Simular presencia humana mientras la lógica procesa
    await sock.sendPresenceUpdate('composing', from).catch(() => {});
    const startTime = Date.now();

    const aiResponse = await generateResponse(textMessage, from);

    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 1500 - elapsed);
    if (minDelay > 0) await new Promise((r) => setTimeout(r, minDelay));

    await sock.sendPresenceUpdate('paused', from).catch(() => {});
    await sock.sendMessage(from, { text: aiResponse });

    if (isAwaitingAdvisor(from)) {
      clearUserInactivityTimers(from);
      scheduleAdvisorInactivityTimer(from);
    } else {
      scheduleInactivityTimers(from, sock);
    }
  });
}
