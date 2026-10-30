import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import QRCode from 'qrcode';
import { config } from './config/env';
import { startWhatsAppBot, getBotStatus, endAdvisorSessionAndResume } from './services/whatsapp';
import { getActiveAdvisorChats } from './services/gemini';
import { logger } from './utils/logger';

const app = express();

// ── Seguridad HTTP ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(
  cors({
    origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
    methods: ['GET', 'POST'],
  }),
);

app.use(express.json({ limit: '1mb' }));

// Rate limit para endpoints de la API (100 peticiones por 15 min por IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, por favor intenta más tarde.' },
});

app.use('/api/', apiLimiter);

// Servir archivos estáticos de la landing page
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// ── Health check para monitoreo (UptimeRobot, Railway, Docker, etc.) ──
app.get('/health', (_req: Request, res: Response) => {
  const { status, uptimeSeconds } = getBotStatus();
  res.json({
    ok: true,
    status,
    uptimeSeconds,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint de estado para el frontend
app.get('/api/status', (_req: Request, res: Response) => {
  const statusInfo = getBotStatus();
  res.json({
    success: true,
    ...statusInfo,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para ver chats activos con asesor humano
app.get('/api/advisor/chats', (_req: Request, res: Response) => {
  const chats = getActiveAdvisorChats();
  res.json({ success: true, chats });
});

// Endpoint para finalizar atención del asesor y que el bot pregunte cordialmente
app.post('/api/advisor/close', async (req: Request, res: Response) => {
  const { jid } = req.body as { jid?: string };
  if (!jid) {
    return res.status(400).json({ error: 'Falta el parámetro jid' });
  }
  const ok = await endAdvisorSessionAndResume(jid);
  return res.json({ success: ok });
});

// Endpoint para obtener el código QR como imagen Data URL
app.get('/api/qr', async (_req: Request, res: Response) => {
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
    } catch (err: unknown) {
      logger.error('Error generando imagen QR', { error: String(err) });
      return res.status(500).json({ error: 'Error generando imagen QR' });
    }
  }

  return res.json({ status, qrImage: null, message: 'Iniciando conexión...' });
});

// ── Manejo Centralizado de Errores ──
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Error no capturado en endpoint Express', { error: err.message });
  res.status(500).json({
    success: false,
    error: config.nodeEnv === 'production' ? 'Error interno del servidor' : err.message,
  });
});

const server = app.listen(config.port, () => {
  logger.info(`Servidor HTTP activo en el puerto ${config.port} (Entorno: ${config.nodeEnv})`);
  startWhatsAppBot().catch((err: unknown) => {
    logger.error('Error al arrancar el bot de WhatsApp', { error: String(err) });
  });
});

// ── Cierre Ordenado (Graceful Shutdown) ──
function shutdown(signal: string): void {
  logger.info(`${signal} recibido. Cerrando servidor de manera ordenada...`);
  server.close(() => {
    logger.info('Servidor HTTP cerrado.');
    process.exit(0);
  });
  // Timeout forzado tras 10 segundos
  setTimeout(() => {
    logger.error('Cierre forzado tras timeout de 10s.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
