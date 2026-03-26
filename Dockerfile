# Stage 1: Build Frontend
FROM node:23-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Agent Runtime
FROM node:23-alpine AS runner

RUN npm install -g bun

WORKDIR /app

COPY package.json ./
COPY src/ ./src/
COPY characters/ ./characters/

RUN npm install
RUN npm install -g @elizaos/cli

COPY --from=frontend-builder /app/public ./public

ENV PORT=3000
ENV NODE_ENV=production
ENV ELIZAOS_LOG_LEVEL=info

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["elizaos", "start", "--character", "characters/cryptosentinel.json"]
