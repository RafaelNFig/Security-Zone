// backend/src/controllers/playerController.js

import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';

// Número de "rounds" de hash. 10 é um bom padrão para segurança e velocidade.
const saltRounds = 10;

/**
 * Registra um novo jogador no sistema.
 */
export const registerPlayer = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Todos os campos (name, email, password) são obrigatórios.' });
  }

  try {
    // 1. Criptografa a senha antes de salvar
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 2. Cria o novo jogador no banco de dados
    const newPlayer = await prisma.player.create({
      data: {
        PL_NAME: name,
        PL_EMAIL: email,
        PL_PASSWORD_HASH: passwordHash,
        // PL_COINS, PL_GEMS e PL_LEVEL usarão os valores @default definidos no schema!
      },
      // Seleciona quais campos retornar (NUNCA RETORNE O HASH DA SENHA)
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_COINS: true,
        PL_Created_at: true,
      }
    });

    // 3. Resposta de sucesso
    return res.status(201).json({
      message: 'Jogador registrado com sucesso!',
      player: newPlayer
    });

  } catch (error) {
    console.error('Erro ao registrar jogador:', error);
    
    // Trata erro de unicidade (Ex: e-mail ou nome de usuário já existe)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'O nome de usuário ou e-mail já está em uso.' });
    }

    return res.status(500).json({ error: 'Erro interno do servidor durante o registro.' });
  }
};