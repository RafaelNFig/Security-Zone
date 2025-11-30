/* eslint-env node */
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

// 🔐 Secret do JWT (com fallback seguro)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'security-zone-super-secret-key-2024-change-in-production';

/* ------------------------------------------------------
 * Função utilitária: extrai token do request
 * ------------------------------------------------------ */
function extractToken(req) {
  const auth = req.headers.authorization;

  if (auth?.startsWith('Bearer ')) {
    return auth.split(' ')[1].trim();
  }

  return (req.headers['x-access-token'] || req.query.token || '').trim();
}

/* ------------------------------------------------------
 * Função utilitária: carrega jogador do banco
 * ------------------------------------------------------ */
async function loadPlayer(playerId) {
  return prisma.player.findUnique({
    where: { PL_ID: playerId },
    select: {
      PL_ID: true,
      PL_NAME: true,
      PL_EMAIL: true,
      PL_COINS: true,
      PL_GEMS: true,
      PL_LEVEL: true,
      PL_AVATAR: true,
      PL_LIFE: true,
      PL_AUTH_PROVIDER: true,
      PL_Created_at: true,
      PL_PASSWORD_HASH: true,
      PL_FIREBASE_UID: true
    }
  });
}

/* ------------------------------------------------------
 * 🔒 Middleware obrigatório (bloqueia sem token)
 * ------------------------------------------------------ */
export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação não fornecido.',
        code: 'NO_TOKEN'
      });
    }

    // Verificar token JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      const map = {
        TokenExpiredError: ['Token expirado. Faça login novamente.', 'TOKEN_EXPIRED'],
        JsonWebTokenError: ['Token inválido ou adulterado.', 'INVALID_SIGNATURE'],
        NotBeforeError: ['Token ainda não está válido.', 'TOKEN_NOT_ACTIVE']
      };

      const [msg, code] = map[err.name] || ['Token inválido.', 'INVALID_TOKEN'];

      return res.status(401).json({ success: false, error: msg, code });
    }

    const playerId =
      decoded.playerId || decoded.PL_ID || decoded.id || decoded.userId;

    if (!playerId) {
      return res.status(401).json({
        success: false,
        error: 'Token não contém ID do jogador.',
        code: 'MISSING_PLAYER_ID'
      });
    }

    const player = await loadPlayer(playerId);

    if (!player) {
      return res.status(401).json({
        success: false,
        error: 'Jogador não encontrado. Token possivelmente desatualizado.',
        code: 'PLAYER_NOT_FOUND'
      });
    }

    // Anexar player ao request
    req.player = {
      ...player,
      _tokenInfo: {
        issuedAt: decoded.iat ? new Date(decoded.iat * 1000) : null,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
      }
    };

    console.log(`🔐 Auth OK: ${player.PL_NAME} (${player.PL_ID})`);
    next();
  } catch (error) {
    console.error('🔐 Erro inesperado no authMiddleware:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno no servidor de autenticação.',
      code: 'AUTH_SERVER_ERROR'
    });
  }
};

/* ------------------------------------------------------
 * 🟡 Middleware opcional (não bloqueia sem token)
 * ------------------------------------------------------ */
export const optionalProtect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.player = null;
      return next();
    }

    // Tenta verificar o token sem lidar com todos os erros de expiração/assinatura
    const decoded = jwt.decode(token); 
    
    if (!decoded) {
      req.player = null;
      return next();
    }
    
    // Tentativa de verificação mais completa para evitar tokens falsos
    try {
        jwt.verify(token, JWT_SECRET);
    } catch (e) {
        // Se a verificação falhar, apenas continua sem o jogador (opcional)
        req.player = null;
        return next();
    }

    const playerId =
      decoded.playerId || decoded.PL_ID || decoded.id || decoded.userId;

    if (playerId) {
      req.player = await loadPlayer(playerId);
    } else {
      req.player = null;
    }

    next();
  } catch (error) {
    req.player = null;
    next();
  }
};

/* ------------------------------------------------------
 * 🔑 Middleware para admins
 * ------------------------------------------------------ */
export const requireAdmin = async (req, res, next) => {
  try {
    // Usamos a função protect diretamente aqui
    await protect(req, res, async () => {
      // Verifica se a requisição foi autenticada (req.player existe)
      if (!req.player) {
        return res.status(401).json({
            success: false, 
            error: 'Não autenticado para checagem de admin.',
            code: 'ADMIN_AUTH_REQUIRED'
        });
      }

      const isAdmin =
        req.player.PL_ROLE === 'ADMIN' ||
        req.player.PL_EMAIL === 'admin@securityzone.com';

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Acesso restrito. Permissão de administrador necessária.',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      next();
    });
  } catch (err) {
    console.error('🔐 Erro no middleware requireAdmin:', err);
    res.status(500).json({
      success: false,
      error: 'Erro interno na verificação de permissões.',
      code: 'PERMISSION_CHECK_ERROR'
    });
  }
};

export default {
  protect,
  optionalProtect,
  requireAdmin,
  // NOTA: generateToken e validateToken foram removidos daqui
};