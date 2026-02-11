/* eslint-env node */
// prisma/seedUsersBotsDecks.js
// Cria:
// - Player (email: "player", senha: "play123") com inventário completo (20 cartas no máximo da coleção)
// - 3 decks diferentes (1 ativo)
// - 2 bots (easy/normal) como Players "sistema" com decks apropriados
//
// ✅ Ajuste: respeita limite total do deck (DECK_MAX_CARDS, default 20)
// - trunca composição para não passar de 20 (somando DECK_CD_QUANTITY)
// - também respeita CD_MAX_IN_DECK por carta

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const saltRounds = 10;

// Convenções de sistema
const PLAYER_EMAIL_DB = "player@email.com"; // normalizeEmail("Player") => "player"
const PLAYER_NAME = "Player";
const PLAYER_PASSWORD = "play123";

const BOT_EASY = { name: "Bot Easy", email: "bot_easy@sz.local", level: "easy" };
const BOT_NORMAL = { name: "Bot Normal", email: "bot_normal@sz.local", level: "normal" };

const DEFAULT_DECK_MAX = 20;

async function getAllCards() {
  const cards = await prisma.card.findMany({
    select: {
      CD_ID: true,
      CD_NAME: true,
      CD_MAX_IN_DECK: true,
      CD_MAX_IN_COLLECTION: true,
      CD_COST: true,
      CD_TYPE: true,
    },
    orderBy: { CD_ID: "asc" },
  });

  if (!cards || cards.length === 0) {
    throw new Error("NO_CARDS_FOUND: rode o seed das cartas primeiro.");
  }

  return cards;
}

function byNameMap(cards) {
  const m = new Map();
  for (const c of cards) m.set(c.CD_NAME, c);
  return m;
}

async function safeSetUniqueNameByEmail(email, desiredName) {
  // Evita quebrar o seed se PL_NAME já existir para outro usuário.
  // Se conflitar, cria um sufixo.
  const name = String(desiredName || "").trim().slice(0, 45) || "Player";

  // já existe esse email?
  const existing = await prisma.player.findUnique({
    where: { PL_EMAIL: email },
    select: { PL_ID: true, PL_NAME: true },
  });

  if (!existing) return name; // no create, tentamos usar o desejado

  // update: NÃO força renomear (evita P2002), a menos que já seja o mesmo
  return existing.PL_NAME || name;
}

async function upsertPlayerWithPassword({ name, emailDbLowercase, plainPassword, authProvider = null }) {
  const passwordHash = await bcrypt.hash(String(plainPassword), saltRounds);

  const safeName = await safeSetUniqueNameByEmail(emailDbLowercase, name);

  // Upsert tolerante: no update não tenta alterar PL_NAME para evitar colisão.
  return prisma.player.upsert({
    where: { PL_EMAIL: emailDbLowercase },
    update: {
      PL_PASSWORD_HASH: passwordHash,
      PL_AUTH_PROVIDER: authProvider,
      PL_LIFE: 100,
      // PL_NAME: safeName, // ❌ não forçar no update
    },
    create: {
      PL_NAME: safeName,
      PL_EMAIL: emailDbLowercase,
      PL_PASSWORD_HASH: passwordHash,
      PL_AUTH_PROVIDER: authProvider,
      PL_COINS: 0,
      PL_GEMS: 0,
      PL_LEVEL: 1,
      PL_LIFE: 100,
    },
    select: { PL_ID: true, PL_NAME: true, PL_EMAIL: true },
  });
}

async function upsertBotPlayer({ name, email, level }) {
  // Bot não precisa senha real; mas schema exige PL_PASSWORD_HASH
  const botHash = await bcrypt.hash(`bot-${level}-seed`, saltRounds);

  const safeName = await safeSetUniqueNameByEmail(email, name);

  return prisma.player.upsert({
    where: { PL_EMAIL: email },
    update: {
      PL_PASSWORD_HASH: botHash,
      PL_AUTH_PROVIDER: "BOT",
      PL_LIFE: 100,
      // PL_NAME: safeName, // ❌ não forçar no update
      PL_LEVEL: level === "normal" ? 3 : 1,
    },
    create: {
      PL_NAME: safeName,
      PL_EMAIL: email,
      PL_PASSWORD_HASH: botHash,
      PL_AUTH_PROVIDER: "BOT",
      PL_COINS: 0,
      PL_GEMS: 0,
      PL_LEVEL: level === "normal" ? 3 : 1,
      PL_LIFE: 100,
    },
    select: { PL_ID: true, PL_NAME: true, PL_EMAIL: true },
  });
}

async function upsertFullInventory(playerId, cards) {
  // coloca cada carta na quantidade máxima da coleção (CD_MAX_IN_COLLECTION)
  for (const c of cards) {
    const qty = Number(c.CD_MAX_IN_COLLECTION ?? 4);

    await prisma.playerCard.upsert({
      where: {
        PLAYER_PL_ID_CARDS_CD_ID: {
          PLAYER_PL_ID: playerId,
          CARDS_CD_ID: c.CD_ID,
        },
      },
      update: { PL_CD_QUANTITY: qty },
      create: {
        PLAYER_PL_ID: playerId,
        CARDS_CD_ID: c.CD_ID,
        PL_CD_QUANTITY: qty,
      },
    });
  }
}

async function upsertDeck(playerId, deckName, isActive) {
  return prisma.deck.upsert({
    where: {
      PLAYER_PL_ID_DECK_NAME: {
        PLAYER_PL_ID: playerId,
        DECK_NAME: deckName,
      },
    },
    update: { DECK_IS_ACTIVE: !!isActive },
    create: {
      PLAYER_PL_ID: playerId,
      DECK_NAME: deckName,
      DECK_IS_ACTIVE: !!isActive,
      // ✅ garante o limite no create (se o schema tiver DECK_MAX_CARDS)
      DECK_MAX_CARDS: DEFAULT_DECK_MAX,
    },
    select: { DECK_ID: true, DECK_NAME: true, DECK_IS_ACTIVE: true, DECK_MAX_CARDS: true },
  });
}

async function deactivateAllDecks(playerId) {
  await prisma.deck.updateMany({
    where: { PLAYER_PL_ID: playerId, DECK_IS_ACTIVE: true },
    data: { DECK_IS_ACTIVE: false },
  });
}

async function resetDeckCards(deckId) {
  await prisma.deckCard.deleteMany({ where: { DECK_ID: deckId } });
}

/** ✅ soma total de cartas do deck */
function sumComposition(composition) {
  return composition.reduce((acc, it) => acc + Number(it?.qty ?? 0), 0);
}

/**
 * ✅ aplica:
 * - limite por carta: CD_MAX_IN_DECK
 * - limite total do deck: deckMax (20)
 * Estratégia: percorre na ordem e vai preenchendo até bater o limite.
 */
function enforceDeckLimits(cardsByName, composition, deckMax) {
  const maxTotal = Math.max(0, Number(deckMax ?? DEFAULT_DECK_MAX) || DEFAULT_DECK_MAX);

  const out = [];
  let remaining = maxTotal;

  for (const item of composition || []) {
    if (remaining <= 0) break;

    const c = cardsByName.get(item.name);
    if (!c) continue; // deixa o throw acontecer depois na escrita (ou ignore aqui)
    const perCardMax = Number(c.CD_MAX_IN_DECK ?? 3);

    const desired = Number(item?.qty ?? 1);
    const clamped = Math.max(1, Math.min(desired, perCardMax));

    const finalQty = Math.min(clamped, remaining);
    if (finalQty <= 0) break;

    out.push({ name: item.name, qty: finalQty });
    remaining -= finalQty;
  }

  return out;
}

async function setDeckCards(deckId, cardsByName, composition, deckMax) {
  const safeComposition = enforceDeckLimits(cardsByName, composition, deckMax);

  // valida nomes (agora só do que restou)
  for (const item of safeComposition) {
    const c = cardsByName.get(item.name);
    if (!c) throw new Error(`CARD_NOT_FOUND_IN_DB: "${item.name}"`);

    const max = Number(c.CD_MAX_IN_DECK ?? 3);
    const qty = Math.max(1, Math.min(Number(item.qty ?? 1), max));

    await prisma.deckCard.upsert({
      where: {
        DECK_ID_CARDS_CD_ID: { DECK_ID: deckId, CARDS_CD_ID: c.CD_ID },
      },
      update: { DECK_CD_QUANTITY: qty },
      create: {
        DECK_ID: deckId,
        CARDS_CD_ID: c.CD_ID,
        DECK_CD_QUANTITY: qty,
      },
    });
  }

  // log leve pra debug
  const total = sumComposition(safeComposition);
  if (total !== Number(deckMax ?? DEFAULT_DECK_MAX)) {
    // não é erro: só indica que a lista original tinha mais que 20 e foi truncada
    // ou tinha menos e ficou menor.
    console.log(`ℹ️ Deck ${deckId}: total cartas = ${total}/${Number(deckMax ?? DEFAULT_DECK_MAX)}`);
  }
}

function makePlayerDecks() {
  return [
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
}

function makeBotDeck(level) {
  if (level === "easy") {
    return {
      name: "Bot Deck — Easy",
      cards: [
        { name: "Firewall Básico", qty: 3 },
        { name: "Senha Forte++", qty: 3 },
        { name: "Detector de Redes Falsas", qty: 2 },
        { name: "Modo Navegação Segura", qty: 2 },
        { name: "Escudo Digital", qty: 3 },
        { name: "Atualização de Software", qty: 2 },
        { name: "Captura de Pacotes", qty: 2 },
        { name: "Força Bruta", qty: 2 },
        { name: "Logs de Auditoria", qty: 2 },
        { name: "Software Malicioso", qty: 2 },
      ],
    };
  }

  return {
    name: "Bot Deck — Normal",
    cards: [
      { name: "Captura de Pacotes", qty: 3 },
      { name: "Injeção de Script", qty: 3 },
      { name: "Quebra de Autorização", qty: 3 },
      { name: "Man-in-the-Middle", qty: 3 },
      { name: "Ponto Fantasma", qty: 2 },
      { name: "Exploração de API", qty: 2 },
      { name: "Página Fake de Login", qty: 2 },
      { name: "Engenharia Social", qty: 2 },
      { name: "Atualização de Software", qty: 1 },
      { name: "Software Malicioso", qty: 2 },
    ],
  };
}

export async function seedUsersBotsDecks() {
  console.log("🌱 Seeding: Player + Bots + Decks + Inventário...");

  const cards = await getAllCards();
  const cardsByName = byNameMap(cards);

  // Player principal
  const player = await upsertPlayerWithPassword({
    name: PLAYER_NAME,
    emailDbLowercase: PLAYER_EMAIL_DB,
    plainPassword: PLAYER_PASSWORD,
    authProvider: null,
  });

  await upsertFullInventory(player.PL_ID, cards);

  // Garantir somente 1 deck ativo
  await deactivateAllDecks(player.PL_ID);

  // 3 decks do player (reset cards antes de setar)
  const playerDecks = makePlayerDecks();
  for (const d of playerDecks) {
    const deck = await upsertDeck(player.PL_ID, d.name, d.active);

    // ✅ se já existe, força o limite também
    await prisma.deck.update({
      where: { DECK_ID: deck.DECK_ID },
      data: { DECK_MAX_CARDS: DEFAULT_DECK_MAX },
    });

    await resetDeckCards(deck.DECK_ID);
    await setDeckCards(deck.DECK_ID, cardsByName, d.cards, DEFAULT_DECK_MAX);
  }

  await prisma.player.update({
    where: { PL_ID: player.PL_ID },
    data: { PL_ACTIVE_DECK_COUNT: playerDecks.length },
  });

  // Bots
  const botEasy = await upsertBotPlayer(BOT_EASY);
  const botNormal = await upsertBotPlayer(BOT_NORMAL);

  // Inventário (opcional pros bots, mas útil pra consistência)
  await upsertFullInventory(botEasy.PL_ID, cards);
  await upsertFullInventory(botNormal.PL_ID, cards);

  // Garantir somente 1 deck ativo para cada bot
  await deactivateAllDecks(botEasy.PL_ID);
  await deactivateAllDecks(botNormal.PL_ID);

  // Decks dos bots (reset cards antes de setar)
  const easyDeck = makeBotDeck("easy");
  const normalDeck = makeBotDeck("normal");

  const dEasy = await upsertDeck(botEasy.PL_ID, easyDeck.name, true);
  await prisma.deck.update({
    where: { DECK_ID: dEasy.DECK_ID },
    data: { DECK_MAX_CARDS: DEFAULT_DECK_MAX },
  });
  await resetDeckCards(dEasy.DECK_ID);
  await setDeckCards(dEasy.DECK_ID, cardsByName, easyDeck.cards, DEFAULT_DECK_MAX);

  const dNormal = await upsertDeck(botNormal.PL_ID, normalDeck.name, true);
  await prisma.deck.update({
    where: { DECK_ID: dNormal.DECK_ID },
    data: { DECK_MAX_CARDS: DEFAULT_DECK_MAX },
  });
  await resetDeckCards(dNormal.DECK_ID);
  await setDeckCards(dNormal.DECK_ID, cardsByName, normalDeck.cards, DEFAULT_DECK_MAX);

  await prisma.player.update({ where: { PL_ID: botEasy.PL_ID }, data: { PL_ACTIVE_DECK_COUNT: 1 } });
  await prisma.player.update({ where: { PL_ID: botNormal.PL_ID }, data: { PL_ACTIVE_DECK_COUNT: 1 } });

  console.log("✅ Seed Player/Bots/Decks OK");
}

export default seedUsersBotsDecks;

// Exec direto (node prisma/seedUsersBotsDecks.js)
if (import.meta.url === `file://${process.argv[1]}`) {
  seedUsersBotsDecks()
    .catch((e) => {
      console.error("❌ Seed users/bots/decks falhou:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
