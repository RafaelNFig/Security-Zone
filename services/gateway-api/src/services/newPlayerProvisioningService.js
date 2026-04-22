/* eslint-env node */
// gateway-api/src/services/newPlayerProvisioningService.js
//
// Provisiona inventário completo + 3 decks iniciais para cada novo jogador.
// Reutiliza a composição de cartas definida no seed (seedUsersBotsDecks.js).
//
// ⚠️ Este service NÃO deve ser chamado em logins subsequentes — apenas na
//    PRIMEIRA criação do Player (register local ou primeiro firebase-login).

import prisma from "../prismaClient.js";

const DEFAULT_DECK_MAX = 20;

// ────────────────────────────────────────────
// Composição dos 3 decks iniciais
// (espelho exato do makePlayerDecks em seedUsersBotsDecks.js)
// ────────────────────────────────────────────
const STARTER_DECKS = [
  {
    name: "Deck 1 — Ofensivo",
    active: true,
    cards: [
      { name: "Captura de Pacotes", qty: 3 },
      { name: "Injeção de Script", qty: 3 },
      { name: "Man-in-the-Middle", qty: 3 },
      { name: "Ponto Fantasma", qty: 3 },
      { name: "Quebra de Autorização", qty: 3 },
      { name: "Força Bruta", qty: 3 },
      { name: "Engenharia Social", qty: 2 },
      { name: "Exploração de API", qty: 2 },
      { name: "Software Malicioso", qty: 2 },
      { name: "Atualização de Software", qty: 1 },
    ],
  },
  {
    name: "Deck 2 — Defesa/Recuperação",
    active: false,
    cards: [
      { name: "Firewall Básico", qty: 3 },
      { name: "Detector de Redes Falsas", qty: 3 },
      { name: "Modo Navegação Segura", qty: 3 },
      { name: "Senha Forte++", qty: 3 },
      { name: "VPN Ativada", qty: 3 },
      { name: "Escudo Digital", qty: 3 },
      { name: "Logs de Auditoria", qty: 2 },
      { name: "Backup Seguro", qty: 2 },
      { name: "Captura de Pacotes", qty: 1 },
      { name: "Página Fake de Login", qty: 1 },
    ],
  },
  {
    name: "Deck 3 — Controle/Misto",
    active: false,
    cards: [
      { name: "Página Fake de Login", qty: 3 },
      { name: "Exploração de API", qty: 3 },
      { name: "Evil Twin", qty: 2 },
      { name: "Engenharia Social", qty: 2 },
      { name: "Logs de Auditoria", qty: 3 },
      { name: "Backup Seguro", qty: 2 },
      { name: "Escudo Digital", qty: 2 },
      { name: "Injeção de Script", qty: 2 },
      { name: "Firewall Básico", qty: 1 },
      { name: "VPN Ativada", qty: 1 },
    ],
  },
];

// ────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────

/**
 * Busca todas as cartas do banco e retorna um Map<nome, card>.
 * @returns {Promise<Map<string, object>>}
 */
async function getAllCardsByName() {
  const cards = await prisma.card.findMany({
    select: {
      CD_ID: true,
      CD_NAME: true,
      CD_MAX_IN_DECK: true,
      CD_MAX_IN_COLLECTION: true,
    },
    orderBy: { CD_ID: "asc" },
  });

  const map = new Map();
  for (const c of cards) map.set(c.CD_NAME, c);
  return map;
}

/**
 * Aplica limites de cartas por deck (CD_MAX_IN_DECK) e total do deck (deckMax).
 * Retorna composição segura.
 */
function enforceDeckLimits(cardsByName, composition, deckMax) {
  const maxTotal = Math.max(0, Number(deckMax) || DEFAULT_DECK_MAX);
  const out = [];
  let remaining = maxTotal;

  for (const item of composition || []) {
    if (remaining <= 0) break;

    const c = cardsByName.get(item.name);
    if (!c) continue;

    const perCardMax = Number(c.CD_MAX_IN_DECK ?? 3);
    const desired = Number(item?.qty ?? 1);
    const clamped = Math.max(1, Math.min(desired, perCardMax));
    const finalQty = Math.min(clamped, remaining);

    if (finalQty <= 0) break;

    out.push({ name: item.name, qty: finalQty, cardId: c.CD_ID });
    remaining -= finalQty;
  }

  return out;
}

// ────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────

/**
 * Provisiona inventário completo e decks iniciais para um novo jogador.
 *
 * Idempotente: se o jogador já possuir inventário ou decks, pula a etapa
 * correspondente para evitar duplicação em cenários de race condition.
 *
 * @param {number} playerId - ID do jogador recém-criado.
 * @returns {Promise<{inventoryCreated: boolean, decksCreated: number}>}
 */
export async function provisionNewPlayer(playerId) {
  const startTime = Date.now();
  console.log(`🎴 [Provisioning] Iniciando provisionamento para player ${playerId}...`);

  const cardsByName = await getAllCardsByName();

  if (cardsByName.size === 0) {
    console.warn("⚠️ [Provisioning] Nenhuma carta encontrada no banco. Pulando provisionamento.");
    return { inventoryCreated: false, decksCreated: 0 };
  }

  // ── 1) Inventário completo (todas as cartas na quantidade máxima da coleção) ──
  const existingInventoryCount = await prisma.playerCard.count({
    where: { PLAYER_PL_ID: playerId },
  });

  let inventoryCreated = false;

  if (existingInventoryCount === 0) {
    const inventoryData = [];
    for (const card of cardsByName.values()) {
      inventoryData.push({
        PLAYER_PL_ID: playerId,
        CARDS_CD_ID: card.CD_ID,
        PL_CD_QUANTITY: Number(card.CD_MAX_IN_COLLECTION ?? 4),
      });
    }

    await prisma.playerCard.createMany({
      data: inventoryData,
      skipDuplicates: true,
    });

    inventoryCreated = true;
    console.log(`  ✓ Inventário: ${inventoryData.length} cartas adicionadas`);
  } else {
    console.log(`  ℹ️ Inventário já existe (${existingInventoryCount} entradas). Pulando.`);
  }

  // ── 2) Decks iniciais ──
  const existingDeckCount = await prisma.deck.count({
    where: { PLAYER_PL_ID: playerId },
  });

  let decksCreated = 0;

  if (existingDeckCount === 0) {
    for (const deckDef of STARTER_DECKS) {
      const safeComposition = enforceDeckLimits(cardsByName, deckDef.cards, DEFAULT_DECK_MAX);

      // Cria o deck
      const deck = await prisma.deck.create({
        data: {
          PLAYER_PL_ID: playerId,
          DECK_NAME: deckDef.name,
          DECK_IS_ACTIVE: !!deckDef.active,
          DECK_MAX_CARDS: DEFAULT_DECK_MAX,
        },
      });

      // Popula as cartas do deck
      const deckCardsData = safeComposition.map((item) => ({
        DECK_ID: deck.DECK_ID,
        CARDS_CD_ID: item.cardId,
        DECK_CD_QUANTITY: item.qty,
      }));

      if (deckCardsData.length > 0) {
        await prisma.deckCard.createMany({
          data: deckCardsData,
          skipDuplicates: true,
        });
      }

      decksCreated += 1;

      const totalCards = safeComposition.reduce((acc, it) => acc + it.qty, 0);
      console.log(`  ✓ Deck "${deckDef.name}" criado (${totalCards}/${DEFAULT_DECK_MAX} cartas, ativo: ${!!deckDef.active})`);
    }

    // Atualiza contagem de decks ativos no player
    const activeCount = STARTER_DECKS.filter((d) => d.active).length;
    await prisma.player.update({
      where: { PL_ID: playerId },
      data: { PL_ACTIVE_DECK_COUNT: activeCount },
    });
  } else {
    console.log(`  ℹ️ Decks já existem (${existingDeckCount}). Pulando criação.`);
  }

  const elapsed = Date.now() - startTime;
  console.log(`✅ [Provisioning] Player ${playerId} provisionado em ${elapsed}ms (inventário: ${inventoryCreated}, decks: ${decksCreated})`);

  return { inventoryCreated, decksCreated };
}

export default { provisionNewPlayer };
