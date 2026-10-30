import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env';

export const supabase = createClient(config.supabase.url, config.supabase.anonKey);

export interface MatchedDocument {
  id: number;
  content: string;
  similarity: number;
}

export async function getBusinessContext(queryEmbedding: number[]): Promise<string> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.1,
    match_count: 10,
  });

  if (error) {
    console.error('Error in match_documents RPC:', error);
    return '';
  }

  const documents = data as MatchedDocument[] | null;

  if (!documents || documents.length === 0) {
    console.warn('⚠️ No matching documents found for the query embedding.');
    return '';
  }

  console.log(`🔍 Encontrados ${documents.length} documentos coincidentes. Similitud principal: ${documents[0]?.similarity?.toFixed(4)}`);
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

export async function saveBooking(data: BookingData): Promise<{ success: boolean; id?: number; error?: string }> {
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
      console.warn('⚠️ [Supabase] Nota: Asegúrate de ejecutar schema.sql si la tabla bookings no existe aún:', error.message);
      return { success: false, error: error.message };
    }

    console.log(`✅ [Supabase] Reserva guardada con éxito (ID: ${inserted?.id}) para ${data.name}`);
    return { success: true, id: inserted?.id };
  } catch (err: any) {
    console.error('❌ [Supabase] Error inesperado guardando reserva:', err?.message || err);
    return { success: false, error: err?.message };
  }
}
