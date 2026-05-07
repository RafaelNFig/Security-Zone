# services/match-service/Dockerfile
# Match Service (Node/Express) - ESM
# Sem Prisma por enquanto.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copia o motor do jogo (monorepo local dependency)
COPY shared ./shared

# Copia apenas o package do serviço
COPY services/match-service/package*.json ./services/match-service/

# Entra na pasta do shared para instalar as dependencias dele (boardgame.io)
WORKDIR /app/shared/game-engine
RUN npm install

# Entra na pasta do serviço para instalar
WORKDIR /app/services/match-service

# Instala as dependencias (vai ler o file:../../shared/game-engine com sucesso)
RUN npm install

# Copia o resto do código do match-service
COPY services/match-service .

ENV NODE_ENV=development
EXPOSE 3001

CMD ["npm", "run", "dev"]
