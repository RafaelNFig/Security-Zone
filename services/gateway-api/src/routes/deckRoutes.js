// gateway-api/src/routes/deckRoutes.js
/* eslint-env node */
import { Router } from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listMyDecks, activateDeck } from "../controllers/deckController.js";

const router = Router();

/**
 * GET /api/decks
 * Lista decks do jogador logado (inclui cardCount e DECK_MAX_CARDS)
 */
router.get("/", protect, listMyDecks);

/**
 * POST /api/decks/:deckId/activate
 * Ativa um deck e desativa os demais do mesmo player
 * (controller valida limite DECK_MAX_CARDS)
 */
router.post("/:deckId/activate", protect, activateDeck);

export default router;
