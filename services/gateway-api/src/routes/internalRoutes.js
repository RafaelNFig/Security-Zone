// gateway-api/src/routes/internalRoutes.js
/* eslint-env node */
import { Router } from "express";
import { getActiveDeckByPlayer } from "../controllers/internalDeckController.js";

const router = Router();

// rota interna (não expor pro front)
router.get("/internal/players/:playerId/active-deck", getActiveDeckByPlayer);

export default router;
