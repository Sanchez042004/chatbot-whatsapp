import { matchFAQ, FAQ_RESPONSES } from './faq';

export interface ChatPart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

export interface ActiveAdvisorChat {
  jid: string;
  phone: string;
  minutesActive: number;
  activatedAt: string;
}

const historyMap = new Map<string, ChatMessage[]>();
// Mapa de usuarios en atención con asesor y fecha de inicio
const advisorModeMap = new Map<string, { activatedAt: number }>();
const pendingAdvisorOffer = new Set<string>(); // usuarios a quienes se les ofreció asesor
const CONFIRM_KEYWORDS = ['si', 'sí', 'claro', 'ok', 'dale', 'por favor', 'quiero', 'yes', 'bueno'];

/** Indica si el bot está pausado para este usuario (asesor activo) */
export function isAwaitingAdvisor(from: string): boolean {
  return advisorModeMap.has(from);
}

/** Activa el modo asesor para un usuario */
export function activateAdvisorMode(from: string): void {
  advisorModeMap.set(from, { activatedAt: Date.now() });
  historyMap.delete(from);
  console.log(`🧑‍💼 Modo asesor activado para ${from}`);
}

/** Desactiva el modo asesor (reactiva el bot) */
export function deactivateAdvisorMode(from: string): void {
  advisorModeMap.delete(from);
  console.log(`🤖 Modo asesor finalizado para ${from}`);
}

/** Lista los chats actualmente en atención con asesor humano */
export function getActiveAdvisorChats(): ActiveAdvisorChat[] {
  const now = Date.now();
  const list: ActiveAdvisorChat[] = [];
  for (const [jid, data] of advisorModeMap.entries()) {
    const rawNumber = jid.split('@')[0] || jid;
    list.push({
      jid,
      phone: '+' + rawNumber.replace(/[^\d]/g, ''),
      minutesActive: Math.max(0, Math.floor((now - data.activatedAt) / 60000)),
      activatedAt: new Date(data.activatedAt).toLocaleTimeString(),
    });
  }
  return list;
}

/** Reinicia la sesión y el historial de un usuario */
export function resetUserSession(from: string): void {
  historyMap.delete(from);
  pendingAdvisorOffer.delete(from);
  console.log(`🧹 Sesión e historial reiniciados para ${from}`);
}

/**
 * Genera la respuesta del bot para un mensaje entrante:
 * 1. Verifica si el usuario está confirmando solicitud de asesor.
 * 2. Normaliza el texto y busca coincidencia directa en las FAQs oficiales del gimnasio
 *    (horarios, planes y precios, clases grupales, requisitos de ingreso, Free Pass, ubicación/parqueadero, asesor).
 * 3. Si no coincide, retorna la respuesta de respaldo amable con menú de opciones.
 */
export async function generateResponse(userMessage: string, from: string): Promise<string> {
  try {
    const lowerMsg = userMessage.toLowerCase().trim();

    // 1. Confirmación de oferta previa de asesor
    if (pendingAdvisorOffer.has(from)) {
      const confirms = CONFIRM_KEYWORDS.some(kw => lowerMsg === kw || lowerMsg.startsWith(kw + ' '));
      if (confirms) {
        activateAdvisorMode(from);
        pendingAdvisorOffer.delete(from);
        return '¡Perfecto! 🧑‍💼 Un asesor de nuestro equipo se comunicará contigo a la brevedad. ¡Gracias por contactarnos!';
      } else {
        pendingAdvisorOffer.delete(from);
      }
    }

    // 2. Coincidencia directa con las FAQs oficiales del gimnasio
    const faqResult = matchFAQ(userMessage);

    // Escalar a asesor
    if (faqResult.category === 'advisor') {
      activateAdvisorMode(from);
      pendingAdvisorOffer.delete(from);
      return faqResult.response;
    }

    // Si coincide con una FAQ específica o saludo
    if (faqResult.matched) {
      const history = historyMap.get(from) || [];
      history.push({ role: 'user', parts: [{ text: userMessage }] });
      history.push({ role: 'model', parts: [{ text: faqResult.response }] });
      if (history.length > 8) history.splice(0, history.length - 8);
      historyMap.set(from, history);
      return faqResult.response;
    }

    // 3. Respuesta de respaldo amable con menú de opciones cuando no entiende
    pendingAdvisorOffer.add(from);
    return FAQ_RESPONSES.fallback;

  } catch (error) {
    console.error('Error generando respuesta:', error);
    return 'Disculpa, ocurrió un error momentáneo al procesar tu mensaje. Por favor intenta de nuevo o escribe *"asesor"* para comunicarte con nuestro equipo. 💪';
  }
}
