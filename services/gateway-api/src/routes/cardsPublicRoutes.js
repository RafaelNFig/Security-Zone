import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

// GET /api/cards (público)
router.get("/cards", async (_req, res) => {
  try {
    const cards = await prisma.card.findMany({
      orderBy: { CD_ID: "asc" },
      select: {
        CD_ID: true,
        CD_NAME: true,
        CD_TYPE: true,
        CD_COST: true,
        CD_LIFE: true,
        CD_ATTACK: true,
        CD_DEFENSE: true,
        CD_IMAGE: true,
        CD_EFFECT_JSON: true,
      },
    });

    // normaliza pro formato do front (Landing)
    const mapped = cards.map((c) => {
      const category = c?.CD_EFFECT_JSON?.category; // "ATAQUE"|"DEFESA"|"MAGIA"
      const type =
        typeof category === "string"
          ? category.toLowerCase() // ataque/defesa/magia
          : c.CD_TYPE === "SPELL"
          ? "magia"
          : "ataque";

      return {
        id: c.CD_ID,
        name: c.CD_NAME,
        type, // ataque/defesa/magia
        cost: c.CD_COST,
        life: c.CD_LIFE ?? 0,
        attack: c.CD_ATTACK ?? 0,
        defense: c.CD_DEFENSE ?? 0,
        img: c.CD_IMAGE ?? null, // exemplo: "/img/cards/firewall.png"
      };
    });

    return res.json({ success: true, data: { cards: mapped } });
  } catch (e) {
    console.error("❌ GET /cards:", e);
    return res.status(500).json({ success: false, error: "Erro ao buscar cards" });
  }
});

export default router;
