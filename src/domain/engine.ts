/**
 * Motor Genérico de Procesamiento de Mensajes y Coincidencia de FAQs.
 * Completamente agnóstico al tipo de negocio (Gimnasio, Restaurante, Tienda, etc.).
 */

import { BusinessConfig, BusinessFAQ } from '../types/business';
import { activeBusiness } from './business-loader';

export interface MatchResult {
  matched: boolean;
  category?: string;
  response: string;
  faqId?: string;
  quickReplies?: string[];
}

/**
 * Normaliza un texto eliminando tildes, mayúsculas y signos de puntuación.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimina tildes
    .replace(/[^\w\s]/gi, ' ') // reemplaza signos por espacios
    .replace(/\s+/g, ' ') // colapsa espacios
    .trim();
}

/**
 * Comprueba si un texto normalizado contiene una palabra o frase respetando límites de palabra.
 */
export function containsKeyword(normalizedText: string, keyword: string): boolean {
  const normKw = normalizeText(keyword);
  if (normKw.includes(' ')) {
    return normalizedText.includes(normKw);
  }
  const regex = new RegExp(`(^|\\s)${normKw}(\\s|$)`, 'i');
  return regex.test(normalizedText);
}

/**
 * Evalúa si alguna de las palabras clave coincide con el texto.
 */
export function anyKeyword(normalizedText: string, keywords: string[]): boolean {
  return keywords.some((kw) => containsKeyword(normalizedText, kw));
}

export class BusinessChatEngine {
  constructor(private readonly business: BusinessConfig = activeBusiness) {}

  /**
   * Procesa un mensaje entrante y busca la respuesta más adecuada según la configuración del negocio.
   */
  public match(rawMessage: string): MatchResult {
    const normalized = normalizeText(rawMessage);

    // 1. Escalar a asesor humano
    if (anyKeyword(normalized, this.business.bot.advisorKeywords)) {
      return {
        matched: true,
        category: 'advisor',
        response: this.business.bot.advisorPrompt,
      };
    }

    // 2. Saludo o menú inicial (mensajes cortos con palabras de saludo)
    const isGreeting = anyKeyword(normalized, this.business.bot.greetingKeywords);
    if (isGreeting && normalized.split(' ').length <= 4) {
      return {
        matched: true,
        category: 'greeting',
        response: this.business.bot.welcomeMessage,
      };
    }

    // 3. Coincidencia con FAQs configuradas para este negocio
    let bestMatch: BusinessFAQ | null = null;
    let highestScore = 0;

    for (const faq of this.business.faqs) {
      let score = 0;
      for (const kw of faq.keywords) {
        if (containsKeyword(normalized, kw)) {
          // Las frases compuestas dan mayor peso que palabras individuales
          score += kw.includes(' ') ? 3 : 1;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = faq;
      }
    }

    if (bestMatch && highestScore > 0) {
      return {
        matched: true,
        category: bestMatch.category,
        response: bestMatch.answer,
        faqId: bestMatch.id,
        quickReplies: bestMatch.quickReplies,
      };
    }

    // 4. Fallback (Respaldo cuando no entiende)
    // NOTA PARA EXTENSIÓN: Aquí se puede conectar un proveedor de IA (ej. Gemini o OpenAI)
    // pasando el contexto dinámico del negocio antes de emitir el mensaje de fallback.
    return {
      matched: false,
      response: this.business.bot.fallbackMessage,
    };
  }
}

export const defaultEngine = new BusinessChatEngine();

export function matchBusinessFAQ(rawMessage: string, business?: BusinessConfig): MatchResult {
  const engine = business ? new BusinessChatEngine(business) : defaultEngine;
  return engine.match(rawMessage);
}
