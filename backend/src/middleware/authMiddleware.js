// backend/src/middleware/authMiddleware.js
/* eslint-env node */
import jwt from 'jsonwebtoken';
import prisma from '../prismaClient.js';

const JWT_SECRET = process.env.JWT_SECRET || 'security-zone-secret-key';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Obtém token do header
      token = req.headers.authorization.split(' ')[1];

      // Verifica token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Busca jogador no banco (sem a senha)
      const player = await prisma.player.findUnique({
        where: { PL_ID: decoded.playerId },
        select: {
          PL_ID: true,
          PL_NAME: true,
          PL_EMAIL: true,
          PL_COINS: true,
          PL_GEMS: true,
          PL_LEVEL: true,
          PL_AVATAR: true,
        }
      });

      if (player) {
        req.player = player;
        next();
      } else {
        res.status(401).json({ error: 'Token inválido - jogador não encontrado.' });
      }

    } catch (error) {
      console.error('Erro na verificação do token:', error);
      res.status(401).json({ error: 'Token inválido.' });
    }
  } else {
    res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }
};