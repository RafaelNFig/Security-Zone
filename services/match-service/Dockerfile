# services/match-service/Dockerfile
# Match Service (Node/Express) - ESM
# Sem Prisma por enquanto.

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# cache de deps
COPY package*.json ./

# mais tolerante (se lock não bater)
RUN npm install

# código
COPY . .

ENV NODE_ENV=development
EXPOSE 3001

CMD ["npm", "run", "dev"]
