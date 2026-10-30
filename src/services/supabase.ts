import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let supabaseClient: SupabaseClient | null = null;

if (config.supabase.url && config.supabase.anonKey) {
  try {
    supabaseClient = createClient(config.supabase.url, config.supabase.anonKey);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.warn(`No se pudo inicializar cliente de Supabase: ${errorMsg}`);
  }
}

export const supabase = supabaseClient;

export interface MatchedDocument {
  id: number;
  content: string;
  similarity: number;
}

export async function getBusinessContext(queryEmbedding: number[]): Promise<string> {
  if (!supabase) return '';

  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.1,
    match_count: 10,
  });

  if (error) {
    logger.error('Error in match_documents RPC', { error: error.message });
    return '';
  }

  const documents = data as MatchedDocument[] | null;

  if (!documents || documents.length === 0) {
    logger.warn('No matching documents found for the query embedding');
    return '';
  }

  logger.info(
    `Encontrados ${documents.length} documentos coincidentes. Similitud: ${documents[0]?.similarity?.toFixed(4)}`,
  );
  const context = documents.map((doc) => doc.content).join('\n---\n');
  return context;
}

export interface BookingData {
  phone: string;
  name: string;
  serviceType: string;
  bookingDate: string;
  bookingTime?: string;
  notes?: string;
}

export async function saveBooking(
  data: BookingData,
): Promise<{ success: boolean; id?: number; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase no está configurado' };
  }

  try {
    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert({
        phone: data.phone,
        name: data.name,
        service_type: data.serviceType,
        booking_date: data.bookingDate,
        booking_time: data.bookingTime || '',
        notes: data.notes || '',
        status: 'confirmed',
      })
      .select('id')
      .single();

    if (error) {
      logger.warn('Error al guardar reserva en Supabase', { message: error.message });
      return { success: false, error: error.message };
    }

    logger.info(`Reserva guardada con éxito (ID: ${inserted?.id}) para ${data.name}`);
    return { success: true, id: inserted?.id };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('Error inesperado guardando reserva', { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}
