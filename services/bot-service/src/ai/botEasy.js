// bot-service/src/ai/botEasy.js
/**
 * Bot EASY (heurística simples):

 * Observações:
 * - Quem valida regras é o rules-service.
 * - Bot NÃO usa ACTIVATE_ABILITY (habilidades opcionais) — apenas joga UNIT, usa SPELL e ataca.
 * - Assume bot jogando como P2 (turn.owner="P2").
 * - match-service deve enviar state COMPLETO (não sanitizado) pro bot.
 */

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function toUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getBotSide() {
  return "P2";
}

function getEnemySide(side) {
  return side === "P1" ? "P2" : "P1";
}

function getPlayer(state, side) {
  return isObject(state?.players?.[side]) ? state.players[side] : null;
}

function getBoard(state, side) {
  const b = state?.board?.[side];
  if (!Array.isArray(b)) return [null, null, null];
  const out = b.slice(0, 3);
  while (out.length < 3) out.push(null);
  return out;
}

function getEnergy(state, side) {
  const p = getPlayer(state, side);
  return safeNum(p?.energy, 0);
}

function normalizeCardInHand(raw) {
  // Normal esperado: { cardId, type, cost, effect? }
  // Tolerância: { id, CD_ID, CD_TYPE, CD_COST, CD_EFFECT_JSON, ... }
  if (!raw) return null;

  if (typeof raw === "string" || typeof raw === "number") {
    // Sem metadados -> não dá pra jogar com segurança
    return null;
  }

  if (!isObject(raw)) return null;

  const cardId = raw.cardId ?? raw.id ?? raw.CD_ID ?? raw.CDID ?? null;
  if (cardId == null) return null;

  const type = toUpper(raw.type ?? raw.CD_TYPE ?? "");
  const cost = safeNum(raw.cost ?? raw.CD_COST ?? 0);

  return {
    cardId: String(cardId),
    type: type === "SPELL" ? "SPELL" : "UNIT",
    cost,
    name: raw.name ?? raw.CD_NAME ?? null,
    attack: safeNum(raw.attack ?? raw.atk ?? raw.CD_ATTACK ?? 0, 0),
    defense: safeNum(raw.defense ?? raw.def ?? raw.CD_DEFENSE ?? 0, 0),
    life:
      raw.life != null
        ? safeNum(raw.life, 0)
        : raw.CD_LIFE != null
          ? safeNum(raw.CD_LIFE, 0)
          : null,
    effect: raw.effect ?? raw.CD_EFFECT_JSON ?? null,
  };
}

function getHandCards(state, side) {
  const p = getPlayer(state, side);
  const hand = p?.hand;
  if (!Array.isArray(hand)) return [];

  const cards = [];
  for (const raw of hand) {
    const c = normalizeCardInHand(raw);
    if (c) cards.push(c);
  }
  return cards;
}

function getFreeSlots(boardArr) {
  const free = [];
  for (let i = 0; i < 3; i += 1) {
    if (boardArr[i] == null) free.push(i);
  }
  return free;
}

function pickSlotForPlay(boardArr) {
  const free = getFreeSlots(boardArr);
  return free.length ? free[0] : null;
}

function pickPlayableUnit(handCards, energy) {
  const candidates = handCards
    .filter((c) => c.type === "UNIT")
    .filter((c) => safeNum(c.cost, 0) <= energy);

  if (!candidates.length) return null;

  // Easy: joga a mais barata (simples e reduz rejeições por energia)
  candidates.sort((a, b) => safeNum(a.cost, 0) - safeNum(b.cost, 0));
  return candidates[0];
}

function getUnitAttackValue(unit) {
  if (!unit) return 0;
  if (isObject(unit)) return safeNum(unit.attack ?? unit.atk ?? 0, 0);
  return 0;
}

function getUnitDefenseValue(unit) {
  if (!unit) return 0;
  if (isObject(unit)) return safeNum(unit.defense ?? unit.def ?? 0, 0);
  return 0;
}

function pickBestAttackSlot(botBoard, enemyBoard) {
  // Heurística:
  // 1) inimigo vazio (dano direto) com maior atk
  // 2) atk > def (dano positivo) com maior (atk-def)
  // 3) qualquer unidade com maior atk
  let bestDirect = null;
  let bestDirectAtk = -Infinity;

  let bestAdv = null;
  let bestAdvScore = -Infinity;

  let bestAny = null;
  let bestAnyAtk = -Infinity;

  for (let i = 0; i < 3; i += 1) {
    const myUnit = botBoard[i];
    if (!myUnit) continue;

    const myAtk = getUnitAttackValue(myUnit);

    if (myAtk > bestAnyAtk) {
      bestAnyAtk = myAtk;
      bestAny = i;
    }

    const enemyUnit = enemyBoard[i];

    if (!enemyUnit) {
      if (myAtk > bestDirectAtk) {
        bestDirectAtk = myAtk;
        bestDirect = i;
      }
      continue;
    }

    const enemyDef = getUnitDefenseValue(enemyUnit);
    const dmg = myAtk - enemyDef; // regra do rules-service
    if (dmg > 0 && dmg > bestAdvScore) {
      bestAdvScore = dmg;
      bestAdv = i;
    }
  }

  return bestDirect ?? bestAdv ?? bestAny;
}

// ===== Spells (CAST_SPELL) helpers =====
function isSpell(card) {
  return card?.type === "SPELL";
}

function isSpellCastable(card, energy) {
  return isSpell(card) && safeNum(card.cost, 0) <= energy;
}

function spellKind(card) {
  // ResolveSpell lê effect.kind (upper/lower indiferente)
  const eff = card?.effect;
  if (eff && typeof eff === "object") return toUpper(eff.kind, "");
  return "";
}

function pickCastableSpell(handCards, energy, state, botSide, enemySide) {
  // Regras do resolveSpell:
  // - só pode cast antes do ataque (turn.hasAttacked=false e phase MAIN)
  // - card deve ser SPELL
  //
  // Easy: escolhe o "primeiro" spell castável seguindo prioridade simples por kind.

  const spells = handCards.filter((c) => isSpellCastable(c, energy));
  if (!spells.length) return null;

  // Pequena prioridade por kind (não depende de alvos complexos)
  // 1) NEXT_ATTACK_BLOCK / NEXT_ATTACK_REDIRECT (defensivo)
  // 2) DAMAGE_UNIT (se existir unidade inimiga em algum slot)
  // 3) DAMAGE_PLAYER
  // 4) HEAL_PLAYER (se hp < 100)
  // 5) DRAW
  // 6) REVEAL_HAND
  const enemyBoard = getBoard(state, enemySide);
  const hasEnemyUnit = enemyBoard.some((u) => u != null);

  const botHp = safeNum(getPlayer(state, botSide)?.hp ?? 100, 100);

  const score = (c) => {
    const k = spellKind(c);
    if (k === "NEXT_ATTACK_BLOCK") return 1000;
    if (k === "NEXT_ATTACK_REDIRECT") return 950;
    if (k === "DAMAGE_UNIT" && hasEnemyUnit) return 900;
    if (k === "DAMAGE_PLAYER") return 850;
    if (k === "HEAL_PLAYER" && botHp < 100) return 800;
    if (k === "DRAW") return 700;
    if (k === "REVEAL_HAND") return 650;
    return 100; // qualquer outro kind suportado no futuro
  };

  // Se empate, pega o mais barato (reduz chance de travar energia para unit)
  spells.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sb !== sa) return sb - sa;
    return safeNum(a.cost, 0) - safeNum(b.cost, 0);
  });

  return spells[0];
}

// Para DAMAGE_UNIT, o resolveSpell exige slot + target.
// Nosso botEasy escolhe slot automaticamente (primeiro com unidade inimiga).
function buildSpellPayload(card, state, botSide, enemySide) {
  const eff = card?.effect;
  const k = spellKind(card);

  // Sempre inclui cardId
  const base = { cardId: String(card.cardId) };

  // Se não tem efeito estruturado, ainda pode castar (resolveSpell vai só mover e emitir events)
  if (!eff || typeof eff !== "object") return base;

  if (k === "DAMAGE_UNIT") {
    const enemyBoard = getBoard(state, enemySide);
    let slot = 0;
    for (let i = 0; i < 3; i += 1) {
      if (enemyBoard[i] != null) { slot = i; break; }
    }
    return {
      ...base,
      // override do efeito para garantir alvo válido (resolveSpell lê effect.slot/target do card, NÃO do payload)
      // então não adianta mandar slot aqui se o card não tiver. Mas como você padronizou spells com effect, ok.
      // Ainda assim, mantemos no payload porque pode ser útil no futuro.
      slot,
      target: "ENEMY",
    };
  }

  if (k === "HEAL_PLAYER") {
    return { ...base, target: "SELF" };
  }

  if (k === "DAMAGE_PLAYER") {
    return { ...base, target: "ENEMY" };
  }

  if (k === "REVEAL_HAND") {
    return { ...base, target: "ENEMY" };
  }

  // DRAW / NEXT_ATTACK_* geralmente não precisa de payload extra
  return base;
}

function makeEndTurn() {
  return { type: "END_TURN", payload: {} };
}

function makePlayCard(cardId, slot) {
  return { type: "PLAY_CARD", payload: { cardId: String(cardId), slot } };
}

function makeCastSpell(cardId, extraPayload = {}) {
  return { type: "CAST_SPELL", payload: { cardId: String(cardId), ...extraPayload } };
}

function makeAttack(attackerSlot) {
  return { type: "ATTACK", payload: { attackerSlot } };
}

/**
 * API principal do bot easy.
 * @param {{ state: any, difficulty?: string }} input
 * @returns {{ type: string, payload: any }}
 */
export function decideMove({ state }) {
  if (!isObject(state)) return makeEndTurn();

  const botSide = getBotSide();
  const enemySide = getEnemySide(botSide);

  // Se não for turno do bot, por segurança
  if (state?.turn?.owner !== botSide) return makeEndTurn();

  const phase = toUpper(state?.turn?.phase, "MAIN");
  if (phase !== "MAIN") return makeEndTurn();

  const hasAttacked = Boolean(state?.turn?.hasAttacked);
  const botEnergy = getEnergy(state, botSide);

  const botBoard = getBoard(state, botSide);
  const enemyBoard = getBoard(state, enemySide);

  const hand = getHandCards(state, botSide);

  // 0) Se ainda não atacou, tenta usar 1 SPELL antes (bot easy não usa habilidades)
  if (!hasAttacked) {
    const spell = pickCastableSpell(hand, botEnergy, state, botSide, enemySide);
    if (spell) {
      const extra = buildSpellPayload(spell, state, botSide, enemySide);
      // extra já contém cardId; makeCastSpell também, então removemos duplicação:
      const { cardId, ...rest } = extra;
      return makeCastSpell(spell.cardId, rest);
    }
  }

  // 1) Jogar UNIT se houver slot livre e energia suficiente
  const freeSlot = pickSlotForPlay(botBoard);
  if (freeSlot != null) {
    const unit = pickPlayableUnit(hand, botEnergy);
    if (unit) return makePlayCard(unit.cardId, freeSlot);
  }

  // 2) Atacar
  const attackSlot = pickBestAttackSlot(botBoard, enemyBoard);
  if (attackSlot != null) return makeAttack(attackSlot);

  // 3) Nada
  return makeEndTurn();
}

export default { decideMove };
