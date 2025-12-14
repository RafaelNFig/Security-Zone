/* eslint-env node */

/* ============================================================
   🔥 1. DOTENV — DEVE VIR ANTES DE QUALQUER OUTRO IMPORT
============================================================ */
import dotenv from "dotenv";
dotenv.config();

/* ============================================================
   🔧 2. IMPORTS GERAIS
============================================================ */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";

/* ============================================================
   🔥 3. IMPORTS DO FIREBASE E ROTAS
============================================================ */
import firebaseAdmin from "./config/firebaseAdmin.js";
import playerRoutes from "./routes/playerRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

const prisma = new PrismaClient();

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

/* ============================================================
   🛡 4. SEGURANÇA E MIDDLEWARES
============================================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? 
            process.env.CORS_ORIGIN.split(',') : 
            ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// Rate Limit
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: "Muitas requisições. Tente novamente mais tarde.",
      code: "RATE_LIMIT_EXCEEDED"
    }
  })
);

// Logs
app.use(morgan(isDevelopment ? "dev" : "combined"));

// Parsing JSON
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch {
        res.status(400).json({
          success: false,
          error: "JSON malformado",
          code: "INVALID_JSON"
        });
        throw new Error("Invalid JSON");
      }
    }
  })
);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Log simples de requisição
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ============================================================
   🃏 API PARA CARTAS DO JOGADOR
============================================================ */
app.get("/api/player/:playerId/cards", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    if (isNaN(playerId)) {
      return res.status(400).json({
        success: false,
        error: "ID do jogador inválido"
      });
    }

    // Buscar cartas do jogador
    const playerCards = await prisma.playerCard.findMany({
      where: { 
        PLAYER_PL_ID: playerId 
      },
      include: {
        card: true
      },
      orderBy: {
        card: {
          CD_NAME: 'asc'
        }
      }
    });

    // Formatar resposta
    const formattedCards = playerCards.map(pc => ({
      id: pc.card.CD_ID,
      name: pc.card.CD_NAME,
      description: pc.card.CD_DESCRIPTION,
      type: pc.card.CD_TYPE.toLowerCase(),
      cost: pc.card.CD_COST,
      life: pc.card.CD_LIFE,
      attack: pc.card.CD_ATTACK,
      defense: pc.card.CD_DEFENSE,
      img: pc.card.CD_IMAGE ? `/img/${pc.card.CD_IMAGE}` : null,
      quantity: pc.PL_CD_QUANTITY,
      maxInDeck: pc.card.CD_MAX_IN_DECK,
      maxInCollection: pc.card.CD_MAX_IN_COLLECTION
    }));

    res.json({
      success: true,
      playerId: playerId,
      cards: formattedCards,
      total: formattedCards.length
    });

  } catch (error) {
    console.error("❌ Erro ao buscar cartas:", error);
    res.status(500).json({
      success: false,
      error: "Erro ao buscar cartas do jogador",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ============================================================
   🎴 API PARA DECKS DO JOGADOR
============================================================ */

// 📋 1. LISTAR DECKS DO JOGADOR
app.get("/api/player/:playerId/decks", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ 
        success: false, 
        error: "ID de jogador inválido" 
      });
    }

    const decks = await prisma.deck.findMany({
      where: { PLAYER_PL_ID: playerId },
      include: {
        cardsInDeck: {
          include: {
            card: true
          }
        }
      },
      orderBy: { DECK_CREATED_AT: 'desc' }
    });

    // Formatar resposta
    const formattedDecks = decks.map(deck => ({
      id: deck.DECK_ID,
      name: deck.DECK_NAME,
      isActive: deck.DECK_IS_ACTIVE,
      playerId: deck.PLAYER_PL_ID,
      createdAt: deck.DECK_CREATED_AT,
      cards: deck.cardsInDeck.map(dc => ({
        id: dc.card.CD_ID,
        name: dc.card.CD_NAME,
        type: dc.card.CD_TYPE,
        img: dc.card.CD_IMAGE ? `/img/${dc.card.CD_IMAGE}` : null,
        quantity: dc.DECK_CD_QUANTITY,
        maxInDeck: dc.card.CD_MAX_IN_DECK
      })),
      totalCards: deck.cardsInDeck.reduce((sum, dc) => sum + dc.DECK_CD_QUANTITY, 0)
    }));

    return res.json({ 
      success: true, 
      decks: formattedDecks 
    });
    
  } catch (error) {
    console.error("❌ Erro ao buscar decks:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno ao buscar decks" 
    });
  }
});

// 🔍 2. BUSCAR DECK ESPECÍFICO (PARA EDIÇÃO)
app.get("/api/player/:playerId/decks/:deckId", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const deckId = parseInt(req.params.deckId);

    if (isNaN(playerId) || isNaN(deckId)) {
      return res.status(400).json({ 
        success: false, 
        error: "IDs inválidos" 
      });
    }

    const deck = await prisma.deck.findFirst({
      where: {
        DECK_ID: deckId,
        PLAYER_PL_ID: playerId
      },
      include: {
        cardsInDeck: {
          include: { card: true }
        }
      }
    });

    if (!deck) {
      return res.status(404).json({ 
        success: false, 
        error: "Deck não encontrado" 
      });
    }

    const formattedDeck = {
      id: deck.DECK_ID,
      name: deck.DECK_NAME,
      isActive: deck.DECK_IS_ACTIVE,
      playerId: deck.PLAYER_PL_ID,
      createdAt: deck.DECK_CREATED_AT,
      cards: deck.cardsInDeck.map(dc => ({
        id: dc.card.CD_ID,
        name: dc.card.CD_NAME,
        type: dc.card.CD_TYPE,
        img: dc.card.CD_IMAGE ? `/img/${dc.card.CD_IMAGE}` : null,
        quantity: dc.DECK_CD_QUANTITY,
        maxInDeck: dc.card.CD_MAX_IN_DECK
      })),
      totalCards: deck.cardsInDeck.reduce((sum, dc) => sum + dc.DECK_CD_QUANTITY, 0)
    };

    return res.json({ 
      success: true, 
      deck: formattedDeck 
    });
    
  } catch (error) {
    console.error("❌ Erro ao buscar deck:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro interno ao buscar deck" 
    });
  }
});

// ➕ 3. CRIAR NOVO DECK
app.post("/api/player/:playerId/decks", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const { name, cardIds } = req.body;

    if (isNaN(playerId)) {
      return res.status(400).json({ success: false, error: "ID inválido" });
    }

    if (!name || !Array.isArray(cardIds)) {
      return res.status(400).json({ 
        success: false, 
        error: "Nome e lista de cartas são obrigatórios" 
      });
    }

    // VALIDAÇÃO 1: Verificar se nome já existe para este jogador
    const existingDeck = await prisma.deck.findFirst({
      where: {
        PLAYER_PL_ID: playerId,
        DECK_NAME: name
      }
    });

    if (existingDeck) {
      return res.status(400).json({
        success: false,
        error: "Já existe um deck com este nome"
      });
    }

    // VALIDAÇÃO 2: Verificar se jogador já tem 10 decks (máximo)
    const deckCount = await prisma.deck.count({
      where: { PLAYER_PL_ID: playerId }
    });

    if (deckCount >= 10) {
      return res.status(400).json({
        success: false,
        error: "Limite máximo de 10 decks atingido"
      });
    }

    // VALIDAÇÃO 3: Verificar se cartas existem e jogador as possui
    const cardQuantities = {};
    cardIds.forEach(id => {
      cardQuantities[id] = (cardQuantities[id] || 0) + 1;
    });

    const uniqueCardIds = Object.keys(cardQuantities).map(id => parseInt(id));

    // Buscar informações das cartas
    const cards = await prisma.card.findMany({
      where: { CD_ID: { in: uniqueCardIds } }
    });

    // Verificar se jogador possui as cartas
    const playerCards = await prisma.playerCard.findMany({
      where: {
        PLAYER_PL_ID: playerId,
        CARDS_CD_ID: { in: uniqueCardIds }
      }
    });

    // VALIDAÇÃO 4: Verificar limites
    for (const cardId of uniqueCardIds) {
      const requestedQuantity = cardQuantities[cardId];
      const card = cards.find(c => c.CD_ID === cardId);
      const playerCard = playerCards.find(pc => pc.CARDS_CD_ID === cardId);

      // Verificar se carta existe
      if (!card) {
        return res.status(400).json({
          success: false,
          error: `Carta com ID ${cardId} não encontrada`
        });
      }

      // Verificar se jogador possui a carta
      if (!playerCard) {
        return res.status(400).json({
          success: false,
          error: `Você não possui a carta: ${card.CD_NAME}`
        });
      }

      // Verificar quantidade em inventário
      if (playerCard.PL_CD_QUANTITY < requestedQuantity) {
        return res.status(400).json({
          success: false,
          error: `Você possui apenas ${playerCard.PL_CD_QUANTITY} cópias de ${card.CD_NAME}`
        });
      }

      // Verificar limite por deck (CD_MAX_IN_DECK)
      if (requestedQuantity > card.CD_MAX_IN_DECK) {
        return res.status(400).json({
          success: false,
          error: `Máximo de ${card.CD_MAX_IN_DECK} cópias de ${card.CD_NAME} por deck`
        });
      }
    }

    // VALIDAÇÃO 5: Verificar tamanho total do deck
    const totalCards = Object.values(cardQuantities).reduce((a, b) => a + b, 0);
    
    if (totalCards < 5) {
      return res.status(400).json({
        success: false,
        error: "O deck deve ter no mínimo 5 cartas"
      });
    }

    if (totalCards > 15) {
      return res.status(400).json({
        success: false,
        error: "O deck deve ter no máximo 15 cartas"
      });
    }

    // Criar deck com transação
    const newDeck = await prisma.$transaction(async (tx) => {
      // Criar deck
      const deck = await tx.deck.create({
        data: {
          DECK_NAME: name,
          PLAYER_PL_ID: playerId,
          DECK_IS_ACTIVE: false
        }
      });

      // Adicionar cartas ao deck
      const deckCardsData = uniqueCardIds.map(cardId => ({
        DECK_ID: deck.DECK_ID,
        CARDS_CD_ID: cardId,
        DECK_CD_QUANTITY: cardQuantities[cardId]
      }));

      await tx.deckCard.createMany({
        data: deckCardsData
      });

      return deck;
    });

    return res.json({
      success: true,
      message: "Deck criado com sucesso!",
      deckId: newDeck.DECK_ID
    });

  } catch (error) {
    console.error("❌ Erro ao criar deck:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro ao criar deck" 
    });
  }
});

// ✏️ 4. ATUALIZAR DECK (EDIÇÃO)
app.put("/api/player/:playerId/decks/:deckId", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const deckId = parseInt(req.params.deckId);
    const { name, cardIds } = req.body;

    if (isNaN(playerId) || isNaN(deckId)) {
      return res.status(400).json({ 
        success: false, 
        error: "IDs inválidos" 
      });
    }

    if (!name || !Array.isArray(cardIds)) {
      return res.status(400).json({ 
        success: false, 
        error: "Nome e lista de cartas são obrigatórios" 
      });
    }

    // 1. Verificar se deck existe e pertence ao jogador
    const existingDeck = await prisma.deck.findFirst({
      where: {
        DECK_ID: deckId,
        PLAYER_PL_ID: playerId
      }
    });

    if (!existingDeck) {
      return res.status(404).json({
        success: false,
        error: "Deck não encontrado ou não pertence ao jogador"
      });
    }

    // 2. Verificar se novo nome já existe (exceto o deck atual)
    if (name !== existingDeck.DECK_NAME) {
      const duplicateName = await prisma.deck.findFirst({
        where: {
          PLAYER_PL_ID: playerId,
          DECK_NAME: name,
          NOT: { DECK_ID: deckId }
        }
      });

      if (duplicateName) {
        return res.status(400).json({
          success: false,
          error: "Já existe outro deck com este nome"
        });
      }
    }

    // 3. VALIDAÇÃO DAS CARTAS
    const cardQuantities = {};
    cardIds.forEach(id => {
      cardQuantities[id] = (cardQuantities[id] || 0) + 1;
    });

    const uniqueCardIds = Object.keys(cardQuantities).map(id => parseInt(id));

    // Verificar quantidade total
    const totalCards = Object.values(cardQuantities).reduce((a, b) => a + b, 0);
    
    if (totalCards < 5 || totalCards > 15) {
      return res.status(400).json({
        success: false,
        error: "O deck deve ter entre 5 e 15 cartas"
      });
    }

    // 4. ATUALIZAR COM TRANSAÇÃO
    const updatedDeck = await prisma.$transaction(async (tx) => {
      // Atualizar nome
      const deck = await tx.deck.update({
        where: { DECK_ID: deckId },
        data: { DECK_NAME: name }
      });

      // Remover cartas antigas
      await tx.deckCard.deleteMany({
        where: { DECK_ID: deckId }
      });

      // Adicionar novas cartas
      if (uniqueCardIds.length > 0) {
        const deckCardsData = uniqueCardIds.map(cardId => ({
          DECK_ID: deckId,
          CARDS_CD_ID: cardId,
          DECK_CD_QUANTITY: cardQuantities[cardId]
        }));

        await tx.deckCard.createMany({
          data: deckCardsData
        });
      }

      return deck;
    });

    return res.json({
      success: true,
      message: "Deck atualizado com sucesso!",
      deckId: updatedDeck.DECK_ID
    });

  } catch (error) {
    console.error("❌ Erro ao atualizar deck:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro ao atualizar deck" 
    });
  }
});

// 🔄 5. ATIVAR/DESATIVAR DECK
app.put("/api/player/:playerId/decks/:deckId/activate", async (req, res) => {
  try {
    const playerId = parseInt(req.params.playerId);
    const deckId = parseInt(req.params.deckId);

    if (isNaN(playerId) || isNaN(deckId)) {
      return res.status(400).json({ 
        success: false, 
        error: "IDs inválidos" 
      });
    }

    // Verificar se deck pertence ao jogador
    const deck = await prisma.deck.findFirst({
      where: {
        DECK_ID: deckId,
        PLAYER_PL_ID: playerId
      }
    });

    if (!deck) {
      return res.status(404).json({ 
        success: false, 
        error: "Deck não encontrado ou não pertence ao jogador" 
      });
    }

    // Se quer ativar, verificar limite de decks ativos (máximo 3)
    const { activate = true } = req.body;

    if (activate) {
      const activeDecksCount = await prisma.deck.count({
        where: {
          PLAYER_PL_ID: playerId,
          DECK_IS_ACTIVE: true
        }
      });

      if (activeDecksCount >= 3) {
        return res.status(400).json({
          success: false,
          error: "Limite máximo de 3 decks ativos atingido"
        });
      }
    }

    // Atualizar status
    const updatedDeck = await prisma.deck.update({
      where: { DECK_ID: deckId },
      data: { DECK_IS_ACTIVE: activate }
    });

    return res.json({
      success: true,
      message: activate ? "Deck ativado com sucesso!" : "Deck desativado com sucesso!",
      isActive: updatedDeck.DECK_IS_ACTIVE
    });

  } catch (error) {
    console.error("❌ Erro ao ativar deck:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Erro ao ativar deck" 
    });
  }
});

// 🗑️ 6. EXCLUIR DECK
app.delete("/api/player/:playerId/decks/:deckId", async (req, res) => {
  let playerId, deckId;
  
  try {
    playerId = parseInt(req.params.playerId);
    deckId = parseInt(req.params.deckId);

    if (isNaN(playerId) || isNaN(deckId)) {
      return res.status(400).json({ 
        success: false, 
        error: "IDs inválidos" 
      });
    }

    console.log(`🗑️ Iniciando exclusão do deck ${deckId} do player ${playerId}...`);

    // 1. Verificar se deck existe e pertence ao jogador
    const deck = await prisma.deck.findFirst({
      where: {
        DECK_ID: deckId,
        PLAYER_PL_ID: playerId
      }
    });

    if (!deck) {
      return res.status(404).json({ 
        success: false, 
        error: "Deck não encontrado ou não pertence ao jogador" 
      });
    }

    // 2. Guardar se o deck estava ativo
    const wasActive = deck.DECK_IS_ACTIVE;

    // 3. Excluir em ordem usando transação
    const result = await prisma.$transaction(async (tx) => {
      // 1. Excluir DeckCards relacionados
      const deckCardsDeleted = await tx.deckCard.deleteMany({
        where: { DECK_ID: deckId }
      });
      console.log(`✅ ${deckCardsDeleted.count} DeckCards excluídos`);

      // 2. Excluir MatchPlayers relacionados (se houver)
      const matchPlayersDeleted = await tx.matchPlayer.deleteMany({
        where: { DECK_USED_ID: deckId }
      });
      if (matchPlayersDeleted.count > 0) {
        console.log(`✅ ${matchPlayersDeleted.count} MatchPlayers excluídos`);
      }

      // 3. Atualizar contador de decks ativos se necessário
      if (wasActive) {
        await tx.player.update({
          where: { PL_ID: playerId },
          data: { 
            PL_ACTIVE_DECK_COUNT: { decrement: 1 }
          }
        });
      }

      // 4. Finalmente excluir o deck
      const deletedDeck = await tx.deck.delete({
        where: { DECK_ID: deckId }
      });

      return {
        deck: deletedDeck,
        stats: {
          deckCards: deckCardsDeleted.count,
          matchPlayers: matchPlayersDeleted.count
        }
      };
    });

    console.log(`✅ Deck "${result.deck.DECK_NAME}" excluído com sucesso!`);

    return res.json({
      success: true,
      message: "Deck excluído com sucesso!",
      deckId: result.deck.DECK_ID,
      deckName: result.deck.DECK_NAME,
      stats: {
        cardsRemoved: result.stats.deckCards,
        matchesRemoved: result.stats.matchPlayers
      }
    });

  } catch (error) {
    console.error("❌ Erro ao excluir deck:", error);
    
    // Tratamento específico para erros do Prisma
    let errorMessage = "Erro ao excluir deck";
    let statusCode = 500;
    
    if (error.code === 'P2003') {
      errorMessage = "Não foi possível excluir o deck porque existem registros relacionados que não puderam ser removidos.";
    } else if (error.code === 'P2025') {
      errorMessage = "Deck não encontrado (já pode ter sido excluído).";
      statusCode = 404;
    } else if (error.message.includes('não encontrado')) {
      errorMessage = "Deck não encontrado.";
      statusCode = 404;
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      code: error.code,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/* ============================================================
   ❤️ 5. HEALTH CHECKS
============================================================ */
app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "🚀 SecurityZone API está rodando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  })
);

app.get("/health", (req, res) =>
  res.json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      database: "Prisma / PostgreSQL",
      auth: "JWT + Firebase"
    }
  })
);

/* ============================================================
   🔥 6. ROTA DE TESTE DO FIREBASE (CORRIGIDA)
============================================================ */
app.get("/api/auth/test-firebase", async (req, res) => {
  try {
    console.log("🧪 Testando Firebase Admin...");

    if (!firebaseAdmin.isReady()) {
      return res.status(500).json({
        success: false,
        error: "Firebase Admin NÃO está inicializado.",
        projectId: process.env.FIREBASE_PROJECT_ID || null,
        envLoaded: !!process.env.FIREBASE_PROJECT_ID
      });
    }

    await firebaseAdmin.getAuth().listUsers(1);

    res.json({
      success: true,
      message: "Firebase Admin funcionando corretamente",
      projectId: process.env.FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Erro no Firebase Admin:", error);
    res.status(500).json({
      success: false,
      error: "Falha ao testar Firebase Admin",
      details: isDevelopment ? error.message : undefined
    });
  }
});

/* ============================================================
   📦 7. ROTAS PRINCIPAIS
============================================================ */
app.use("/api/player", playerRoutes);
app.use("/api/auth", authRoutes);

/* ============================================================
   ❌ 8. 404 - ROTA NÃO ENCONTRADA
============================================================ */
app.use("*", (req, res) =>
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND"
  })
);

/* ============================================================
   💥 9. MIDDLEWARE GLOBAL DE ERROS
============================================================ */
app.use((error, req, res, next) => {
  console.error("💥 Erro global:", error);

  res.status(error.status || 500).json({
    success: false,
    error: isProduction ? "Erro interno do servidor" : error.message,
    code: error.code || "INTERNAL_SERVER_ERROR",
    stack: isDevelopment ? error.stack : undefined
  });
});

/* ============================================================
   🛑 10. GRACEFUL SHUTDOWN
============================================================ */
const shutdown = (signal) => {
  console.log(`\n⚠️ Recebido ${signal}. Encerrando API...`);
  setTimeout(() => {
    console.log("✅ Encerrado com sucesso");
    process.exit(0);
  }, 800);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* ============================================================
   🚀 11. INICIAR SERVIDOR
============================================================ */
const server = app.listen(PORT, () => {
  console.log(`\n🚀 SecurityZone Server rodando em http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log("===========================================");
});

export default server;
