// backend/server.js

import express from 'express';
import cors from 'cors';

// 1. Configuração Básica
const app = express();
const port = 3001; // Porta padrão para o backend (diferente do Vite/React)

// 2. Middleware
// Permite que o React se comunique com o backend (CORS)
app.use(cors()); 
// Permite que o Express leia JSON em requisições
app.use(express.json()); 

// 3. Rota de Teste (Raiz)
app.get('/', (req, res) => {
  res.send('Servidor do Security Zone (Backend) está online!');
});

// 4. Iniciar o Servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});