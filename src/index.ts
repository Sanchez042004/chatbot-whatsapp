import express from 'express';
import { config } from './config/env';
import { startWhatsAppBot } from './services/whatsapp';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('FitBot Gym WhatsApp AI is running.');
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
  startWhatsAppBot();
});
