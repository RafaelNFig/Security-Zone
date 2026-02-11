// rules-service/src/engine/resolveSpell.js
// Resolver CAST_SPELL (Magias/Software) — versão "full" compatível com:
// - Regras base do PDF: magias não ocupam slot, só na MAIN e antes do ataque, consomem energia,
//   e se o deck acabar pode reciclar a Zona de Exclusão (discard) como novo deck.
// - Sistema de efeitos temporários em state.effects[] (buff/debuff, reveal, tax de custo, “próximo ataque…”).
// - Magias do PDF (implementadas):
//   1) Software Malicioso: BUFF/DEBUFF de ATK até fim do próximo turno.
//   2) Escudo Digital: cura unidade + buff de DEF até fim da rodada.
//   3) Logs de Auditoria: revela topo do deck do oponente; se for Ataque, taxa +1 de custo “neste turno”.
//   4) Atualização de Software: bloqueia o próximo ataque OU redireciona o próximo ataque.
//   5) Backup Seguro: restaura 1 carta do discard para campo (20% vida) OU mão (full e revelada).
//
// Importante:
// - Este resolver grava efeitos e eventos; alguns efeitos exigem que outros resolvers consultem state.effects.
//   Ex.: COST_TAX_NEXT_CARD deve ser lido em resolvePlayCard; NEXT_ATTACK_BLOCK/REDIRECT deve ser lido em resolveAttack.
// - Mantém compatibilidade com o seu state atual (players[*].discard como "Zona de Exclusão").
//
// Payloads esperados por magia (padrão recomendado):
// - CAST_SPELL: { cardId, choice?, target?, slot?, redirectToSlot?, restoreCardId?, restoreTo?, restoreSlot? }
//
// Observação: se a carta tiver effect.kind JSON, ele ainda pode cair no fallback "kind simples" (DAMAGE_UNIT etc).

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
  if (typeof st.turn.number !== "number" || !Number.isFinite(st.turn.number)) st.turn.number = 1;
  if (typeof st.turn.abilityUsed !== "boolean") st.turn.abilityUsed = false;
  if (!st.turn.abilityUsedBy) st.turn.abilityUsedBy = null;
}

function ensureEffects(st) {
  ensureArray(st, "effects");
  return st.effects;
}

function addEffect(st, eff) {
  const effects = ensureEffects(st);
  effects.push({
    id: `eff_${Date.now()}_${Math.floor(Math.random() * 1e9)}`,
    ts: Date.now(),
    ...eff,
  });
}

function getRoundNumber(st) {
  const r = Number(st?.round?.number);
  if (Number.isFinite(r) && r > 0) return r;
  const t = Number(st?.turn?.number ?? 1);
  if (!Number.isFinite(t) || t <= 0) return 1;
  return Math.ceil(t / 2);
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

function getHp(playerObj) {
  const hp = Number(playerObj?.hp ?? playerObj?.life ?? 100);
  return Number.isFinite(hp) ? hp : 100;
}

function setHp(playerObj, val) {
  playerObj.hp = val;
}

function isValidSlot(s) {
  return Number.isInteger(s) && s >= 0 && s <= 2;
}

function getBoard(st, who) {
  const b = st?.board?.[who];
  return Array.isArray(b) ? b : null;
}

function getUnitAt(st, who, slot) {
  const b = getBoard(st, who);
  if (!b || b.length < 3) return null;
  return b[slot] ?? null;
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Regra do PDF: se o deck acabar, recicla a Zona de Exclusão (discard) para virar deck novamente.
function ensureDeckHasCards(pl, events, who, source = "SPELL") {
  ensureArray(pl, "deck");
  ensureArray(pl, "discard");

  if (pl.deck.length > 0) return;

  if (pl.discard.length > 0) {
    pl.deck = pl.discard.splice(0, pl.discard.length);
    shuffleInPlace(pl.deck);

    events.push({
      type: "DECK_RECYCLED_FROM_DISCARD",
      payload: { player: who, deckCount: pl.deck.length, source },
    });
  }
}

function normalizeSlug(v) {
  return String(v ?? "").trim().toLowerCase();
}

// ===== Handlers de magias (PDF) =====
function resolveSoftwareMalicioso(st, owner, enemy, payload, events) {
  // Escolhe 1:
  // (a) inimigo -10 ATK até fim do próximo turno
  // (b) aliado +10 ATK até fim do próximo turno
  const choice = toUpper(payload.choice, "");
  const target = isObject(payload.target) ? payload.target : null;
  const side = toUpper(target?.side, choice.includes("DEBUFF") ? "ENEMY" : "SELF");
  const slot = target?.slot;

  if (!isValidSlot(slot)) {
    return reject("INVALID_SPELL_TARGET", "Software Malicioso requer target.slot (0..2).", events);
  }

  const who = side === "ENEMY" ? enemy : owner;
  const unit = getUnitAt(st, who, slot);
  if (!unit) return reject("NO_UNIT_IN_TARGET_SLOT", "Não há unidade no slot alvo.", events);

  let mod = 0;
  if (choice === "DEBUFF" || choice === "DEBUFF_ENEMY" || choice === "A") mod = -10;
  else if (choice === "BUFF" || choice === "BUFF_SELF" || choice === "B") mod = +10;
  else {
    // fallback: se não vier choice, tenta inferir pelo payload.mod
    const m = Number(payload.mod ?? 0);
    if (!Number.isFinite(m) || m === 0) {
      return reject("MISSING_CHOICE", "Software Malicioso requer choice (BUFF/DEBUFF) ou payload.mod (+/-).", events);
    }
    mod = m;
  }

  const turnNum = Number(st.turn.number ?? 1);
  addEffect(st, {
    kind: "MOD_ATK",
    owner,
    targetPlayer: who,
    slot,
    amount: mod,
    expiresAtTurn: turnNum + 2, // fim do próximo turno do jogador (turn alterna)
    meta: { source: "SPELL", spell: "SOFTWARE_MALICIOSO" },
  });

  events.push({
    type: "EFFECT_APPLIED",
    payload: {
      by: owner,
      kind: "MOD_ATK",
      targetPlayer: who,
      slot,
      amount: mod,
      expiresAtTurn: turnNum + 2,
      source: "SOFTWARE_MALICIOSO",
    },
  });

  return { ok: true };
}

function resolveEscudoDigital(st, owner, enemy, payload, events) {
  // Cura 30 em uma unidade aliada e +10 DEF até fim da rodada
  const target = isObject(payload.target) ? payload.target : null;
  const slot = target?.slot;

  if (!isValidSlot(slot)) {
    return reject("INVALID_SPELL_TARGET", "Escudo Digital requer target.slot (0..2).", events);
  }

  const unit = getUnitAt(st, owner, slot);
  if (!unit) return reject("NO_UNIT_IN_TARGET_SLOT", "Não há unidade aliada no slot alvo.", events);

  const lifeBefore = Number(unit.life ?? 0);
  const lifeMax = Number(unit.lifeMax ?? unit.maxLife ?? lifeBefore);
  const heal = 30;

  const after = Math.min(Number.isFinite(lifeMax) ? lifeMax : lifeBefore + heal, lifeBefore + heal);
  unit.life = after;

  events.push({
    type: "UNIT_HEALED",
    payload: { by: owner, targetPlayer: owner, slot, amount: heal, lifeBefore, lifeAfter: after, source: "ESCUDO_DIGITAL" },
  });

  const roundNow = getRoundNumber(st);
  addEffect(st, {
    kind: "MOD_DEF",
    owner,
    targetPlayer: owner,
    slot,
    amount: +10,
    expiresAtRound: roundNow + 1, // fim da rodada atual
    meta: { source: "SPELL", spell: "ESCUDO_DIGITAL" },
  });

  events.push({
    type: "EFFECT_APPLIED",
    payload: {
      by: owner,
      kind: "MOD_DEF",
      targetPlayer: owner,
      slot,
      amount: 10,
      expiresAtRound: roundNow + 1,
      source: "ESCUDO_DIGITAL",
    },
  });

  return { ok: true };
}

function resolveLogsAuditoria(st, owner, enemy, payload, events) {
  // Revela o topo do deck do oponente; se for Ataque, ela custa +1 "neste turno".
  const op = st.players[enemy];
  ensureArray(op, "deck");
  ensureArray(op, "discard");

  // garante deck via reciclagem se vazio
  ensureDeckHasCards(op, events, enemy, "LOGS_AUDITORIA");

  const top = op.deck[0] ?? null;
  if (!top) {
    events.push({ type: "PEEK_SKIPPED_NO_CARDS_AVAILABLE", payload: { by: owner, target: enemy, source: "LOGS_AUDITORIA" } });
    return { ok: true };
  }

  const topId = extractCardId(top);
  const topType = extractType(top); // SPELL/UNIT etc
  events.push({
    type: "TOP_DECK_REVEALED",
    payload: { by: owner, target: enemy, cardId: topId, cardType: topType, source: "LOGS_AUDITORIA" },
  });

  // Se for carta de Ataque (no seu jogo: UNIT tipo ataque; aqui usamos heurística por campo/slug)
  const slug = normalizeSlug(topId);
  const looksAttack = topType !== "SPELL" && (
    slug.includes("ataque") ||
    slug.includes("attack") ||
    slug.includes("forca") ||
    slug.includes("injecao") ||
    slug.includes("captura") ||
    slug.includes("quebra") ||
    slug.includes("exploracao") ||
    slug.includes("mitm") ||
    slug.includes("ponto") ||
    slug.includes("engenharia") ||
    // fallback: se vier um campo “category/tipo”
    normalizeSlug(top?.category ?? top?.tipo ?? "").includes("ataque")
  );

  if (looksAttack) {
    // aplica um “tax” no próximo PLAY_CARD do oponente neste turno
    // OBS: resolvePlayCard precisa ler esse efeito e somar +amount ao custo.
    const turnNum = Number(st.turn.number ?? 1);
    addEffect(st, {
      kind: "COST_TAX_NEXT_CARD",
      owner,
      targetPlayer: enemy,
      amount: 1,
      expiresAtTurn: turnNum + 1, // expira no fim do turno atual
      meta: { source: "SPELL", spell: "LOGS_AUDITORIA", cardId: topId },
    });

    events.push({
      type: "COST_TAX_APPLIED",
      payload: { by: owner, target: enemy, amount: 1, duration: "THIS_TURN", source: "LOGS_AUDITORIA" },
    });
  }

  return { ok: true };
}

function resolveAtualizacaoSoftware(st, owner, enemy, payload, events) {
  // Bloqueia o próximo ataque OU redireciona o próximo ataque para outro slot válido
  const choice = toUpper(payload.choice, "");
  const turnNum = Number(st.turn.number ?? 1);

  if (choice === "BLOCK") {
    // resolveAttack deve checar esse efeito e negar o próximo ATTACK do inimigo (ou do próximo atacante)
    addEffect(st, {
      kind: "NEXT_ATTACK_BLOCK",
      owner,
      targetPlayer: owner,          // quem está protegido
      expiresAtTurn: turnNum + 2,   // até o fim do próximo turno do oponente (janela segura)
      meta: { source: "SPELL", spell: "ATUALIZACAO_SOFTWARE" },
    });

    events.push({
      type: "EFFECT_APPLIED",
      payload: { by: owner, kind: "NEXT_ATTACK_BLOCK", targetPlayer: owner, expiresAtTurn: turnNum + 2, source: "ATUALIZACAO_SOFTWARE" },
    });
    return { ok: true };
  }

  if (choice === "REDIRECT") {
    const redirectToSlot = payload.redirectToSlot;
    if (!isValidSlot(redirectToSlot)) {
      return reject("INVALID_SPELL_TARGET", "Atualização de Software REDIRECT requer redirectToSlot (0..2).", events);
    }

    addEffect(st, {
      kind: "NEXT_ATTACK_REDIRECT",
      owner,
      targetPlayer: owner,          // quem está protegido
      slot: redirectToSlot,         // slot para onde redirecionar
      expiresAtTurn: turnNum + 2,
      meta: { source: "SPELL", spell: "ATUALIZACAO_SOFTWARE" },
    });

    events.push({
      type: "EFFECT_APPLIED",
      payload: { by: owner, kind: "NEXT_ATTACK_REDIRECT", targetPlayer: owner, redirectToSlot, expiresAtTurn: turnNum + 2, source: "ATUALIZACAO_SOFTWARE" },
    });
    return { ok: true };
  }

  return reject("MISSING_CHOICE", "Atualização de Software requer choice=BLOCK ou choice=REDIRECT.", events);
}

function resolveBackupSeguro(st, owner, enemy, payload, events, extraCostChargeFn) {
  // Backup Seguro (restauração) — PDF:
  // (a) restaurar para o campo com 20% vida (custo adicional 2)
  // (b) restaurar para a mão com vida cheia revelada (custo adicional 3)
  //
  // Payload recomendado:
  // - restoreCardId: id da carta dentro do discard do jogador
  // - restoreTo: "FIELD"|"HAND"
  // - restoreSlot: 0..2 (se FIELD)
  const me = st.players[owner];
  ensureArray(me, "discard");
  ensureArray(me, "hand");

  const restoreCardId = payload.restoreCardId ?? payload.cardIdFromDiscard ?? null;
  if (!restoreCardId || String(restoreCardId).trim() === "") {
    return reject("MISSING_RESTORE_CARD_ID", "Backup Seguro requer restoreCardId (carta no discard).", events);
  }

  const restoreTo = toUpper(payload.restoreTo, "");
  if (restoreTo !== "FIELD" && restoreTo !== "HAND") {
    return reject("INVALID_RESTORE_DESTINATION", "Backup Seguro requer restoreTo=FIELD ou restoreTo=HAND.", events);
  }

  // custo adicional
  const extra = restoreTo === "FIELD" ? 2 : 3;
  if (typeof extraCostChargeFn === "function") {
    const ok = extraCostChargeFn(extra);
    if (!ok) return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente para Backup Seguro. Extra=${extra}.`, events);
  }

  const idStr = String(restoreCardId);
  const idx = me.discard.findIndex((c) => extractCardId(c) === idStr);
  if (idx === -1) {
    return reject("CARD_NOT_IN_DISCARD", "A carta informada não está na Zona de Exclusão (discard) do jogador.", events);
  }

  const [restored] = me.discard.splice(idx, 1);

  if (restoreTo === "HAND") {
    // vida cheia + revelada
    // (se for UNIT, garantimos lifeMax/full; se for SPELL, só volta pra mão)
    if (restored && typeof restored === "object") {
      // Se for uma unidade snapshot (do board), pode ter lifeMax
      if (restored.type === "UNIT" || toUpper(restored.type, "") === "UNIT") {
        const max = Number(restored.lifeMax ?? restored.maxLife ?? restored.life ?? 0);
        if (Number.isFinite(max) && max > 0) restored.life = max;
      }
    }

    me.hand.push(restored);

    // Marca revelada temporariamente (match-service deve respeitar)
    const turnNum = Number(st.turn.number ?? 1);
    addEffect(st, {
      kind: "REVEAL_HAND_CARD",
      owner,
      targetPlayer: owner,
      amount: 1,
      expiresAtTurn: turnNum + 1,
      meta: { source: "SPELL", spell: "BACKUP_SEGURO", cardId: idStr },
    });

    events.push({
      type: "CARD_MOVED",
      payload: { player: owner, cardId: idStr, from: "DISCARD", to: "HAND", source: "BACKUP_SEGURO" },
    });
    events.push({
      type: "HAND_CARD_REVEALED",
      payload: { player: owner, cardId: idStr, duration: "UNTIL_END_TURN", source: "BACKUP_SEGURO" },
    });

    return { ok: true };
  }

  // restoreTo === FIELD
  const restoreSlot = payload.restoreSlot;
  if (!isValidSlot(restoreSlot)) {
    return reject("INVALID_RESTORE_SLOT", "Backup Seguro FIELD requer restoreSlot (0..2).", events);
  }

  const board = getBoard(st, owner);
  if (!board || board.length < 3) {
    return reject("INVALID_BOARD", "board do jogador inválido no state.", events);
  }
  if (board[restoreSlot] != null) {
    return reject("SLOT_OCCUPIED", "O slot alvo já está ocupado.", events);
  }

  // Precisamos colocar algo no board: se a carta restaurada não for snapshot UNIT, construímos snapshot mínimo
  const cardId = extractCardId(restored) ?? idStr;

  const baseLife = Number(restored?.lifeMax ?? restored?.maxLife ?? restored?.life ?? restored?.CD_LIFE ?? 1);
  const maxLife = Number.isFinite(baseLife) && baseLife > 0 ? baseLife : 1;
  const revivedLife = Math.max(1, Math.ceil(maxLife * 0.2));

  const unitSnapshot = {
    ...(isObject(restored) ? restored : {}),
    type: "UNIT",
    cardId,
    name: restored?.name ?? restored?.CD_NAME ?? "Unit",
    owner,
    originalOwner: restored?.originalOwner ?? owner,
    lifeMax: maxLife,
    life: revivedLife,
    // mantém stats se existirem
    attack: Number(restored?.attack ?? restored?.atk ?? restored?.CD_ATTACK ?? 0) || 0,
    defense: Number(restored?.defense ?? restored?.def ?? restored?.CD_DEFENSE ?? 0) || 0,
    revivedBy: owner,
    revivedAtTurn: Number(st.turn.number ?? 1),
  };

  board[restoreSlot] = unitSnapshot;

  events.push({
    type: "CARD_MOVED",
    payload: { player: owner, cardId, from: "DISCARD", to: "BOARD", slot: restoreSlot, source: "BACKUP_SEGURO" },
  });
  events.push({
    type: "UNIT_REVIVED",
    payload: { player: owner, slot: restoreSlot, cardId, life: revivedLife, lifeMax: maxLife, source: "BACKUP_SEGURO" },
  });

  return { ok: true };
}

// ===== Fallback antigo (kinds simples) =====
function resolveLegacyEffect(st, owner, enemy, effect, payload, events) {
  const kind = toUpper(effect.kind, "");
  const me = st.players[owner];

  // 1) DAMAGE_UNIT
  if (kind === "DAMAGE_UNIT") {
    const amount = Number(effect.amount ?? 0);
    const slot = effect.slot;
    const target = toUpper(effect.target, "ENEMY"); // ENEMY | SELF

    if (!Number.isFinite(amount) || amount <= 0) return reject("INVALID_SPELL_EFFECT", "DAMAGE_UNIT requer amount > 0.", events);
    if (!isValidSlot(slot)) return reject("INVALID_SPELL_TARGET", "DAMAGE_UNIT requer slot 0..2.", events);

    const who = target === "SELF" ? owner : enemy;
    const board = getBoard(st, who);
    if (!board || board.length < 3) return reject("INVALID_BOARD", "board inválido no state.", events);

    const unit = board[slot];
    if (!unit) return reject("NO_UNIT_IN_TARGET_SLOT", "Não há unidade no slot alvo.", events);

    const lifeBefore = Number(unit.life ?? 0);
    const lifeAfterRaw = lifeBefore - amount;
    const lifeAfter = Math.max(0, lifeAfterRaw);
    unit.life = lifeAfter;

    events.push({ type: "UNIT_DAMAGED", payload: { by: owner, targetPlayer: who, slot, amount, lifeBefore, lifeAfter, source: "SPELL" } });

    if (lifeAfterRaw <= 0) {
      board[slot] = null;
      const pl = st.players[who];
      ensureArray(pl, "discard");
      unit.life = 0;
      pl.discard.push(unit);
      events.push({ type: "UNIT_DESTROYED", payload: { slot, owner: who, unitId: unit.unitId ?? null, cardId: unit.cardId ?? null, source: "SPELL" } });
    }

    return { ok: true };
  }

  // 2) DAMAGE_PLAYER
  if (kind === "DAMAGE_PLAYER") {
    const amount = Number(effect.amount ?? 0);
    const target = toUpper(effect.target, "ENEMY"); // ENEMY | SELF
    if (!Number.isFinite(amount) || amount <= 0) return reject("INVALID_SPELL_EFFECT", "DAMAGE_PLAYER requer amount > 0.", events);

    const who = target === "SELF" ? owner : enemy;
    const pl = st.players[who];
    const before = getHp(pl);
    const after = Math.max(0, before - amount);
    setHp(pl, after);

    events.push({ type: "PLAYER_DAMAGED", payload: { from: owner, to: who, amount, hpBefore: before, hpAfter: after, source: "SPELL" } });

    if (after <= 0) {
      st.turn = st.turn || {};
      st.turn.phase = "ENDED";
      events.push({ type: "GAME_ENDED", payload: { winner: owner, loser: who, reason: "PLAYER_HP_ZERO" } });
    }

    return { ok: true };
  }

  // 3) HEAL_PLAYER
  if (kind === "HEAL_PLAYER") {
    const amount = Number(effect.amount ?? 0);
    const target = toUpper(effect.target, "SELF");
    if (!Number.isFinite(amount) || amount <= 0) return reject("INVALID_SPELL_EFFECT", "HEAL_PLAYER requer amount > 0.", events);

    const who = target === "ENEMY" ? enemy : owner;
    const pl = st.players[who];
    const before = getHp(pl);
    const after = before + amount;
    setHp(pl, after);

    events.push({ type: "PLAYER_HEALED", payload: { by: owner, to: who, amount, hpBefore: before, hpAfter: after, source: "SPELL" } });
    return { ok: true };
  }

  // 4) DRAW
  if (kind === "DRAW") {
    const amount = Number(effect.amount ?? 1);
    if (!Number.isFinite(amount) || amount <= 0) return reject("INVALID_SPELL_EFFECT", "DRAW requer amount > 0.", events);

    for (let i = 0; i < amount; i++) {
      ensureDeckHasCards(me, events, owner, "SPELL");
      if (me.deck.length > 0) {
        const drawn = me.deck.shift();
        me.hand.push(drawn);
        events.push({
          type: "CARD_DRAWN",
          payload: { player: owner, cardId: drawn?.cardId ?? drawn?.id ?? drawn?.CD_ID ?? null, handCount: me.hand.length, deckCount: me.deck.length, source: "SPELL" },
        });
      } else {
        events.push({ type: "DRAW_SKIPPED_NO_CARDS_AVAILABLE", payload: { player: owner, source: "SPELL" } });
        break;
      }
    }
    return { ok: true };
  }

  // 5) REVEAL_HAND (persistente via effect também)
  if (kind === "REVEAL_HAND") {
    const target = toUpper(effect.target, "ENEMY");
    const who = target === "SELF" ? owner : enemy;
    const turnNum = Number(st.turn.number ?? 1);
    addEffect(st, { kind: "REVEAL_HAND", owner, targetPlayer: who, expiresAtTurn: turnNum + 1, meta: { source: "SPELL" } });

    events.push({ type: "REVEAL_HAND", payload: { by: owner, target: who, duration: effect.duration ?? "UNTIL_END_TURN", source: "SPELL" } });
    return { ok: true };
  }

  return reject("EFFECT_NOT_IMPLEMENTED", `Efeito não implementado: ${effect.kind}`, events);
}

export function resolveSpell(state, actionInput) {
  const action = normalizeAction(actionInput);
  const type = toUpper(action?.type, "");
  const payload = isObject(action?.payload) ? action.payload : {};

  if (type !== "CAST_SPELL") {
    return reject("INVALID_RESOLVER", "resolveSpell chamado com ação diferente de CAST_SPELL.");
  }

  const owner = ownerKey(state);
  if (!owner) return reject("INVALID_TURN_OWNER", "turn.owner inválido (esperado P1/P2).");

  // Timing: só na MAIN e antes do ataque
  const phase = toUpper(state?.turn?.phase, "MAIN");
  if (phase !== "MAIN") return reject("INVALID_PHASE", `CAST_SPELL não permitido na fase '${phase}'.`);
  if (state?.turn?.hasAttacked) return reject("SPELL_AFTER_ATTACK", "Não é possível usar Magias após declarar ataque.");

  const cardId = payload.cardId;
  if (cardId == null || String(cardId).trim() === "") return reject("MISSING_CARD_ID", "cardId é obrigatório em CAST_SPELL.");

  const newState = deepClone(state);
  ensureTurn(newState);
  ensureEffects(newState);

  if (!newState.players?.P1 || !newState.players?.P2) return reject("INVALID_PLAYERS", "players.P1 e players.P2 são obrigatórios.");
  if (!newState.board?.P1 || !newState.board?.P2) return reject("INVALID_BOARD", "board.P1 e board.P2 são obrigatórios.");

  const enemy = otherKey(owner);
  const me = newState.players[owner];

  ensureArray(me, "hand");
  ensureArray(me, "discard");
  ensureArray(me, "deck");

  const targetId = String(cardId);
  const idx = me.hand.findIndex((c) => extractCardId(c) === targetId);
  if (idx === -1) return reject("CARD_NOT_IN_HAND", "A carta informada não está na mão do jogador.");

  const card = me.hand[idx];
  const ctype = extractType(card);
  if (ctype !== "SPELL") return reject("NOT_A_SPELL", "CAST_SPELL só pode ser usado com carta SPELL.");

  const baseCost = extractCost(card);
  const energy = Number(me.energy ?? 0);
  if (!Number.isFinite(energy)) return reject("INVALID_ENERGY", "Energia do jogador inválida no state.");
  if (baseCost < 0) return reject("INVALID_CARD_COST", "Custo de carta inválido (negativo).");
  if (baseCost > energy) return reject("NOT_ENOUGH_ENERGY", `Energia insuficiente. Custo=${baseCost}, energia=${energy}.`);

  // Paga custo base
  me.energy = energy - baseCost;

  // Move: hand -> discard (zona de exclusão atual)
  const [spellCard] = me.hand.splice(idx, 1);
  me.discard.push(spellCard);

  const events = [];
  events.push({ type: "ACTION_META", payload: { actionType: "CAST_SPELL", player: owner } });
  events.push({ type: "ENERGY_SPENT", payload: { player: owner, amount: baseCost, energyAfter: me.energy } });
  events.push({ type: "CARD_MOVED", payload: { player: owner, cardId: targetId, from: "HAND", to: "DISCARD" } });
  events.push({ type: "SPELL_CAST", payload: { player: owner, cardId: targetId, name: spellCard?.name ?? spellCard?.CD_NAME ?? "Spell" } });

  // Função para cobrar custos extras (Backup Seguro)
  const chargeExtra = (extra) => {
    const cur = Number(me.energy ?? 0);
    if (!Number.isFinite(cur) || cur < extra) return false;
    me.energy = cur - extra;
    events.push({ type: "ENERGY_SPENT", payload: { player: owner, amount: extra, energyAfter: me.energy, source: "SPELL_EXTRA_COST" } });
    return true;
  };

  // 1) Tenta resolver pelas magias do PDF via slug / name
  const slug = normalizeSlug(spellCard?.cardId ?? spellCard?.id ?? targetId);
  const nm = normalizeSlug(spellCard?.name ?? spellCard?.CD_NAME ?? "");

  const isSoftwareMalicioso = slug.includes("software_malicioso") || nm.includes("software malicioso");
  const isEscudoDigital = slug.includes("escudo_digital") || nm.includes("escudo digital");
  const isLogsAuditoria = slug.includes("logs_auditoria") || nm.includes("logs de auditoria");
  const isAtualizacaoSoftware = slug.includes("atualizacao_software") || nm.includes("atualização de software") || nm.includes("atualizacao de software");
  const isBackupSeguro = slug.includes("backup_seguro") || nm.includes("backup seguro");

  if (isSoftwareMalicioso) {
    const r = resolveSoftwareMalicioso(newState, owner, enemy, payload, events);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  if (isEscudoDigital) {
    const r = resolveEscudoDigital(newState, owner, enemy, payload, events);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  if (isLogsAuditoria) {
    const r = resolveLogsAuditoria(newState, owner, enemy, payload, events);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  if (isAtualizacaoSoftware) {
    const r = resolveAtualizacaoSoftware(newState, owner, enemy, payload, events);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  if (isBackupSeguro) {
    const r = resolveBackupSeguro(newState, owner, enemy, payload, events, chargeExtra);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  // 2) Se não for uma magia do PDF, tenta resolver via effect JSON (legacy/demo)
  const effect = spellCard?.effect ?? spellCard?.CD_EFFECT_JSON ?? null;
  if (effect && typeof effect === "object") {
    const r = resolveLegacyEffect(newState, owner, enemy, effect, payload, events);
    if (r?.rejected) return r;
    bumpVersion(newState);
    events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
    return { newState, events };
  }

  // 3) Sem efeito: spell “neutra” (só foi usada)
  bumpVersion(newState);
  events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
  return { newState, events };
}

export default resolveSpell;
