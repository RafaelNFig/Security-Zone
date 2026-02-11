/* eslint-env node */
// gateway-api/src/controllers/authController.js

import prisma from "../prismaClient.js";
import { generateToken as generateJWT } from "../utils/jwtUtils.js";
import firebaseAdmin from "../config/firebaseAdmin.js";

const IS_PROD = String(process.env.NODE_ENV || "").toLowerCase() === "production";

// Em produção, exigir JWT_SECRET para evitar tokens forjáveis por fallback.
if (IS_PROD && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET ausente em production. Configure no .env/host.");
}

class AuthController {
  // -----------------------------------------
  // 🔥 UTILITÁRIO: Verificar Token Firebase
  // -----------------------------------------
  static async verifyFirebaseToken(firebaseToken) {
    if (!firebaseToken || typeof firebaseToken !== "string") {
      throw new Error("MISSING_FIREBASE_TOKEN");
    }

    try {
      return await firebaseAdmin.verifyIdToken(firebaseToken);
    } catch {
      throw new Error("INVALID_FIREBASE_TOKEN");
    }
  }

  // -----------------------------------------
  // Select fields padrão do player
  // -----------------------------------------
  static getPlayerSelectFields() {
    return {
      PL_ID: true,
      PL_NAME: true,
      PL_EMAIL: true,
      PL_PASSWORD_HASH: true,
      PL_COINS: true,
      PL_GEMS: true,
      PL_LEVEL: true,
      PL_AVATAR: true,
      PL_LIFE: true,
      PL_AUTH_PROVIDER: true,
      PL_CREATED_AT: true,
      PL_FIREBASE_UID: true,

      decks: {
        select: {
          DECK_ID: true,
          DECK_NAME: true,
          DECK_CREATED_AT: true,
          DECK_IS_ACTIVE: true,
        },
        take: 5,
      },

      inventory: {
        select: {
          CARDS_CD_ID: true,
          PL_CD_QUANTITY: true,
        },
        take: 10,
      },
    };
  }

  // -----------------------------------------
  // Username único (quando cria player)
  // -----------------------------------------
  static async generateUniqueUsername(base) {
    let normalized = String(base || "Player").trim();
    if (!normalized) normalized = "Player";

    normalized = normalized.replace(/\s+/g, " ");

    const maxLen = 45;
    if (normalized.length > maxLen) normalized = normalized.slice(0, maxLen);

    let username = normalized;

    for (let i = 1; i <= 50; i += 1) {
      const exists = await prisma.player.findUnique({
        where: { PL_NAME: username },
        select: { PL_ID: true },
      });
      if (!exists) return username;

      const suffix = String(i);
      username = `${normalized}${suffix}`;
      if (username.length > maxLen) {
        username = username.slice(0, maxLen - suffix.length) + suffix;
      }
    }

    const tail = Date.now().toString().slice(-4);
    let final = `${normalized}${tail}`;
    if (final.length > maxLen) final = final.slice(0, maxLen - tail.length) + tail;
    return final;
  }

  // -----------------------------------------
  // Criar ou recuperar player pelo Firebase
  // -----------------------------------------
  static async findOrCreatePlayerFromFirebase(firebaseUser) {
    const { uid, email, displayName, photoURL } = firebaseUser;

    if (!uid) throw new Error("MISSING_FIREBASE_UID");
    if (!email) throw new Error("MISSING_FIREBASE_EMAIL");

    const safeEmail = String(email).trim().toLowerCase();

    try {
      // 1) Já existe por UID?
      const byUid = await prisma.player.findUnique({
        where: { PL_FIREBASE_UID: uid },
        select: AuthController.getPlayerSelectFields(),
      });
      if (byUid) return byUid;

      // 2) Existe por email (usuário criado antes sem UID)?
      const byEmail = await prisma.player.findUnique({
        where: { PL_EMAIL: safeEmail },
        select: AuthController.getPlayerSelectFields(),
      });

      if (byEmail) {
        return await prisma.player.update({
          where: { PL_ID: byEmail.PL_ID },
          data: {
            PL_FIREBASE_UID: uid,
            PL_AUTH_PROVIDER: "google",
            PL_AVATAR: photoURL || byEmail.PL_AVATAR || null,
          },
          select: AuthController.getPlayerSelectFields(),
        });
      }

      // 3) Criar novo
      const baseName =
        (displayName && String(displayName).trim()) ||
        (safeEmail && safeEmail.split("@")[0]) ||
        "Player";

      const username = await AuthController.generateUniqueUsername(baseName);

      return await prisma.player.create({
        data: {
          PL_NAME: username,
          PL_EMAIL: safeEmail,
          PL_FIREBASE_UID: uid,
          PL_AUTH_PROVIDER: "google",
          PL_AVATAR: photoURL || null,

          // schema exige PL_PASSWORD_HASH (não-null)
          PL_PASSWORD_HASH: "google-auth-no-password",

          // defaults
          PL_COINS: 100,
          PL_GEMS: 10,
          PL_LEVEL: 1,
          PL_LIFE: 100,
        },
        select: AuthController.getPlayerSelectFields(),
      });
    } catch (error) {
      console.error("❌ Erro no findOrCreatePlayerFromFirebase:", error);
      throw new Error("PLAYER_UPSERT_FAILED");
    }
  }

  // -----------------------------------------
  // JWT do seu sistema (usa jwtUtils.js)
  // -----------------------------------------
  static generateToken(player) {
    return generateJWT(player);
  }

  // -----------------------------------------
  // Resposta segura pro front
  // -----------------------------------------
  static formatPlayerResponse(player) {
    const safe = { ...player };
    delete safe.PL_PASSWORD_HASH;

    return {
      ...safe,
      isVerified: !!player.PL_EMAIL,
      hasPassword: !!(
        player.PL_PASSWORD_HASH && player.PL_PASSWORD_HASH !== "google-auth-no-password"
      ),
      displayName: player.PL_NAME,
    };
  }

  // -----------------------------------------
  // 🔥 LOGIN COM FIREBASE (PÚBLICO)
  // Body: { firebaseToken }
  // -----------------------------------------
  static async firebaseLogin(req, res) {
    try {
      const { firebaseToken } = req.body || {};

      let decoded;
      try {
        decoded = await AuthController.verifyFirebaseToken(firebaseToken);
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: "Token Firebase inválido ou expirado.",
          code: err.message,
        });
      }

      let player;
      try {
        player = await AuthController.findOrCreatePlayerFromFirebase({
          uid: decoded.uid,
          email: decoded.email,
          displayName: decoded.name || decoded.email?.split("@")[0],
          photoURL: decoded.picture,
        });
      } catch (e) {
        const code = e?.message || "PLAYER_UPSERT_FAILED";
        return res.status(500).json({
          success: false,
          error: "FIREBASE_AUTH_ERROR",
          code,
        });
      }

      return res.json({
        success: true,
        message: "Login realizado com sucesso!",
        token: AuthController.generateToken(player),
        player: AuthController.formatPlayerResponse(player),
      });
    } catch (error) {
      console.error("💥 ERRO no login Firebase:", error);
      return res.status(500).json({
        success: false,
        error: "FIREBASE_AUTH_ERROR",
        code: "UNEXPECTED_ERROR",
      });
    }
  }

  // -----------------------------------------
  // 🔥 VINCULAR GOOGLE (PROTEGIDO)
  // Body: { firebaseToken }
  // -----------------------------------------
  static async linkGoogleAccount(req, res) {
    try {
      const { firebaseToken } = req.body || {};
      const playerId = req.player?.PL_ID;

      if (!playerId) {
        return res.status(401).json({
          success: false,
          error: "Não autenticado.",
          code: "NO_AUTH",
        });
      }

      let decoded;
      try {
        decoded = await AuthController.verifyFirebaseToken(firebaseToken);
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: "Token Firebase inválido ou expirado.",
          code: err.message,
        });
      }

      // Impede vincular um uid que já pertence a outro player
      const conflict = await prisma.player.findFirst({
        where: {
          PL_FIREBASE_UID: decoded.uid,
          PL_ID: { not: playerId },
        },
        select: { PL_ID: true },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: "Conta Google já vinculada a outro jogador.",
          code: "GOOGLE_ACCOUNT_ALREADY_LINKED",
        });
      }

      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: {
          PL_FIREBASE_UID: decoded.uid,
          PL_AUTH_PROVIDER: "google",
          PL_AVATAR: decoded.picture || null,
        },
        select: AuthController.getPlayerSelectFields(),
      });

      return res.json({
        success: true,
        message: "Conta Google vinculada com sucesso!",
        token: AuthController.generateToken(updatedPlayer),
        player: AuthController.formatPlayerResponse(updatedPlayer),
      });
    } catch (error) {
      console.error("💥 ERRO AO VINCULAR GOOGLE:", error);

      if (error?.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: "Esta conta Google já está em uso (violação de restrição única).",
          code: "UNIQUE_CONSTRAINT_VIOLATION",
        });
      }

      return res.status(500).json({
        success: false,
        error: "GOOGLE_LINK_ERROR",
        code: "UNEXPECTED_ERROR",
      });
    }
  }

  // -----------------------------------------
  // DESVINCULAR GOOGLE (PROTEGIDO)
  // -----------------------------------------
  static async unlinkGoogleAccount(req, res) {
    try {
      const playerId = req.player?.PL_ID;

      if (!playerId) {
        return res
          .status(401)
          .json({ success: false, error: "Não autenticado.", code: "NO_AUTH" });
      }

      const player = await prisma.player.findUnique({
        where: { PL_ID: playerId },
        select: { PL_PASSWORD_HASH: true },
      });

      if (!player) {
        return res.status(404).json({ success: false, error: "PLAYER_NOT_FOUND" });
      }

      // regra: só permite desvincular se tiver senha real cadastrada
      if (!player.PL_PASSWORD_HASH || player.PL_PASSWORD_HASH === "google-auth-no-password") {
        return res.status(400).json({
          success: false,
          error: "Não pode desvincular sem senha definida.",
          code: "NO_PASSWORD_SET",
        });
      }

      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: { PL_FIREBASE_UID: null, PL_AUTH_PROVIDER: null },
        select: AuthController.getPlayerSelectFields(),
      });

      return res.json({
        success: true,
        message: "Conta Google desvinculada!",
        player: AuthController.formatPlayerResponse(updatedPlayer),
      });
    } catch (error) {
      console.error("💥 ERRO AO DESVINCULAR GOOGLE:", error);
      return res
        .status(500)
        .json({ success: false, error: "GOOGLE_UNLINK_ERROR", code: "UNEXPECTED_ERROR" });
    }
  }

  // -----------------------------------------
  // VERIFY TOKEN / ME (PROTEGIDO)
  // -----------------------------------------
  static async verifyToken(req, res) {
    try {
      const playerId = req.player?.PL_ID;

      const player = await prisma.player.findUnique({
        where: { PL_ID: playerId },
        select: AuthController.getPlayerSelectFields(),
      });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: "PLAYER_NOT_FOUND",
        });
      }

      return res.json({
        success: true,
        player: AuthController.formatPlayerResponse(player),
        session: {
          userId: player.PL_ID,
          provider: player.PL_AUTH_PROVIDER,
        },
      });
    } catch (error) {
      console.error("💥 ERRO verifyToken:", error);
      return res.status(500).json({
        success: false,
        error: "VERIFY_TOKEN_ERROR",
        code: "UNEXPECTED_ERROR",
      });
    }
  }

  // -----------------------------------------
  // REFRESH TOKEN (PROTEGIDO)
  // -----------------------------------------
  static async refreshToken(req, res) {
    try {
      const playerId = req.player?.PL_ID;

      const player = await prisma.player.findUnique({
        where: { PL_ID: playerId },
        select: AuthController.getPlayerSelectFields(),
      });

      if (!player) {
        return res.status(404).json({ success: false, error: "PLAYER_NOT_FOUND" });
      }

      return res.json({
        success: true,
        message: "Token atualizado!",
        token: AuthController.generateToken(player),
        player: AuthController.formatPlayerResponse(player),
      });
    } catch (error) {
      console.error("💥 ERRO refreshToken:", error);
      return res
        .status(500)
        .json({ success: false, error: "TOKEN_REFRESH_ERROR", code: "UNEXPECTED_ERROR" });
    }
  }

  // -----------------------------------------
  // ✅ LOGOUT (stateless)
  // -----------------------------------------
  static async logout(req, res) {
    return res.json({
      success: true,
      message: "Logout realizado com sucesso. Descarte o token localmente.",
    });
  }
}

// -----------------------------------------------------
// 🔑 EXPORTAÇÕES NOMINAIS (batendo com authRoutes.js)
// -----------------------------------------------------
export const firebaseLogin = AuthController.firebaseLogin;

// ✅ nomes esperados pelo router
export const linkGoogle = AuthController.linkGoogleAccount;
export const unlinkGoogle = AuthController.unlinkGoogleAccount;

export const verifyToken = AuthController.verifyToken;
export const refreshToken = AuthController.refreshToken;
export const logout = AuthController.logout;

export default AuthController;
