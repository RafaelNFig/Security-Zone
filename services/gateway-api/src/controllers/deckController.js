// gateway-api/src/controllers/deckController.js
/* eslint-env node */
import prisma from "../prismaClient.js";

const DEFAULT_DECK_MAX = 20;

/**
 * GET /api/decks
 * Lista decks do jogador logado, com contagem total de cartas (somando quantidades)
 * + limite (DECK_MAX_CARDS).
 */
export async function listMyDecks(req, res) {
  try {
    const playerId = req?.player?.PL_ID;
    if (!playerId) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        code: "NO_PLAYER_IN_CONTEXT",
      });
    }

    const decks = await prisma.deck.findMany({
      where: { PLAYER_PL_ID: playerId },
      select: {
        DECK_ID: true,
        DECK_NAME: true,
        DECK_IS_ACTIVE: true,
        DECK_CREATED_AT: true,
        DECK_MAX_CARDS: true,
        cardsInDeck: {
          select: {
            DECK_CD_QUANTITY: true,
          },
        },
      },
      orderBy: [{ DECK_IS_ACTIVE: "desc" }, { DECK_CREATED_AT: "desc" }],
    });

    const mapped = decks.map((d) => {
      const cardCount = (d.cardsInDeck || []).reduce((acc, row) => {
        const qty = Number(row?.DECK_CD_QUANTITY ?? 0);
        return acc + (Number.isFinite(qty) && qty > 0 ? qty : 0);
      }, 0);

      const maxCards = Number.isFinite(Number(d.DECK_MAX_CARDS)) ? Number(d.DECK_MAX_CARDS) : DEFAULT_DECK_MAX;

      return {
        DECK_ID: d.DECK_ID,
        DECK_NAME: d.DECK_NAME,
        DECK_IS_ACTIVE: d.DECK_IS_ACTIVE,
        DECK_CREATED_AT: d.DECK_CREATED_AT,
        DECK_MAX_CARDS: maxCards,
        cardCount,
        isComplete: cardCount >= maxCards,
      };
    });

    return res.json({
      success: true,
      playerId,
      decks: mapped,
    });
  } catch (error) {
    console.error("❌ listMyDecks error:", error);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      code: "LIST_DECKS_ERROR",
      details: error?.message,
    });
  }
}

/**
 * POST /api/decks/:deckId/activate
 * Ativa um deck do jogador logado e desativa os demais.
 * ✅ Valida se o deck respeita o limite total (<= DECK_MAX_CARDS).
 */
export async function activateDeck(req, res) {
  try {
    const playerId = req?.player?.PL_ID;
    if (!playerId) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        code: "NO_PLAYER_IN_CONTEXT",
      });
    }

    const deckId = Number.parseInt(req.params.deckId, 10);
    if (!Number.isFinite(deckId) || deckId <= 0) {
      return res.status(400).json({
        success: false,
        error: "INVALID_DECK_ID",
        code: "INVALID_DECK_ID",
      });
    }

    // Confirma que o deck pertence ao player logado + pega limite + total atual
    const deck = await prisma.deck.findFirst({
      where: { DECK_ID: deckId, PLAYER_PL_ID: playerId },
      select: {
        DECK_ID: true,
        DECK_NAME: true,
        DECK_IS_ACTIVE: true,
        DECK_MAX_CARDS: true,
        cardsInDeck: { select: { DECK_CD_QUANTITY: true } },
      },
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        error: "DECK_NOT_FOUND",
        code: "DECK_NOT_FOUND",
      });
    }

    const cardCount = (deck.cardsInDeck || []).reduce((acc, row) => {
      const qty = Number(row?.DECK_CD_QUANTITY ?? 0);
      return acc + (Number.isFinite(qty) && qty > 0 ? qty : 0);
    }, 0);

    const maxCards = Number.isFinite(Number(deck.DECK_MAX_CARDS)) ? Number(deck.DECK_MAX_CARDS) : DEFAULT_DECK_MAX;

    if (cardCount > maxCards) {
      return res.status(400).json({
        success: false,
        error: "DECK_TOO_LARGE",
        code: "DECK_TOO_LARGE",
        details: `Deck excede o limite: ${cardCount}/${maxCards}`,
        meta: { cardCount, maxCards },
      });
    }

    // Desativa todos e ativa o escolhido (transação)
    await prisma.$transaction([
      prisma.deck.updateMany({
        where: { PLAYER_PL_ID: playerId, DECK_IS_ACTIVE: true },
        data: { DECK_IS_ACTIVE: false },
      }),
      prisma.deck.update({
        where: { DECK_ID: deckId },
        data: { DECK_IS_ACTIVE: true },
      }),
    ]);

    return res.json({
      success: true,
      message: "Deck ativado com sucesso",
      activeDeck: {
        DECK_ID: deck.DECK_ID,
        DECK_NAME: deck.DECK_NAME,
        DECK_IS_ACTIVE: true,
        DECK_MAX_CARDS: maxCards,
        cardCount,
      },
    });
  } catch (error) {
    console.error("❌ activateDeck error:", error);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      code: "ACTIVATE_DECK_ERROR",
      details: error?.message,
    });
  }
}
