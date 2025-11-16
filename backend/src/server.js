// backend/src/server.js
/* eslint-env node */

// CARREGAMENTO DO DOTENV
import 'dotenv/config'; 

import express from 'express';
import cors from 'cors';
import playerRoutes from './routes/playerRoutes.js';
import { router as profileRoutes } from './routes/profile.js';
import authRoutes from './routes/authRoutes.js';

// Inicializa o aplicativo Express
const app = express();

// Lê a porta do arquivo .env
const PORT = process.env.PORT || 3000; 

// MIDDLEWARES ESSENCIAIS

// 1. CORS: Permite a comunicação com o frontend
app.use(cors());

// 2. JSON: Permite que o Express leia o corpo das requisições como JSON
app.use(express.json());

// 3. ROTEAMENTO
// Define o ponto de entrada principal para as rotas de jogador
app.use('/api/player', playerRoutes);

// ADICIONADO: Define as rotas de perfil
app.use('/api/profile', profileRoutes);

// ADICIONADO: Define as rotas de autenticação
app.use('/api/auth', authRoutes);

// Rota de Teste de Saúde do Servidor
app.get('/', (req, res) => {
  res.send('Servidor Express rodando. A API de jogo está ativa!');
});

// Rota de teste do Firebase Admin
app.get('/api/auth/test-firebase', async (req, res) => {
  try {
    console.log('🧪 Testando Firebase Admin...');
    
    const admin = await import('./firebase/admin.js');
    console.log('✅ Firebase Admin importado');
    
    // CORREÇÃO: Removida a variável não utilizada 'auth'
    const _auth = admin.default.auth(); // Usando _ para indicar variável intencionalmente não usada
    console.log('✅ Firebase Auth inicializado');
    
    res.json({ 
      success: true, 
      message: 'Firebase Admin está funcionando',
      projectId: process.env.FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no Firebase Admin:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      projectId: process.env.FIREBASE_PROJECT_ID
    });
  }
});

// INICIALIZAÇÃO DO SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta http://localhost:${PORT}`);
  console.log('API de Registro de Jogador: POST http://localhost:3000/api/player/register');
  console.log('API de Perfil: GET/PUT http://localhost:3000/api/profile/:playerId');
  console.log('API de Auth: POST http://localhost:3000/api/auth/firebase-login');
  console.log('Teste Firebase: GET http://localhost:3000/api/auth/test-firebase');
});