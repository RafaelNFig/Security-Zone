/* eslint-env node */
import express from 'express';

// 🔥 NOVO: Importamos as funções de rota nominalmente para evitar problemas de carregamento
import AuthController, {
  firebaseLogin,
  linkGoogleAccount,
  unlinkGoogleAccount,
  verifyToken,
  refreshToken,
  logout
} from '../controllers/authController.js';
// NOTA: O 'AuthController' (default import) é mantido para usar a função 'formatPlayerResponse' na rota /session.

// middlewares
import { protect, optionalProtect } from '../middleware/authMiddleware.js';

const router = express.Router();

// -------------------------------------------------------------------
// Rotas de Autenticação
// -------------------------------------------------------------------

// Firebase login
router.post('/firebase-login', firebaseLogin);

// Vincular Google
router.post('/link-google', protect, linkGoogleAccount);

// Desvincular Google
router.post('/unlink-google', protect, unlinkGoogleAccount);

// Verificar token
router.get('/verify', protect, verifyToken);

// Alias de /verify
router.get('/me', protect, verifyToken);

// Refresh token
router.post('/refresh-token', protect, refreshToken);

// Logout
router.post('/logout', protect, logout);

// Sessão opcional
router.get('/session', optionalProtect, (req, res) => {
  if (req.player) {
    return res.json({
      success: true,
      isAuthenticated: true,
      // Usa o método estático do Controller
      player: AuthController.formatPlayerResponse(req.player)
    });
  }

  res.json({
    success: true,
    isAuthenticated: false,
    message: 'Usuário não autenticado'
  });
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Authentication Service',
    version: '1.0.0'
  });
});

export default router;