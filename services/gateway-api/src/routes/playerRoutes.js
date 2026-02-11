// backend/src/routes/playerRoutes.js
/* eslint-env node */
import { Router } from "express";
import prisma from "../prismaClient.js";

import {
  registerPlayer,
  loginPlayer,
  getPlayerProfile,
  updatePlayerProfile,
  changePassword,
  getPlayerStats,
  getPublicProfile,
  clearCache,
} from "../controllers/playerController.js";

import { protect, requireAdmin } from "../middleware/authMiddleware.js";

const router = Router();

// ========== ROTAS PÚBLICAS ==========

/**
 * @route   POST /api/player/register
 */
router.post("/register", registerPlayer);

/**
 * @route   POST /api/player/login
 */
router.post("/login", loginPlayer);

/**
 * @route   GET /api/player/public/:playerId
 */
router.get("/public/:playerId", getPublicProfile);

/**
 * @route   GET /api/player/health
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    service: "Player Service",
    version: "1.0.0",
  });
});

// ========== ROTAS PROTEGIDAS ==========

/**
 * @route   GET /api/player/profile
 */
router.get("/profile", protect, getPlayerProfile);

/**
 * @route   PUT /api/player/profile
 */
router.put("/profile", protect, updatePlayerProfile);

/**
 * @route   PATCH /api/player/password
 */
router.patch("/password", protect, changePassword);

/**
 * @route   GET /api/player/stats
 */
router.get("/stats", protect, getPlayerStats);

/**
 * @route   GET /api/player/me
 * @desc    Dados básicos do jogador autenticado (não usa campos inexistentes)
 */
router.get("/me", protect, (req, res) => {
  return res.json({
    success: true,
    player: {
      PL_ID: req.player.PL_ID,
      PL_NAME: req.player.PL_NAME,
      PL_EMAIL: req.player.PL_EMAIL,
      PL_LEVEL: req.player.PL_LEVEL ?? 1,
      PL_AVATAR: req.player.PL_AVATAR ?? null,
      PL_COINS: req.player.PL_COINS ?? 0,
      PL_GEMS: req.player.PL_GEMS ?? 0,
      PL_LIFE: req.player.PL_LIFE ?? 100,
      PL_AUTH_PROVIDER: req.player.PL_AUTH_PROVIDER ?? null,
      PL_CREATED_AT: req.player.PL_CREATED_AT ?? null,
      PL_FIREBASE_UID: req.player.PL_FIREBASE_UID ?? null,
    },
  });
});

/**
 * @route   GET /api/player/search
 * @desc    Buscar jogadores por nome (com paginação)
 */
router.get("/search", protect, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const page = Number.parseInt(String(req.query.page || "1"), 10);
    const limit = Number.parseInt(String(req.query.limit || "10"), 10);

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Termo de busca deve ter pelo menos 2 caracteres.",
        code: "INVALID_SEARCH_TERM",
      });
    }

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 && limit <= 50 ? limit : 10;
    const skip = (safePage - 1) * safeLimit;

    const [players, total] = await Promise.all([
      prisma.player.findMany({
        where: {
          PL_NAME: { contains: q },
        },
        select: {
          PL_ID: true,
          PL_NAME: true,
          PL_LEVEL: true,
          PL_AVATAR: true,
          PL_CREATED_AT: true,
        },
        orderBy: { PL_CREATED_AT: "desc" },
        skip,
        take: safeLimit,
      }),
      prisma.player.count({
        where: { PL_NAME: { contains: q } },
      }),
    ]);

    return res.json({
      success: true,
      players,
      pagination: {
        q,
        page: safePage,
        limit: safeLimit,
        total,
        hasMore: skip + players.length < total,
      },
    });
  } catch (error) {
    console.error("❌ Erro na busca de jogadores:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno na busca.",
      code: "SEARCH_ERROR",
      details: error.message,
    });
  }
});

// ========== ROTAS ADMIN ==========

/**
 * @route   POST /api/player/admin/clear-cache
 * @desc    Limpar cache de jogadores (apenas admin)
 *
 * Obs: requireAdmin já chama protect internamente, então não precisa duplicar.
 */
router.post("/admin/clear-cache", requireAdmin, clearCache);

/**
 * @route   GET /api/player/admin/stats/:playerId
 * @desc    Obter estatísticas de qualquer jogador (apenas admin)
 */
router.get("/admin/stats/:playerId", requireAdmin, async (req, res) => {
  try {
    const playerId = Number.parseInt(req.params.playerId, 10);
    if (!Number.isFinite(playerId)) {
      return res.status(400).json({
        success: false,
        error: "playerId inválido",
        code: "INVALID_PLAYER_ID",
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
          select: { decks: true, inventory: true, matchesWon: true, matchesParticipated: true },
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

    return res.json({
      success: true,
      message: "Estatísticas admin carregadas com sucesso",
      stats: {
        ...stats,
        totalDecks: stats._count?.decks ?? 0,
        totalItems: stats._count?.inventory ?? 0,
        matchesWon: stats._count?.matchesWon ?? 0,
        matchesParticipated: stats._count?.matchesParticipated ?? 0,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao buscar stats admin:", error);
    return res.status(500).json({
      success: false,
      error: "Erro interno ao buscar estatísticas.",
      code: "ADMIN_STATS_ERROR",
      details: error.message,
    });
  }
});

export default router;
