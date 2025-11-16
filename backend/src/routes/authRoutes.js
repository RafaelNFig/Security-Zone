// backend/src/routes/authRoutes.js
/* eslint-env node */
import express from 'express';
import { AuthController } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   POST /api/auth/firebase-login
 * @desc    Login com Firebase Authentication
 * @access  Public
 * @body    { firebaseToken: string }
 */
router.post('/firebase-login', AuthController.firebaseLogin);

/**
 * @route   POST /api/auth/link-google
 * @desc    Vincular conta Google a um perfil existente
 * @access  Private (requer autenticação JWT)
 * @body    { firebaseToken: string }
 * @header  Authorization: Bearer <jwt-token>
 */
router.post('/link-google', protect, AuthController.linkGoogleAccount);

/**
 * @route   POST /api/auth/unlink-google
 * @desc    Desvincular conta Google do perfil
 * @access  Private (requer autenticação JWT)
 * @header  Authorization: Bearer <jwt-token>
 */
router.post('/unlink-google', protect, AuthController.unlinkGoogleAccount);

/**
 * @route   GET /api/auth/verify
 * @desc    Verificar token JWT e retornar dados do jogador
 * @access  Private (requer autenticação JWT)
 * @header  Authorization: Bearer <jwt-token>
 */
router.get('/verify', protect, AuthController.verifyToken);

/**
 * @route   GET /api/auth/me
 * @desc    Retornar dados do jogador autenticado (alias para verify)
 * @access  Private (requer autenticação JWT)
 * @header  Authorization: Bearer <jwt-token>
 */
router.get('/me', protect, AuthController.verifyToken);

export default router;