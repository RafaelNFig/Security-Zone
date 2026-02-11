/* eslint-env node */

/* ============================================================
   🔥 1) DOTENV — antes de qualquer coisa que dependa de env
============================================================ */
import "dotenv/config";

/* ============================================================
   🔧 2) IMPORTS
============================================================ */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import prisma from "./prismaClient.js";
import firebaseAdmin from "./config/firebaseAdmin.js";

import playerRoutes from "./routes/playerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import internalRoutes from "./routes/internalRoutes.js";
import deckRoutes from "./routes/deckRoutes.js";
import cardsPublicRoutes from "./routes/cardsPublicRoutes.js";

/* ============================================================
   ⚙️ 3) CONFIG
============================================================ */
const app = express();
const PORT = Number(process.env.PORT || 3000);

const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const isProduction = NODE_ENV === "production";
const isDevelopment = !isProduction;

app.set("trust proxy", 1);

// ✅ Deck rules (alinhado com schema DECK_MAX_CARDS default 20)
const DEFAULT_DECK_MAX = 20;
const DEFAULT_DECK_MIN = 5;

/* ============================================================
   🛠 4) HELPERS
============================================================ */
/**
 * Normaliza imagem vinda do banco.
 * - Se já vier "/img/cards/xxx.png" => mantém
 * - Se vier "cards/xxx.png" => vira "/img/cards/xxx.png"
 * - Se vier "xxx.png" => vira "/img/cards/xxx.png" (fallback)
 */
function normalizeCardImagePath(dbValue) {
  if (!dbValue) return null;

  const raw = String(dbValue).trim();
  if (!raw) return null;

  // se vier path de filesystem (contém "/frontend/public/" ou "/public/")
  const markers = ["/frontend/public/", "/public/"];
  for (const m of markers) {
    const idx = raw.indexOf(m);
    if (idx !== -1) {
      const after = raw.slice(idx + m.length).replace(/^\/+/, ""); // ex: "img/cards/x.png"
      if (after.startsWith("img/")) return `/${after}`;
      if (after.startsWith("cards/")) return `/img/${after}`;
      return `/img/cards/${after}`;
    }
  }

  // remove qualquer ../ do caminho
  const noTraversal = raw.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");

  if (noTraversal.startsWith("/img/")) return noTraversal;

  const cleaned = noTraversal.replace(/^\/+/, "");
  if (cleaned.startsWith("img/")) return `/${cleaned}`;
  if (cleaned.startsWith("cards/")) return `/img/${cleaned}`;

  return `/img/cards/${cleaned}`;
}

/**
 * Deriva tipo do frontend (ataque/defesa/magia) a partir do JSON category (se existir)
 * ou do CD_TYPE (UNIT/SPELL).
 */
function normalizeFrontType(card) {
  const cat = card?.CD_EFFECT_JSON?.category;
  if (typeof cat === "string") {
    const v = cat.toLowerCase();
    if (v === "ataque" || v === "defesa" || v === "magia") return v;
  }
  // fallback
  const cdType = String(card?.CD_TYPE ?? "").toUpperCase();
  if (cdType === "SPELL") return "magia";
  return "ataque";
}

/* ============================================================
   🛡 5) SEGURANÇA E MIDDLEWARES
============================================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-request-id",
      "x-player-id",
      "x-firebase-uid",
    ],
  })
);

// Logs HTTP (morgan)
app.use(morgan(isDevelopment ? "dev" : "combined"));

// Rate Limit
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: "Muitas requisições. Tente novamente mais tarde.",
      code: "RATE_LIMIT_EXCEEDED",
    },
  })
);

// Parsing JSON/URLENCODED
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// JSON inválido (handler correto do express.json)
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "JSON malformado",
      code: "INVALID_JSON",
    });
  }
  return next(err);
});

// Log simples (opcional)
app.use((req, _res, next) => {
  if (isDevelopment) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

/* ============================================================
   ❤️ 6) HEALTH CHECKS
============================================================ */
app.get("/", (_req, res) =>
  res.json({
    success: true,
    message: "🚀 SecurityZone API está rodando!",
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
  })
);

app.get("/health", (_req, res) =>
  res.json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      database: "Prisma / MySQL",
      auth: "JWT + Firebase",
      matchProxy: "Gateway -> Match Service",
    },
  })
);

/* ============================================================
   🔥 7) ROTA DE TESTE DO FIREBASE
============================================================ */
app.get("/api/auth/test-firebase", async (_req, res) => {
  try {
    if (!firebaseAdmin?.isReady?.()) {
      return res.status(500).json({
        success: false,
        error: "Firebase Admin NÃO está inicializado.",
        projectId: process.env.FIREBASE_PROJECT_ID || null,
        envLoaded: !!process.env.FIREBASE_PROJECT_ID,
      });
    }

    await firebaseAdmin.getAuth().listUsers(1);

    return res.json({
      success: true,
      message: "Firebase Admin funcionando corretamente",
      projectId: process.env.FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Erro no Firebase Admin:", error);
    return res.status(500).json({
      success: false,
      error: "Falha ao testar Firebase Admin",
      details: isDevelopment ? error.message : undefined,
    });
  }
});

/* ============================================================
   📦 8) ROTAS (routers)
   - internalRoutes pode ficar fora de /api (depende do seu arquivo)
============================================================ */
app.use(internalRoutes);

// Rotas modularizadas
app.use("/api/player", playerRoutes);
app.use("/api/auth", authRoutes);

// Decks (rota dedicada)
app.use("/api/decks", deckRoutes);

// Cards públicos (LandingPage)
app.use("/api", cardsPublicRoutes);

// Gateway -> Match Service
app.use("/api", matchRoutes);

/* ============================================================
   🧱 9) ENDPOINTS LEGADOS (mantidos) — com IMG corrigido
============================================================ */

/**
 * GET /api/player/:playerId/cards
 * ✅ FIX: não prefixar "/img/" se CD_IMAGE já vem como "/img/cards/..."
 */
app.get("/api/player/:playerId/cards", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    if (!Number.isFinite(playerId)) {
      return res
        .status(400)
        .json({ success: false, error: "ID do jogador inválido" });
    }

    const playerCards = await prisma.playerCard.findMany({
      where: { PLAYER_PL_ID: playerId },
      include: { card: true },
      orderBy: { card: { CD_NAME: "asc" } },
    });

    const formattedCards = playerCards.map((pc) => ({
      id: pc.card.CD_ID,
      name: pc.card.CD_NAME,
      description: pc.card.CD_HABILITY,
      type: normalizeFrontType(pc.card), // ataque/defesa/magia
      cost: pc.card.CD_COST,
      life: pc.card.CD_LIFE ?? 0,
      attack: pc.card.CD_ATTACK ?? 0,
      defense: pc.card.CD_DEFENSE ?? 0,
      img: normalizeCardImagePath(pc.card.CD_IMAGE),
      quantity: pc.PL_CD_QUANTITY,
      maxInDeck: pc.card.CD_MAX_IN_DECK,
      maxInCollection: pc.card.CD_MAX_IN_COLLECTION,
    }));

    return res.json({
      success: true,
      playerId,
      cards: formattedCards,
      total: formattedCards.length,
    });
  } catch (error) {
    console.error("❌ Erro ao buscar cartas:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar cartas do jogador",
      details: isDevelopment ? error.message : undefined,
    });
  }
});

/**
 * GET /api/player/:playerId/decks
 */
app.get("/api/player/:playerId/decks", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    if (!Number.isFinite(playerId)) {
      return res
        .status(400)
        .json({ success: false, error: "ID de jogador inválido" });
    }

    const decks = await prisma.deck.findMany({
      where: { PLAYER_PL_ID: playerId },
      include: {
        cardsInDeck: { include: { card: true } },
      },
      orderBy: { DECK_CREATED_AT: "desc" },
    });

    const formattedDecks = decks.map((deck) => {
      const deckMax = Number.isFinite(Number(deck?.DECK_MAX_CARDS))
        ? Number(deck.DECK_MAX_CARDS)
        : DEFAULT_DECK_MAX;

      const totalCards = deck.cardsInDeck.reduce((sum, dc) => sum + dc.DECK_CD_QUANTITY, 0);

      return {
        id: deck.DECK_ID,
        name: deck.DECK_NAME,
        isActive: deck.DECK_IS_ACTIVE,
        playerId: deck.PLAYER_PL_ID,
        createdAt: deck.DECK_CREATED_AT,
        maxCards: deckMax,
        totalCards,
        isTooLarge: totalCards > deckMax,
        cards: deck.cardsInDeck.map((dc) => ({
          id: dc.card.CD_ID,
          name: dc.card.CD_NAME,
          type: String(dc.card.CD_TYPE).toLowerCase(),
          img: normalizeCardImagePath(dc.card.CD_IMAGE),
          quantity: dc.DECK_CD_QUANTITY,
          maxInDeck: dc.card.CD_MAX_IN_DECK,
        })),
      };
    });

    return res.json({ success: true, decks: formattedDecks });
  } catch (error) {
    console.error("❌ Erro ao buscar decks:", error);
    return res
      .status(500)
      .json({ success: false, error: "Erro interno ao buscar decks" });
  }
});

/**
 * GET /api/player/:playerId/decks/:deckId
 */
app.get("/api/player/:playerId/decks/:deckId", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const deckId = Number(req.params.deckId);

    if (!Number.isFinite(playerId) || !Number.isFinite(deckId)) {
      return res.status(400).json({ success: false, error: "IDs inválidos" });
    }

    const deck = await prisma.deck.findFirst({
      where: { DECK_ID: deckId, PLAYER_PL_ID: playerId },
      include: { cardsInDeck: { include: { card: true } } },
    });

    if (!deck)
      return res
        .status(404)
        .json({ success: false, error: "Deck não encontrado" });

    const deckMax = Number.isFinite(Number(deck?.DECK_MAX_CARDS))
      ? Number(deck.DECK_MAX_CARDS)
      : DEFAULT_DECK_MAX;

    const totalCards = deck.cardsInDeck.reduce((sum, dc) => sum + dc.DECK_CD_QUANTITY, 0);

    const formattedDeck = {
      id: deck.DECK_ID,
      name: deck.DECK_NAME,
      isActive: deck.DECK_IS_ACTIVE,
      playerId: deck.PLAYER_PL_ID,
      createdAt: deck.DECK_CREATED_AT,
      maxCards: deckMax,
      totalCards,
      isTooLarge: totalCards > deckMax,
      cards: deck.cardsInDeck.map((dc) => ({
        id: dc.card.CD_ID,
        name: dc.card.CD_NAME,
        type: dc.card.CD_TYPE,
        img: normalizeCardImagePath(dc.card.CD_IMAGE),
        quantity: dc.DECK_CD_QUANTITY,
        maxInDeck: dc.card.CD_MAX_IN_DECK,
      })),
    };

    return res.json({ success: true, deck: formattedDeck });
  } catch (error) {
    console.error("❌ Erro ao buscar deck:", error);
    return res
      .status(500)
      .json({ success: false, error: "Erro interno ao buscar deck" });
  }
});

/**
 * POST /api/player/:playerId/decks
 */
app.post("/api/player/:playerId/decks", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const { name, cardIds } = req.body ?? {};

    if (!Number.isFinite(playerId)) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }
    if (!name || !Array.isArray(cardIds)) {
      return res.status(400).json({
        success: false,
        error: "Nome e lista de cartas são obrigatórios",
      });
    }

    const existingDeck = await prisma.deck.findFirst({
      where: { PLAYER_PL_ID: playerId, DECK_NAME: name },
    });
    if (existingDeck) {
      return res
        .status(400)
        .json({ success: false, error: "Já existe um deck com este nome" });
    }

    const deckCount = await prisma.deck.count({
      where: { PLAYER_PL_ID: playerId },
    });
    if (deckCount >= 10) {
      return res.status(400).json({
        success: false,
        error: "Limite máximo de 10 decks atingido",
      });
    }

    const cardQuantities = {};
    for (const id of cardIds) cardQuantities[id] = (cardQuantities[id] || 0) + 1;

    const uniqueCardIds = Object.keys(cardQuantities)
      .map((id) => Number(id))
      .filter(Number.isFinite);

    const cards = await prisma.card.findMany({
      where: { CD_ID: { in: uniqueCardIds } },
    });
    const playerCards = await prisma.playerCard.findMany({
      where: { PLAYER_PL_ID: playerId, CARDS_CD_ID: { in: uniqueCardIds } },
    });

    for (const cardId of uniqueCardIds) {
      const requestedQuantity = cardQuantities[cardId];
      const card = cards.find((c) => c.CD_ID === cardId);
      const playerCard = playerCards.find((pc) => pc.CARDS_CD_ID === cardId);

      if (!card)
        return res.status(400).json({
          success: false,
          error: `Carta com ID ${cardId} não encontrada`,
        });
      if (!playerCard)
        return res.status(400).json({
          success: false,
          error: `Você não possui a carta: ${card.CD_NAME}`,
        });

      if (playerCard.PL_CD_QUANTITY < requestedQuantity) {
        return res.status(400).json({
          success: false,
          error: `Você possui apenas ${playerCard.PL_CD_QUANTITY} cópias de ${card.CD_NAME}`,
        });
      }

      if (requestedQuantity > card.CD_MAX_IN_DECK) {
        return res.status(400).json({
          success: false,
          error: `Máximo de ${card.CD_MAX_IN_DECK} cópias de ${card.CD_NAME} por deck`,
        });
      }
    }

    const totalCards = Object.values(cardQuantities).reduce((a, b) => a + b, 0);
    if (totalCards < DEFAULT_DECK_MIN)
      return res.status(400).json({
        success: false,
        error: `O deck deve ter no mínimo ${DEFAULT_DECK_MIN} cartas`,
      });

    if (totalCards > DEFAULT_DECK_MAX)
      return res.status(400).json({
        success: false,
        error: `O deck deve ter no máximo ${DEFAULT_DECK_MAX} cartas`,
      });

    const newDeck = await prisma.$transaction(async (tx) => {
      const deck = await tx.deck.create({
        data: {
          DECK_NAME: name,
          PLAYER_PL_ID: playerId,
          DECK_IS_ACTIVE: false,
          DECK_MAX_CARDS: DEFAULT_DECK_MAX,
        },
      });

      const deckCardsData = uniqueCardIds.map((cardId) => ({
        DECK_ID: deck.DECK_ID,
        CARDS_CD_ID: cardId,
        DECK_CD_QUANTITY: cardQuantities[cardId],
      }));

      await tx.deckCard.createMany({ data: deckCardsData });
      return deck;
    });

    return res.json({
      success: true,
      message: "Deck criado com sucesso!",
      deckId: newDeck.DECK_ID,
    });
  } catch (error) {
    console.error("❌ Erro ao criar deck:", error);
    return res.status(500).json({ success: false, error: "Erro ao criar deck" });
  }
});

/**
 * PUT /api/player/:playerId/decks/:deckId
 */
app.put("/api/player/:playerId/decks/:deckId", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const deckId = Number(req.params.deckId);
    const { name, cardIds } = req.body ?? {};

    if (!Number.isFinite(playerId) || !Number.isFinite(deckId)) {
      return res.status(400).json({ success: false, error: "IDs inválidos" });
    }
    if (!name || !Array.isArray(cardIds)) {
      return res.status(400).json({
        success: false,
        error: "Nome e lista de cartas são obrigatórios",
      });
    }

    const existingDeck = await prisma.deck.findFirst({
      where: { DECK_ID: deckId, PLAYER_PL_ID: playerId },
    });
    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        error: "Deck não encontrado ou não pertence ao jogador",
      });
    }

    if (name !== existingDeck.DECK_NAME) {
      const duplicateName = await prisma.deck.findFirst({
        where: {
          PLAYER_PL_ID: playerId,
          DECK_NAME: name,
          NOT: { DECK_ID: deckId },
        },
      });
      if (duplicateName)
        return res
          .status(400)
          .json({ success: false, error: "Já existe outro deck com este nome" });
    }

    const cardQuantities = {};
    for (const id of cardIds) cardQuantities[id] = (cardQuantities[id] || 0) + 1;

    const totalCards = Object.values(cardQuantities).reduce((a, b) => a + b, 0);

    const deckMax = Number.isFinite(Number(existingDeck?.DECK_MAX_CARDS))
      ? Number(existingDeck.DECK_MAX_CARDS)
      : DEFAULT_DECK_MAX;

    if (totalCards < DEFAULT_DECK_MIN || totalCards > deckMax) {
      return res.status(400).json({
        success: false,
        error: `O deck deve ter entre ${DEFAULT_DECK_MIN} e ${deckMax} cartas`,
      });
    }

    const uniqueCardIds = Object.keys(cardQuantities)
      .map((id) => Number(id))
      .filter(Number.isFinite);

    const updatedDeck = await prisma.$transaction(async (tx) => {
      const deck = await tx.deck.update({
        where: { DECK_ID: deckId },
        data: { DECK_NAME: name },
      });

      await tx.deckCard.deleteMany({ where: { DECK_ID: deckId } });

      if (uniqueCardIds.length > 0) {
        const deckCardsData = uniqueCardIds.map((cardId) => ({
          DECK_ID: deckId,
          CARDS_CD_ID: cardId,
          DECK_CD_QUANTITY: cardQuantities[cardId],
        }));

        await tx.deckCard.createMany({ data: deckCardsData });
      }

      return deck;
    });

    return res.json({
      success: true,
      message: "Deck atualizado com sucesso!",
      deckId: updatedDeck.DECK_ID,
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar deck:", error);
    return res
      .status(500)
      .json({ success: false, error: "Erro ao atualizar deck" });
  }
});

/**
 * PUT /api/player/:playerId/decks/:deckId/activate
 */
app.put("/api/player/:playerId/decks/:deckId/activate", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const deckId = Number(req.params.deckId);
    const { activate = true } = req.body ?? {};

    if (!Number.isFinite(playerId) || !Number.isFinite(deckId)) {
      return res.status(400).json({ success: false, error: "IDs inválidos" });
    }

    const deck = await prisma.deck.findFirst({
      where: { DECK_ID: deckId, PLAYER_PL_ID: playerId },
      include: { cardsInDeck: { select: { DECK_CD_QUANTITY: true } } },
    });
    if (!deck)
      return res.status(404).json({
        success: false,
        error: "Deck não encontrado ou não pertence ao jogador",
      });

    // ✅ valida limite antes de ativar
    const deckMax = Number.isFinite(Number(deck?.DECK_MAX_CARDS))
      ? Number(deck.DECK_MAX_CARDS)
      : DEFAULT_DECK_MAX;

    const totalCards = (deck.cardsInDeck || []).reduce((sum, dc) => sum + Number(dc.DECK_CD_QUANTITY || 0), 0);
    if (totalCards > deckMax) {
      return res.status(400).json({
        success: false,
        error: `Deck excede o limite: ${totalCards}/${deckMax}`,
        code: "DECK_TOO_LARGE",
      });
    }

    if (activate) {
      const activeDecksCount = await prisma.deck.count({
        where: { PLAYER_PL_ID: playerId, DECK_IS_ACTIVE: true },
      });

      if (activeDecksCount >= 3) {
        return res.status(400).json({
          success: false,
          error: "Limite máximo de 3 decks ativos atingido",
        });
      }
    }

    const updatedDeck = await prisma.deck.update({
      where: { DECK_ID: deckId },
      data: { DECK_IS_ACTIVE: Boolean(activate) },
    });

    return res.json({
      success: true,
      message: activate ? "Deck ativado com sucesso!" : "Deck desativado com sucesso!",
      isActive: updatedDeck.DECK_IS_ACTIVE,
    });
  } catch (error) {
    console.error("❌ Erro ao ativar deck:", error);
    return res
      .status(500)
      .json({ success: false, error: "Erro ao ativar deck" });
  }
});

/**
 * DELETE /api/player/:playerId/decks/:deckId
 */
app.delete("/api/player/:playerId/decks/:deckId", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const deckId = Number(req.params.deckId);

    if (!Number.isFinite(playerId) || !Number.isFinite(deckId)) {
      return res.status(400).json({ success: false, error: "IDs inválidos" });
    }

    const deck = await prisma.deck.findFirst({
      where: { DECK_ID: deckId, PLAYER_PL_ID: playerId },
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        error: "Deck não encontrado ou não pertence ao jogador",
      });
    }

    const wasActive = deck.DECK_IS_ACTIVE;

    const result = await prisma.$transaction(async (tx) => {
      const deckCardsDeleted = await tx.deckCard.deleteMany({
        where: { DECK_ID: deckId },
      });

      const matchPlayersDeleted = await tx.matchPlayer.deleteMany({
        where: { DECK_USED_ID: deckId },
      });

      if (wasActive) {
        await tx.player.update({
          where: { PL_ID: playerId },
          data: { PL_ACTIVE_DECK_COUNT: { decrement: 1 } },
        });
      }

      const deletedDeck = await tx.deck.delete({ where: { DECK_ID: deckId } });

      return {
        deck: deletedDeck,
        stats: {
          deckCards: deckCardsDeleted.count,
          matchPlayers: matchPlayersDeleted.count,
        },
      };
    });

    return res.json({
      success: true,
      message: "Deck excluído com sucesso!",
      deckId: result.deck.DECK_ID,
      deckName: result.deck.DECK_NAME,
      stats: {
        cardsRemoved: result.stats.deckCards,
        matchesRemoved: result.stats.matchPlayers,
      },
    });
  } catch (error) {
    console.error("❌ Erro ao excluir deck:", error);

    let errorMessage = "Erro ao excluir deck";
    let statusCode = 500;

    if (error?.code === "P2003") {
      errorMessage = "Não foi possível excluir o deck: existem registros relacionados.";
    } else if (error?.code === "P2025") {
      errorMessage = "Deck não encontrado (já pode ter sido excluído).";
      statusCode = 404;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      code: error?.code,
      details: isDevelopment ? error?.message : undefined,
    });
  }
});

/* ============================================================
   ❌ 10) 404
============================================================ */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND",
  });
});

/* ============================================================
   💥 11) ERRO GLOBAL
============================================================ */
app.use((error, _req, res, _next) => {
  console.error("💥 Erro global:", error);

  res.status(error?.status || 500).json({
    success: false,
    error: isProduction ? "Erro interno do servidor" : error?.message,
    code: error?.code || "INTERNAL_SERVER_ERROR",
    stack: isDevelopment ? error?.stack : undefined,
  });
});

/* ============================================================
   🚀 12) START + GRACEFUL SHUTDOWN
============================================================ */
const server = app.listen(PORT, () => {
  console.log(`\n🚀 SecurityZone Server rodando em http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${NODE_ENV}`);
  console.log("===========================================");
});

const shutdown = async (signal) => {
  console.log(`\n⚠️ Recebido ${signal}. Encerrando API...`);

  try {
    await prisma.$disconnect();
  } catch (e) {
    console.error("⚠️ Falha ao desconectar Prisma:", e?.message || e);
  }

  server.close(() => {
    console.log("✅ Encerrado com sucesso");
    process.exit(0);
  });

  setTimeout(() => process.exit(0), 1200).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;
