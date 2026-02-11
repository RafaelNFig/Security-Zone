/* eslint-env node */
// gateway-api/src/middleware/authMiddleware.js

import jwt from "jsonwebtoken";
import prisma from "../prismaClient.js";

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";

// 🔐 Secret do JWT (em produção, SEMPRE via env)
const JWT_SECRET_ENV = process.env.JWT_SECRET;
if (IS_PROD && !JWT_SECRET_ENV) {
  throw new Error("JWT_SECRET ausente em production. Configure no .env/host.");
}
const JWT_SECRET = JWT_SECRET_ENV || "security-zone-super-secret-key-2024-change-in-production";

// Admins por e-mail (opcional)
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || "admin@securityzone.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function extractToken(req) {
  const auth = req?.headers?.authorization;
  if (auth && typeof auth === "string" && auth.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }

  const alt = req?.headers?.["x-access-token"] ?? req?.query?.token ?? "";
  return String(alt || "").trim();
}

function extractPlayerId(decoded) {
  if (!decoded || typeof decoded !== "object") return null;

  const raw =
    decoded.playerId ??
    decoded.PL_ID ??
    decoded.id ??
    decoded.userId ??
    decoded.sub ??
    null;

  if (raw == null) return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

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
      PL_CREATED_AT: true,
      PL_FIREBASE_UID: true,
    },
  });
}

function buildReqUser(player, decoded) {
  const iat = decoded?.iat ? new Date(decoded.iat * 1000) : null;
  const exp = decoded?.exp ? new Date(decoded.exp * 1000) : null;

  return {
    id: player.PL_ID,
    playerId: player.PL_ID,
    uid: player.PL_FIREBASE_UID ?? null,
    firebaseUid: player.PL_FIREBASE_UID ?? null,
    email: player.PL_EMAIL,
    name: player.PL_NAME,
    authProvider: player.PL_AUTH_PROVIDER ?? null,
    tokenInfo: { issuedAt: iat, expiresAt: exp },
  };
}

function replyAuthError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: code,
    message,
  });
}

export const protect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return replyAuthError(res, 401, "NO_TOKEN", "Token de autenticação não fornecido.");
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return replyAuthError(res, 401, "TOKEN_EXPIRED", "Token expirado. Faça login novamente.");
      }
      if (err?.name === "JsonWebTokenError") {
        return replyAuthError(res, 401, "INVALID_SIGNATURE", "Token inválido ou adulterado.");
      }
      if (err?.name === "NotBeforeError") {
        return replyAuthError(res, 401, "TOKEN_NOT_ACTIVE", "Token ainda não está válido.");
      }
      return replyAuthError(res, 401, "INVALID_TOKEN", "Token inválido.");
    }

    const playerId = extractPlayerId(decoded);
    if (!playerId) {
      return replyAuthError(res, 401, "MISSING_PLAYER_ID", "Token não contém ID do jogador.");
    }

    const player = await loadPlayer(playerId);
    if (!player) {
      return replyAuthError(res, 401, "PLAYER_NOT_FOUND", "Jogador não encontrado. Token possivelmente desatualizado.");
    }

    req.player = player;
    req.user = buildReqUser(player, decoded);

    return next();
  } catch (error) {
    console.error("🔐 Erro inesperado no authMiddleware:", error);
    return replyAuthError(res, 500, "AUTH_SERVER_ERROR", "Erro interno no servidor de autenticação.");
  }
};

export const optionalProtect = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      req.player = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      req.user = null;
      req.player = null;
      return next();
    }

    const playerId = extractPlayerId(decoded);
    if (!playerId) {
      req.user = null;
      req.player = null;
      return next();
    }

    const player = await loadPlayer(playerId);
    if (!player) {
      req.user = null;
      req.player = null;
      return next();
    }

    req.player = player;
    req.user = buildReqUser(player, decoded);
    return next();
  } catch {
    req.user = null;
    req.player = null;
    return next();
  }
};

export const requireAdmin = async (req, res, next) => {
  return protect(req, res, () => {
    try {
      if (!req.player) {
        return replyAuthError(res, 401, "ADMIN_AUTH_REQUIRED", "Não autenticado para checagem de admin.");
      }

      const email = String(req.player.PL_EMAIL || "").toLowerCase();
      const isAdmin = ADMIN_EMAILS.includes(email);

      if (!isAdmin) {
        return replyAuthError(res, 403, "INSUFFICIENT_PERMISSIONS", "Acesso restrito. Permissão de administrador necessária.");
      }

      return next();
    } catch (err) {
      console.error("🔐 Erro no middleware requireAdmin:", err);
      return replyAuthError(res, 500, "PERMISSION_CHECK_ERROR", "Erro interno na verificação de permissões.");
    }
  });
};

export default protect;
