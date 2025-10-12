// backend/src/server.js

// CARREGAMENTO DO DOTENV: Esta é a sintaxe oficial para Módulos ES
// que garante que as variáveis de ambiente sejam carregadas no 'process.env'.
import 'dotenv/config'; 

import express from 'express';
import cors from 'cors';
import playerRoutes from './routes/playerRoutes.js';

// Inicializa o aplicativo Express
const app = express();
// Lê a porta do arquivo .env (process.env.PORT)
const PORT = process.env.PORT || 3000; 

// MIDDLEWARES ESSENCIAIS

// 1. CORS: Permite a comunicação com o frontend
app.use(cors());

// 2. JSON: Permite que o Express leia o corpo das requisições como JSON
app.use(express.json());

// 3. ROTEAMENTO
// Define o ponto de entrada principal para as rotas de jogador
// Endpoint final de registro: POST /api/player/register
app.use('/api/player', playerRoutes);


// Rota de Teste de Saúde do Servidor
app.get('/', (req, res) => {
  res.send('Servidor Express rodando. A API de jogo está ativa!');
});


// INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
  console.log('API de Registro de Jogador: POST http://localhost:3000/api/player/register');
});