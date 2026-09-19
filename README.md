# FitBot - Gym WhatsApp AI Chatbot

FitBot es un MVP de chatbot para atención al cliente y preguntas frecuentes (FAQs) en WhatsApp, diseñado específicamente para un gimnasio.

## Stack Tecnológico

- **Backend:** Node.js, Express, TypeScript
- **Integración WhatsApp:** `@whiskeysockets/baileys`
- **IA / LLM:** Google Gemini API (`gemini-1.5-flash`)
- **Base de Datos Vectorial:** Supabase (PostgreSQL + `pgvector`)
- **CI/CD:** GitHub Actions

## Configuración Local

### 1. Clonar e Instalar
```bash
git clone <repo-url>
cd chatbot-ia
npm install
```

### 2. Variables de Entorno
Crea un archivo `.env` en la raíz (basado en `.env.example`):
```env
GEMINI_API_KEY=tu_clave_api
SUPABASE_URL=tu_supabase_url
SUPABASE_ANON_KEY=tu_supabase_anon_key
PORT=3000
```

### 3. Base de Datos
En el SQL Editor de tu proyecto de Supabase, ejecuta el contenido de `schema.sql` para crear la tabla y la función RAG.

### 4. Cargar Datos Iniciales (Seed)
Ejecuta el script para llenar la base de datos con las preguntas del gimnasio y generar los embeddings con Gemini:
```bash
npm run seed
```

### 5. Iniciar el Bot
Ejecuta el servidor:
```bash
npm start
```
Aparecerá un código QR en la consola. Escanéalo desde tu app de WhatsApp (Dispositivos Vinculados) para iniciar la sesión. El bot ahora responderá basándose en el contexto guardado.

## Despliegue
Puedes desplegar esta aplicación en servicios gratuitos como Render, Railway o Fly.io, asegurándote de configurar las variables de entorno en la plataforma elegida.
