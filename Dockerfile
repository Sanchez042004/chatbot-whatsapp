# ─── Etapa 1: Builder ───────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias (solo prod+dev para compilar)
COPY package*.json ./
RUN npm ci

# Copiar código y compilar
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# ─── Etapa 2: Runner (imagen ligera) ────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Solo dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar artefactos compilados y assets
COPY --from=builder /app/dist ./dist
COPY public/ ./public/

# Exponer puerto
EXPOSE 3000

# Volumen para persistir la sesión de WhatsApp (Baileys)
VOLUME ["/app/baileys_auth_info"]

# Cierre ordenado con dumb-init
RUN apk add --no-cache dumb-init

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]

