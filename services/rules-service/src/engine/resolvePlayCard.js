// rules-service/src/engine/resolvePlayCard.js
// Observações:
// - SPELL é negado aqui: deve ser CAST_SPELL.
// - Snapshot padroniza owner/originalOwner, instanceId, lifeMax, passives/triggers/abilities.
// - Mantém compatibilidade com dados antigos (CD_* / mocks).

import resolveAbility from "./resolveAbility.js";

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

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function ownerKey(state) {
  const owner = state?.turn?.owner;
  return owner === "P1" || owner === "P2" ? owner : null;
}

function reject(code, message, events = []) {
  return { rejected: { code, message }, events };
}

function extractCardId(card) {
  const id = card?.cardId ?? card?.id ?? card?.CD_ID ?? card?.CDID;
  return id == null ? null : String(id);
}

function extractType(card) {
  return toUpper(card?.type ?? card?.CD_TYPE, "");
}

function extractCost(card) {
  const n = Number(card?.cost ?? card?.CD_COST ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function stat(card, key, fallback = 0) {
  const map = {
    life: [card?.life, card?.hp, card?.CD_LIFE],
    attack: [card?.attack, card?.atk, card?.CD_ATTACK],
    defense: [card?.defense, card?.def, card?.CD_DEFENSE],
  };
  const arr = map[key] ?? [card?.[key], card?.[key?.toUpperCase?.() ?? key]];
  for (const v of arr) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function bumpVersion(st) {
  const v = Number(st.version ?? 0);
  st.version = Number.isFinite(v) ? v + 1 : 1;
}

function ensureArray(obj, key) {
  if (!Array.isArray(obj[key])) obj[key] = [];
  return obj[key];
}

function ensureTurn(st) {
  if (!st.turn || typeof st.turn !== "object") st.turn = {};
  if (typeof st.turn.phase !== "string") st.turn.phase = "MAIN";
  if (typeof st.turn.hasAttacked !== "boolean") st.turn.hasAttacked = false;
  if (typeof st.turn.abilityUsed !== "boolean") st.turn.abilityUsed = false;
  if (!("abilityUsedBy" in st.turn)) st.turn.abilityUsedBy = null;
  if (typeof st.turn.number !== "number" || !Number.isFinite(st.turn.number)) st.turn.number = 1;
}

function ensureEffects(st) {
  ensureArray(st, "effects");
  return st.effects;
}

function isValidSlot(s) {
  return Number.isInteger(s) && s >= 0 && s <= 2;
}

function nowTs() {
  return Date.now();
}

function genInstanceId(owner, cardId) {
  const rnd = Math.floor(Math.random() * 1e9);
  return `u_${owner}_${cardId}_${nowTs()}_${rnd}`;
}

// ====== effects helpers ======
function consumeFirstEffect(st, predicate) {
  const effects = ensureEffects(st);
  const idx = effects.findIndex(predicate);
  if (idx === -1) return null;
  const [removed] = effects.splice(idx, 1);
  return removed ?? null;
}

function computeAndConsumeCostTaxIfAny(st, owner, events) {
  // efeito: { kind:"COST_TAX_NEXT_CARD", targetPlayer:"P1", amount:1, ... }
  const eff = consumeFirstEffect(
    st,
    (e) =>
      e &&
      typeof e === "object" &&
      toUpper(e.kind, "") === "COST_TAX_NEXT_CARD" &&
      e.targetPlayer === owner
  );

  if (!eff) return 0;

  const amt = Number(eff.amount ?? 0);
  const add = Number.isFinite(amt) ? Math.max(0, amt) : 0;

  events.push({
    type: "EFFECT_CONSUMED",
    payload: { kind: "COST_TAX_NEXT_CARD", targetPlayer: owner, amount: add, source: eff?.meta?.spell ?? eff?.meta?.source ?? "SPELL" },
  });

  return add;
}

// ====== Normalização de "features" da carta para o snapshot ======
function normalizeFeaturesFromCard(card) {
  const effect = card?.effect ?? card?.CD_EFFECT_JSON ?? null;

  const base = {
    passives: [],
    triggers: [],
    abilities: [],
    onSummonAbilityKey: null,
    onSummonPayload: null,
  };

  const readArr = (arr) =>
    Array.isArray(arr)
      ? arr.filter((x) => x && typeof x === "object" && x.key).map((x) => ({ ...x, key: String(x.key) }))
      : [];

  base.passives = readArr(card?.passives);
  base.triggers = readArr(card?.triggers);
  base.abilities = readArr(card?.abilities);

  if (effect && typeof effect === "object") {
    base.passives = base.passives.concat(readArr(effect.passives));
    base.triggers = base.triggers.concat(readArr(effect.triggers));
    base.abilities = base.abilities.concat(readArr(effect.abilities));

    if (effect.onSummonAbilityKey) base.onSummonAbilityKey = String(effect.onSummonAbilityKey);
    if (effect.onSummonPayload && typeof effect.onSummonPayload === "object") base.onSummonPayload = effect.onSummonPayload;
  }

  // fallback legacy -> abilityKey
  if (base.abilities.length === 0 && (card?.hasAbility ?? card?.CD_HAS_ABILITY)) {
    const k = effect?.abilityKey ?? effect?.key ?? effect?.kind ?? null;
    if (k) {
      base.abilities.push({
        key: String(k),
        cost: card?.abilityCost ?? card?.CD_ABILITY_COST ?? null,
        limit: card?.abilityLimit ?? card?.CD_ABILITY_LIMIT_JSON ?? null,
      });
    }
  }

  if (!base.onSummonAbilityKey && card?.onSummonAbilityKey) base.onSummonAbilityKey = String(card.onSummonAbilityKey);

  const uniqByKey = (arr) => {
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      const k = String(it.key);
      const up = k.toUpperCase();
      if (seen.has(up)) continue;
      seen.add(up);
      out.push(it);
    }
    return out;
  };

  base.passives = uniqByKey(base.passives);
  base.triggers = uniqByKey(base.triggers);
  base.abilities = uniqByKey(base.abilities);

  return base;
}

export function resolvePlayCard(state, actionInput) {
  const action = normalizeAction(actionInput);
  const type = toUpper(action?.type, "");
  const payload = isObject(action?.payload) ? action.payload : {};

  if (type !== "PLAY_CARD") {
    return reject("INVALID_RESOLVER", "resolvePlayCard chamado com ação diferente de PLAY_CARD.");
  }

  const owner = ownerKey(state);
  if (!owner) return reject("INVALID_TURN_OWNER", "turn.owner inválido (esperado P1/P2).");

  const cardId = payload.cardId;
  const slot = payload.slot;

  if (cardId == null || String(cardId).trim() === "") {
    return reject("MISSING_CARD_ID", "cardId é obrigatório.");
  }
  if (!isValidSlot(slot)) {
    return reject("INVALID_SLOT", "slot deve ser um inteiro entre 0 e 2.");
  }

  let newState = deepClone(state);
  ensureTurn(newState);
  ensureEffects(newState);

  // ===== Timing =====
  const phase = toUpper(newState.turn.phase, "MAIN");
  if (phase !== "MAIN") {
    return reject("INVALID_PHASE", `PLAY_CARD não permitido na fase '${phase}'.`);
  }
  if (Boolean(newState.turn.hasAttacked)) {
    return reject("TURN_ALREADY_ENDED_BY_ATTACK", "Após atacar, o turno é encerrado.");
  }

  // ===== Estrutura mínima =====
  if (!newState.players || !newState.players[owner]) {
    return reject("INVALID_PLAYER", "players[turn.owner] não encontrado no state.");
  }
  if (!newState.board || !Array.isArray(newState.board[owner])) {
    return reject("INVALID_BOARD", "board do jogador do turno inválido.");
  }
  if (newState.board[owner].length < 3) {
    newState.board[owner] = [null, null, null];
  }

  const me = newState.players[owner];
  const myBoard = newState.board[owner];

  if (!Array.isArray(me.hand)) me.hand = [];
  ensureArray(me, "discard");
  ensureArray(me, "deck");

  if (myBoard[slot] != null) {
    return reject("SLOT_OCCUPIED", "O slot já está ocupado.");
  }

  const targetId = String(cardId);
  const handIndex = me.hand.findIndex((c) => extractCardId(c) === targetId);
  if (handIndex === -1) {
    return reject("CARD_NOT_IN_HAND", "A carta informada não está na mão do jogador.");
  }

  const card = me.hand[handIndex];
  const cardType = extractType(card);
  if (cardType === "SPELL") {
    return reject("SPELL_REQUIRES_CAST", "Carta SPELL deve ser usada com CAST_SPELL.");
  }

  // ===== Eventos base (vamos preenchendo) =====
  const events = [{ type: "ACTION_META", payload: { actionType: "PLAY_CARD", player: owner } }];

  // ===== Custo + TAX (spells) =====
  const baseCost = extractCost(card);
  const costTax = computeAndConsumeCostTaxIfAny(newState, owner, events);
  const cost = Math.max(0, baseCost + costTax);

  const energy = Number(me.energy ?? 0);
  if (!Number.isFinite(energy)) return reject("INVALID_ENERGY", "Energia do jogador inválida no state.", events);
  if (baseCost < 0) return reject("INVALID_CARD_COST", "Custo da carta inválido (negativo).", events);
  if (energy < cost) {
    return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${cost}, energia=${energy}.`, events);
  }

  // 1) Remove da mão
  const [playedCard] = me.hand.splice(handIndex, 1);

  // 2) Gasta energia (já com tax aplicado)
  me.energy = energy - cost;

  // 3) Snapshot unit
  const unitLife = Math.max(1, stat(playedCard, "life", 1));
  const unitAttack = Math.max(0, stat(playedCard, "attack", 0));
  const unitDefense = Math.max(0, stat(playedCard, "defense", 0));

  const features = normalizeFeaturesFromCard(playedCard);
  const instanceId = genInstanceId(owner, targetId);

  const unitSnapshot = {
    unitId: instanceId, // compat
    instanceId,
    cardId: targetId,
    name: playedCard?.name ?? playedCard?.CD_NAME ?? "Unit",
    type: "UNIT",

    // custo pago (já com tax, se houver)
    cost,

    // ownership (necessário para cartas tipo Evil Twin)
    owner,
    originalOwner: owner,

    // stats
    life: unitLife,
    lifeMax: unitLife,

    // auxilia o resolveAttack (curas que inferem max)
    summonedLifeMax: unitLife,
    initialLife: unitLife,

    attack: unitAttack,
    defense: unitDefense,

    // features normalizadas
    passives: features.passives,
    triggers: features.triggers,
    abilities: features.abilities,

    // onSummon hook
    onSummonAbilityKey: features.onSummonAbilityKey,
    onSummonPayload: features.onSummonPayload,

    // legacy fields (mantém, mas prefira usar passives/triggers/abilities)
    effect: playedCard?.effect ?? playedCard?.CD_EFFECT_JSON ?? null,
    hasAbility: Boolean(playedCard?.hasAbility ?? playedCard?.CD_HAS_ABILITY ?? false),
    abilityCost: playedCard?.abilityCost ?? playedCard?.CD_ABILITY_COST ?? null,
    abilityLimit: playedCard?.abilityLimit ?? playedCard?.CD_ABILITY_LIMIT_JSON ?? null,

    // meta
    summonedTurn: Number(newState.turn.number ?? 1),
    summonedBy: owner,
    createdAt: nowTs(),
    _flags: {},
  };

  // 4) Coloca no board
  myBoard[slot] = unitSnapshot;

  // 5) Eventos do play
  events.push({ type: "ENERGY_SPENT", payload: { player: owner, amount: cost, energyAfter: me.energy, baseCost, tax: costTax } });
  events.push({ type: "CARD_MOVED", payload: { player: owner, cardId: targetId, from: "HAND", to: "BOARD", slot } });
  events.push({
    type: "UNIT_SUMMONED",
    payload: {
      player: owner,
      slot,
      unit: {
        unitId: unitSnapshot.unitId,
        cardId: unitSnapshot.cardId,
        name: unitSnapshot.name,
        life: unitSnapshot.life,
        attack: unitSnapshot.attack,
        defense: unitSnapshot.defense,
      },
    },
  });

  // 6) OnSummon grátis (respeita 1 habilidade/turno)
  if (unitSnapshot.onSummonAbilityKey) {
    if (newState.turn.abilityUsed) {
      events.push({
        type: "ON_SUMMON_ABILITY_SKIPPED_LIMIT",
        payload: { player: owner, slot, unitId: unitSnapshot.unitId, cardId: unitSnapshot.cardId, abilityKey: unitSnapshot.onSummonAbilityKey },
      });
    } else {
      const internalAction = {
        type: "ACTIVATE_ABILITY",
        payload: {
          source: { slot },
          abilityKey: unitSnapshot.onSummonAbilityKey,
          ...(unitSnapshot.onSummonPayload ? { ...unitSnapshot.onSummonPayload } : {}),
        },
      };

      const beforeVersion = Number(newState.version ?? 0);

      const res = resolveAbility(newState, internalAction, {
        internal: true,
        costOverride: 0,
        triggeredBy: "ON_SUMMON",
      });

      if (res?.rejected) {
        // não desfaz invocação; apenas registra
        events.push({
          type: "ON_SUMMON_ABILITY_REJECTED",
          payload: {
            player: owner,
            slot,
            unitId: unitSnapshot.unitId,
            cardId: unitSnapshot.cardId,
            abilityKey: unitSnapshot.onSummonAbilityKey,
            reason: res.rejected,
          },
        });
      } else if (res?.newState) {
        newState = res.newState;
        ensureTurn(newState);
        ensureEffects(newState);

        if (Array.isArray(res.events) && res.events.length) {
          events.push(...res.events);
        }

        // Se resolveAbility já bumpou a versão, não bumpamos 2x
        const afterVersion = Number(newState.version ?? 0);
        if (Number.isFinite(afterVersion) && afterVersion !== beforeVersion) {
          // ok, já foi bumpado internamente
        }
      }
    }
  }


  const vNow = Number(newState.version ?? 0);
  if (!Number.isFinite(vNow)) newState.version = 0;

  const lastType = events.length ? String(events[events.length - 1]?.type ?? "") : "";
  if (lastType !== "STATE_VERSION_BUMP") {
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
  }

  return { newState, events };
}

export default resolvePlayCard;
