//src/controllers/playerController.js

/* eslint-env node */
import prisma from "../prismaClient.js";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwtUtils.js";
import { provisionNewPlayer } from "../services/newPlayerProvisioningService.js";

const saltRounds = 10;

// 🔥 Cache simples em memória para evitar queries repetidas
const profileCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// ------------------------
// Utils
// ------------------------
const clone = (v) => (globalThis.structuredClone ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const normalizeName = (name) => String(name || "").trim().replace(/\s+/g, " ").slice(0, 45); // PL_NAME VarChar(45)

const ensureUniqueUsername = async (baseName) => {
  let base = normalizeName(baseName || "Player");
  if (!base) base = "Player";

  let candidate = base;

  for (let i = 1; i <= 50; i += 1) {
    const exists = await prisma.player.findUnique({
      where: { PL_NAME: candidate },
      select: { PL_ID: true },
    });

    if (!exists) return candidate;

    const suffix = String(i);
    candidate = `${base}${suffix}`;
    if (candidate.length > 45) {
      candidate = candidate.slice(0, 45 - suffix.length) + suffix;
    }
  }

  const tail = Date.now().toString().slice(-4);
  let fallback = `${base}${tail}`;
  if (fallback.length > 45) fallback = fallback.slice(0, 45 - tail.length) + tail;
  return fallback;
};

// 🔥 Função utilitária para formatar resposta do player
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
    PL_CREATED_AT: player.PL_CREATED_AT,
    PL_FIREBASE_UID: player.PL_FIREBASE_UID ?? null,
    isActive: true,
    hasPassword: !!(player.PL_PASSWORD_HASH && player.PL_PASSWORD_HASH !== "google-auth-no-password"),
  };
};

// 🔥 Função para limpar cache do player
const clearPlayerCache = (playerId) => {
  profileCache.delete(`player_${playerId}`);
  profileCache.delete(`stats_${playerId}`);
};

// Campos padrão do player pra evitar “Unknown field”
const playerSelectBasic = {
  PL_ID: true,
  PL_NAME: true,
  PL_EMAIL: true,
  PL_PASSWORD_HASH: true,
  PL_COINS: true,
  PL_GEMS: true,
  PL_LEVEL: true,
  PL_AVATAR: true,
  PL_LIFE: true,
  PL_AUTH_PROVIDER: true,
  PL_CREATED_AT: true,
  PL_FIREBASE_UID: true,
};

// ================================
// REGISTRAR NOVO JOGADOR
// ================================
export const registerPlayer = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "Todos os campos (name, email, password) são obrigatórios.",
      code: "MISSING_FIELDS",
    });
  }

  if (String(password).length < 6) {
    return res.status(400).json({
      success: false,
      error: "A senha deve ter pelo menos 6 caracteres.",
      code: "WEAK_PASSWORD",
    });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail.includes("@")) {
    return res.status(400).json({
      success: false,
      error: "E-mail inválido.",
      code: "INVALID_EMAIL",
    });
  }

  try {
    // email único
    const existingPlayer = await prisma.player.findUnique({
      where: { PL_EMAIL: normalizedEmail },
      select: { PL_ID: true },
    });

    if (existingPlayer) {
      return res.status(409).json({
        success: false,
        error: "Este e-mail já está em uso.",
        code: "EMAIL_ALREADY_EXISTS",
      });
    }

    // name único (PL_NAME é @unique)
    const baseName = normalizeName(name);
    const uniqueName = await ensureUniqueUsername(baseName);

    const passwordHash = await bcrypt.hash(String(password), saltRounds);

    const newPlayer = await prisma.player.create({
      data: {
        PL_NAME: uniqueName,
        PL_EMAIL: normalizedEmail,
        PL_PASSWORD_HASH: passwordHash,
        PL_COINS: 0,
        PL_GEMS: 0,
        PL_LEVEL: 1,
        PL_LIFE: 100,
      },
      select: playerSelectBasic,
    });

    const token = generateToken(newPlayer);
    const playerResponse = formatPlayerResponse(newPlayer);

    console.log(`✅ Novo jogador registrado: ${newPlayer.PL_NAME} (${newPlayer.PL_ID})`);

    // Provisiona inventário + decks iniciais (fire-and-forget para não atrasar resposta)
    provisionNewPlayer(newPlayer.PL_ID).catch((err) => {
      console.error(`❌ [Provisioning] Falha ao provisionar player ${newPlayer.PL_ID}:`, err);
    });

    return res.status(201).json({
      success: true,
      message: "Jogador registrado com sucesso!",
      player: playerResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Erro ao registrar jogador:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "O nome de usuário ou e-mail já está em uso.",
        code: "DUPLICATE_ENTRY",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor durante o registro.",
      code: "REGISTRATION_ERROR",
    });
  }
};

// ================================
// LOGIN TRADICIONAL
// ================================
export const loginPlayer = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "E-mail e senha são obrigatórios.",
      code: "MISSING_CREDENTIALS",
    });
  }

  try {
    const normalizedEmail = normalizeEmail(email);

    const player = await prisma.player.findUnique({
      where: { PL_EMAIL: normalizedEmail },
      select: playerSelectBasic,
    });

    if (!player) {
      return res.status(401).json({
        success: false,
        error: "E-mail ou senha inválidos.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // conta social não tem senha “real”
    if (!player.PL_PASSWORD_HASH || player.PL_PASSWORD_HASH === "google-auth-no-password") {
      return res.status(401).json({
        success: false,
        error: "Esta conta usa login social. Use Google para entrar.",
        code: "SOCIAL_ACCOUNT",
      });
    }

    const passwordMatch = await bcrypt.compare(String(password), player.PL_PASSWORD_HASH);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: "E-mail ou senha inválidos.",
        code: "INVALID_CREDENTIALS",
      });
    }

    const token = generateToken(player);
    const playerResponse = formatPlayerResponse(player);

    clearPlayerCache(player.PL_ID);

    console.log(`✅ Login realizado: ${player.PL_NAME} (${player.PL_ID})`);

    return res.status(200).json({
      success: true,
      message: "Login realizado com sucesso!",
      player: playerResponse,
      token,
    });
  } catch (error) {
    console.error("❌ Erro ao fazer login:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor durante o login.",
      code: "LOGIN_ERROR",
    });
  }
};

// ================================
// PERFIL DO JOGADOR (COM CACHE)
// ================================
export const getPlayerProfile = async (req, res) => {
  try {
    const playerId = req.player.PL_ID;
    console.log("🔐 [Backend] Buscando perfil para player ID:", playerId);

    const cacheKey = `player_${playerId}`;
    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        message: "Perfil carregado com sucesso!",
        player: cached.data,
        fromCache: true,
      });
    }

    const player = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: {
        ...playerSelectBasic,
        decks: {
          select: {
            DECK_ID: true,
            DECK_NAME: true,
            DECK_CREATED_AT: true,
            DECK_IS_ACTIVE: true,
          },
          orderBy: { DECK_CREATED_AT: "desc" },
          take: 20,
        },
        inventory: {
          select: {
            CARDS_CD_ID: true,
            PL_CD_QUANTITY: true,
          },
          take: 200,
        },
        _count: {
          select: {
            decks: true,
            inventory: true,
          },
        },
      },
    });

    if (!player) {
      console.log("❌ [Backend] Player não encontrado:", playerId);
      return res.status(404).json({
        success: false,
        error: "Jogador não encontrado.",
        code: "PLAYER_NOT_FOUND",
      });
    }

    const formatted = {
      ...formatPlayerResponse(player),
      decks: player.decks || [],
      inventory: player.inventory || [],
      stats: {
        totalDecks: player._count?.decks ?? 0,
        totalItems: player._count?.inventory ?? 0,
      },
    };

    profileCache.set(cacheKey, { data: formatted, timestamp: Date.now() });

    return res.json({
      success: true,
      message: "Perfil carregado com sucesso!",
      player: formatted,
      fromCache: false,
    });
  } catch (error) {
    console.error("💥 [Backend] Erro ao buscar perfil:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor.",
      code: "PROFILE_FETCH_ERROR",
      details: error.message,
    });
  }
};

// ================================
// EDITAR PERFIL
// ================================
export const updatePlayerProfile = async (req, res) => {
  // ✅ agora aceita email + avatar pode ser null/"" (remover)
  const { name, email, avatar } = req.body || {};

  const hasName = typeof name !== "undefined";
  const hasEmail = typeof email !== "undefined";
  const hasAvatar = typeof avatar !== "undefined";

  if (!hasName && !hasEmail && !hasAvatar) {
    return res.status(400).json({
      success: false,
      error: "Nenhum dado fornecido para atualização.",
      code: "NO_UPDATE_DATA",
    });
  }

  if (hasName) {
    const n = String(name || "").trim();
    if (!n || n.length < 2 || n.length > 45) {
      return res.status(400).json({
        success: false,
        error: "O nome deve ter entre 2 e 45 caracteres.",
        code: "INVALID_NAME_LENGTH",
      });
    }
  }

  if (hasEmail) {
    const e = normalizeEmail(email);
    if (!e || !e.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "E-mail inválido.",
        code: "INVALID_EMAIL",
      });
    }
  }

  try {
    const playerId = req.player.PL_ID;

    const updateData = {};

    if (hasName) updateData.PL_NAME = normalizeName(name);
    if (hasEmail) updateData.PL_EMAIL = normalizeEmail(email);

    // avatar: permite limpar (null/"" => null)
    if (hasAvatar) {
      const a = avatar === null ? null : String(avatar || "").trim();
      updateData.PL_AVATAR = a ? a : null;
    }

    // ✅ Se trocar nome, garante unique
    if (updateData.PL_NAME) {
      const exists = await prisma.player.findUnique({
        where: { PL_NAME: updateData.PL_NAME },
        select: { PL_ID: true },
      });

      if (exists && exists.PL_ID !== playerId) {
        return res.status(409).json({
          success: false,
          error: "Este nome de usuário já está em uso.",
          code: "NAME_ALREADY_EXISTS",
        });
      }
    }

    // ✅ Se trocar email, garante unique
    if (updateData.PL_EMAIL) {
      const existsEmail = await prisma.player.findUnique({
        where: { PL_EMAIL: updateData.PL_EMAIL },
        select: { PL_ID: true },
      });

      if (existsEmail && existsEmail.PL_ID !== playerId) {
        return res.status(409).json({
          success: false,
          error: "Este e-mail já está em uso.",
          code: "EMAIL_ALREADY_EXISTS",
        });
      }
    }

    // ✅ evita update vazio (ex: client mandou tudo undefined)
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nenhum dado fornecido para atualização.",
        code: "NO_UPDATE_DATA",
      });
    }

    const updatedPlayer = await prisma.player.update({
      where: { PL_ID: playerId },
      data: updateData,
      select: playerSelectBasic,
    });

    clearPlayerCache(playerId);

    console.log(`✅ Perfil atualizado: ${updatedPlayer.PL_NAME} (${updatedPlayer.PL_ID})`);

    return res.json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      player: formatPlayerResponse(updatedPlayer),
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar perfil:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Registro duplicado (nome/email).",
        code: "DUPLICATE_ENTRY",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor.",
      code: "PROFILE_UPDATE_ERROR",
      details: error.message,
    });
  }
};

// ================================
// ALTERAR SENHA
// ================================
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({
      success: false,
      error: "A nova senha é obrigatória.",
      code: "MISSING_NEW_PASSWORD",
    });
  }

  if (String(newPassword).length < 6) {
    return res.status(400).json({
      success: false,
      error: "A nova senha deve ter pelo menos 6 caracteres.",
      code: "WEAK_NEW_PASSWORD",
    });
  }

  try {
    const playerId = req.player.PL_ID;

    const player = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: { PL_PASSWORD_HASH: true, PL_EMAIL: true },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Jogador não encontrado.",
        code: "PLAYER_NOT_FOUND",
      });
    }

    const hasRealPassword =
      !!player.PL_PASSWORD_HASH && player.PL_PASSWORD_HASH !== "google-auth-no-password";

    // ✅ Conta Google sem senha: permite DEFINIR senha (sem currentPassword)
    if (!hasRealPassword) {
      const newPasswordHash = await bcrypt.hash(String(newPassword), saltRounds);

      await prisma.player.update({
        where: { PL_ID: playerId },
        data: { PL_PASSWORD_HASH: newPasswordHash },
      });

      clearPlayerCache(playerId);
      console.log(`🔐 Senha definida (social->local): ${player.PL_EMAIL}`);

      return res.json({
        success: true,
        message: "Senha definida com sucesso!",
      });
    }

    // ✅ Conta com senha: exige currentPassword
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: "Senha atual e nova senha são obrigatórias.",
        code: "MISSING_PASSWORDS",
      });
    }

    if (String(currentPassword) === String(newPassword)) {
      return res.status(400).json({
        success: false,
        error: "A nova senha deve ser diferente da atual.",
        code: "SAME_PASSWORD",
      });
    }

    const isPasswordValid = await bcrypt.compare(String(currentPassword), player.PL_PASSWORD_HASH);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Senha atual incorreta.",
        code: "INVALID_CURRENT_PASSWORD",
      });
    }

    const newPasswordHash = await bcrypt.hash(String(newPassword), saltRounds);

    await prisma.player.update({
      where: { PL_ID: playerId },
      data: { PL_PASSWORD_HASH: newPasswordHash },
    });

    clearPlayerCache(playerId);
    console.log(`🔐 Senha alterada: ${player.PL_EMAIL}`);

    return res.json({
      success: true,
      message: "Senha alterada com sucesso!",
    });
  } catch (error) {
    console.error("❌ Erro ao alterar senha:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor.",
      code: "PASSWORD_CHANGE_ERROR",
      details: error.message,
    });
  }
};

// ================================
// ESTATÍSTICAS DO JOGADOR (COM CACHE)
// ================================
export const getPlayerStats = async (req, res) => {
  try {
    const playerId = req.player.PL_ID;
    const cacheKey = `stats_${playerId}`;

    const cached = profileCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({
        success: true,
        message: "Estatísticas carregadas com sucesso!",
        stats: cached.data,
        fromCache: true,
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
        PL_CREATED_AT: true,
        _count: {
          select: {
            decks: true,
            inventory: true,
          },
        },
      },
    });

    if (!stats) {
      return res.status(404).json({
        success: false,
        error: "Jogador não encontrado.",
        code: "PLAYER_NOT_FOUND",
      });
    }

    const formattedStats = {
      ...stats,
      totalDecks: stats._count?.decks ?? 0,
      totalItems: stats._count?.inventory ?? 0,
      totalMatches: 0,
      winRate: "0%",
    };

    profileCache.set(cacheKey, { data: formattedStats, timestamp: Date.now() });

    return res.json({
      success: true,
      message: "Estatísticas carregadas com sucesso!",
      stats: formattedStats,
      fromCache: false,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar estatísticas:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor.",
      code: "STATS_FETCH_ERROR",
      details: error.message,
    });
  }
};

// ================================
// Perfil público de outro jogador
// ================================
export const getPublicProfile = async (req, res) => {
  try {
    const { playerId } = req.params;

    const id = Number.parseInt(playerId, 10);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: "ID inválido.", code: "INVALID_PLAYER_ID" });
    }

    const player = await prisma.player.findUnique({
      where: { PL_ID: id },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_LEVEL: true,
        PL_AVATAR: true,
        PL_CREATED_AT: true,
        _count: { select: { decks: true } },
      },
    });

    if (!player) {
      return res.status(404).json({
        success: false,
        error: "Jogador não encontrado.",
        code: "PLAYER_NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      player: {
        ...player,
        totalDecks: player._count?.decks ?? 0,
        isPublic: true,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar perfil público:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno do servidor.",
      code: "PUBLIC_PROFILE_ERROR",
      details: error.message,
    });
  }
};

// ================================
// Limpar cache manualmente (admin/debug)
// ================================
export const clearCache = async (req, res) => {
  const { playerId } = req.body;

  if (playerId) {
    clearPlayerCache(playerId);
    return res.json({
      success: true,
      message: `Cache do player ${playerId} limpo com sucesso.`,
    });
  }

  profileCache.clear();
  return res.json({
    success: true,
    message: "Todo o cache foi limpo com sucesso.",
  });
};

export default {
  registerPlayer,
  loginPlayer,
  getPlayerProfile,
  updatePlayerProfile,
  changePassword,
  getPlayerStats,
  getPublicProfile,
  clearCache,
};
