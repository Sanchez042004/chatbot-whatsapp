/**
 * Fachada para el motor de FAQs y normalización de texto.
 * Delega completamente en el motor dinámico del negocio activo.
 */

import { activeBusiness } from '../domain/business-loader';
import { defaultEngine, normalizeText, MatchResult } from '../domain/engine';

export { normalizeText, MatchResult };

export type FAQMatchResult = MatchResult;

export const FAQ_RESPONSES = {
  menu: activeBusiness.bot.welcomeMessage,
  fallback: activeBusiness.bot.fallbackMessage,
  advisor: activeBusiness.bot.advisorPrompt,
};

/**
 * Coincidencia de FAQs delegada al motor dinámico del negocio activo.
 */
export function matchFAQ(rawMessage: string): MatchResult {
  return defaultEngine.match(rawMessage);
}
