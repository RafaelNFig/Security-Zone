// bot-service/src/ai/botNormal.js
/**
 * Bot NORMAL (heurística intermediária, compatível com o sistema):
 * - Entrada: { state, difficulty? }
 * - Saída: action:
 *    { type: "PLAY_CARD"|"CAST_SPELL"|"ACTIVATE_ABILITY"|"ATTACK"|"END_TURN", payload: {...} }
 *
 * Estratégia (NORMAL):
 * 0) Segurança: só joga se for turno do bot e phase MAIN.
 * 1) Se ainda NÃO atacou:
 *    1.1) Se existir habilidade opcional boa e ainda não usou habilidade no turno -> ACTIVATE_ABILITY
 *    1.2) Senão, se existir spell bom e castável -> CAST_SPELL
 * 2) Se pode causar dano direto (slot inimigo vazio) -> ATTACK
 * 3) Senão, se pode jogar UNIT forte (energia suficiente + slot livre) -> PLAY_CARD
 * 4) Senão, se pode causar dano positivo (atk > def) -> ATTACK
 * 5) Senão, END_TURN
 *
 * Observações importantes:
 * - NÃO valida regras; rules-service valida.
 * - Assume bot como P2 (turn.owner = "P2").
 * - Precisa receber state COMPLETO (não sanitizado).
 * - Respeita a regra do seu engine: 1 habilidade opcional por turno (turn.abilityUsed).
 * - Não tenta “forçar” targets complexos: escolhe alvos simples/seguros.
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

function isValidSlot(s) {
  return Number.isInteger(s) && s >= 0 && s <= 2;
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
  if (!raw) return null;
  if (typeof raw === "string" || typeof raw === "number") return null;
  if (!isObject(raw)) return null;

  const cardId = raw.cardId ?? raw.id ?? raw.CD_ID ?? raw.CDID ?? null;
  if (cardId == null) return null;

  const type = toUpper(raw.type ?? raw.CD_TYPE ?? "");
  const cost = safeNum(raw.cost ?? raw.CD_COST ?? 0);

  const attack = safeNum(raw.attack ?? raw.atk ?? raw.CD_ATTACK ?? 0, 0);
  const defense = safeNum(raw.defense ?? raw.def ?? raw.CD_DEFENSE ?? 0, 0);

  const lifeRaw = raw.life ?? raw.hp ?? raw.CD_LIFE;
  const life = lifeRaw != null ? safeNum(lifeRaw, 0) : 0;

  const effect = raw.effect ?? raw.CD_EFFECT_JSON ?? null;

  return {
    cardId: String(cardId),
    type: type === "SPELL" ? "SPELL" : "UNIT",
    cost,
    name: raw.name ?? raw.CD_NAME ?? null,
    life,
    attack,
    defense,
    effect,

    // legacy flags (hand-level; unit snapshot normaliza ao entrar no board)
    hasAbility: Boolean(raw.hasAbility ?? raw.CD_HAS_ABILITY ?? false),
    abilityCost: raw.abilityCost ?? raw.CD_ABILITY_COST ?? null,
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

function getUnitAttackValue(unit) {
  if (!unit || !isObject(unit)) return 0;
  return safeNum(unit.attack ?? unit.atk ?? 0, 0);
}

function getUnitDefenseValue(unit) {
  if (!unit || !isObject(unit)) return 0;
  return safeNum(unit.defense ?? unit.def ?? 0, 0);
}

function freeSlots(boardArr) {
  const out = [];
  for (let i = 0; i < 3; i += 1) if (boardArr[i] == null) out.push(i);
  return out;
}

function calcCardValue(card) {
  // (attack + defense + life*0.5) / max(1,cost)
  const atk = safeNum(card.attack, 0);
  const def = safeNum(card.defense, 0);
  const life = safeNum(card.life, 0);
  const cost = Math.max(1, safeNum(card.cost, 0));
  const raw = atk + def + life * 0.5;
  return raw / cost;
}

function pickBestPlayableUnit(handCards, energy) {
  const playable = handCards
    .filter((c) => c.type === "UNIT")
    .filter((c) => safeNum(c.cost, 0) <= energy);

  if (!playable.length) return null;

  playable.sort((a, b) => calcCardValue(b) - calcCardValue(a));
  return playable[0];
}

function pickBestSlotForUnit(enemyBoard, free) {
  // prioriza slot inimigo vazio; senão, menor DEF
  let best = free[0] ?? null;
  let bestScore = -Infinity;

  for (const slot of free) {
    const enemyUnit = enemyBoard[slot];
    if (!enemyUnit) return slot;

    const def = getUnitDefenseValue(enemyUnit);
    const score = -def;
    if (score > bestScore) {
      bestScore = score;
      best = slot;
    }
  }

  return best;
}

function findDirectAttack(botBoard, enemyBoard) {
  // slot inimigo vazio com maior atk
  let bestSlot = null;
  let bestAtk = -Infinity;

  for (let i = 0; i < 3; i += 1) {
    const my = botBoard[i];
    if (!my) continue;
    if (enemyBoard[i]) continue;

    const atk = getUnitAttackValue(my);
    if (atk > bestAtk) {
      bestAtk = atk;
      bestSlot = i;
    }
  }

  return bestSlot;
}

function findPositiveDamageAttack(botBoard, enemyBoard) {
  // maior (atk - def) (>=1)
  let bestSlot = null;
  let bestDmg = 0;

  for (let i = 0; i < 3; i += 1) {
    const my = botBoard[i];
    if (!my) continue;

    const atk = getUnitAttackValue(my);
    const enemy = enemyBoard[i];
    const def = enemy ? getUnitDefenseValue(enemy) : 0;

    const dmg = atk - def;
    if (dmg > bestDmg) {
      bestDmg = dmg;
      bestSlot = i;
    }
  }

  return bestSlot;
}

// ===== Spells (CAST_SPELL) =====
function isSpell(card) {
  return card?.type === "SPELL";
}

function isSpellCastable(card, energy) {
  return isSpell(card) && safeNum(card.cost, 0) <= energy;
}

function spellKind(card) {
  const eff = card?.effect;
  if (eff && typeof eff === "object") return toUpper(eff.kind, "");
  return "";
}

function pickCastableSpell(handCards, energy, state, botSide, enemySide) {
  const spells = handCards.filter((c) => isSpellCastable(c, energy));
  if (!spells.length) return null;

  const enemyBoard = getBoard(state, enemySide);
  const hasEnemyUnit = enemyBoard.some((u) => u != null);

  const botHp = safeNum(getPlayer(state, botSide)?.hp ?? 100, 100);
  const enemyHp = safeNum(getPlayer(state, enemySide)?.hp ?? 100, 100);

  // NORMAL: mais “inteligente” do que easy:
  // - se inimigo está baixo, prioriza DAMAGE_PLAYER
  // - se tem unidade inimiga, DAMAGE_UNIT sobe
  // - DRAW se mão baixa (<=2)
  const handCount = Array.isArray(getPlayer(state, botSide)?.hand) ? getPlayer(state, botSide).hand.length : 0;

  const score = (c) => {
    const k = spellKind(c);
    if (k === "NEXT_ATTACK_BLOCK") return 1200;
    if (k === "NEXT_ATTACK_REDIRECT") return 1150;

    if (k === "DAMAGE_PLAYER") {
      if (enemyHp <= 25) return 1100;
      return 950;
    }

    if (k === "DAMAGE_UNIT") {
      if (hasEnemyUnit) return 1000;
      return 200;
    }

    if (k === "HEAL_PLAYER") {
      if (botHp <= 40) return 980;
      if (botHp <= 70) return 850;
      return 300;
    }

    if (k === "DRAW") {
      if (handCount <= 2) return 900;
      return 500;
    }

    if (k === "REVEAL_HAND") return 650;

    return 100;
  };

  spells.sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    if (sb !== sa) return sb - sa;
    // tie-break: mais barato
    return safeNum(a.cost, 0) - safeNum(b.cost, 0);
  });

  return spells[0];
}

function buildSpellPayload(card, state, botSide, enemySide) {
  const eff = card?.effect;
  const k = spellKind(card);
  const base = { cardId: String(card.cardId) };

  if (!eff || typeof eff !== "object") return base;

  if (k === "DAMAGE_UNIT") {
    const enemyBoard = getBoard(state, enemySide);
    // NORMAL: escolhe alvo com menor vida (tenta finalizar) senão primeiro
    let bestSlot = null;
    let bestLife = Infinity;

    for (let i = 0; i < 3; i += 1) {
      const u = enemyBoard[i];
      if (!u) continue;
      const life = safeNum(u.life ?? u.hp ?? 0, 0);
      if (life > 0 && life < bestLife) {
        bestLife = life;
        bestSlot = i;
      }
    }

    const slot = isValidSlot(bestSlot) ? bestSlot : 0;
    return { ...base, slot, target: "ENEMY" };
  }

  if (k === "HEAL_PLAYER") return { ...base, target: "SELF" };
  if (k === "DAMAGE_PLAYER") return { ...base, target: "ENEMY" };
  if (k === "REVEAL_HAND") return { ...base, target: "ENEMY" };

  return base;
}

// ===== Abilities (ACTIVATE_ABILITY) =====
//
// Convenção do resolveAbility (o que ele costuma aceitar no seu engine):
// { type:"ACTIVATE_ABILITY", payload:{ source:{slot}, abilityKey?, ... } }
//
// - abilityKey pode ser omitida se a unidade tiver só 1 ability (resolveAbility escolhe)
// - Se houver múltiplas, tentamos escolher pela melhor heurística (primeira “ofensiva”)
function listUnitAbilities(unit) {
  if (!unit || !isObject(unit)) return [];
  if (Array.isArray(unit.abilities)) {
    return unit.abilities.filter((a) => a && typeof a === "object" && a.key).map((a) => ({ ...a, key: String(a.key) }));
  }
  // fallback legacy
  if (unit.hasAbility && unit.effect && typeof unit.effect === "object") {
    const k = unit.effect.abilityKey ?? unit.effect.key ?? unit.effect.kind ?? null;
    if (k) return [{ key: String(k), cost: unit.abilityCost ?? null }];
  }
  return [];
}

function abilityCost(ability, unit) {
  const c = ability?.cost ?? unit?.abilityCost ?? null;
  const n = Number(c);
  return Number.isFinite(n) ? n : 0;
}

function isSilencedByEffect(state, side, slot) {
  const effs = Array.isArray(state?.effects) ? state.effects : [];
  return effs.some(
    (e) =>
      e &&
      typeof e === "object" &&
      toUpper(e.kind, "") === "SILENCE_ABILITIES" &&
      e.targetPlayer === side &&
      e.slot === slot
  );
}

function pickBestAbilityToUse(state, botSide, enemySide, energy, botBoard) {
  // respeita regra global do turno:
  const already = Boolean(state?.turn?.abilityUsed);
  if (already) return null;

  // se ataque já aconteceu, resolveAbility deve rejeitar (normalmente),
  // então evitamos aqui.
  if (Boolean(state?.turn?.hasAttacked)) return null;

  // tenta achar uma unidade com ability castável
  // Heurística:
  // - prioriza abilities "ofensivas" por key
  // - depois defensivas
  const prefScore = (keyUp) => {
    if (keyUp.includes("REVEAL")) return 850; // revelar mão / info
    if (keyUp.includes("DAMAGE") || keyUp.includes("DIRECT")) return 1000;
    if (keyUp.includes("DESTROY") || keyUp.includes("REMOVE")) return 950;
    if (keyUp.includes("BUFF") || keyUp.includes("MOD_ATK")) return 800;
    if (keyUp.includes("SHIELD") || keyUp.includes("NEGATE") || keyUp.includes("BLOCK")) return 700;
    return 500;
  };

  let best = null;

  for (let slot = 0; slot < 3; slot += 1) {
    const unit = botBoard[slot];
    if (!unit) continue;

    if (isSilencedByEffect(state, botSide, slot)) continue;

    const abilities = listUnitAbilities(unit);
    if (!abilities.length) continue;

    // escolhe melhor ability desta unidade
    abilities.sort((a, b) => prefScore(toUpper(b.key, "")) - prefScore(toUpper(a.key, "")));
    const chosen = abilities[0];

    const c = abilityCost(chosen, unit);
    if (c > energy) continue;

    const keyUp = toUpper(chosen.key, "");
    const sc = prefScore(keyUp);

    if (!best || sc > best.score) {
      best = { slot, abilityKey: chosen.key, cost: c, score: sc };
    }
  }

  return best;
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

function makeActivateAbility(slot, abilityKey) {
  const payload = { source: { slot } };
  if (abilityKey) payload.abilityKey = String(abilityKey);
  return { type: "ACTIVATE_ABILITY", payload };
}

function makeAttack(attackerSlot) {
  return { type: "ATTACK", payload: { attackerSlot } };
}

/**
 * Decide a jogada (NORMAL)
 */
export function decideMove({ state }) {
  if (!isObject(state)) return makeEndTurn();

  const botSide = getBotSide();
  const enemySide = getEnemySide(botSide);

  // Segurança: só joga se for turno do bot
  if (state?.turn?.owner !== botSide) return makeEndTurn();

  const phase = toUpper(state?.turn?.phase, "MAIN");
  if (phase !== "MAIN") return makeEndTurn();

  // Se já atacou, em geral o rules encerra turno automaticamente,
  // mas caso chegue aqui, só end turn.
  if (Boolean(state?.turn?.hasAttacked)) return makeEndTurn();

  const energy = getEnergy(state, botSide);
  const botBoard = getBoard(state, botSide);
  const enemyBoard = getBoard(state, enemySide);
  const hand = getHandCards(state, botSide);

  // 1) Habilidade opcional (1 por turno)
  const bestAb = pickBestAbilityToUse(state, botSide, enemySide, energy, botBoard);
  if (bestAb) {
    return makeActivateAbility(bestAb.slot, bestAb.abilityKey);
  }

  // 2) Spell antes do ataque
  const spell = pickCastableSpell(hand, energy, state, botSide, enemySide);
  if (spell) {
    const extra = buildSpellPayload(spell, state, botSide, enemySide);
    const { cardId, ...rest } = extra;
    return makeCastSpell(spell.cardId, rest);
  }

  // 3) Ataque direto
  const directSlot = findDirectAttack(botBoard, enemyBoard);
  if (directSlot != null) {
    const atk = getUnitAttackValue(botBoard[directSlot]);
    if (atk > 0) return makeAttack(directSlot);
  }

  // 4) Jogar melhor unidade jogável se houver slot livre
  const free = freeSlots(botBoard);
  if (free.length > 0) {
    const bestUnit = pickBestPlayableUnit(hand, energy);
    if (bestUnit) {
      const slot = pickBestSlotForUnit(enemyBoard, free);
      if (slot != null) return makePlayCard(bestUnit.cardId, slot);
    }
  }

  // 5) Ataque com dano positivo
  const posSlot = findPositiveDamageAttack(botBoard, enemyBoard);
  if (posSlot != null) {
    const atk = getUnitAttackValue(botBoard[posSlot]);
    const enemy = enemyBoard[posSlot];
    const def = enemy ? getUnitDefenseValue(enemy) : 0;
    if (atk - def > 0) return makeAttack(posSlot);
  }

  // 6) Último recurso: atacar com maior atk
  let bestAny = null;
  let bestAnyAtk = -Infinity;
  for (let i = 0; i < 3; i += 1) {
    const my = botBoard[i];
    if (!my) continue;
    const atk = getUnitAttackValue(my);
    if (atk > bestAnyAtk) {
      bestAnyAtk = atk;
      bestAny = i;
    }
  }
  if (bestAny != null && bestAnyAtk > 0) return makeAttack(bestAny);

  return makeEndTurn();
}

export default { decideMove };
