// rules-service/src/routes/rulesRoutes.js
import { Router } from "express";
import { resolveHandler, healthHandler } from "../controllers/rulesController.js";

const router = Router();

/**
 * Ping simples (opcional, útil em debug)
 * GET /
 */
router.get("/", (req, res) => {
  return res.json({ ok: true, service: "rules-service" });
});

/**
 * Healthcheck
 * GET /health
 */
router.get("/health", healthHandler);

/**
 * Resolve action
 * POST /resolve
 *
 * Body esperado:
 * {
 *   state: {...},
 *   action: { type, payload?, actionId?, clientVersion? }
 * }
 */
router.post("/resolve", resolveHandler);

// (Opcional) respostas mais claras para método errado
router.all("/resolve", (req, res) => {
  return res.status(405).json({
    success: false,
    newState: null,
    events: [],
    rejected: { code: "METHOD_NOT_ALLOWED", message: "Use POST em /resolve." },
  });
});

export default router;
