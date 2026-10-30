import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const {
  GEMINI_API_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  PORT,
} = process.env;

const missingVars: string[] = [];
if (!GEMINI_API_KEY) missingVars.push('GEMINI_API_KEY');
if (!SUPABASE_URL) missingVars.push('SUPABASE_URL');
if (!SUPABASE_ANON_KEY) missingVars.push('SUPABASE_ANON_KEY');

if (missingVars.length > 0) {
  console.error(`❌ [Config] Variables de entorno faltantes: ${missingVars.join(', ')}`);
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

export const config = {
  gemini: {
    apiKey: GEMINI_API_KEY as string,
  },
  supabase: {
    url: SUPABASE_URL as string,
    anonKey: SUPABASE_ANON_KEY as string,
  },
  port: parseInt(PORT || '3000', 10),
};
