/* eslint-env node */
import jwt from "jsonwebtoken";

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";

// 🔐 Secret do JWT
// Em produção: OBRIGATÓRIO via env.
// Em dev: permite fallback para facilitar setup local.
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (IS_PROD && !JWT_SECRET_ENV) {
  throw new Error("JWT_SECRET ausente em production. Configure no .env/host.");
}
const JWT_SECRET =
  JWT_SECRET_ENV || "security-zone-super-secret-key-2024-change-in-production";

// ⏱️ Expiração padrão
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_ISSUER = process.env.JWT_ISSUER || "security-zone-api";

/* ------------------------------------------------------
 * 🧪 Gerar token JWT
 * ------------------------------------------------------ */
/**
 * Cria um novo token JWT para o jogador.
 * @param {object} player Objeto Player (schema Prisma)
 * @returns {string} Token JWT assinado
 */
export const generateToken = (player) => {
  const playerId = player?.PL_ID ?? player?.playerId ?? null;
  if (!playerId) {
    throw new Error("INVALID_PLAYER_FOR_JWT");
  }

  return jwt.sign(
    {
      // 🔑 Fonte única de verdade
      playerId: Number(playerId),

      // 🔁 Compatibilidade
      PL_ID: Number(playerId),

      // Info básica (não sensível) — útil pro front, mas não confiar server-side
      email: player?.PL_EMAIL ?? player?.email ?? null,
      name: player?.PL_NAME ?? player?.name ?? null,
      level: player?.PL_LEVEL ?? player?.level ?? null,

      // Tipo do ator (pra evoluir no futuro)
      type: "PLAYER",
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
      issuer: JWT_ISSUER,
      subject: String(playerId),
    }
  );
};

/* ------------------------------------------------------
 * 🔍 Validar e decodificar token
 * ------------------------------------------------------ */
/**
 * Valida o token JWT e retorna o payload decodificado.
 * @param {string} token JWT
 * @returns {{ valid: boolean, decoded?: object, error?: string, code?: string }}
 */
export const validateToken = (token) => {
  try {
    if (!token || typeof token !== "string") {
      return {
        valid: false,
        error: "Token não fornecido ou inválido",
        code: "NO_TOKEN",
      };
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
    });

    return { valid: true, decoded };
  } catch (err) {
    if (err?.name === "TokenExpiredError") {
      return { valid: false, error: "Token expirado", code: "TOKEN_EXPIRED" };
    }
    if (err?.name === "JsonWebTokenError") {
      return { valid: false, error: "Token inválido", code: "INVALID_TOKEN" };
    }
    if (err?.name === "NotBeforeError") {
      return { valid: false, error: "Token ainda não está válido", code: "TOKEN_NOT_ACTIVE" };
    }

    return {
      valid: false,
      error: err?.message || "Erro ao validar token",
      code: "TOKEN_ERROR",
    };
  }
};

export default {
  generateToken,
  validateToken,
};
