import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const {
  GEMINI_API_KEY,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  PORT,
  N8N_WEBHOOK_URL
} = process.env;

if (!GEMINI_API_KEY) {
  throw new Error('Missing GEMINI_API_KEY environment variable');
}
if (!SUPABASE_URL) {
  throw new Error('Missing SUPABASE_URL environment variable');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

export const config = {
  gemini: {
    apiKey: GEMINI_API_KEY,
  },
  supabase: {
    url: SUPABASE_URL,
    anonKey: SUPABASE_ANON_KEY,
  },
  n8n: {
    webhookUrl: N8N_WEBHOOK_URL || '',
  },
  port: parseInt(PORT || '3000', 10),
};
