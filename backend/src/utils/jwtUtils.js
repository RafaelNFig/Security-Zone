/* eslint-env node */
import jwt from 'jsonwebtoken';

// 🔐 Secret do JWT (importado ou definido com fallback seguro)
const JWT_SECRET =
  process.env.JWT_SECRET ||
  'security-zone-super-secret-key-2024-change-in-production';

/* ------------------------------------------------------
 * 🧪 Gerar token JWT
 * ------------------------------------------------------ */
/**
 * Cria um novo token JWT para o jogador.
 * @param {object} player Objeto do jogador (Player) com PL_ID, PL_EMAIL, PL_NAME, PL_LEVEL.
 * @returns {string} O token JWT assinado.
 */
export const generateToken = player => {
  return jwt.sign(
    {
      playerId: player.PL_ID, // Usado para identificar o usuário no middleware
      email: player.PL_EMAIL,
      name: player.PL_NAME,
      level: player.PL_LEVEL
    },
    JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d', // 7 dias de validade por padrão
      issuer: 'security-zone-api',
      subject: String(player.PL_ID)
    }
  );
};

/* ------------------------------------------------------
 * 🔍 Validar e decodificar token
 * ------------------------------------------------------ */
/**
 * Valida o token JWT e retorna a decodificação se for válido.
 * @param {string} token O token JWT a ser verificado.
 * @returns {{valid: boolean, decoded?: object, error?: string}} Resultado da validação.
 */
export const validateToken = token => {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Token não fornecido ou inválido' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, decoded };
  } catch (err) {
    // Captura erros comuns do JWT, como expiração
    return { valid: false, error: err.message };
  }
};

// Exportação padrão (facilita a importação do objeto utilitário completo)
export default {
  generateToken,
  validateToken
};