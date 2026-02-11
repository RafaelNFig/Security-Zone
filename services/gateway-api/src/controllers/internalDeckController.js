// gateway-api/src/controllers/internalDeckController.js
/* eslint-env node */
import prisma from "../prismaClient.js";

const DEFAULT_DECK_MAX = 20;

export async function getActiveDeckByPlayer(req, res) {
  try {
    const playerId = Number(req.params.playerId);
    if (!Number.isFinite(playerId) || playerId <= 0) {
      return res.status(400).json({ success: false, error: "INVALID_PLAYER_ID" });
    }

    const deck = await prisma.deck.findFirst({
      where: { PLAYER_PL_ID: playerId, DECK_IS_ACTIVE: true },
      select: {
        DECK_ID: true,
        DECK_NAME: true,
        DECK_MAX_CARDS: true,
        cardsInDeck: {
          select: {
            DECK_CD_QUANTITY: true,
            card: {
              select: {
                CD_ID: true,
                CD_NAME: true,
                CD_HABILITY: true,
                CD_TYPE: true,
                CD_COST: true,
                CD_LIFE: true,
                CD_ATTACK: true,
                CD_DEFENSE: true,
                CD_EFFECT_JSON: true,
                CD_HAS_ABILITY: true,
                CD_ABILITY_COST: true,
                CD_ABILITY_LIMIT_JSON: true,
                CD_IMAGE: true,
                CD_MAX_IN_DECK: true,
              },
            },
          },
        },
      },
    });

    if (!deck) {
      return res.status(404).json({
        success: false,
        error: "ACTIVE_DECK_NOT_FOUND",
        playerId,
      });
    }

    const deckMax = Number.isFinite(Number(deck.DECK_MAX_CARDS)) ? Number(deck.DECK_MAX_CARDS) : DEFAULT_DECK_MAX;

    // “Explode” quantidade, mas respeita limite total do deck
    const cards = [];
    for (const row of deck.cardsInDeck || []) {
      if (!row?.card) continue;

      const qtyRaw = Number(row.DECK_CD_QUANTITY ?? 1);
      const qty = Number.isFinite(qtyRaw) ? Math.max(1, qtyRaw) : 1;

      for (let i = 0; i < qty; i++) {
        if (cards.length >= deckMax) break;
        cards.push(row.card);
      }

      if (cards.length >= deckMax) break;
    }

    // se o deck no banco está acima do limite, não deixa passar silencioso
    const dbCount = (deck.cardsInDeck || []).reduce((acc, r) => {
      const q = Number(r?.DECK_CD_QUANTITY ?? 0);
      return acc + (Number.isFinite(q) && q > 0 ? q : 0);
    }, 0);

    if (dbCount > deckMax) {
      return res.status(409).json({
        success: false,
        error: "DECK_TOO_LARGE",
        playerId,
        details: `Deck excede o limite: ${dbCount}/${deckMax}`,
        meta: { cardCount: dbCount, maxCards: deckMax },
      });
    }

    return res.json({
      success: true,
      playerId,
      deck: { id: deck.DECK_ID, name: deck.DECK_NAME, maxCards: deckMax },
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("❌ getActiveDeckByPlayer error:", error);
    return res.status(500).json({
      success: false,
      error: "INTERNAL_ERROR",
      code: "GET_ACTIVE_DECK_ERROR",
      details: error?.message,
    });
  }
}
