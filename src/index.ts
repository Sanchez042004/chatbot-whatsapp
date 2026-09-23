import express from 'express';
import path from 'path';
import QRCode from 'qrcode';
import { config } from './config/env';
import { startWhatsAppBot, getBotStatus } from './services/whatsapp';

const app = express();
app.use(express.json());

// Servir archivos estáticos de la landing page
const publicDir = path.resolve(process.cwd(), 'public');
app.use(express.static(publicDir));

// Endpoint de estado para el frontend y monitores (UptimeRobot / cron-job.org)
app.get('/api/status', (req, res) => {
  const statusInfo = getBotStatus();
  res.json({
    success: true,
    ...statusInfo,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint para obtener el código QR como imagen Data URL
app.get('/api/qr', async (req, res) => {
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
          light: '#ffffff'
        }
      });
      return res.json({ status: 'qr_ready', qrImage });
    } catch (err) {
      return res.status(500).json({ error: 'Error generando imagen QR' });
    }
  }

  return res.json({ status, qrImage: null, message: 'Iniciando conexión...' });
});

app.listen(config.port, () => {
  console.log(`🌐 Server and Landing Page running on port ${config.port}`);
  startWhatsAppBot();
});

