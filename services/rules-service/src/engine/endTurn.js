// rules-service/src/engine/endTurn.js
// Resolver END_TURN (e também usado internamente pelo resolveAttack).
//
// Regras aplicadas (documento oficial):
// - Estrutura do turno: Compra -> Principal -> Ataque (opcional, encerra turno) -> Fim
// - No início de cada turno: compra 1 carta; energia atual restaura ao máximo; energia máxima +1
// - Se o deck acabar: reutiliza Zona de Exclusão (discard) como novo deck
// - Campo tem 3 slots por jogador (E/C/D)

function normalizeAction(input) {
  if (!input) return null;
  if (input.action && typeof input.action === "object") return input.action;
  return input;
}

function deepClone(obj) {
  if (typeof structuredClone === "function") return structuredClone(obj);
  return JSON.parse(JSON.stringify(obj));
}

function toUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
}

function ownerKey(state) {
  const o = state?.turn?.owner;
  return o === "P1" || o === "P2" ? o : null;
}

function otherKey(k) {
  return k === "P1" ? "P2" : "P1";
}

function reject(code, message, events = []) {
  return { rejected: { code, message }, events };
}

function bumpVersion(st) {
  const v = Number(st.version ?? 0);
  st.version = Number.isFinite(v) ? v + 1 : 1;
}

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function getHp(playerObj) {
  const hp = Number(playerObj?.hp ?? playerObj?.life ?? 100);
  return Number.isFinite(hp) ? hp : 100;
}

function isGameOver(st) {
  const hp1 = getHp(st?.players?.P1);
  const hp2 = getHp(st?.players?.P2);
  return hp1 <= 0 || hp2 <= 0;
}

// Fisher–Yates shuffle (determinístico não é necessário aqui)
function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Regras: se o deck acabar, recicla a Zona de Exclusão (discard) para virar deck novamente.
function ensureDeckHasCards(pl, events, who) {
  ensureArray(pl, "deck");
  ensureArray(pl, "discard");

  if (pl.deck.length > 0) return;

  if (pl.discard.length > 0) {
    // move tudo do discard para o deck e embaralha
    pl.deck = pl.discard.splice(0, pl.discard.length);
    shuffleInPlace(pl.deck);

    events.push({
      type: "DECK_RECYCLED_FROM_DISCARD",
      payload: { player: who, deckCount: pl.deck.length },
    });
  }
}

function applyStartOfTurn(st, who, events) {
  const pl = st.players[who];

  // ===== Energia: energiaMax +1; energia = energiaMax =====
  const max = Number(pl.energyMax ?? 0);
  const newMax = Number.isFinite(max) ? max + 1 : 1;
  pl.energyMax = newMax;
  pl.energy = newMax;

  events.push({
    type: "ENERGY_MAX_INCREASED",
    payload: { player: who, energyMax: pl.energyMax },
  });
  events.push({
    type: "ENERGY_REFILLED",
    payload: { player: who, energy: pl.energy },
  });

  // ===== Compra 1 carta (com recycle se deck vazio) =====
  ensureArray(pl, "hand");
  ensureArray(pl, "deck");
  ensureArray(pl, "discard");

  ensureDeckHasCards(pl, events, who);

  if (pl.deck.length > 0) {
    const drawn = pl.deck.shift();
    pl.hand.push(drawn);

    const drawnId = drawn?.cardId ?? drawn?.id ?? drawn?.CD_ID ?? null;
    events.push({
      type: "CARD_DRAWN",
      payload: { player: who, cardId: drawnId, handCount: pl.hand.length, deckCount: pl.deck.length },
    });
  } else {
    // Sem deck e sem discard: não compra (estado bem raro; mas mantém o engine robusto)
    events.push({
      type: "DRAW_SKIPPED_NO_CARDS_AVAILABLE",
      payload: { player: who },
    });
  }
}

export function resolveEndTurn(state, actionInput, options = {}) {
  const action = normalizeAction(actionInput);
  const type = toUpper(action?.type, "END_TURN");

  // Permite uso interno (por ataque) mesmo sem action formal
  if (type !== "END_TURN" && !options.internal) {
    return reject("INVALID_RESOLVER", "endTurn chamado com ação diferente de END_TURN.");
  }

  const owner = ownerKey(state);
  if (!owner) return reject("INVALID_TURN_OWNER", "turn.owner inválido (esperado P1/P2).");

  const newState = deepClone(state);

  if (!newState.players?.P1 || !newState.players?.P2) {
    return reject("INVALID_PLAYERS", "players.P1 e players.P2 são obrigatórios.");
  }

  // Se já acabou o jogo, não gira turno
  if (isGameOver(newState)) {
    newState.turn = newState.turn || {};
    newState.turn.phase = "ENDED";
    const events = [{ type: "GAME_ALREADY_ENDED", payload: {} }];
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  const events = [];

  const prevOwner = owner;
  const nextOwner = otherKey(prevOwner);

  const prevTurnNum = Number(newState.turn?.number ?? 1);
  const nextTurnNum = prevTurnNum + 1;

  events.push({
    type: "TURN_ENDED",
    payload: {
      player: prevOwner,
      turnNumber: prevTurnNum,
      reason: options.reason ?? "MANUAL",
    },
  });

   // Troca turno
  newState.turn = newState.turn || {};
  newState.turn.owner = nextOwner;
  newState.turn.number = nextTurnNum;
  newState.turn.phase = "MAIN";
  newState.turn.hasAttacked = false;

  // ✅ Reset do limitador global de habilidades (1 por turno)
  newState.turn.abilityUsed = false;
  newState.turn.abilityUsedBy = null;

  events.push({
    type: "TURN_LIMITS_RESET",
    payload: { player: nextOwner, hasAttacked: false, abilityUsed: false },
  });

  // Início do turno do próximo jogador: energia + compra
  applyStartOfTurn(newState, nextOwner, events);

  events.push({
    type: "TURN_STARTED",
    payload: {
      player: nextOwner,
      turnNumber: nextTurnNum,
      phase: "MAIN",
    },
  });

  bumpVersion(newState);
  events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });

  return { newState, events };
}

export default resolveEndTurn;
