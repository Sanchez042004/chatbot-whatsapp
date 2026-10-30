import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z
    .string()
    .default('3000')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().positive().max(65535)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  BUSINESS_ID: z.string().trim().min(1, 'El BUSINESS_ID no puede estar vacío').default('gym'),
  GEMINI_API_KEY: z.string().trim().optional(),
  SUPABASE_URL: z.string().trim().url('SUPABASE_URL debe ser una URL válida').optional(),
  SUPABASE_ANON_KEY: z.string().trim().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  CORS_ORIGIN: z.string().default('*'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ [Configuración] Error validando variables de entorno:');
    const formatted = result.error.format();
    for (const [key, value] of Object.entries(formatted)) {
      if (key === '_errors') continue;
      const fieldErrors = (value as { _errors?: string[] })?._errors || [];
      if (fieldErrors.length > 0) {
        console.error(`   • ${key}: ${fieldErrors.join(', ')}`);
      }
    }
    console.error('\n👉 Revisa tu archivo .env o las variables de entorno configuradas.\n');
    process.exit(1);
  }

  return result.data;
}

export const env = parseEnv();

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  businessId: env.BUSINESS_ID,
  gemini: {
    apiKey: env.GEMINI_API_KEY || '',
  },
  supabase: {
    url: env.SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || '',
  },
  corsOrigin: env.CORS_ORIGIN,
};
