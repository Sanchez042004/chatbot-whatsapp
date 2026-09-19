import { GoogleGenAI } from '@google/genai';
import { config } from '../config/env';
import { getBusinessContext } from './supabase';

const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: text,
    });
    return response.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error('Error generating embedding:', error);
    return [];
  }
}

export interface ChatPart {
  text: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: ChatPart[];
}

const historyMap = new Map<string, ChatMessage[]>();
const advisorModeSet = new Set<string>(); // usuarios esperando a un asesor humano
const MODELS = ['gemini-flash-lite-latest', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'];

/** Indica si el bot debe pausarse para este usuario (asesor tomó el hilo) */
export function isAwaitingAdvisor(from: string): boolean {
  return advisorModeSet.has(from);
}

/** Activa el modo asesor para un usuario */
export function activateAdvisorMode(from: string): void {
  advisorModeSet.add(from);
  historyMap.delete(from); // limpiar historial al pasar a asesor
  console.log(`🧑‍💼 Modo asesor activado para ${from}`);
}

/** Desactiva el modo asesor (para reactivar el bot manualmente) */
export function deactivateAdvisorMode(from: string): void {
  advisorModeSet.delete(from);
  console.log(`🤖 Bot reactivado para ${from}`);
}

/** Reinicia la sesión y el historial de un usuario (por cierre de sesión o inactividad) */
export function resetUserSession(from: string): void {
  historyMap.delete(from);
  pendingAdvisorOffer.delete(from);
  console.log(`🧹 Sesión e historial reiniciados para ${from}`);
}

async function callGeminiWithRetry(history: ChatMessage[], systemPrompt: string, retries = 3): Promise<string> {
  let lastError: any = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    const model = MODELS[attempt % MODELS.length];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: history,
        config: { systemInstruction: systemPrompt }
      });
      return response.text || 'Lo siento, tuve un problema procesando tu solicitud.';
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ Error con modelo ${model} (intento ${attempt + 1}/${retries}):`, error?.message || error);
      if (attempt < retries - 1) {
        const delay = 1000 * (attempt + 1);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }
  throw lastError || new Error('Max retries reached');
}

const ADVISOR_KEYWORDS = ['asesor', 'humano', 'agente', 'persona', 'hablar con alguien', 'quiero asesor', 'necesito asesor'];
const CONFIRM_KEYWORDS = ['si', 'sí', 'claro', 'ok', 'dale', 'por favor', 'quiero', 'yes'];
const pendingAdvisorOffer = new Set<string>(); // usuarios a quienes se les ofreció asesor

const PURE_GREETINGS = [
  'hola', 'buenas', 'buenos dias', 'buenos días', 'buenas tardes', 'buenas noches',
  'hey', 'saludos', 'que tal', 'qué tal', 'hi', 'hello', 'buen dia', 'buen día'
];

function isPureGreeting(text: string): boolean {
  const normalized = text.toLowerCase().replace(/[^\w\sáéíóúñ]/g, '').trim();
  return PURE_GREETINGS.includes(normalized);
}

const WELCOME_MENU = `¡Hola! 👋🏋️‍♂️ Bienvenido/a a *FitBot*, tu asistente virtual del gimnasio.

¿En qué puedo colaborarte hoy? Puedes consultarme sobre:
• 📋 *Planes y Precios* (básico, premium, anual)
• 🕒 *Horarios de atención y festivos*
• 🚴 *Clases grupales* (Spinning, Yoga, Zumba, CrossFit)
• 📍 *Ubicación y parqueadero gratuito*
• 💳 *Métodos de pago y congelación de membresía*
• 🎟️ *Pase de cortesía de 1 día (Free Pass)*
• 🧑‍💼 *Hablar con un asesor* (escribe *"asesor"*)

¡Escríbeme tu duda y con gusto te ayudo! 💪`;

export async function generateResponse(userMessage: string, from: string): Promise<string> {
  try {
    const lowerMsg = userMessage.toLowerCase().trim();

    // 1. Detección directa: el usuario pide explícitamente un asesor
    const wantsAdvisor = ADVISOR_KEYWORDS.some(kw => lowerMsg.includes(kw));
    if (wantsAdvisor) {
      activateAdvisorMode(from);
      pendingAdvisorOffer.delete(from);
      return '¡Claro! 🧑‍💼 En un momento un asesor de nuestro equipo se comunicará contigo. ¡Gracias por tu paciencia! 🙏';
    }

    // 2. El usuario confirma la oferta de asesor que hizo el bot antes
    if (pendingAdvisorOffer.has(from)) {
      const confirms = CONFIRM_KEYWORDS.some(kw => lowerMsg.includes(kw));
      if (confirms) {
        activateAdvisorMode(from);
        pendingAdvisorOffer.delete(from);
        return '¡Perfecto! 🧑‍💼 Un asesor se comunicará contigo muy pronto. ¡Hasta luego! 👋';
      } else {
        // No confirmó, seguir como normal
        pendingAdvisorOffer.delete(from);
      }
    }

    // 3. Saludo puro inicial -> responder directamente con menú de bienvenida sin gastar vector search
    if (isPureGreeting(userMessage)) {
      const history = historyMap.get(from) || [];
      history.push({ role: 'user', parts: [{ text: userMessage }] });
      history.push({ role: 'model', parts: [{ text: WELCOME_MENU }] });
      historyMap.set(from, history);
      return WELCOME_MENU;
    }

    const embedding = await generateEmbedding(userMessage);
    const context = await getBusinessContext(embedding);

    console.log('📋 Context sent to Gemini:\n', context || '(empty)');

    // 4. Sin contexto relevante -> ofrecer asesor
    if (!context) {
      pendingAdvisorOffer.add(from);
      return '😕 No tengo información sobre eso en este momento. ¿Te gustaría que te conecte con uno de nuestros asesores? Responde *sí* y con gusto lo hacemos. 🙋';
    }

    const systemPrompt = `
Eres "FitBot", la recepcionista virtual de nuestro gimnasio.
Tu tono debe ser amable, motivacional y claro. Usa emojis relevantes.
REGLA IMPORTANTE: Si ya saludaste al usuario antes en esta conversación, NO vuelvas a saludarlo, ve directo al grano.
REGLA CRÍTICA: Responde ÚNICAMENTE basándote en el CONTEXTO que te dará el usuario en su mensaje. Si la información no está en el contexto, di amablemente que no tienes esa información y que puede acercarse a la recepción.
    `;

    // Recuperar o inicializar historial
    const history = historyMap.get(from) || [];

    // Construir el mensaje del usuario con el contexto incrustado
    const messageWithContext = `[CONTEXTO DEL GIMNASIO - úsalo para responder]:\n${context}\n\n[PREGUNTA DEL USUARIO]: ${userMessage}`;

    history.push({ role: 'user', parts: [{ text: messageWithContext }] });

    const responseText = await callGeminiWithRetry(history, systemPrompt);

    // Guardar en historial solo el mensaje original (sin contexto) para no inflar tokens
    history[history.length - 1] = { role: 'user', parts: [{ text: userMessage }] };
    history.push({ role: 'model', parts: [{ text: responseText }] });

    // Limitar el historial a los últimos 10 mensajes (5 turnos)
    if (history.length > 10) {
      history.splice(0, history.length - 10);
    }
    historyMap.set(from, history);

    return responseText;
  } catch (error) {
    console.error('Error generating response:', error);
    return 'Disculpa, estoy teniendo problemas técnicos en este momento. Intenta más tarde.';
  }
}


