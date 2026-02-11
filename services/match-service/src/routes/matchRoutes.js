// match-service/src/routes/matchRoutes.js
import express from "express";
import * as controller from "../controllers/matchController.js";

const router = express.Router();

// Garante que esse router parseia JSON mesmo se o server.js esquecer
router.use(express.json({ limit: "2mb" }));

// Health do match-service
router.get("/health", controller.health);

// Core API
router.post("/matches", controller.createMatch);
router.get("/matches/:id", controller.getMatch);
router.post("/matches/:id/actions", controller.applyAction);

/**
 * Rotas opcionais para debug local (não obrigatórias pro front)
 * Descomente só quando os métodos existirem no controller.
 */
// router.get("/matches", controller.listMatches);
// router.delete("/matches/:id", controller.deleteMatch);

export default router;
