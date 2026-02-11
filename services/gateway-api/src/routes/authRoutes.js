/* eslint-env node */
import { Router } from "express";

import {
  firebaseLogin,
  verifyToken,
  refreshToken,
  logout,
  linkGoogle,
  unlinkGoogle,
} from "../controllers/authController.js";

import { protect, optionalProtect } from "../middleware/authMiddleware.js";

const router = Router();

// Firebase login (público)
router.post("/firebase-login", firebaseLogin);

// ✅ Link / Unlink Google (protegido)
router.post("/link-google", protect, linkGoogle);
router.post("/unlink-google", protect, unlinkGoogle);

// Verificar token / Perfil
router.get("/verify", protect, verifyToken);
router.get("/me", protect, verifyToken);

// Refresh token / Logout
router.post("/refresh-token", protect, refreshToken);
router.post("/logout", protect, logout);

/**
 * Sessão opcional:
 * - autenticado: devolve user padronizado + resumo do player
 * - não autenticado: isAuthenticated=false
 */
router.get("/session", optionalProtect, (req, res) => {
  if (req.player) {
    return res.json({
      success: true,
      isAuthenticated: true,
      user: req.user,
      player: {
        PL_ID: req.player.PL_ID,
        PL_NAME: req.player.PL_NAME,
        PL_EMAIL: req.player.PL_EMAIL,
        PL_COINS: req.player.PL_COINS ?? 0,
        PL_GEMS: req.player.PL_GEMS ?? 0,
        PL_LEVEL: req.player.PL_LEVEL ?? 1,
        PL_AVATAR: req.player.PL_AVATAR ?? null,
        PL_LIFE: req.player.PL_LIFE ?? 100,
        PL_AUTH_PROVIDER: req.player.PL_AUTH_PROVIDER ?? null,
        PL_CREATED_AT: req.player.PL_CREATED_AT ?? null,
        PL_FIREBASE_UID: req.player.PL_FIREBASE_UID ?? null,
      },
    });
  }

  return res.json({
    success: true,
    isAuthenticated: false,
    message: "Usuário não autenticado",
  });
});

// Health check
router.get("/health", (req, res) => {
  return res.json({
    success: true,
    status: "OK",
    timestamp: new Date().toISOString(),
    service: process.env.SERVICE_NAME || "gateway-api/auth",
    version: process.env.SERVICE_VERSION || "1.0.0",
  });
});

export default router;
