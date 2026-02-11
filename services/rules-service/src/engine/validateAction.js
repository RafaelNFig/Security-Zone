// rules-service/src/engine/validateAction.js
// Validação do contrato { state, action } para o Rules Service (stateless).
// Regras alinhadas:
// - Ações (PLAY_CARD / CAST_SPELL / ATTACK / ACTIVATE_ABILITY) só na fase MAIN.
// - O jogador só pode atacar 1 vez por turno.
// - Após atacar, o turno é considerado encerrado (não pode fazer outras ações).
// - Habilidade (ACTIVATE_ABILITY): 1 uso por turno (state.turn.abilityUsed), opcional, com custo.
//
// Observação importante:
// - Este validator é "contrato + pré-checagens".
// - Os resolvers continuam sendo a fonte final de verdade (podem rejeitar com regras adicionais).
// - Este validator NÃO aplica efeitos, não resolve habilidades, só valida estrutura e permissões básicas.

function normalizeAction(input) {
  if (!input) return null;
  if (input.action && typeof input.action === "object") return input.action;
  return input;
}

function reject(code, message, events = []) {
  return { ok: false, rejected: { code, message }, events };
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
}

function isInt(n) {
  return Number.isInteger(n);
}

function inRangeInt(n, min, max) {
  return isInt(n) && n >= min && n <= max;
}

function getTurnOwner(state) {
  const owner = state?.turn?.owner;
  return owner === "P1" || owner === "P2" ? owner : null;
}

function getPhase(state) {
  // padrão "MAIN" (suficiente pra demo)
  return toUpper(state?.turn?.phase, "MAIN");
}

function getPlayer(state, key) {
  return state?.players?.[key] ?? null;
}

function getBoard(state, key) {
  const b = state?.board?.[key];
  return Array.isArray(b) ? b : null;
}

function getEnergy(state, key) {
  const p = getPlayer(state, key);
  const e = Number(p?.energy ?? 0);
  return Number.isFinite(e) ? e : 0;
}

function getHand(state, key) {
  const p = getPlayer(state, key);
  return Array.isArray(p?.hand) ? p.hand : [];
}

function extractCardId(card) {
  const id = card?.cardId ?? card?.id ?? card?.CD_ID ?? card?.CDID;
  return id == null ? null : String(id);
}

function extractCardType(card) {
  return toUpper(card?.type ?? card?.CD_TYPE, "");
}

function extractCost(card) {
  const n = Number(card?.cost ?? card?.CD_COST ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function findCardInHand(state, owner, cardIdStr) {
  const hand = getHand(state, owner);
  return hand.find((c) => extractCardId(c) === cardIdStr) ?? null;
}

// ====== Habilidades (ACTIVATE_ABILITY) ======
function listUnitAbilities(unit) {
  if (!unit) return [];
  if (Array.isArray(unit.abilities)) {
    return unit
      .abilities
      .filter((a) => a && typeof a === "object" && a.key)
      .map((a) => ({ key: String(a.key), cost: a.cost }));
  }

  const k =
    unit.abilityKey ??
    unit?.effect?.abilityKey ??
    unit?.effect?.key ??
    null;

  if (k) return [{ key: String(k), cost: unit.abilityCost ?? null }];

  if (unit.hasAbility && unit?.effect?.kind) {
    return [{ key: String(unit.effect.kind), cost: unit.abilityCost ?? null }];
  }

  return [];
}

function resolveAbilityCostFromUnit(unit, abilityKey) {
  // tenta achar na lista
  const list = listUnitAbilities(unit);
  const found = list.find((a) => toUpper(a.key, "") === toUpper(abilityKey, ""));
  if (found && found.cost != null) {
    const c = Number(found.cost);
    return Number.isFinite(c) ? c : null;
  }

  // fallback
  const c = Number(unit?.abilityCost ?? null);
  return Number.isFinite(c) ? c : null;
}

export function validateAction(state, actionInput) {
  const action = normalizeAction(actionInput);

  if (!isObject(state)) {
    return reject("INVALID_STATE", "state é obrigatório e deve ser um objeto.");
  }

  if (!isObject(action)) {
    return reject("INVALID_ACTION", "action é obrigatório e deve ser um objeto.");
  }

  const type = toUpper(action.type, "");
  const payload = isObject(action.payload) ? action.payload : {};

  if (!type) {
    return reject("MISSING_ACTION_TYPE", "action.type é obrigatório.");
  }

  const owner = getTurnOwner(state);
  if (!owner) {
    return reject("INVALID_TURN_OWNER", "turn.owner deve ser 'P1' ou 'P2'.");
  }

  const phase = getPhase(state);
  const hasAttacked = Boolean(state?.turn?.hasAttacked);
  const abilityUsed = Boolean(state?.turn?.abilityUsed);

  // Valida estrutura do board/players pra evitar crash nos resolvers
  const board = getBoard(state, owner);
  if (!board || board.length < 3) {
    return reject("INVALID_BOARD", "board do jogador do turno deve ser um array de 3 slots.");
  }

  const player = getPlayer(state, owner);
  if (!player) {
    return reject("INVALID_PLAYER", "players[turn.owner] não encontrado no state.");
  }

  // =========================
  // END_TURN
  // =========================
  if (type === "END_TURN") {
    if (phase === "ENDED") {
      return reject("CANNOT_END_TURN", "Não é possível encerrar um turno já encerrado.");
    }
    return { ok: true };
  }

  // Regra: após atacar, o turno já está consumido.
  // Então, qualquer outra ação que não seja END_TURN é inválida.
  if (hasAttacked) {
    return reject("TURN_ALREADY_ENDED_BY_ATTACK", "Após atacar, o turno é encerrado.");
  }

  // Ações só permitidas em MAIN (mantém simples e aderente ao timing).
  if (phase !== "MAIN") {
    return reject("INVALID_PHASE", `Ação '${type}' não permitida na fase '${phase}'.`);
  }

  // =========================
  // PLAY_CARD (somente UNIT)
  // =========================
  if (type === "PLAY_CARD") {
    const cardId = payload.cardId;
    const slot = payload.slot;

    if (cardId == null || String(cardId).trim() === "") {
      return reject("MISSING_CARD_ID", "cardId é obrigatório.");
    }

    if (!inRangeInt(slot, 0, 2)) {
      return reject("INVALID_SLOT", "slot deve ser um inteiro entre 0 e 2.");
    }

    if (board[slot] != null) {
      return reject("SLOT_OCCUPIED", "O slot já está ocupado.");
    }

    const card = findCardInHand(state, owner, String(cardId));
    if (!card) {
      return reject("CARD_NOT_IN_HAND", "A carta informada não está na mão do jogador.");
    }

    const cardType = extractCardType(card);
    if (cardType === "SPELL") {
      return reject("SPELL_REQUIRES_CAST", "Esta carta é do tipo SPELL. Use a ação CAST_SPELL.");
    }

    const cost = extractCost(card);
    const energy = getEnergy(state, owner);

    if (cost < 0) {
      return reject("INVALID_CARD_COST", "Custo de carta inválido (negativo).");
    }

    if (cost > energy) {
      return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${cost}, energia=${energy}.`);
    }

    return { ok: true };
  }

  // =========================
  // ATTACK
  // =========================
  if (type === "ATTACK") {
    const attackerSlot = payload.attackerSlot;

    if (!inRangeInt(attackerSlot, 0, 2)) {
      return reject("INVALID_ATTACKER_SLOT", "attackerSlot deve ser um inteiro entre 0 e 2.");
    }

    const attacker = board[attackerSlot];
    if (!attacker) {
      return reject("NO_ATTACKER_IN_SLOT", "Não há unidade no slot atacante.");
    }

    const atk = Number(attacker.attack ?? attacker.atk ?? 0);
    if (!Number.isFinite(atk) || atk <= 0) {
      return reject("INVALID_ATTACKER", "A unidade no slot não possui ataque válido.");
    }

    return { ok: true };
  }

  // =========================
  // CAST_SPELL
  // =========================
  if (type === "CAST_SPELL") {
    const cardId = payload.cardId;
    if (cardId == null || String(cardId).trim() === "") {
      return reject("MISSING_CARD_ID", "cardId é obrigatório em CAST_SPELL.");
    }

    const card = findCardInHand(state, owner, String(cardId));
    if (!card) {
      return reject("CARD_NOT_IN_HAND", "A carta informada não está na mão do jogador.");
    }

    const cardType = extractCardType(card);
    if (cardType !== "SPELL") {
      return reject("NOT_A_SPELL", "CAST_SPELL só pode ser usado com carta SPELL.");
    }

    const cost = extractCost(card);
    const energy = getEnergy(state, owner);
    if (cost < 0) {
      return reject("INVALID_CARD_COST", "Custo de carta inválido (negativo).");
    }
    if (cost > energy) {
      return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${cost}, energia=${energy}.`);
    }

    return { ok: true };
  }

  // =========================
  // ACTIVATE_ABILITY
  // =========================
  if (type === "ACTIVATE_ABILITY") {
    // 1 habilidade por turno (global)
    if (abilityUsed) {
      return reject("ABILITY_ALREADY_USED_THIS_TURN", "Você já usou uma habilidade neste turno.");
    }

    const source = isObject(payload.source) ? payload.source : null;
    const sourceSlot = source?.slot;

    if (!inRangeInt(sourceSlot, 0, 2)) {
      return reject("INVALID_ABILITY_SOURCE", "ACTIVATE_ABILITY requer payload.source.slot (0..2).");
    }

    const unit = board[sourceSlot];
    if (!unit) {
      return reject("NO_SOURCE_UNIT", "Não há unidade no slot de origem para ativar habilidade.");
    }

    const abilityKey = String(payload.abilityKey ?? "").trim();
    if (!abilityKey) {
      return reject("MISSING_ABILITY_KEY", "ACTIVATE_ABILITY requer payload.abilityKey.");
    }

    // A unidade precisa ter essa habilidade (pelo menos no snapshot)
    const has = listUnitAbilities(unit).some((a) => toUpper(a.key, "") === toUpper(abilityKey, ""));
    if (!has) {
      return reject("ABILITY_NOT_FOUND_ON_UNIT", "Esta unidade não possui a habilidade solicitada.");
    }

    // Checagem de energia (melhor esforço):
    // - se a unit declarar custo, valida aqui
    // - se não declarar, deixa para o resolver
    const declaredCost = resolveAbilityCostFromUnit(unit, abilityKey);
    if (declaredCost != null) {
      if (declaredCost < 0) {
        return reject("INVALID_ABILITY_COST", "Custo de habilidade inválido (negativo).");
      }
      const energy = getEnergy(state, owner);
      if (declaredCost > energy) {
        return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${declaredCost}, energia=${energy}.`);
      }
    }

    // targets específicos são validados no resolveAbility (depende da habilidade)
    return { ok: true };
  }

  return reject("UNKNOWN_ACTION_TYPE", `Tipo de ação desconhecido: ${type}`);
}

export default validateAction;
