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
    match_count: 10
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

  console.log(`✅ Found ${documents.length} matching docs. Top similarity: ${documents[0]?.similarity?.toFixed(4)}`);
  const context = documents.map((doc) => doc.content).join('\n---\n');
  return context;
}
