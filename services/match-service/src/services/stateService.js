// services/match-service/src/services/stateService.js
// Estado quente (in-memory) do match-service + helpers de shape/sanitize.
// ESM puro.
//
// ✅ AJUSTE: createMatch agora carrega deck ativo do Gateway (Prisma) e compra mão inicial.
// ✅ AJUSTE: quando Gateway enviar botDeckCards, P2 usa o deck do bot seeded (não copia do P1).
// ✅ AJUSTE (NOVO): sanitizeStateForViewer respeita REVEAL_HAND / REVEAL_HAND_CARD corretamente,
//                  usando targetPlayer (mão que está sendo revelada) + visibleTo (quem pode ver) e owner/by.
// ✅ AJUSTE (NOVO): normalizeCard agora normaliza `img` para `/img/cards/<arquivo>.png` (corrige paths quebrados).
// ✅ AJUSTE (NOVO): mulligan: se mão inicial não tiver carta de custo <= 2, refaz 1x (com garantia opcional).
// ⚠️ createMatch é ASYNC (precisa de await no matchController).

import crypto from "crypto";
import axios from "axios";

/**
 * Estado quente (local):
 * matches.get(matchId) => {
 *   id, mode, difficulty,
 *   state,
 *   createdAt,
 *   processedActions: Map<clientActionId, cachedResponse>,
 *   processedActionsOrder: string[]  // para limitar crescimento (demo)
 * }
 */
const matches = new Map();

const MAX_CACHED_ACTIONS = Number(process.env.MAX_CACHED_ACTIONS || 500);

// Gateway (para buscar deck ativo)
const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";

// ✅ mão inicial por regra do PDF (recomendado 5)
const OPENING_HAND_SIZE = Number(process.env.OPENING_HAND_SIZE || 5);

// ✅ Mulligan: se não tiver early play (<=2), refaz 1x
const OPENING_EARLY_MAX_COST = Number(process.env.OPENING_EARLY_MAX_COST || 2);
const OPENING_MULLIGAN_MAX_TRIES = Number(process.env.OPENING_MULLIGAN_MAX_TRIES || 1);
// ✅ garantia dura (evita mão inicial “injogável”): true por padrão
const OPENING_FORCE_EARLY_PLAY =
  String(process.env.OPENING_FORCE_EARLY_PLAY ?? "true") !== "false";

const ENABLE_GATEWAY_DECK_FETCH =
  String(process.env.ENABLE_GATEWAY_DECK_FETCH ?? "true") !== "false";

function nowIso() {
  return new Date().toISOString();
}

function randomId(prefix = "m") {
  const uuid = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
}

function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
}

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function ensureBoard3Slots(boardArr) {
  const b = Array.isArray(boardArr) ? boardArr.slice(0, 3) : [];
  while (b.length < 3) b.push(null);
  return b;
}

// Fisher–Yates shuffle (ok para demo)
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* -------------------- IMG NORMALIZATION -------------------- */

function normalizeImgPath(img) {
  if (!img) return null;

  // Ex: "/img/cards/../../../frontend/public/img/cards/attssoftware.png"
  // -> "/img/cards/attssoftware.png"
  const clean = String(img).replaceAll("\\", "/").trim();
  const file = clean.split("/").filter(Boolean).pop();
  if (!file) return null;

  return `/img/cards/${file}`;
}

/**
 * Normaliza carta para o formato que o rules-service entende.
 * Compatível com:
 * - mock: { id, type, cost, name, life, attack/atk, defense/def, effect }
 * - prisma/raw: { CD_ID, CD_TYPE, CD_COST, CD_NAME, CD_LIFE, CD_ATTACK, CD_DEFENSE, CD_EFFECT_JSON, ... }
 *
 * ⚠️ IMPORTANTE: rules exige cardId -> sempre setar.
 */
function normalizeCard(c) {
  if (!isObject(c)) return null;

  const cardIdRaw = c.cardId ?? c.id ?? c.CD_ID ?? c.CDID ?? null;
  const cardId = cardIdRaw == null ? randomId("card") : String(cardIdRaw);

  const type = toUpper(c.type ?? c.CD_TYPE ?? "UNIT");
  const cost = Number(c.cost ?? c.CD_COST ?? 0);

  const name = String(c.name ?? c.CD_NAME ?? cardId);

  const lifeRaw = c.life ?? c.hp ?? c.CD_LIFE;
  const attackRaw = c.attack ?? c.atk ?? c.CD_ATTACK;
  const defenseRaw = c.defense ?? c.def ?? c.CD_DEFENSE;

  const effect = c.effect ?? c.CD_EFFECT_JSON ?? null;

  const imgRaw = c.img ?? c.image ?? c.CD_IMG ?? c.CD_IMAGE ?? null;

  const out = {
    cardId,
    type: type === "SPELL" ? "SPELL" : "UNIT",
    cost: Number.isFinite(cost) ? cost : 0,
    name,
    effect,
    img: normalizeImgPath(imgRaw),
    hasAbility: Boolean(c.hasAbility ?? c.CD_HAS_ABILITY ?? false),
    abilityCost: c.abilityCost ?? c.CD_ABILITY_COST ?? null,
    abilityLimit: c.abilityLimit ?? c.CD_ABILITY_LIMIT_JSON ?? null,
  };

  // stats só fazem sentido pra UNIT, mas a gente mantém se vier
  if (lifeRaw != null) out.life = Number(lifeRaw);
  if (attackRaw != null) out.attack = Number(attackRaw);
  if (defenseRaw != null) out.defense = Number(defenseRaw);

  // garante números válidos
  if (out.life != null && !Number.isFinite(out.life)) delete out.life;
  if (out.attack != null && !Number.isFinite(out.attack)) delete out.attack;
  if (out.defense != null && !Number.isFinite(out.defense)) delete out.defense;

  return out;
}

/**
 * Garante shape compatível com rules-service.
 * Não “inventa” decks — só garante campos existirem.
 */
function ensureStateShape(state) {
  const s = deepClone(state ?? {});
  s.version = Number.isFinite(Number(s.version)) ? Number(s.version) : 0;

  s.turn = isObject(s.turn) ? s.turn : {};
  s.turn.owner = s.turn.owner === "P2" ? "P2" : "P1";
  s.turn.number = Number.isFinite(Number(s.turn.number)) ? Number(s.turn.number) : 1;
  s.turn.phase = String(s.turn.phase ?? "MAIN");
  s.turn.hasAttacked = Boolean(s.turn.hasAttacked);

  s.players = isObject(s.players) ? s.players : {};
  s.players.P1 = isObject(s.players.P1) ? s.players.P1 : {};
  s.players.P2 = isObject(s.players.P2) ? s.players.P2 : {};

  // jogadores
  s.players.P1.hp = Number.isFinite(Number(s.players.P1.hp)) ? Number(s.players.P1.hp) : 100;
  s.players.P2.hp = Number.isFinite(Number(s.players.P2.hp)) ? Number(s.players.P2.hp) : 100;

  s.players.P1.energyMax = Number.isFinite(Number(s.players.P1.energyMax))
    ? Number(s.players.P1.energyMax)
    : 2;
  s.players.P2.energyMax = Number.isFinite(Number(s.players.P2.energyMax))
    ? Number(s.players.P2.energyMax)
    : 2;

  s.players.P1.energy = Number.isFinite(Number(s.players.P1.energy))
    ? Number(s.players.P1.energy)
    : s.players.P1.energyMax;
  s.players.P2.energy = Number.isFinite(Number(s.players.P2.energy))
    ? Number(s.players.P2.energy)
    : s.players.P2.energyMax;

  ensureArray(s.players.P1, "deck");
  ensureArray(s.players.P1, "hand");
  ensureArray(s.players.P1, "discard");

  ensureArray(s.players.P2, "deck");
  ensureArray(s.players.P2, "hand");
  ensureArray(s.players.P2, "discard");

  // board
  s.board = isObject(s.board) ? s.board : {};
  s.board.P1 = ensureBoard3Slots(s.board.P1);
  s.board.P2 = ensureBoard3Slots(s.board.P2);

  // efeitos
  if (!Array.isArray(s.effects)) s.effects = [];

  return s;
}

/**
 * Cria state inicial puro (rules-friendly).
 * Meta da match fica fora do state (em matches Map).
 */
function createInitialState({ p1PlayerId = 1 } = {}) {
  return ensureStateShape({
    version: 0,
    turn: { owner: "P1", number: 1, phase: "MAIN", hasAttacked: false },
    players: {
      P1: { playerId: p1PlayerId, hp: 100, energyMax: 2, energy: 2, deck: [], hand: [], discard: [] },
      P2: { bot: true, hp: 100, energyMax: 2, energy: 2, deck: [], hand: [], discard: [] },
    },
    board: { P1: [null, null, null], P2: [null, null, null] },
    effects: [],
  });
}

/**
 * Eventos padronizados:
 * { type, payload }
 */
function ev(type, payload = {}) {
  return { type, payload };
}

/**
 * Regra do PDF: deck não pode ficar vazio.
 * Se deck acabar, recicla discard (zona de exclusão) -> deck, embaralha, então compra.
 */
function ensureDeckHasCards(playerObj, events, side, source) {
  ensureArray(playerObj, "deck");
  ensureArray(playerObj, "discard");

  if (playerObj.deck.length > 0) return;

  if (playerObj.discard.length > 0) {
    playerObj.deck = playerObj.discard.splice(0, playerObj.discard.length);
    shuffleInPlace(playerObj.deck);

    events.push(
      ev("DECK_RECYCLED_FROM_DISCARD", {
        player: side,
        deckCount: playerObj.deck.length,
        source,
      })
    );
  }
}

/**
 * Compra 1 carta do topo do deck (com recycle do discard).
 * Retorna { event, drawnCard|null }
 */
function drawCard(state, side, source = "TURN") {
  const p = state.players?.[side];
  if (!p) return { event: ev("DRAW_SKIPPED_INVALID_PLAYER", { player: side }), drawnCard: null };

  // ✅ tenta reciclar antes de desistir
  const eventsTmp = [];
  ensureDeckHasCards(p, eventsTmp, side, source);

  if (!Array.isArray(p.deck) || p.deck.length === 0) {
    return { event: ev("DRAW_SKIPPED_EMPTY_DECK", { player: side, source }), drawnCard: null };
  }

  const top = p.deck.shift();
  const card = normalizeCard(top) ?? top;

  p.hand.push(card);

  return {
    event: ev("CARD_DRAWN", {
      player: side,
      cardId: card?.cardId ?? null,
      handCount: p.hand.length,
      deckCount: p.deck.length,
      source,
    }),
    drawnCard: card,
  };
}

/* -------------------- OPENING HAND + MULLIGAN -------------------- */

function hasEarlyPlay(hand, maxCost = 2) {
  if (!Array.isArray(hand) || hand.length === 0) return false;
  return hand.some((c) => Number(c?.cost ?? 999) <= Number(maxCost));
}

function forceEarlyPlayFromDeck(state, side, maxCost = 2) {
  const p = state.players?.[side];
  if (!p || !Array.isArray(p.deck) || p.deck.length === 0) return false;

  // tenta achar no deck a menor custo (idealmente <= maxCost)
  let bestIdx = -1;
  for (let i = 0; i < p.deck.length; i += 1) {
    const c = normalizeCard(p.deck[i]) ?? p.deck[i];
    const cost = Number(c?.cost ?? 999);

    if (bestIdx < 0) bestIdx = i;
    else {
      const bestCost = Number((normalizeCard(p.deck[bestIdx]) ?? p.deck[bestIdx])?.cost ?? 999);
      if (cost < bestCost) bestIdx = i;
    }

    if (cost <= maxCost) {
      bestIdx = i;
      break;
    }
  }

  if (bestIdx < 0) return false;

  const pickedRaw = p.deck.splice(bestIdx, 1)[0];
  const picked = normalizeCard(pickedRaw) ?? pickedRaw;

  // substitui a primeira carta da mão (pra manter tamanho)
  if (!Array.isArray(p.hand) || p.hand.length === 0) {
    p.hand = [picked];
  } else {
    p.hand[0] = picked;
  }

  return Number(picked?.cost ?? 999) <= Number(maxCost);
}

function drawInitialHand(state, side, n = 3) {
  const s = ensureStateShape(state); // OK clonar/normalizar 1x aqui
  const events = [];
  const times = Number.isFinite(Number(n)) ? Number(n) : 3;

  // 1) compra
  for (let i = 0; i < times; i += 1) {
    const { event } = drawCard(s, side, "INITIAL");
    if (event) events.push(event);
  }

  // 2) mulligan (1x) se não tiver early play
  let tries = 0;
  while (
    tries < OPENING_MULLIGAN_MAX_TRIES &&
    !hasEarlyPlay(s.players?.[side]?.hand, OPENING_EARLY_MAX_COST)
  ) {
    tries += 1;

    const p = s.players?.[side];
    if (!p) break;

    // devolve mão pro deck, embaralha, recompra
    const hand = Array.isArray(p.hand) ? p.hand.splice(0) : [];
    if (hand.length > 0) p.deck.push(...hand);
    shuffleInPlace(p.deck);

    events.push(
      ev("MULLIGAN_PERFORMED", {
        player: side,
        try: tries,
        reason: `NO_COST_LE_${OPENING_EARLY_MAX_COST}`,
      })
    );

    for (let i = 0; i < times; i += 1) {
      const { event } = drawCard(s, side, "INITIAL_MULLIGAN");
      if (event) events.push(event);
    }
  }

  // 3) garantia dura (opcional)
  if (
    OPENING_FORCE_EARLY_PLAY &&
    !hasEarlyPlay(s.players?.[side]?.hand, OPENING_EARLY_MAX_COST)
  ) {
    const ok = forceEarlyPlayFromDeck(s, side, OPENING_EARLY_MAX_COST);
    if (ok) {
      events.push(
        ev("OPENING_HAND_FORCED_EARLY_PLAY", {
          player: side,
          maxCost: OPENING_EARLY_MAX_COST,
        })
      );
    }
  }

  return { state: s, events };
}

/**
 * Busca deck ativo no gateway (internal endpoint).
 * Retorna lista de cartas (raw) ou [].
 */
async function fetchActiveDeckCards(p1PlayerId, reqHeaders = {}) {
  const url = `${GATEWAY_URL}/internal/players/${p1PlayerId}/active-deck`;

  const { data } = await axios.get(url, {
    timeout: 5000,
    headers: {
      "x-request-id": reqHeaders["x-request-id"] || "match-service",
      ...(process.env.INTERNAL_API_KEY ? { "x-internal-key": process.env.INTERNAL_API_KEY } : {}),
    },
  });

  if (!data?.success || !Array.isArray(data.cards)) return [];
  return data.cards;
}

/**
 * Expande botDeckCards [{quantity, card}] para lista flat de cartas normalizadas.
 * Clampa quantity para evitar explosão (demo).
 */
function expandBotDeckCards(botDeckCards) {
  if (!Array.isArray(botDeckCards) || botDeckCards.length === 0) return [];

  const out = [];
  for (const entry of botDeckCards) {
    const qtyRaw = entry?.quantity ?? entry?.DECK_CD_QUANTITY ?? 1;
    const qty = Number.isFinite(Number(qtyRaw)) ? Number(qtyRaw) : 1;

    const rawCard = entry?.card ?? entry;
    const n = Math.max(1, Math.min(qty, 10)); // clamp demo
    for (let i = 0; i < n; i += 1) out.push(normalizeCard(rawCard));
  }

  return out.filter(Boolean);
}

/**
 * Cria partida.
 * - Se debug vier, mantém compatibilidade (aplica debug decks).
 * - Se não vier debug e ENABLE_GATEWAY_DECK_FETCH=true: carrega deck ativo do player no gateway e compra mão inicial.
 * - ✅ Se botDeckCards vier (do Gateway), P2 usa esse deck.
 *
 * debug esperado:
 * {
 *   p1Deck: [cards...],
 *   p2Deck: [cards...],
 *   initialHandSize: number
 * }
 */
async function createMatch({
  mode = "BOT",
  difficulty = "easy",
  p1PlayerId = 1,

  // ✅ NOVO: deck do bot (vindo do gateway)
  botDeckCards = null,

  debug = null,
  reqHeaders = {},
} = {}) {
  const id = randomId("m");
  let state = createInitialState({ p1PlayerId });

  const events = [];

  // 1) Debug decks (mantém o que você já tinha)
  if (isObject(debug)) {
    const p1Deck = Array.isArray(debug.p1Deck) ? debug.p1Deck.map(normalizeCard).filter(Boolean) : [];
    const p2Deck = Array.isArray(debug.p2Deck) ? debug.p2Deck.map(normalizeCard).filter(Boolean) : [];

    state.players.P1.deck = p1Deck;
    state.players.P2.deck = p2Deck;

    events.push(ev("DEBUG_DECKS_APPLIED", { p1Deck: p1Deck.length, p2Deck: p2Deck.length }));

    const handSize = Number.isFinite(Number(debug.initialHandSize))
      ? Number(debug.initialHandSize)
      : OPENING_HAND_SIZE;

    const p1Draw = drawInitialHand(state, "P1", handSize);
    state = p1Draw.state;
    events.push(...p1Draw.events);

    const p2Draw = drawInitialHand(state, "P2", handSize);
    state = p2Draw.state;
    events.push(...p2Draw.events);
  } else if (ENABLE_GATEWAY_DECK_FETCH) {
    // 2) buscar deck ativo do gateway e comprar mão inicial
    try {
      const rawCards = await fetchActiveDeckCards(p1PlayerId, reqHeaders);

      if (rawCards.length === 0) {
        events.push(ev("ACTIVE_DECK_EMPTY_OR_NOT_FOUND", { playerId: p1PlayerId }));
      } else {
        const normalized = rawCards.map(normalizeCard).filter(Boolean);
        shuffleInPlace(normalized);

        // P1: deck + mão inicial
        state.players.P1.deck = normalized;

        const p1Draw = drawInitialHand(state, "P1", OPENING_HAND_SIZE);
        state = p1Draw.state;
        events.push(ev("ACTIVE_DECK_LOADED_FROM_GATEWAY", { playerId: p1PlayerId, deckSize: normalized.length }));
        events.push(...p1Draw.events);

        // P2 (Bot): ✅ usa deck seeded se disponível; senão, fallback igual P1 (compat)
        const seededBotDeck = expandBotDeckCards(botDeckCards);

        if (seededBotDeck.length > 0) {
          shuffleInPlace(seededBotDeck);
          state.players.P2.deck = seededBotDeck;

          const p2Draw = drawInitialHand(state, "P2", OPENING_HAND_SIZE);
          state = p2Draw.state;
          events.push(ev("BOT_DECK_LOADED_FROM_GATEWAY", { deckSize: seededBotDeck.length }));
          events.push(...p2Draw.events);
        } else {
          const botDeck = rawCards.map(normalizeCard).filter(Boolean);
          shuffleInPlace(botDeck);
          state.players.P2.deck = botDeck;

          const p2Draw = drawInitialHand(state, "P2", OPENING_HAND_SIZE);
          state = p2Draw.state;
          events.push(ev("BOT_DECK_LOADED_FROM_P1_DECK", { deckSize: botDeck.length }));
          events.push(...p2Draw.events);
        }
      }
    } catch (e) {
      events.push(
        ev("ACTIVE_DECK_FETCH_FAILED", {
          playerId: p1PlayerId,
          message: e?.message || "unknown",
        })
      );
      // mantém state vazio (mas match cria mesmo assim)
    }
  }

  const obj = {
    id,
    mode,
    difficulty,
    state: ensureStateShape(state),
    createdAt: nowIso(),
    processedActions: new Map(),
    processedActionsOrder: [],
  };

  matches.set(id, obj);

  return { match: obj, events };
}

function getMatch(matchId) {
  return matches.get(matchId) || null;
}

function getState(matchId) {
  const m = getMatch(matchId);
  return m ? m.state : null;
}

function setState(matchId, newState) {
  const m = getMatch(matchId);
  if (!m) return null;
  m.state = ensureStateShape(newState);
  return m.state;
}

function getMode(matchId) {
  const m = getMatch(matchId);
  return m?.mode || null;
}

function getDifficulty(matchId) {
  const m = getMatch(matchId);
  return m?.difficulty || "easy";
}

/**
 * Idempotência (demo)
 */
function getCachedActionResult(matchId, clientActionId) {
  if (!clientActionId) return null;
  const m = getMatch(matchId);
  if (!m) return null;
  return m.processedActions.get(clientActionId) || null;
}

function setCachedActionResult(matchId, clientActionId, response) {
  if (!clientActionId) return;
  const m = getMatch(matchId);
  if (!m) return;

  if (!m.processedActions.has(clientActionId)) {
    m.processedActionsOrder.push(clientActionId);
  }
  m.processedActions.set(clientActionId, response);

  // Evita crescer infinito
  while (m.processedActionsOrder.length > MAX_CACHED_ACTIONS) {
    const oldest = m.processedActionsOrder.shift();
    if (oldest) m.processedActions.delete(oldest);
  }
}

/* -------------------- REVEAL helpers (tolerantes) -------------------- */

function effectKind(e) {
  return String(e?.kind ?? e?.type ?? e?.effect ?? "").toUpperCase();
}

function isEffectActive(e, state) {
  // Se tiver expiração por turno/round, respeita; se não tiver, assume ativo (demo-friendly).
  const curTurn = Number(state?.turn?.number ?? 1);

  const expiresAtTurn =
    e?.expiresAtTurn ?? e?.expiresAt ?? e?.expiresTurn ?? e?.untilTurn ?? e?.turnUntil ?? null;

  const expiresAtRound = e?.expiresAtRound ?? e?.roundUntil ?? e?.untilRound ?? null;

  if (Number.isFinite(Number(expiresAtTurn))) {
    return curTurn <= Number(expiresAtTurn);
  }
  if (Number.isFinite(Number(expiresAtRound))) {
    return curTurn <= Number(expiresAtRound);
  }
  return true;
}

function sideOfViewer(viewer) {
  return viewer === "P2" ? "P2" : "P1";
}

function otherSide(viewerSide) {
  return viewerSide === "P1" ? "P2" : "P1";
}

/**
 * Semântica CORRETA:
 * - targetPlayer = mão que está sendo revelada (quem "possui" as cartas)
 * - visibleTo/viewer = quem pode ver
 * - owner/by/from = quem causou o efeito (caster)
 *
 * Aceita vários campos tolerantes:
 * - visibleTo | viewer | forPlayer | appliesTo | visibleFor  (quem pode ver)
 * - targetPlayer | to | target | side          (mão-alvo)
 * - owner | by | from | player                (caster)
 */
function canViewerSeeOtherHand(state, viewer) {
  const v = sideOfViewer(viewer);
  const other = otherSide(v);
  const effects = Array.isArray(state?.effects) ? state.effects : [];

  return effects.some((e) => {
    if (effectKind(e) !== "REVEAL_HAND") return false;
    if (!isEffectActive(e, state)) return false;

    const target = String(e?.targetPlayer ?? e?.to ?? e?.target ?? e?.side ?? "").toUpperCase();
    if (target && target !== other) return false;

    const explicitVisibleTo = String(
      e?.visibleTo ?? e?.viewer ?? e?.forPlayer ?? e?.appliesTo ?? e?.visibleFor ?? ""
    ).toUpperCase();

    // Se o efeito declara explicitamente quem vê, respeita isso.
    if (explicitVisibleTo) return explicitVisibleTo === v;

    // Caso contrário, assume que quem causou o efeito (owner/by/from/player) é quem vê.
    const by = String(e?.owner ?? e?.by ?? e?.from ?? e?.player ?? "").toUpperCase();
    return by ? by === v : true;
  });
}

function getRevealCardIdsForOtherHand(state, viewer) {
  const v = sideOfViewer(viewer);
  const other = otherSide(v);
  const effects = Array.isArray(state?.effects) ? state.effects : [];
  const ids = [];

  for (const e of effects) {
    if (effectKind(e) !== "REVEAL_HAND_CARD") continue;
    if (!isEffectActive(e, state)) continue;

    const target = String(e?.targetPlayer ?? e?.to ?? e?.target ?? e?.side ?? "").toUpperCase();
    if (target && target !== other) continue;

    const explicitVisibleTo = String(
      e?.visibleTo ?? e?.viewer ?? e?.forPlayer ?? e?.appliesTo ?? e?.visibleFor ?? ""
    ).toUpperCase();

    if (explicitVisibleTo) {
      if (explicitVisibleTo !== v) continue;
    } else {
      const by = String(e?.owner ?? e?.by ?? e?.from ?? e?.player ?? "").toUpperCase();
      if (by && by !== v) continue;
    }

    const cardId =
      e?.meta?.cardId ??
      e?.cardId ??
      e?.payload?.cardId ??
      e?.target?.cardId ??
      e?.data?.cardId ??
      null;

    if (cardId != null) ids.push(String(cardId));
  }

  return ids;
}

/**
 * Sanitização:
 * - viewer = "P1" ou "P2"
 * - não expõe a mão real do inimigo
 * - expõe handCount do inimigo
 *
 * ✅ Respeita:
 * - REVEAL_HAND: revela mão inteira do inimigo para o viewer
 * - REVEAL_HAND_CARD: revela apenas carta(s) específica(s) do inimigo para o viewer
 *
 * IMPORTANTE:
 * - O rules-service deve sempre receber o state COMPLETO (sem sanitize).
 * - sanitize é só para retornar ao front/gateway.
 */
function sanitizeStateForViewer(state, viewer = "P1") {
  const s = ensureStateShape(state);
  const v = sideOfViewer(viewer);
  const other = otherSide(v);

  const cloned = deepClone(s);

  ensureArray(cloned.players[v], "hand");
  ensureArray(cloned.players[other], "hand");

  const enemyHand = cloned.players[other].hand;
  cloned.players[other].handCount = enemyHand.length;

  // 1) REVEAL_HAND -> mostra tudo
  const revealAll = canViewerSeeOtherHand(s, v);
  if (revealAll) {
    return cloned;
  }

  // 2) REVEAL_HAND_CARD -> mostra só ids revelados (o resto vira placeholder hidden)
  const revealIds = getRevealCardIdsForOtherHand(s, v);
  if (revealIds.length > 0) {
    cloned.players[other].hand = enemyHand.map((c) => {
      const cid = String(c?.cardId ?? c?.id ?? c?.CD_ID ?? "");
      if (cid && revealIds.includes(cid)) return { ...c, revealed: true };
      return { hidden: true };
    });
    return cloned;
  }

  // 3) padrão: não mostra nada
  cloned.players[other].hand = [];
  return cloned;
}

export {
  // core
  createMatch,
  getMatch,
  getState,
  setState,

  // meta
  getMode,
  getDifficulty,

  // idempotência
  getCachedActionResult,
  setCachedActionResult,

  // util
  sanitizeStateForViewer,
  ensureStateShape,
  normalizeCard,

  // (útil em testes locais)
  drawCard,
  drawInitialHand,
};

export default {
  createMatch,
  getMatch,
  getState,
  setState,
  getMode,
  getDifficulty,
  getCachedActionResult,
  setCachedActionResult,
  sanitizeStateForViewer,
  ensureStateShape,
  normalizeCard,
  drawCard,
  drawInitialHand,
};
