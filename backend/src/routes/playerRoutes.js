// backend/src/routes/playerRoutes.js
/* eslint-env node */
import { Router } from 'express';
import { 
  registerPlayer, 
  loginPlayer, 
  getPlayerProfile,
  updatePlayerProfile,
  changePassword,
  getPlayerStats,
  getPublicProfile,
  clearCache
} from '../controllers/playerController.js';
import { protect, optionalProtect, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

// ========== ROTAS PÚBLICAS ==========

/**
 * @route   POST /api/player/register
 * @desc    Registrar novo jogador
 * @access  Public
 * @body    { name: string, email: string, password: string }
 * @returns { success: boolean, message: string, token: string, player: object }
 */
router.post('/register', registerPlayer);

/**
 * @route   POST /api/player/login
 * @desc    Login tradicional com email e senha
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { success: boolean, message: string, token: string, player: object }
 */
router.post('/login', loginPlayer);

/**
 * @route   GET /api/player/public/:playerId
 * @desc    Obter perfil público de um jogador
 * @access  Public
 * @params  { playerId: number }
 * @returns { success: boolean, player: object }
 */
router.get('/public/:playerId', getPublicProfile);

/**
 * @route   GET /api/player/health
 * @desc    Health check do serviço de jogadores
 * @access  Public
 * @returns { success: boolean, status: string, timestamp: string, service: string }
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Player Service',
    version: '1.0.0'
  });
});

// ========== ROTAS PROTEGIDAS ==========

/**
 * @route   GET /api/player/profile
 * @desc    Obter perfil completo do jogador autenticado
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @returns { success: boolean, message: string, player: object, fromCache?: boolean }
 */
router.get('/profile', protect, getPlayerProfile);

/**
 * @route   PUT /api/player/profile
 * @desc    Atualizar perfil do jogador
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @body    { name?: string, avatar?: string }
 * @returns { success: boolean, message: string, player: object }
 */
router.put('/profile', protect, updatePlayerProfile);

/**
 * @route   PATCH /api/player/password
 * @desc    Alterar senha do jogador
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @body    { currentPassword: string, newPassword: string }
 * @returns { success: boolean, message: string }
 */
router.patch('/password', protect, changePassword);

/**
 * @route   GET /api/player/stats
 * @desc    Obter estatísticas do jogador
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @returns { success: boolean, message: string, stats: object, fromCache?: boolean }
 */
router.get('/stats', protect, getPlayerStats);

/**
 * @route   GET /api/player/me
 * @desc    Obter dados básicos do jogador autenticado (alias para profile)
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @returns { success: boolean, player: object }
 */
router.get('/me', protect, (req, res) => {
  // Retorna apenas dados básicos do jogador autenticado
  res.json({
    success: true,
    player: {
      PL_ID: req.player.PL_ID,
      PL_NAME: req.player.PL_NAME,
      PL_EMAIL: req.player.PL_EMAIL,
      PL_LEVEL: req.player.PL_LEVEL,
      PL_AVATAR: req.player.PL_AVATAR,
      PL_RANK: req.player.PL_RANK,
      PL_COINS: req.player.PL_COINS,
      PL_GEMS: req.player.PL_GEMS
    }
  });
});

/**
 * @route   GET /api/player/search
 * @desc    Buscar jogadores por nome (com paginação)
 * @access  Private
 * @header  Authorization: Bearer <jwt-token>
 * @query   { q: string, page?: number, limit?: number }
 * @returns { success: boolean, players: array[], pagination: object }
 */
router.get('/search', protect, async (req, res) => {
  try {
    const { q, page = 1, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Termo de busca deve ter pelo menos 2 caracteres.',
        code: 'INVALID_SEARCH_TERM'
      });
    }

    // Implementar lógica de busca no banco
    const players = []; // Placeholder - implementar com Prisma
    
    res.json({
      success: true,
      players,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: players.length,
        hasMore: false // Implementar lógica real
      }
    });
  } catch (error) {
    console.error('❌ Erro na busca de jogadores:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno na busca.',
      code: 'SEARCH_ERROR'
    });
  }
});

// ========== ROTAS ADMIN ==========

/**
 * @route   POST /api/player/admin/clear-cache
 * @desc    Limpar cache de jogadores (apenas admin)
 * @access  Private/Admin
 * @header  Authorization: Bearer <jwt-token>
 * @body    { playerId?: number } // Se não fornecido, limpa todo o cache
 * @returns { success: boolean, message: string }
 */
router.post('/admin/clear-cache', protect, requireAdmin, clearCache);

/**
 * @route   GET /api/player/admin/stats/:playerId
 * @desc    Obter estatísticas de qualquer jogador (apenas admin)
 * @access  Private/Admin
 * @header  Authorization: Bearer <jwt-token>
 * @params  { playerId: number }
 * @returns { success: boolean, stats: object }
 */
router.get('/admin/stats/:playerId', protect, requireAdmin, async (req, res) => {
  try {
    const { playerId } = req.params;
    
    // Implementar lógica admin para buscar stats de qualquer jogador
    // Similar à getPlayerStats mas sem restrição de ownership
    
    res.json({
      success: true,
      message: 'Estatísticas admin carregadas com sucesso',
      stats: {} // Placeholder
    });
  } catch (error) {
    console.error('❌ Erro ao buscar stats admin:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao buscar estatísticas.',
      code: 'ADMIN_STATS_ERROR'
    });
  }
});

export default router;