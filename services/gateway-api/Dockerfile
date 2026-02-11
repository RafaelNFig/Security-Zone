# services/gateway-api/Dockerfile
# Gateway API (Node + Prisma) - ESM

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia manifests primeiro (cache)
COPY package*.json ./

# (opcional mas recomendado) copia schema cedo para cache do generate
COPY prisma ./prisma

# Instala deps de forma reproduzível
RUN npm install

# Copia o resto do projeto
COPY . .

# Gera Prisma Client (runtime)
RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
