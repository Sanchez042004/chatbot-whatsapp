import express from 'express';
import path from 'path';
import QRCode from 'qrcode';
import { config } from './config/env';
import { startWhatsAppBot, getBotStatus, endAdvisorSessionAndResume } from './services/whatsapp';
import { getActiveAdvisorChats } from './services/gemini';

const app = express();
app.use(express.json());

// Servir archivos estáticos de la landing page
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// ── Health check para monitoreo (UptimeRobot, Railway, etc.) ──
app.get('/health', (_req, res) => {
  const { status, uptimeSeconds } = getBotStatus();
  res.json({
    ok: true,
    status,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de estado para el frontend
app.get('/api/status', (_req, res) => {
  const statusInfo = getBotStatus();
  res.json({
    success: true,
    ...statusInfo,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para ver chats activos con asesor humano
app.get('/api/advisor/chats', (_req, res) => {
  const chats = getActiveAdvisorChats();
  res.json({ success: true, chats });
});

// Endpoint para finalizar atención del asesor y que el bot pregunte cordialmente si tiene otra duda
app.post('/api/advisor/close', async (req, res) => {
  const { jid } = req.body;
  if (!jid) {
    return res.status(400).json({ error: 'Falta el parámetro jid' });
  }
  const ok = await endAdvisorSessionAndResume(jid);
  return res.json({ success: ok });
});

// Endpoint para obtener el código QR como imagen Data URL
app.get('/api/qr', async (_req, res) => {
  const { status, lastQrRaw } = getBotStatus();

  if (status === 'open') {
    return res.json({ status: 'open', qrImage: null, message: 'Bot ya conectado' });
  }

  if (lastQrRaw) {
    try {
      const qrImage = await QRCode.toDataURL(lastQrRaw, {
        margin: 2,
        width: 300,
        color: {
          dark: '#0a0b0e',
          light: '#ffffff',
        },
      });
      return res.json({ status: 'qr_ready', qrImage });
    } catch (_err) {
      return res.status(500).json({ error: 'Error generando imagen QR' });
    }
  }

  return res.json({ status, qrImage: null, message: 'Iniciando conexión...' });
});

const server = app.listen(config.port, () => {
  console.log(`🌐 Servidor corriendo en el puerto ${config.port}`);
  startWhatsAppBot();
});

// ── Cierre ordenado ──
function shutdown(signal: string) {
  console.log(`\n⚠️  ${signal} recibido. Cerrando servidor...`);
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente.');
    process.exit(0);
  });
  // Forzar cierre si tarda más de 10s
  setTimeout(() => {
    console.error('❌ Cierre forzado por timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
