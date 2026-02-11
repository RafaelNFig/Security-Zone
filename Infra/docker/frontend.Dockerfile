# Infra/docker/frontend.Dockerfile
FROM node:20-alpine

WORKDIR /app

# copia dependências primeiro (cache)
COPY package*.json ./

RUN npm install

# copia o resto do frontend
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
