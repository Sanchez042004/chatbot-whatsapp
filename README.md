# FitBot — Gym WhatsApp AI Chatbot

FitBot es un chatbot para atención al cliente y preguntas frecuentes (FAQs) en WhatsApp, diseñado para gimnasios. Responde consultas sobre planes, horarios, clases y más, usando IA (Gemini) con búsqueda semántica (RAG) sobre Supabase.

## Stack Tecnológico

- **Backend:** Node.js, Express, TypeScript
- **Integración WhatsApp:** `@whiskeysockets/baileys` (conexión directa, sin API oficial de Meta)
- **IA / LLM:** Google Gemini API (`gemini-flash-lite-latest`)
- **Base de Datos Vectorial:** Supabase (PostgreSQL + `pgvector`)
- **Contenerización:** Docker + Docker Compose

## Configuración Local

### 1. Clonar e Instalar
```bash
git clone <repo-url>
cd chatbot-ia
npm install
```

### 2. Variables de Entorno
Copia `.env.example` a `.env` y completa los valores:
```env
GEMINI_API_KEY=tu_clave_gemini
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu_supabase_anon_key
PORT=3000
```

### 3. Base de Datos
En el SQL Editor de tu proyecto Supabase, ejecuta `schema.sql` para crear las tablas y la función RAG.

### 4. Cargar Datos Iniciales (Seed)
Genera los embeddings de las FAQs e insértalos en Supabase:
```bash
npm run seed
```

### 5. Iniciar el Bot
```bash
npm run dev          # Desarrollo (recarga en caliente)
npm run build && npm start  # Producción
```
Aparecerá un código QR en la consola. Escanéalo desde WhatsApp → **Dispositivos Vinculados**.

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Modo desarrollo con recarga automática |
| `npm run build` | Compila TypeScript → `dist/` |
| `npm start` | Corre el compilado de `dist/` |
| `npm run seed` | Carga FAQs en Supabase con embeddings |
| `npm run typecheck` | Verifica tipos sin compilar |

## Comandos del asesor (desde el propio WhatsApp del bot)

| Comando | Efecto |
|---------|--------|
| `!bot off` | Pausa el bot en el chat activo (modo asesor) |
| `!bot on` | Reactiva el bot en el chat activo |

## Despliegue con Docker

```bash
# Construir imagen
docker build -t fitbot .

# Levantar con docker-compose (incluye volumen de sesión)
docker compose up -d

# Ver logs
docker compose logs -f
```

El volumen `baileys_session` persiste la sesión de WhatsApp entre reinicios.

## Monitoreo

- **`GET /health`** — Estado del bot para UptimeRobot / Railway / cron-job.org
- **`GET /api/status`** — Estado detallado (JSON)
- **`GET /api/qr`** — QR actual como Data URL (para el panel admin)
