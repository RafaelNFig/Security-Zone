// backend/src/controllers/playerController.js

/* eslint-env node */
import prisma from '../prismaClient.js';
import bcrypt from 'bcrypt';
import { generateToken } from '../utils/jwtUtils.js';

const saltRounds = 10;

// 🔥 CORREÇÃO: Cache simples em memória para evitar queries repetidas
const profileCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// 🔥 CORREÇÃO: Função utilitária para formatar resposta do player
const formatPlayerResponse = (player) => {
  return {
    PL_ID: player.PL_ID,
    PL_NAME: player.PL_NAME,
    PL_EMAIL: player.PL_EMAIL,
    PL_COINS: player.PL_COINS || 0,
    PL_GEMS: player.PL_GEMS || 0,
    PL_LEVEL: player.PL_LEVEL || 1,
    PL_AVATAR: player.PL_AVATAR,
    PL_LIFE: player.PL_LIFE || 100,
    PL_AUTH_PROVIDER: player.PL_AUTH_PROVIDER,
    PL_Created_at: player.PL_Created_at,
    // 🔥 REMOVIDO: PL_LAST_LOGIN não existe no banco
    isActive: true,
    hasPassword: player.PL_PASSWORD_HASH && player.PL_PASSWORD_HASH !== 'google-auth-no-password'
  };
};

// 🔥 CORREÇÃO: Função para limpar cache do player
const clearPlayerCache = (playerId) => {
  profileCache.delete(`player_${playerId}`);
  profileCache.delete(`stats_${playerId}`);
};

/* ================================
   REGISTRAR NOVO JOGADOR (OTIMIZADO)
================================ */
export const registerPlayer = async (req, res) => {
  const { name, email, password } = req.body;

  // 🔥 CORREÇÃO: Validação mais robusta
  if (!name || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Todos os campos (name, email, password) são obrigatórios.',
      code: 'MISSING_FIELDS'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'A senha deve ter pelo menos 6 caracteres.',
      code: 'WEAK_PASSWORD'
    });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ 
      success: false,
      error: 'E-mail inválido.',
      code: 'INVALID_EMAIL'
    });
  }

  try {
    // 🔥 CORREÇÃO: Verificar se email já existe ANTES de tentar criar
    const existingPlayer = await prisma.player.findUnique({
      where: { PL_EMAIL: email.toLowerCase().trim() }
    });

    if (existingPlayer) {
      return res.status(409).json({ 
        success: false,
        error: 'Este e-mail já está em uso.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    const passwordHash = await bcrypt.hash(password, saltRounds);

    const newPlayer = await prisma.player.create({
      data: {
        PL_NAME: name.trim(),
        PL_EMAIL: email.toLowerCase().trim(),
        PL_PASSWORD_HASH: passwordHash,
        PL_COINS: 0,
        PL_GEMS: 0,
        PL_LEVEL: 1,
        PL_LIFE: 100,
        // 🔥 REMOVIDO: PL_LAST_LOGIN não existe no banco
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
        PL_AUTH_PROVIDER: true,
        PL_Created_at: true,
      }
    });

    // 🔥 CORREÇÃO: Gerar token usando o middleware atualizado
    const token = generateToken(newPlayer);
    const playerResponse = formatPlayerResponse(newPlayer);

    console.log(`✅ Novo jogador registrado: ${newPlayer.PL_NAME} (${newPlayer.PL_ID})`);

    return res.status(201).json({
      success: true,
      message: 'Jogador registrado com sucesso!',
      player: playerResponse,
      token
    });

  } catch (error) {
    console.error('❌ Erro ao registrar jogador:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ 
        success: false,
        error: 'O nome de usuário ou e-mail já está em uso.',
        code: 'DUPLICATE_ENTRY'
      });
    }

    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor durante o registro.',
      code: 'REGISTRATION_ERROR'
    });
  }
};

/* ================================
        LOGIN TRADICIONAL (OTIMIZADO)
================================ */
export const loginPlayer = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'E-mail e senha são obrigatórios.',
      code: 'MISSING_CREDENTIALS'
    });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { PL_EMAIL: email.toLowerCase().trim() },
    });

    if (!player) {
      return res.status(401).json({ 
        success: false,
        error: 'E-mail ou senha inválidos.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 🔥 CORREÇÃO: Verificar se o player tem senha (pode ser conta social)
    if (!player.PL_PASSWORD_HASH) {
      return res.status(401).json({ 
        success: false,
        error: 'Esta conta usa login social. Use Google para entrar.',
        code: 'SOCIAL_ACCOUNT'
      });
    }

    const passwordMatch = await bcrypt.compare(password, player.PL_PASSWORD_HASH);

    if (!passwordMatch) {
      return res.status(401).json({ 
        success: false,
        error: 'E-mail ou senha inválidos.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 🔥 CORREÇÃO: REMOVIDO atualização de PL_LAST_LOGIN (campo não existe)
    console.log('✅ Login validado - pulando atualização de último login');

    const token = generateToken(player);
    const playerResponse = formatPlayerResponse(player);

    // 🔥 CORREÇÃO: Limpar cache antigo
    clearPlayerCache(player.PL_ID);

    console.log(`✅ Login realizado: ${player.PL_NAME} (${player.PL_ID})`);

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso!",
      player: playerResponse,
      token
    });

  } catch (error) {
    console.error('❌ Erro ao fazer login:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor durante o login.',
      code: 'LOGIN_ERROR'
    });
  }
};

/* ================================
        PERFIL DO JOGADOR (OTIMIZADO COM CACHE)
================================ */
export const getPlayerProfile = async (req, res) => {
  try {
    console.log('🔐 [Backend] Buscando perfil para player ID:', req.player.PL_ID);
    
    const playerId = req.player.PL_ID;

    // 🔥 VERSÃO SUPER SIMPLIFICADA - APENAS DADOS BÁSICOS
    const player = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: {
        // 🔥 APENAS campos que CERTAMENTE existem
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_AUTH_PROVIDER: true,
        PL_Created_at: true,
        PL_PASSWORD_HASH: true,
        PL_FIREBASE_UID: true,
        
        // 🔥 REMOVER relacionamentos problemáticos por enquanto
        // decks: true,       // REMOVER
        // inventory: true,   // REMOVER
      }
    });

    if (!player) {
      console.log('❌ [Backend] Player não encontrado:', playerId);
      return res.status(404).json({ 
        success: false,
        error: "Jogador não encontrado.",
        code: "PLAYER_NOT_FOUND"
      });
    }

    console.log('✅ [Backend] Player encontrado:', player.PL_NAME);

    // 🔥 Formatar resposta SEM campos problemáticos
    const playerResponse = {
      PL_ID: player.PL_ID,
      PL_NAME: player.PL_NAME,
      PL_EMAIL: player.PL_EMAIL,
      PL_COINS: player.PL_COINS || 0,
      PL_GEMS: player.PL_GEMS || 0,
      PL_LEVEL: player.PL_LEVEL || 1,
      PL_AVATAR: player.PL_AVATAR,
      PL_LIFE: player.PL_LIFE || 100,
      PL_AUTH_PROVIDER: player.PL_AUTH_PROVIDER,
      PL_Created_at: player.PL_Created_at,
      
      // 🔥 Dados vazios para manter estrutura esperada
      decks: [],
      inventory: [],
      stats: {
        totalDecks: 0,
        totalItems: 0
      }
    };

    console.log('📤 [Backend] Enviando resposta do perfil (simplificada)');
    
    res.json({
      success: true,
      message: "Perfil carregado com sucesso!",
      player: playerResponse
    });

  } catch (error) {
    console.error("💥 [Backend] Erro ao buscar perfil:", error);
    
    // 🔥 Log detalhado do erro
    if (error.message.includes('Unknown field')) {
      const fieldMatch = error.message.match(/Unknown field `(\w+)`/);
      if (fieldMatch) {
        console.error(`🔧 [Backend] Campo '${fieldMatch[1]}' não existe no banco.`);
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: "Erro interno do servidor.",
      code: "PROFILE_FETCH_ERROR"
    });
  }
};

/* ================================
        EDITAR PERFIL (OTIMIZADO)
================================ */
export const updatePlayerProfile = async (req, res) => {
  const { name, avatar } = req.body;

  // 🔥 CORREÇÃO: Validar dados de entrada
  if (!name && !avatar) {
    return res.status(400).json({ 
      success: false,
      error: 'Nenhum dado fornecido para atualização.',
      code: 'NO_UPDATE_DATA'
    });
  }

  if (name && (name.length < 2 || name.length > 30)) {
    return res.status(400).json({ 
      success: false,
      error: 'O nome deve ter entre 2 e 30 caracteres.',
      code: 'INVALID_NAME_LENGTH'
    });
  }

  try {
    const updateData = {};
    if (name) updateData.PL_NAME = name.trim();
    if (avatar) updateData.PL_AVATAR = avatar;

    const updatedPlayer = await prisma.player.update({
      where: { PL_ID: req.player.PL_ID },
      data: updateData,
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_LIFE: true,
        PL_AUTH_PROVIDER: true,
        PL_Created_at: true,
      }
    });

    // 🔥 CORREÇÃO: Limpar cache após atualização
    clearPlayerCache(req.player.PL_ID);

    console.log(`✅ Perfil atualizado: ${updatedPlayer.PL_NAME} (${updatedPlayer.PL_ID})`);

    res.json({
      success: true,
      message: 'Perfil atualizado com sucesso!',
      player: formatPlayerResponse(updatedPlayer)
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);

    if (error.code === 'P2002') {
      return res.status(409).json({ 
        success: false,
        error: 'Este nome de usuário já está em uso.',
        code: 'NAME_ALREADY_EXISTS'
      });
    }

    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor.',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
};

/* ================================
        ALTERAR SENHA (OTIMIZADO)
================================ */
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ 
      success: false,
      error: 'Senha atual e nova senha são obrigatórias.',
      code: 'MISSING_PASSWORDS'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ 
      success: false,
      error: 'A nova senha deve ter pelo menos 6 caracteres.',
      code: 'WEAK_NEW_PASSWORD'
    });
  }

  if (currentPassword === newPassword) {
    return res.status(400).json({ 
      success: false,
      error: 'A nova senha deve ser diferente da atual.',
      code: 'SAME_PASSWORD'
    });
  }

  try {
    const player = await prisma.player.findUnique({
      where: { PL_ID: req.player.PL_ID },
      select: { 
        PL_PASSWORD_HASH: true,
        PL_EMAIL: true 
      }
    });

    if (!player) {
      return res.status(404).json({ 
        success: false,
        error: 'Jogador não encontrado.',
        code: 'PLAYER_NOT_FOUND'
      });
    }

    // 🔥 CORREÇÃO: Verificar se o player tem senha para alterar
    if (!player.PL_PASSWORD_HASH) {
      return res.status(400).json({ 
        success: false,
        error: 'Contas com login social não podem alterar senha aqui.',
        code: 'SOCIAL_ACCOUNT_NO_PASSWORD'
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, player.PL_PASSWORD_HASH);

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        error: 'Senha atual incorreta.',
        code: 'INVALID_CURRENT_PASSWORD'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await prisma.player.update({
      where: { PL_ID: req.player.PL_ID },
      data: { PL_PASSWORD_HASH: newPasswordHash }
    });

    // 🔥 CORREÇÃO: Limpar cache e logs de segurança
    clearPlayerCache(req.player.PL_ID);
    console.log(`🔐 Senha alterada: ${player.PL_EMAIL}`);

    res.json({ 
      success: true,
      message: 'Senha alterada com sucesso!' 
    });

  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor.',
      code: 'PASSWORD_CHANGE_ERROR'
    });
  }
};

/* ================================
        ESTATÍSTICAS DO JOGADOR (OTIMIZADO)
================================ */
export const getPlayerStats = async (req, res) => {
  try {
    const playerId = req.player.PL_ID;
    const cacheKey = `stats_${playerId}`;

    // 🔥 CORREÇÃO: Cache para estatísticas
    const cached = profileCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return res.json({
        success: true,
        message: 'Estatísticas carregadas com sucesso!',
        stats: cached.data,
        fromCache: true
      });
    }

    const stats = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_LEVEL: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LIFE: true,
        PL_Created_at: true,
        _count: {
          select: { 
            decks: true, 
            inventory: true,
          }
        }
      }
    });

    if (!stats) {
      return res.status(404).json({ 
        success: false,
        error: 'Jogador não encontrado.',
        code: 'PLAYER_NOT_FOUND'
      });
    }

    // 🔥 CORREÇÃO: Formatar estatísticas
    const formattedStats = {
      ...stats,
      totalMatches: 0, // Placeholder
      winRate: '0%',   // Placeholder
    };

    // Salvar no cache
    profileCache.set(cacheKey, {
      data: formattedStats,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: 'Estatísticas carregadas com sucesso!',
      stats: formattedStats,
      fromCache: false
    });

  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor.',
      code: 'STATS_FETCH_ERROR'
    });
  }
};

// 🔥 NOVO: Buscar perfil público de outro jogador
export const getPublicProfile = async (req, res) => {
  try {
    const { playerId } = req.params;

    const player = await prisma.player.findUnique({
      where: { PL_ID: parseInt(playerId) },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_Created_at: true,
        _count: {
          select: { decks: true }
        }
      }
    });

    if (!player) {
      return res.status(404).json({ 
        success: false,
        error: 'Jogador não encontrado.',
        code: 'PLAYER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      player: {
        ...player,
        isPublic: true
      }
    });

  } catch (error) {
    console.error('❌ Erro ao buscar perfil público:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor.',
      code: 'PUBLIC_PROFILE_ERROR'
    });
  }
};

// 🔥 NOVO: Limpar cache manualmente (para admin/debug)
export const clearCache = async (req, res) => {
  const { playerId } = req.body;
  
  if (playerId) {
    clearPlayerCache(playerId);
    res.json({ 
      success: true, 
      message: `Cache do player ${playerId} limpo com sucesso.` 
    });
  } else {
    profileCache.clear();
    res.json({ 
      success: true, 
      message: 'Todo o cache foi limpo com sucesso.' 
    });
  }
};

export default {
  registerPlayer,
  loginPlayer,
  getPlayerProfile,
  updatePlayerProfile,
  changePassword,
  getPlayerStats,
  getPublicProfile,
  clearCache
};