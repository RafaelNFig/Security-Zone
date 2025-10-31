// backend/src/controllers/playerController.js

import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import generateToken from '../utils/generateToken.js';

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
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_Created_at: true,
      }
    });

    // 3. Gera token JWT para login automático após registro
    const token = generateToken(newPlayer.PL_ID);

    // 4. Resposta de sucesso
    return res.status(201).json({
      message: 'Jogador registrado com sucesso!',
      player: newPlayer,
      token
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

/**
 * Realiza login do jogador
 */
export const loginPlayer = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // 1. Busca o jogador pelo email
    const player = await prisma.player.findUnique({
      where: { PL_EMAIL: email },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_PASSWORD_HASH: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_Created_at: true,
      }
    });

    // 2. Verifica se jogador existe e senha está correta
    if (player && await bcrypt.compare(password, player.PL_PASSWORD_HASH)) {
      // 3. Gera token JWT
      const token = generateToken(player.PL_ID);

      // 4. Retorna dados do jogador + token
      return res.status(200).json({
        message: 'Login realizado com sucesso!',
        player: {
          PL_ID: player.PL_ID,
          PL_NAME: player.PL_NAME,
          PL_EMAIL: player.PL_EMAIL,
          PL_COINS: player.PL_COINS,
          PL_GEMS: player.PL_GEMS,
          PL_LEVEL: player.PL_LEVEL,
          PL_AVATAR: player.PL_AVATAR,
          PL_LIFE: player.PL_LIFE,
          PL_Created_at: player.PL_Created_at,
        },
        token
      });
    } else {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro interno do servidor durante o login.' });
  }
};

/**
 * Obtém perfil do jogador autenticado
 */
export const getPlayerProfile = async (req, res) => {
  try {
    const player = await prisma.player.findUnique({
      where: { PL_ID: req.player.PL_ID },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_Created_at: true,
      }
    });

    if (player) {
      res.json({
        message: 'Perfil carregado com sucesso!',
        player
      });
    } else {
      res.status(404).json({ error: 'Jogador não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

/**
 * Atualiza perfil do jogador
 */
export const updatePlayerProfile = async (req, res) => {
  const { name, avatar } = req.body;

  try {
    // Só permite atualizar nome e avatar por enquanto
    const updatedPlayer = await prisma.player.update({
      where: { PL_ID: req.player.PL_ID },
      data: {
        ...(name && { PL_NAME: name }),
        ...(avatar && { PL_AVATAR: avatar }),
      },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_Created_at: true,
      }
    });

    res.json({
      message: 'Perfil atualizado com sucesso!',
      player: updatedPlayer
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Este nome de usuário já está em uso.' });
    }
    
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

/**
 * Altera senha do jogador
 */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    // Busca jogador com a senha atual para verificação
    const player = await prisma.player.findUnique({
      where: { PL_ID: req.player.PL_ID },
      select: {
        PL_PASSWORD_HASH: true
      }
    });

    if (!player) {
      return res.status(404).json({ error: 'Jogador não encontrado.' });
    }

    // Verifica se a senha atual está correta
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, player.PL_PASSWORD_HASH);
    
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    // Criptografa a nova senha
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualiza a senha
    await prisma.player.update({
      where: { PL_ID: req.player.PL_ID },
      data: { PL_PASSWORD_HASH: newPasswordHash }
    });

    res.json({ message: 'Senha alterada com sucesso!' });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

/**
 * Obtém estatísticas básicas do jogador
 */
export const getPlayerStats = async (req, res) => {
  try {
    const playerId = req.player.PL_ID;

    // Busca estatísticas do jogador
    const playerStats = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_LEVEL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LIFE: true,
        PL_Created_at: true,
        // Conta decks do jogador
        _count: {
          select: {
            decks: true,
            inventory: true
          }
        }
      }
    });

    if (playerStats) {
      res.json({
        message: 'Estatísticas carregadas com sucesso!',
        stats: playerStats
      });
    } else {
      res.status(404).json({ error: 'Jogador não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};