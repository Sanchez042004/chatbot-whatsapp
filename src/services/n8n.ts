import { config } from '../config/env';

export type N8nEventType = 'ADVISOR_REQUESTED' | 'SESSION_CLOSED' | 'GENERAL_INQUIRY';

export interface N8nEventPayload {
  event: N8nEventType;
  from: string;
  phone: string;
  message?: string;
  reason?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

/** Extrae el número de teléfono legible del remoteJid de WhatsApp */
export function formatPhoneNumber(remoteJid: string): string {
  const clean = remoteJid.replace(/@.*$/, '').replace(/[^\d]/g, '');
  if (clean.length > 5) {
    return `+${clean}`;
  }
  return remoteJid;
}

/** Envía un evento a n8n de forma asíncrona sin bloquear el flujo principal */
export async function sendN8nEvent(
  event: N8nEventType,
  data: {
    from: string;
    message?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const webhookUrl = config.n8n.webhookUrl;
  if (!webhookUrl) {
    // Si no está configurada la URL, continuar normalmente
    return;
  }

  const payload: N8nEventPayload = {
    event,
    from: data.from,
    phone: formatPhoneNumber(data.from),
    message: data.message,
    reason: data.reason,
    metadata: data.metadata,
    timestamp: new Date().toISOString(),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // Timeout de 2.5s

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      console.log(`📡 [n8n] Evento "${event}" enviado exitosamente para ${payload.phone}`);
    } else {
      console.warn(`⚠️ [n8n] Respuesta con estado ${res.status} al enviar evento "${event}"`);
    }
  } catch (error: any) {
    // Falla no bloqueante con log para garantizar que WhatsApp nunca se interrumpa
    if (error?.name === 'AbortError') {
      console.warn(`⚠️ [n8n] Timeout al enviar evento "${event}" a n8n`);
    } else {
      console.warn(`⚠️ [n8n] No se pudo conectar con webhook de n8n (${webhookUrl})`);
    }
  }
}
