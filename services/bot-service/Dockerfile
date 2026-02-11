# services/bot-service/Dockerfile
FROM node:20-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# ✅ usa npm install (não exige lockfile perfeitamente sync)
RUN npm install

COPY . .

ENV NODE_ENV=development
EXPOSE 3003

CMD ["npm", "run", "dev"]
