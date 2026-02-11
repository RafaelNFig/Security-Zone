// gateway-api/src/routes/matchRoutes.js
/* eslint-env node */
import { Router } from "express";
import * as authModule from "../middleware/authMiddleware.js";
import {
  createMatch,
  getMatch,
  postAction,
  health,
} from "../controllers/matchProxyController.js";

const router = Router();

/**
 * Resolve o middleware de auth de forma tolerante a diferentes exports.
 * Preferência:
 * - default export function
 * - named export authMiddleware
 * - named export verifyToken
 * - named export authenticate
 */
function resolveAuthMiddleware(mod) {
  const candidates = [
    mod?.default,
    mod?.authMiddleware,
    mod?.verifyToken,
    mod?.authenticate,
  ];
  for (const fn of candidates) {
    if (typeof fn === "function") return fn;
  }

  // fallback: erro explícito (melhor do que falhar silenciosamente)
  return (req, res) =>
    res.status(500).json({
      success: false,
      error:
        "authMiddleware não encontrado: exporte uma função em src/middleware/authMiddleware.js",
      code: "AUTH_MIDDLEWARE_EXPORT_INVALID",
    });
}

const authMiddleware = resolveAuthMiddleware(authModule);

// (Opcional) healthcheck do match-service (pra demo / troubleshooting)
router.get("/match-service/health", authMiddleware, health);

// Matches (Front chama Gateway /api/...)
router.post("/matches", authMiddleware, createMatch);
router.get("/matches/:id", authMiddleware, getMatch);
router.post("/matches/:id/actions", authMiddleware, postAction);

export default router;
