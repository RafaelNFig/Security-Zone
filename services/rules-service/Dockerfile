# services/rules-service/Dockerfile
# Rules Service (stateless) - Node ESM

FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_ENV=production
EXPOSE 3002

# Preferir npm start. Se não existir, troque por ["node","src/server.js"]
CMD ["npm", "start"]
