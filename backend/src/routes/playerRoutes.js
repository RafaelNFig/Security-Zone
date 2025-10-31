// backend/src/routes/playerRoutes.js

import { Router } from 'express';
import { 
  registerPlayer, 
  loginPlayer, 
  getPlayerProfile,
  updatePlayerProfile,
  changePassword,
  getPlayerStats
} from '../controllers/playerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = Router();

// Rotas públicas
router.post('/register', registerPlayer);
router.post('/login', loginPlayer);

// Rotas protegidas (requerem token JWT)
router.get('/profile', protect, getPlayerProfile);
router.put('/profile', protect, updatePlayerProfile);
router.put('/change-password', protect, changePassword);
router.get('/stats', protect, getPlayerStats);

export default router;