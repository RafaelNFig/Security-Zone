// backend/src/routes/playerRoutes.js

import { Router } from 'express';
// Certifique-se de que o playerController.js existe e tem o export registerPlayer
import { registerPlayer } from '../controllers/playerController.js'; 

const router = Router();

// Rota POST para o registro de novos jogadores
// Endpoint: POST /api/player/register
router.post('/register', registerPlayer);

// Futuramente, adicionaremos a rota de login aqui:
// router.post('/login', loginPlayer);

export default router;