/* eslint-env node */
import prisma from '../prismaClient.js';
// ✅ Importação correta (quebra o ciclo de dependência)
import { generateToken as generateJWT } from '../utils/jwtUtils.js';
import firebaseAdmin from '../config/firebaseAdmin.js';

const JWT_SECRET = process.env.JWT_SECRET || 'security-zone-super-secret-key-2024-change-in-production';

class AuthController {

  // -----------------------------------------
  // 🔥 UTILITÁRIO GLOBAL: Verificar Token Firebase
  // -----------------------------------------
  static async verifyFirebaseToken(firebaseToken) {
    if (!firebaseToken || typeof firebaseToken !== 'string') {
      throw new Error('MISSING_FIREBASE_TOKEN');
    }

    try {
      return await firebaseAdmin.verifyIdToken(firebaseToken);
    } catch {
      throw new Error('INVALID_FIREBASE_TOKEN');
    }
  }

  // -----------------------------------------
  // Criar ou recuperar player
  // -----------------------------------------
  static async findOrCreatePlayerFromFirebase(firebaseUser) {
    const { uid, email, displayName, photoURL } = firebaseUser;

    try {
      let player = await prisma.player.findUnique({
        where: { PL_FIREBASE_UID: uid },
        select: AuthController.getPlayerSelectFields()
      });

      if (player) return player;

      if (email) {
        const emailPlayer = await prisma.player.findUnique({
          where: { PL_EMAIL: email },
          select: AuthController.getPlayerSelectFields()
        });

        if (emailPlayer) {
          return prisma.player.update({
            where: { PL_ID: emailPlayer.PL_ID },
            data: {
              PL_FIREBASE_UID: uid,
              PL_AUTH_PROVIDER: 'google',
              PL_AVATAR: photoURL || emailPlayer.PL_AVATAR,
            },
            select: AuthController.getPlayerSelectFields()
          });
        }
      }

      const username = await AuthController.generateUniqueUsername(
        displayName || email.split('@')[0]
      );

      return prisma.player.create({
        data: {
          PL_NAME: username,
          PL_EMAIL: email,
          PL_FIREBASE_UID: uid,
          PL_AUTH_PROVIDER: 'google',
          PL_AVATAR: photoURL,
          PL_PASSWORD_HASH: 'google-auth-no-password',
          PL_COINS: 100,
          PL_GEMS: 10,
          PL_LEVEL: 1,
          PL_LIFE: 100,

        },
        select: AuthController.getPlayerSelectFields()
      });

    } catch (error) {
      console.error('❌ Erro no findOrCreatePlayerFromFirebase:', error);
      throw new Error(`Falha ao criar/encontrar jogador: ${error.message}`);
    }
  }

  static async generateUniqueUsername(base) {
    let username = base;
    let i = 1;

    while (i <= 50) {
      const exists = await prisma.player.findUnique({
        where: { PL_NAME: username },
        select: { PL_ID: true }
      });

      if (!exists) return username;

      username = `${base}${i}`;
      i++;
    }

    return `${base}${Date.now().toString().slice(-4)}`;
  }

  static getPlayerSelectFields() {
    return {
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
      PL_FIREBASE_UID: true,

      decks: {
        select: {
          DECK_ID: true,
          DECK_NAME: true,
          // CORRIGIDO: Campo correto do schema Deck
          DECK_CREATED_AT: true,
          DECK_IS_ACTIVE: true,
        },
        take: 5
      },
      inventory: {
        select: {
          // CORRIGIDO: Campos reais do modelo PlayerCard
          CARDS_CD_ID: true,
          PL_CD_QUANTITY: true,
          // ITEM_ID, ITEM_TYPE, ITEM_NAME, ITEM_QUANTITY removidos, pois não existem no modelo PlayerCard
        },
        take: 10
      }
    };
  }

  static generateToken(player) {
    return generateJWT(player);
  }

  static formatPlayerResponse(player) {
    return {
      ...player,
      isVerified: !!player.PL_EMAIL,
      hasPassword: player.PL_PASSWORD_HASH !== 'google-auth-no-password',
      displayName: player.PL_NAME
    };
  }

  // -----------------------------------------
  // 🔥 LOGIN COM FIREBASE
  // -----------------------------------------
  static async firebaseLogin(req, res) {
    try {
      const { firebaseToken } = req.body;

      let decoded;
      try {
        decoded = await AuthController.verifyFirebaseToken(firebaseToken);
      } catch (err) {
        return res.status(401).json({
          success: false,
          error: 'Token Firebase inválido ou expirado.',
          code: err.message
        });
      }

      const player = await AuthController.findOrCreatePlayerFromFirebase({
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name || decoded.email?.split('@')[0],
        photoURL: decoded.picture
      });

      res.json({
        success: true,
        message: 'Login realizado com sucesso!',
        token: AuthController.generateToken(player),
        player: AuthController.formatPlayerResponse(player),
      });

    } catch (error) {
      console.error('💥 ERRO no login Firebase:', error);
      res.status(500).json({ success: false, error: 'FIREBASE_AUTH_ERROR' });
    }
  }

  // -----------------------------------------
  // 🔥 VINCULAR GOOGLE (CORREÇÃO FINAL)
  // -----------------------------------------
  static async linkGoogleAccount(req, res) {
    console.log("🔥 [linkGoogleAccount] Início");

    try {
      const { firebaseToken } = req.body;
      const playerId = req.player.PL_ID;

      // 1. Validar Token Firebase
      let decoded;
      try {
        decoded = await AuthController.verifyFirebaseToken(firebaseToken);
        // O token decodificado do Firebase (decoded) geralmente contém:
        // decoded.uid (String)
        // decoded.picture (String | undefined)
      } catch (err) {
        console.error("💥 ERRO NA VALIDAÇÃO DO TOKEN FIREBASE:", err);
        return res.status(401).json({
          success: false,
          error: 'Token Firebase inválido ou expirado.',
          code: err.message
        });
      }

      // 2. Verificar conflito (já existe alguém com esse UID?)
      const conflict = await prisma.player.findFirst({
        where: {
          PL_FIREBASE_UID: decoded.uid,
          PL_ID: { not: playerId } // Ignora o próprio usuário
        },
        select: { PL_ID: true }
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          error: 'Conta Google já vinculada a outro jogador.',
          code: 'GOOGLE_ACCOUNT_ALREADY_LINKED'
        });
      }

      // 3. Preparar dados para o Prisma (Sanitização)
      // Garantir que todos os campos opcionais String? recebam String ou null.
      const updateData = {
        PL_FIREBASE_UID: decoded.uid,
        PL_AUTH_PROVIDER: 'google',
        // Usamos || null para converter explicitamente 'undefined' para 'null'
        PL_AVATAR: decoded.picture || null,
      };

      console.log("💾 [Prisma] Atualizando Player ID:", playerId, "com os dados:", updateData);

      // 4. Executar Update
      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: updateData,
        select: AuthController.getPlayerSelectFields()
      });

      console.log("✅ [Prisma] Jogador atualizado com sucesso.");

      res.json({
        success: true,
        message: 'Conta Google vinculada com sucesso!',
        token: AuthController.generateToken(updatedPlayer),
        player: AuthController.formatPlayerResponse(updatedPlayer)
      });

    } catch (error) {
      console.error("💥 ERRO CRÍTICO AO VINCULAR GOOGLE:", error);

      // Tratamento específico para erro de campo Unique (Código P2002)
      if (error.code === 'P2002') {
        return res.status(409).json({
          success: false,
          error: 'Esta conta Google já está em uso (violação de restrição única).',
          code: 'UNIQUE_CONSTRAINT_VIOLATION'
        });
      }

      // Erro 500 para qualquer outro erro do Prisma ou inesperado
      res.status(500).json({
        success: false,
        error: 'GOOGLE_LINK_ERROR',
        // Esta é a mensagem que o frontend está exibindo:
        details: error.message
      });
    }
  }

  // -----------------------------------------
  // DESVINCULAR
  // -----------------------------------------
  static async unlinkGoogleAccount(req, res) {
    try {
      const playerId = req.player.PL_ID;

      const player = await prisma.player.findUnique({
        where: { PL_ID: playerId },
        select: { PL_PASSWORD_HASH: true }
      });

      if (!player.PL_PASSWORD_HASH || player.PL_PASSWORD_HASH === 'google-auth-no-password') {
        return res.status(400).json({
          success: false,
          error: 'Não pode desvincular sem senha definida.',
          code: 'NO_PASSWORD_SET'
        });
      }

      const updatedPlayer = await prisma.player.update({
        where: { PL_ID: playerId },
        data: { PL_FIREBASE_UID: null, PL_AUTH_PROVIDER: null },
        select: AuthController.getPlayerSelectFields()
      });

      res.json({
        success: true,
        message: 'Conta Google desvinculada!',
        player: AuthController.formatPlayerResponse(updatedPlayer)
      });

    } catch (error) {
      res.status(500).json({ success: false, error: 'GOOGLE_UNLINK_ERROR' });
    }
  }

  // -----------------------------------------
  // VERIFY TOKEN
  // -----------------------------------------
  static async verifyToken(req, res) {
    try {
      const player = await prisma.player.findUnique({
        where: { PL_ID: req.player.PL_ID },
        select: AuthController.getPlayerSelectFields()
      });

      if (!player) {
        return res.status(404).json({
          success: false,
          error: 'PLAYER_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        player: AuthController.formatPlayerResponse(player),
        session: {
          userId: player.PL_ID,
          provider: player.PL_AUTH_PROVIDER,
        }
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: "VERIFY_TOKEN_ERROR"
      });
    }
  }

  // -----------------------------------------
  // REFRESH TOKEN
  // -----------------------------------------
  static async refreshToken(req, res) {
    try {
      const player = await prisma.player.findUnique({
        where: { PL_ID: req.player.PL_ID },
        select: AuthController.getPlayerSelectFields()
      });

      if (!player) {
        return res.status(404).json({ success: false, error: 'PLAYER_NOT_FOUND' });
      }

      res.json({
        success: true,
        message: 'Token atualizado!',
        token: AuthController.generateToken(player),
        player: AuthController.formatPlayerResponse(player)
      });

    } catch {
      res.status(500).json({ success: false, error: 'TOKEN_REFRESH_ERROR' });
    }
  }

  // -----------------------------------------
  // ✅ LOGOUT 
  // -----------------------------------------
  static async logout(req, res) {
    // Log para fins de debug
    console.log(`👤 Logout solicitado para o jogador ID: ${req.player?.PL_ID}`);

    // Resposta padrão de sucesso
    res.json({
      success: true,
      message: 'Logout realizado com sucesso. Descarte o token localmente.'
    });
  }
}

// -----------------------------------------------------
// 🔑 EXPORTAÇÕES NOMINAIS (Crucial para o authRoutes.js)
// -----------------------------------------------------

export const firebaseLogin = AuthController.firebaseLogin;
export const linkGoogleAccount = AuthController.linkGoogleAccount;
export const unlinkGoogleAccount = AuthController.unlinkGoogleAccount;
export const verifyToken = AuthController.verifyToken;
export const refreshToken = AuthController.refreshToken;
export const logout = AuthController.logout;

// Exportação default mantida para utilitários
export default AuthController;