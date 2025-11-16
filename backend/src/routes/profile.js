// backend/routes/profile.js
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Obter dados básicos do jogador
router.get('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    
    const playerProfile = await prisma.player.findUnique({
      where: { PL_ID: parseInt(playerId) },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_AVATAR: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_LIFE: true,
        PL_Created_at: true
      }
    });

    if (!playerProfile) {
      return res.status(404).json({ error: 'Perfil não encontrado' });
    }

    res.json(playerProfile);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do jogador
router.put('/:playerId', async (req, res) => {
  try {
    const { playerId } = req.params;
    const { PL_NAME, PL_EMAIL, PL_AVATAR } = req.body;

    // Verificar se email já existe (excluindo o próprio usuário)
    if (PL_EMAIL) {
      const existingEmail = await prisma.player.findFirst({
        where: {
          PL_EMAIL: PL_EMAIL,
          PL_ID: { not: parseInt(playerId) }
        }
      });

      if (existingEmail) {
        return res.status(400).json({ error: 'Email já está em uso' });
      }
    }

    // Verificar se username já existe (excluindo o próprio usuário)
    if (PL_NAME) {
      const existingUsername = await prisma.player.findFirst({
        where: {
          PL_NAME: PL_NAME,
          PL_ID: { not: parseInt(playerId) }
        }
      });

      if (existingUsername) {
        return res.status(400).json({ error: 'Nome de usuário já está em uso' });
      }
    }

    const updatedProfile = await prisma.player.update({
      where: { PL_ID: parseInt(playerId) },
      data: {
        PL_NAME,
        PL_EMAIL,
        PL_AVATAR
      },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_AVATAR: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_LIFE: true,
        PL_Created_at: true
      }
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

// Verificar disponibilidade de username
router.get('/check-username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const existingUser = await prisma.player.findFirst({
      where: {
        PL_NAME: username
      },
      select: {
        PL_ID: true,
        PL_NAME: true
      }
    });

    res.json({ 
      available: !existingUser,
      username: username
    });
  } catch (error) {
    console.error('Erro ao verificar username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar disponibilidade de email
router.get('/check-email/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const existingUser = await prisma.player.findFirst({
      where: {
        PL_EMAIL: email
      },
      select: {
        PL_ID: true,
        PL_EMAIL: true
      }
    });

    res.json({ 
      available: !existingUser,
      email: email
    });
  } catch (error) {
    console.error('Erro ao verificar email:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export { router };