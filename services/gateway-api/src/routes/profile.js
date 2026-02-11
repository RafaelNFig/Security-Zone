// backend/src/routes/profile.js
/* eslint-env node */
import express from "express";
import prisma from "../prismaClient.js";

const router = express.Router();

/**
 * ⚠️ ORDEM IMPORTA:
 * Rotas específicas (check-*) devem vir ANTES da rota dinâmica /:playerId,
 * senão "/check-username/..." seria interpretado como playerId="check-username".
 */

// ------------------------------------------------------------
// Verificar disponibilidade de username
// GET /api/profile/check-username/:username
// ------------------------------------------------------------
router.get("/check-username/:username", async (req, res) => {
  try {
    const username = String(req.params.username || "").trim();

    if (!username || username.length < 2) {
      return res.status(400).json({ error: "Username inválido" });
    }

    const existingUser = await prisma.player.findFirst({
      where: { PL_NAME: username },
      select: { PL_ID: true, PL_NAME: true },
    });

    return res.json({
      available: !existingUser,
      username,
    });
  } catch (error) {
    console.error("Erro ao verificar username:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ------------------------------------------------------------
// Verificar disponibilidade de email
// GET /api/profile/check-email/:email
// ------------------------------------------------------------
router.get("/check-email/:email", async (req, res) => {
  try {
    const email = String(req.params.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Email inválido" });
    }

    const existingUser = await prisma.player.findFirst({
      where: { PL_EMAIL: email },
      select: { PL_ID: true, PL_EMAIL: true },
    });

    return res.json({
      available: !existingUser,
      email,
    });
  } catch (error) {
    console.error("Erro ao verificar email:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ------------------------------------------------------------
// Obter dados básicos do jogador
// GET /api/profile/:playerId
// ------------------------------------------------------------
router.get("/:playerId", async (req, res) => {
  try {
    const playerId = Number.parseInt(req.params.playerId, 10);
    if (!Number.isFinite(playerId)) {
      return res.status(400).json({ error: "playerId inválido" });
    }

    const playerProfile = await prisma.player.findUnique({
      where: { PL_ID: playerId },
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_AVATAR: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_LIFE: true,
        PL_CREATED_AT: true, // ✅ CORRIGIDO
      },
    });

    if (!playerProfile) {
      return res.status(404).json({ error: "Perfil não encontrado" });
    }

    return res.json(playerProfile);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// ------------------------------------------------------------
// Atualizar perfil do jogador
// PUT /api/profile/:playerId
// ------------------------------------------------------------
router.put("/:playerId", async (req, res) => {
  try {
    const playerId = Number.parseInt(req.params.playerId, 10);
    if (!Number.isFinite(playerId)) {
      return res.status(400).json({ error: "playerId inválido" });
    }

    const { PL_NAME, PL_EMAIL, PL_AVATAR } = req.body || {};

    const name = PL_NAME !== undefined ? String(PL_NAME).trim() : undefined;
    const email = PL_EMAIL !== undefined ? String(PL_EMAIL).trim().toLowerCase() : undefined;
    const avatar = PL_AVATAR !== undefined ? String(PL_AVATAR) : undefined;

    if (name !== undefined && (name.length < 2 || name.length > 45)) {
      return res.status(400).json({ error: "Nome deve ter entre 2 e 45 caracteres" });
    }

    if (email !== undefined && (!email.includes("@") || email.length > 100)) {
      return res.status(400).json({ error: "Email inválido" });
    }

    // Verificar se email já existe (excluindo o próprio usuário)
    if (email) {
      const existingEmail = await prisma.player.findFirst({
        where: {
          PL_EMAIL: email,
          PL_ID: { not: playerId },
        },
        select: { PL_ID: true },
      });

      if (existingEmail) {
        return res.status(409).json({ error: "Email já está em uso" });
      }
    }

    // Verificar se username já existe (excluindo o próprio usuário)
    if (name) {
      const existingUsername = await prisma.player.findFirst({
        where: {
          PL_NAME: name,
          PL_ID: { not: playerId },
        },
        select: { PL_ID: true },
      });

      if (existingUsername) {
        return res.status(409).json({ error: "Nome de usuário já está em uso" });
      }
    }

    const data = {};
    if (name !== undefined) data.PL_NAME = name;
    if (email !== undefined) data.PL_EMAIL = email;
    if (avatar !== undefined) data.PL_AVATAR = avatar;

    const updatedProfile = await prisma.player.update({
      where: { PL_ID: playerId },
      data,
      select: {
        PL_ID: true,
        PL_NAME: true,
        PL_EMAIL: true,
        PL_AVATAR: true,
        PL_COINS: true,
        PL_GEMS: true,
        PL_LEVEL: true,
        PL_LIFE: true,
        PL_CREATED_AT: true, // ✅ CORRIGIDO
      },
    });

    return res.json(updatedProfile);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);

    // unique constraint
    if (error?.code === "P2002") {
      return res.status(409).json({ error: "Conflito de campo único (nome/email já em uso)" });
    }

    return res.status(500).json({ error: "Erro ao atualizar perfil" });
  }
});

export default router;
