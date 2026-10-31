import fs from 'fs';
import path from 'path';
import { businessSchema, BusinessConfig } from '../types/business';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const BUSINESSES_ROOT = path.resolve(process.cwd(), 'businesses');

function getAvailableBusinesses(): string[] {
  try {
    if (!fs.existsSync(BUSINESSES_ROOT)) return [];
    return fs
      .readdirSync(BUSINESSES_ROOT, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory() && !dirent.name.startsWith('_'))
      .map((dirent) => dirent.name);
  } catch {
    return [];
  }
}

function loadBusinessConfig(businessId: string): BusinessConfig {
  const businessFilePath = path.join(BUSINESSES_ROOT, businessId, 'business.json');

  if (!fs.existsSync(businessFilePath)) {
    const available = getAvailableBusinesses();
    const errorMsg =
      `\n❌ [Negocio] No se encontró la configuración del negocio "${businessId}".\n` +
      `   Ruta esperada: ${businessFilePath}\n` +
      `   Negocios disponibles: ${available.length > 0 ? available.join(', ') : 'ninguno'}\n` +
      `👉 Configura la variable de entorno BUSINESS_ID con uno de los negocios disponibles o crea la carpeta correspondente.\n`;
    logger.error(errorMsg);
    throw new Error(`Business "${businessId}" not found`);
  }

  try {
    const rawContent = fs.readFileSync(businessFilePath, 'utf-8');
    const parsedJson: unknown = JSON.parse(rawContent);
    const result = businessSchema.safeParse(parsedJson);

    if (!result.success) {
      logger.error(`Error de validación en business.json para "${businessId}"`, {
        errors: result.error.format(),
      });
      throw new Error(`Invalid business configuration for "${businessId}"`);
    }

    logger.info(
      `Negocio cargado exitosamente: "${result.data.name}" [ID: ${result.data.id}] (Rubro: ${result.data.industry})`,
    );
    return result.data;
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('not found')) {
      throw err;
    }
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`Error leyendo business.json de "${businessId}": ${msg}`);
    throw new Error(`Failed to load business "${businessId}": ${msg}`);
  }
}

export const activeBusiness: BusinessConfig = loadBusinessConfig(config.businessId);

export { loadBusinessConfig, getAvailableBusinesses };
