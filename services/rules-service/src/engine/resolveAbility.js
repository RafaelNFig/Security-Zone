// rules-service/src/engine/resolveAbility.js
// Resolver ACTIVATE_ABILITY (habilidades opcionais com custo).
//
// Regras suportadas:
// - Habilidades são opcionais: jogador escolhe ativar via ação ACTIVATE_ABILITY.
// - Custo de habilidade consome energia do jogador (ou costOverride).
// - Apenas 1 habilidade por turno (limite global): state.turn.abilityUsed.
// - Timing: só na fase MAIN e antes do ataque (após atacar não pode).
//
// Suporte a "uso interno" (ex.: onSummon grátis):
// - resolveAbility(state, action, { internal:true, costOverride:0, triggeredBy:"ON_SUMMON" })
// - Ainda respeita a regra de 1 habilidade por turno.
//
// Observação: Este arquivo NÃO implementa todas as habilidades do PDF.
// Ele implementa a infraestrutura + um conjunto de habilidades base.
// Você pode adicionar novas habilidades no registry ABILITIES abaixo.

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

function ensureTurn(st) {
  if (!st.turn || typeof st.turn !== "object") st.turn = {};
  if (typeof st.turn.phase !== "string") st.turn.phase = "MAIN";
  if (typeof st.turn.hasAttacked !== "boolean") st.turn.hasAttacked = false;

  // Novo controle global por turno
  if (typeof st.turn.abilityUsed !== "boolean") st.turn.abilityUsed = false;
  if (!st.turn.abilityUsedBy) st.turn.abilityUsedBy = null;
}

function isValidSlot(s) {
  return Number.isInteger(s) && s >= 0 && s <= 2;
}

function getEnergy(pl) {
  const e = Number(pl?.energy ?? 0);
  return Number.isFinite(e) ? e : 0;
}

function setEnergy(pl, val) {
  pl.energy = val;
}

// ====== Estrutura de efeitos temporários (mínimo) ======
// Você pode evoluir isso depois para durations mais completas.
function ensureEffects(st) {
  ensureArray(st, "effects");
  return st.effects;
}

/**
 * Adiciona um efeito temporário ou status no state.
 * @param {object} st
 * @param {object} eff { kind, owner, targetPlayer, slot, amount, expiresAtTurn?, expiresAtRound?, meta? }
 */
function addEffect(st, eff) {
  const effects = ensureEffects(st);
  effects.push({
    id: `eff_${Date.now()}_${Math.floor(Math.random() * 1e9)}`,
    ts: Date.now(),
    ...eff,
  });
}

// ====== Helpers p/ acessar board ======
function getBoard(st, who) {
  const b = st?.board?.[who];
  return Array.isArray(b) ? b : null;
}

function getUnitAt(st, who, slot) {
  const b = getBoard(st, who);
  if (!b || b.length < 3) return null;
  return b[slot] ?? null;
}

function getUnitStats(unit) {
  const life = Number(unit?.life ?? unit?.hp ?? 0);
  const attack = Number(unit?.attack ?? unit?.atk ?? 0);
  const defense = Number(unit?.defense ?? unit?.def ?? 0);
  return {
    life: Number.isFinite(life) ? life : 0,
    attack: Number.isFinite(attack) ? attack : 0,
    defense: Number.isFinite(defense) ? defense : 0,
  };
}

// ====== Registry de habilidades ======
// Cada habilidade define:
// - key
// - getCost(ctx) -> number
// - validate(ctx) -> { ok:true } | reject
// - apply(ctx) -> { events, mutated? } (mutar ctx.state)
//
// ctx = { state, owner, enemy, sourceSlot, sourceUnit, payload, options, events }
const ABILITIES = {
  // Exemplo genérico: dano direto em unidade inimiga do slot alvo (custo 2 por padrão)
  // Use: payload.target = { side:"ENEMY", slot:0|1|2 }
  DIRECT_DAMAGE_UNIT: {
    key: "DIRECT_DAMAGE_UNIT",
    getCost: (ctx) => {
      // permite custo definido na unit (abilityCost) ou default 2
      const c = Number(ctx.sourceUnit?.abilityCost ?? 2);
      return Number.isFinite(c) ? c : 2;
    },
    validate: (ctx) => {
      const target = isObject(ctx.payload?.target) ? ctx.payload.target : null;
      const side = toUpper(target?.side, "ENEMY");
      const slot = target?.slot;

      if (!isValidSlot(slot)) {
        return reject("INVALID_ABILITY_TARGET", "DIRECT_DAMAGE_UNIT requer target.slot (0..2).", ctx.events);
      }

      const who = side === "SELF" ? ctx.owner : ctx.enemy;
      const unit = getUnitAt(ctx.state, who, slot);
      if (!unit) {
        return reject("NO_UNIT_IN_TARGET_SLOT", "Não há unidade no slot alvo.", ctx.events);
      }

      return { ok: true };
    },
    apply: (ctx) => {
      const target = ctx.payload.target;
      const side = toUpper(target?.side, "ENEMY");
      const slot = target.slot;

      const who = side === "SELF" ? ctx.owner : ctx.enemy;
      const unit = getUnitAt(ctx.state, who, slot);

      const amount = Number(ctx.payload?.amount ?? 0);
      const dmg = Number.isFinite(amount) && amount > 0 ? amount : 10; // default 10

      const { life: lifeBefore } = getUnitStats(unit);
      const lifeAfterRaw = lifeBefore - dmg;
      const lifeAfter = Math.max(0, lifeAfterRaw);
      unit.life = lifeAfter;

      ctx.events.push({
        type: "UNIT_DAMAGED",
        payload: { by: ctx.owner, targetPlayer: who, slot, amount: dmg, lifeBefore, lifeAfter, source: "ABILITY" },
      });

      if (lifeAfterRaw <= 0) {
        const board = getBoard(ctx.state, who);
        board[slot] = null;

        const pl = ctx.state.players[who];
        ensureArray(pl, "discard");
        unit.life = 0;
        pl.discard.push(unit);

        ctx.events.push({
          type: "UNIT_DESTROYED",
          payload: { slot, owner: who, unitId: unit.unitId ?? null, cardId: unit.cardId ?? null, source: "ABILITY" },
        });
      }

      return { events: ctx.events };
    },
  },

  // Buff/debuff temporário de ATK (+10 ou -10) em um alvo (até fim do próximo turno)
  // Use: payload.mod = +10|-10, payload.target = { side:"SELF"|"ENEMY", slot:0..2 }
  BUFF_ATK_UNTIL_END_NEXT_TURN: {
    key: "BUFF_ATK_UNTIL_END_NEXT_TURN",
    getCost: (ctx) => {
      const c = Number(ctx.sourceUnit?.abilityCost ?? 2);
      return Number.isFinite(c) ? c : 2;
    },
    validate: (ctx) => {
      const target = isObject(ctx.payload?.target) ? ctx.payload.target : null;
      const slot = target?.slot;
      if (!isValidSlot(slot)) {
        return reject("INVALID_ABILITY_TARGET", "BUFF_ATK requer target.slot (0..2).", ctx.events);
      }
      const side = toUpper(target?.side, "SELF");
      const who = side === "ENEMY" ? ctx.enemy : ctx.owner;
      const unit = getUnitAt(ctx.state, who, slot);
      if (!unit) {
        return reject("NO_UNIT_IN_TARGET_SLOT", "Não há unidade no slot alvo.", ctx.events);
      }
      const mod = Number(ctx.payload?.mod ?? 0);
      if (!Number.isFinite(mod) || mod === 0) {
        return reject("INVALID_ABILITY_PAYLOAD", "BUFF_ATK requer payload.mod (+/-).", ctx.events);
      }
      return { ok: true };
    },
    apply: (ctx) => {
      const target = ctx.payload.target;
      const slot = target.slot;
      const side = toUpper(target?.side, "SELF");
      const who = side === "ENEMY" ? ctx.enemy : ctx.owner;

      const mod = Number(ctx.payload.mod);
      const turnNumber = Number(ctx.state?.turn?.number ?? 1);

      // expiresAtTurn: "fim do próximo turno" do dono da habilidade
      // Simplificação: expira quando state.turn.number >= (turnNumber + 2)
      // (já que o turno alterna P1/P2)
      addEffect(ctx.state, {
        kind: "MOD_ATK",
        owner: ctx.owner,
        targetPlayer: who,
        slot,
        amount: mod,
        expiresAtTurn: turnNumber + 2,
        meta: { source: "ABILITY", abilityKey: ctx.abilityKey },
      });

      ctx.events.push({
        type: "EFFECT_APPLIED",
        payload: {
          by: ctx.owner,
          kind: "MOD_ATK",
          targetPlayer: who,
          slot,
          amount: mod,
          expiresAtTurn: turnNumber + 2,
          source: "ABILITY",
        },
      });

      return { events: ctx.events };
    },
  },
};

// ====== Como o engine descobre qual habilidade a unidade tem ======
// A unidade snapshot pode carregar abilities de várias formas.
// Vamos suportar:
// - unit.abilities: [{ key, cost?, ... }]
// - unit.abilityKey / unit.effect?.abilityKey
// - unit.hasAbility + unit.effect.kind (fallback)
// Você pode padronizar depois.
function listUnitAbilities(unit) {
  if (!unit) return [];
  if (Array.isArray(unit.abilities)) {
    return unit.abilities
      .filter((a) => a && typeof a === "object" && a.key)
      .map((a) => ({ key: String(a.key), cost: a.cost }));
  }

  const k =
    unit.abilityKey ??
    unit?.effect?.abilityKey ??
    unit?.effect?.key ??
    null;

  if (k) return [{ key: String(k), cost: unit.abilityCost ?? null }];

  // fallback: se tem hasAbility e effect.kind existe, usa como chave
  if (unit.hasAbility && unit?.effect?.kind) return [{ key: String(unit.effect.kind), cost: unit.abilityCost ?? null }];

  return [];
}

function resolveAbilityCost(ctx, unitAbilityEntry) {
  if (ctx.options?.costOverride != null) {
    const c = Number(ctx.options.costOverride);
    return Number.isFinite(c) ? c : 0;
  }

  // se a entrada da unit trouxe cost, usa
  const entryCost = Number(unitAbilityEntry?.cost);
  if (Number.isFinite(entryCost)) return entryCost;

  // senão pede ao registry
  const handler = ABILITIES[ctx.abilityKey];
  if (handler?.getCost) {
    const c = Number(handler.getCost(ctx));
    return Number.isFinite(c) ? c : 0;
  }

  // fallback: tenta unit.abilityCost
  const c = Number(ctx.sourceUnit?.abilityCost ?? 0);
  return Number.isFinite(c) ? c : 0;
}

export function resolveAbility(state, actionInput, options = {}) {
  const action = normalizeAction(actionInput);
  const type = toUpper(action?.type, "");

  if (type !== "ACTIVATE_ABILITY" && !options.internal) {
    return reject("INVALID_RESOLVER", "resolveAbility chamado com ação diferente de ACTIVATE_ABILITY.");
  }

  const payload = isObject(action?.payload) ? action.payload : (isObject(actionInput?.payload) ? actionInput.payload : {});
  const source = isObject(payload?.source) ? payload.source : null;
  const abilityKey = String(payload?.abilityKey ?? "").trim();

  const owner = ownerKey(state);
  if (!owner) return reject("INVALID_TURN_OWNER", "turn.owner inválido (esperado P1/P2).");
  const enemy = otherKey(owner);

  // clone
  const newState = deepClone(state);
  ensureTurn(newState);

  // Estrutura mínima
  if (!newState.players?.P1 || !newState.players?.P2) {
    return reject("INVALID_PLAYERS", "players.P1 e players.P2 são obrigatórios.");
  }
  if (!newState.board?.P1 || !newState.board?.P2) {
    return reject("INVALID_BOARD", "board.P1 e board.P2 são obrigatórios.");
  }

  const phase = toUpper(newState.turn.phase, "MAIN");
  if (phase !== "MAIN") {
    return reject("INVALID_PHASE", `ACTIVATE_ABILITY não permitido na fase '${phase}'.`);
  }
  if (newState.turn.hasAttacked) {
    return reject("ABILITY_AFTER_ATTACK", "Não é possível usar habilidades após declarar ataque.");
  }

  // Limite global: 1 habilidade por turno
  if (newState.turn.abilityUsed) {
    return reject("ABILITY_ALREADY_USED_THIS_TURN", "Você já usou uma habilidade neste turno.");
  }

  // Source slot obrigatório (habilidades de unidades no campo)
  const sourceSlot = source?.slot;
  if (!isValidSlot(sourceSlot)) {
    return reject("INVALID_ABILITY_SOURCE", "source.slot deve ser um inteiro entre 0 e 2.");
  }

  const myBoard = getBoard(newState, owner);
  if (!myBoard || myBoard.length < 3) {
    return reject("INVALID_BOARD", "board do jogador do turno inválido.");
  }

  const sourceUnit = myBoard[sourceSlot];
  if (!sourceUnit) {
    return reject("NO_SOURCE_UNIT", "Não há unidade no slot de origem para ativar habilidade.");
  }

  // Descobrir habilidades disponíveis nessa unidade
  const unitAbilities = listUnitAbilities(sourceUnit);
  if (!abilityKey) {
    return reject("MISSING_ABILITY_KEY", "payload.abilityKey é obrigatório.");
  }

  const found = unitAbilities.find((a) => toUpper(a.key, "") === toUpper(abilityKey, ""));
  if (!found) {
    return reject("ABILITY_NOT_FOUND_ON_UNIT", "Esta unidade não possui a habilidade solicitada.");
  }

  // Handler registrado?
  const handler = ABILITIES[abilityKey];
  if (!handler) {
    return reject("ABILITY_NOT_IMPLEMENTED", `Habilidade não implementada no engine: ${abilityKey}`);
  }

  const me = newState.players[owner];
  const energy = getEnergy(me);

  const events = [];
  events.push({
    type: "ACTION_META",
    payload: { actionType: "ACTIVATE_ABILITY", player: owner, triggeredBy: options.triggeredBy ?? "MANUAL" },
  });

  // Calcular custo final
  const ctx = {
    state: newState,
    owner,
    enemy,
    sourceSlot,
    sourceUnit,
    payload,
    options,
    abilityKey,
    events,
  };

  const cost = resolveAbilityCost(ctx, found);
  if (cost < 0) return reject("INVALID_ABILITY_COST", "Custo de habilidade inválido (negativo).", events);

  if (!options.internal) {
    if (energy < cost) {
      return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${cost}, energia=${energy}.`, events);
    }
  } else {
    // mesmo em uso interno, se não houver override e custo > energia, rejeita (evita bug)
    if (options.costOverride == null && energy < cost) {
      return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente (uso interno). Custo=${cost}, energia=${energy}.`, events);
    }
  }

  // Validar alvo/condições específicas
  const v = handler.validate ? handler.validate(ctx) : { ok: true };
  if (v?.rejected) return v; // se handler retornou reject()

  // Debita energia (se custo > 0)
  if (cost > 0) {
    setEnergy(me, energy - cost);
    events.push({
      type: "ENERGY_SPENT",
      payload: { player: owner, amount: cost, energyAfter: me.energy, source: "ABILITY" },
    });
  } else {
    events.push({
      type: "ABILITY_COST_FREE",
      payload: { player: owner, abilityKey, reason: options.triggeredBy ?? "INTERNAL" },
    });
  }

  // Marca uso global de habilidade neste turno (bloqueia flood)
  newState.turn.abilityUsed = true;
  newState.turn.abilityUsedBy = {
    slot: sourceSlot,
    unitId: sourceUnit.unitId ?? null,
    cardId: sourceUnit.cardId ?? null,
    abilityKey,
  };

  events.push({
    type: "ABILITY_USED",
    payload: {
      player: owner,
      abilityKey,
      sourceSlot,
      unitId: sourceUnit.unitId ?? null,
      cardId: sourceUnit.cardId ?? null,
      cost,
      triggeredBy: options.triggeredBy ?? "MANUAL",
    },
  });

  // Aplica efeito
  const applied = handler.apply ? handler.apply(ctx) : null;
  if (applied?.rejected) return applied;

  bumpVersion(newState);
  events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });

  return { newState, events };
}

export default resolveAbility;
