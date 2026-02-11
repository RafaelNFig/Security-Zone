// rules-service/src/engine/resolveAttack.js
// Resolver ATTACK (por slot) — versão compatível com:
// - Regras base do PDF (ataque por slot, slot vazio = dano no player, atacar encerra o turno)
// - Passivas/efeitos temporários (buff/debuff, redução fixa e %, ignorar defesa parcial, overflow)
// - Gatilhos de cartas (onAttack, onDamageDealt, onNoDamage, etc.)
// - Integração com magias via state.effects:
//   - NEXT_ATTACK_BLOCK (bloqueia o próximo ataque contra o jogador protegido)
//   - NEXT_ATTACK_REDIRECT (redireciona o próximo ataque contra o jogador protegido para outro slot)
//
// IMPORTANTE (design):
// - Habilidades opcionais com custo (ACTIVATE_ABILITY) são resolvidas em resolveAbility.js.
//   Aqui só consumimos efeitos/passivas/triggers automáticos de combate.

import endTurn from "./endTurn.js";

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
  if (typeof st.turn.abilityUsed !== "boolean") st.turn.abilityUsed = false;
  if (!st.turn.abilityUsedBy) st.turn.abilityUsedBy = null;
  if (typeof st.turn.number !== "number" || !Number.isFinite(st.turn.number)) st.turn.number = 1;
}

function ensureEffects(st) {
  ensureArray(st, "effects");
  return st.effects;
}

function nowTs() {
  return Date.now();
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

function statUnit(unit, key, fallback = 0) {
  const alias =
    key === "attack" ? "atk" :
    key === "defense" ? "def" :
    key === "life" ? "hp" :
    null;

  const n = Number(unit?.[key] ?? (alias ? unit?.[alias] : undefined) ?? fallback);
  return Number.isFinite(n) ? n : fallback;
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

function setUnitAt(st, who, slot, unitOrNull) {
  const b = getBoard(st, who);
  if (!b || b.length < 3) return false;
  b[slot] = unitOrNull;
  return true;
}

function ensureUnitFlags(unit) {
  if (!unit || typeof unit !== "object") return unit;
  if (!unit._flags || typeof unit._flags !== "object") unit._flags = {};
  return unit;
}

function getRoundNumber(st) {
  const r = Number(st?.round?.number);
  if (Number.isFinite(r) && r > 0) return r;
  const t = Number(st?.turn?.number ?? 1);
  if (!Number.isFinite(t) || t <= 0) return 1;
  return Math.ceil(t / 2);
}

function normalizeKey(v) {
  return String(v ?? "").trim().toLowerCase();
}

function cardSlug(unit) {
  const id = unit?.cardId ?? unit?.id ?? "";
  return normalizeKey(id);
}

// ====== Normalização de descritores de cartas (passives/triggers) ======
function listPassives(unit) {
  if (!unit) return [];
  if (Array.isArray(unit.passives)) {
    return unit.passives
      .filter((p) => p && typeof p === "object" && p.key)
      .map((p) => ({ key: String(p.key), ...p }));
  }

  if (isObject(unit.effect) && Array.isArray(unit.effect.passives)) {
    return unit.effect.passives
      .filter((p) => p && typeof p === "object" && p.key)
      .map((p) => ({ key: String(p.key), ...p }));
  }

  // fallback por slug (mínimo)
  const slug = cardSlug(unit);
  const arr = [];
  if (slug.includes("firewall")) arr.push({ key: "FIREWALL_BASIC" });
  if (slug.includes("navegacao_segura") || slug.includes("navegacao") || slug.includes("safe_browsing")) {
    arr.push({ key: "SAFE_BROWSING_HALF_DAMAGE" });
  }
  if (slug.includes("senha_forte")) arr.push({ key: "STRONG_PASSWORD_NEGATE_ONCE_PER_ROUND" });
  return arr;
}

function listTriggers(unit) {
  if (!unit) return [];
  if (Array.isArray(unit.triggers)) {
    return unit.triggers
      .filter((t) => t && typeof t === "object" && t.key)
      .map((t) => ({ key: String(t.key), ...t }));
  }

  if (isObject(unit.effect) && Array.isArray(unit.effect.triggers)) {
    return unit.effect.triggers
      .filter((t) => t && typeof t === "object" && t.key)
      .map((t) => ({ key: String(t.key), ...t }));
  }

  // fallback por slug (mínimo)
  const slug = cardSlug(unit);
  const arr = [];
  if (slug.includes("captura_pacotes") || slug.includes("packet_capture")) {
    arr.push({ key: "PACKET_CAPTURE_LIFESTEAL_ON_DAMAGE_TO_UNIT", heal: 5 });
  }
  if (slug.includes("injecao_script") || slug.includes("script_injection")) {
    arr.push({ key: "SCRIPT_INJECTION_SPLIT_DAMAGE_UP_TO_2" });
  }
  if (slug.includes("pagina_fake") || slug.includes("fake_login")) {
    arr.push({ key: "FAKE_LOGIN_EXTRA_PLAYER_DAMAGE_ON_DAMAGE_TO_UNIT", amount: 10 });
  }
  if (slug.includes("quebra_autorizacao") || slug.includes("broken_auth")) {
    arr.push({ key: "BROKEN_AUTH_IGNORE_DEF_UP_TO", amount: 20 });
  }
  if (slug.includes("forca_bruta") || slug.includes("bruteforce")) {
    arr.push({ key: "BRUTE_FORCE_GAIN_ATK_ON_NO_DAMAGE", amount: 10, expires: "END_NEXT_TURN" });
  }
  if (slug.includes("exploracao_api") || slug.includes("api_exploit")) {
    arr.push({ key: "API_EXPLOIT_SILENCE_TARGET_UNTIL_END_NEXT_TURN" });
  }
  if (slug.includes("man_in_the_middle") || slug.includes("mitm")) {
    arr.push({ key: "MITM_OVERFLOW_SPLIT_HALF_UNIT_HALF_PLAYER" });
  }
  if (slug.includes("ponto_fantasma") || slug.includes("ghost_point")) {
    arr.push({ key: "GHOST_POINT_OVERFLOW_ONLY_IF_DEF_LTE", threshold: 30 });
  }
  if (slug.includes("engenharia_social") || slug.includes("social_engineering")) {
    arr.push({ key: "SOCIAL_ENGINEERING_REVEAL_HAND_UNTIL_END_TURN" });
  }
  return arr;
}

// ====== Efeitos temporários do state.effects ======
function pruneExpiredEffects(st) {
  const effects = ensureEffects(st);
  const turnNum = Number(st?.turn?.number ?? 1);
  const roundNum = getRoundNumber(st);

  st.effects = effects.filter((e) => {
    if (!e || typeof e !== "object") return false;
    const expT = Number(e.expiresAtTurn);
    if (Number.isFinite(expT) && turnNum >= expT) return false;
    const expR = Number(e.expiresAtRound);
    if (Number.isFinite(expR) && roundNum >= expR) return false;
    return true;
  });
}

function effectsForUnit(st, who, slot) {
  const effects = ensureEffects(st);
  return effects.filter((e) => e && typeof e === "object" && e.targetPlayer === who && e.slot === slot);
}

function effectsForPlayer(st, who) {
  const effects = ensureEffects(st);
  return effects.filter((e) => e && typeof e === "object" && e.targetPlayer === who && (e.slot == null));
}

function consumeFirstEffect(st, predicate) {
  const effects = ensureEffects(st);
  const idx = effects.findIndex(predicate);
  if (idx === -1) return null;
  const [removed] = effects.splice(idx, 1);
  return removed ?? null;
}

// Applies additive stat mods from state.effects and returns effective stats.
function computeEffectiveStats(st, who, slot, unit) {
  const base = {
    life: statUnit(unit, "life", 0),
    attack: statUnit(unit, "attack", 0),
    defense: statUnit(unit, "defense", 0),
  };

  const effs = effectsForUnit(st, who, slot);
  let atkMod = 0;
  let defMod = 0;

  for (const e of effs) {
    const kind = toUpper(e.kind, "");
    const amt = Number(e.amount ?? 0);
    if (!Number.isFinite(amt)) continue;

    if (kind === "MOD_ATK") atkMod += amt;
    if (kind === "MOD_DEF") defMod += amt;
  }

  return {
    life: base.life,
    attack: base.attack + atkMod,
    defense: base.defense + defMod,
  };
}

// ====== Pipeline de dano ======
function floorInt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.floor(x);
}

function isCostLower(attackerUnit, defenderUnit) {
  const a = Number(attackerUnit?.cost ?? 0);
  const d = Number(defenderUnit?.cost ?? 0);
  return Number.isFinite(a) && Number.isFinite(d) ? a < d : false;
}

function applyDefIgnoreFromTriggers(ctx, defValue) {
  let defEff = defValue;

  for (const t of ctx.attackerTriggers) {
    const key = toUpper(t.key, "");
    if (key === "BROKEN_AUTH_IGNORE_DEF_UP_TO") {
      const amt = Number(t.amount ?? 20);
      if (Number.isFinite(amt) && amt > 0) {
        defEff = Math.max(0, defEff - amt);
        ctx.events.push({
          type: "DEFENSE_IGNORED",
          payload: { slot: ctx.targetSlot, by: ctx.owner, amount: amt, defenseBefore: defValue, defenseAfter: defEff, source: "TRIGGER" },
        });
      }
    }
  }

  // allow temporary effects too
  const effs = effectsForUnit(ctx.state, ctx.enemy, ctx.targetSlot);
  for (const e of effs) {
    const kind = toUpper(e.kind, "");
    if (kind === "IGNORE_DEF_UP_TO") {
      const amt = Number(e.amount ?? 0);
      if (Number.isFinite(amt) && amt > 0) {
        defEff = Math.max(0, defEff - amt);
        ctx.events.push({
          type: "DEFENSE_IGNORED",
          payload: { slot: ctx.targetSlot, by: ctx.owner, amount: amt, defenseBefore: defValue, defenseAfter: defEff, source: "EFFECT" },
        });
      }
    }
  }

  return defEff;
}

function applyDamageReductions(ctx, damage) {
  let dmg = damage;

  const defUnit = ctx.defenderUnit;

  for (const p of ctx.defenderPassives) {
    const key = toUpper(p.key, "");

    if (key === "FIREWALL_BASIC") {
      ensureUnitFlags(defUnit);
      const round = getRoundNumber(ctx.state);
      const lastRound = Number(defUnit._flags.firewallReducedRound ?? 0);
      if (lastRound !== round) {
        const amount = 20;
        const before = dmg;
        dmg = Math.max(0, dmg - amount);
        defUnit._flags.firewallReducedRound = round;
        ctx.events.push({
          type: "DAMAGE_REDUCED",
          payload: { slot: ctx.targetSlot, owner: ctx.enemy, amount, damageBefore: before, damageAfter: dmg, source: "FIREWALL_BASIC" },
        });
      }
    }

    if (key === "SAFE_BROWSING_HALF_DAMAGE") {
      const before = dmg;
      dmg = floorInt(dmg * 0.5);
      ctx.events.push({
        type: "DAMAGE_REDUCED",
        payload: { slot: ctx.targetSlot, owner: ctx.enemy, percent: 50, damageBefore: before, damageAfter: dmg, source: "SAFE_BROWSING" },
      });
    }

    if (key === "STRONG_PASSWORD_NEGATE_ONCE_PER_ROUND") {
      ensureUnitFlags(defUnit);
      const round = getRoundNumber(ctx.state);
      const usedRound = Number(defUnit._flags.strongPasswordNegatedRound ?? 0);

      if (usedRound !== round && isCostLower(ctx.attackerUnit, defUnit)) {
        const before = dmg;
        dmg = 0;
        defUnit._flags.strongPasswordNegatedRound = round;
        ctx.events.push({
          type: "DAMAGE_NEGATED",
          payload: { slot: ctx.targetSlot, owner: ctx.enemy, damageBefore: before, damageAfter: dmg, source: "STRONG_PASSWORD" },
        });
      }
    }
  }

  // Temporary effects on defender:
  const effs = effectsForUnit(ctx.state, ctx.enemy, ctx.targetSlot);
  for (const e of effs) {
    const kind = toUpper(e.kind, "");
    const amt = Number(e.amount ?? 0);

    if (kind === "REDUCE_DAMAGE_FLAT" && Number.isFinite(amt) && amt > 0) {
      const before = dmg;
      dmg = Math.max(0, dmg - amt);
      ctx.events.push({
        type: "DAMAGE_REDUCED",
        payload: { slot: ctx.targetSlot, owner: ctx.enemy, amount: amt, damageBefore: before, damageAfter: dmg, source: "EFFECT" },
      });
    }

    if (kind === "REDUCE_DAMAGE_PERCENT" && Number.isFinite(amt) && amt > 0) {
      const before = dmg;
      dmg = floorInt(dmg * (1 - amt / 100));
      ctx.events.push({
        type: "DAMAGE_REDUCED",
        payload: { slot: ctx.targetSlot, owner: ctx.enemy, percent: amt, damageBefore: before, damageAfter: dmg, source: "EFFECT" },
      });
    }
  }

  return dmg;
}

// ====== Triggers pós-resolução ======
function addEffect(st, eff) {
  const effects = ensureEffects(st);
  effects.push({
    id: `eff_${nowTs()}_${Math.floor(Math.random() * 1e9)}`,
    ts: nowTs(),
    ...eff,
  });
}

function applyAttackerPostDamageTriggers(ctx, damageDealtToUnit, didDamageUnit, extra) {
  const targetSlot = extra?.targetSlot;

  for (const t of ctx.attackerTriggers) {
    const key = toUpper(t.key, "");

    // Captura de Pacotes: lifesteal 5 (se full, cura player)
    if (key === "PACKET_CAPTURE_LIFESTEAL_ON_DAMAGE_TO_UNIT") {
      if (didDamageUnit && damageDealtToUnit > 0) {
        const heal = Number(t.heal ?? 5);
        const aSlot = ctx.attackerSlot;
        const unit = getUnitAt(ctx.state, ctx.owner, aSlot);
        if (!unit) continue;

        const lifeMax = Number(unit.lifeMax ?? unit.maxLife ?? unit.baseLife ?? unit.life ?? 0);
        const inferredMax = Number(unit.summonedLifeMax ?? unit.initialLife ?? lifeMax);
        const maxLife =
          Number.isFinite(inferredMax) && inferredMax > 0
            ? inferredMax
            : (Number.isFinite(lifeMax) && lifeMax > 0 ? lifeMax : statUnit(unit, "life", 0));

        const curLife = statUnit(unit, "life", 0);
        if (curLife < maxLife) {
          const before = curLife;
          unit.life = Math.min(maxLife, curLife + heal);
          ctx.events.push({
            type: "UNIT_HEALED",
            payload: { by: ctx.owner, slot: aSlot, amount: heal, lifeBefore: before, lifeAfter: unit.life, source: "PACKET_CAPTURE" },
          });
        } else {
          const pl = ctx.state.players[ctx.owner];
          const beforeHp = getHp(pl);
          setHp(pl, beforeHp + heal);
          ctx.events.push({
            type: "PLAYER_HEALED",
            payload: { by: ctx.owner, to: ctx.owner, amount: heal, hpBefore: beforeHp, hpAfter: getHp(pl), source: "PACKET_CAPTURE" },
          });
        }
      }
    }

    // Página Fake: se dano atingiu unidade, +10 no player inimigo
    if (key === "FAKE_LOGIN_EXTRA_PLAYER_DAMAGE_ON_DAMAGE_TO_UNIT") {
      if (didDamageUnit && damageDealtToUnit > 0) {
        const extraDmg = Number(t.amount ?? 10);
        const enemyPl = ctx.state.players[ctx.enemy];
        const before = getHp(enemyPl);
        const after = Math.max(0, before - extraDmg);
        setHp(enemyPl, after);
        ctx.events.push({
          type: "PLAYER_DAMAGED",
          payload: { from: ctx.owner, to: ctx.enemy, amount: extraDmg, hpBefore: before, hpAfter: after, source: "FAKE_LOGIN" },
        });
      }
    }

    // Exploração de API: silencia a unidade alvo até fim do próximo turno
    if (key === "API_EXPLOIT_SILENCE_TARGET_UNTIL_END_NEXT_TURN") {
      if (targetSlot != null) {
        const turnNum = Number(ctx.state.turn.number ?? 1);
        addEffect(ctx.state, {
          kind: "SILENCE_ABILITIES",
          owner: ctx.owner,
          targetPlayer: ctx.enemy,
          slot: targetSlot,
          amount: 1,
          expiresAtTurn: turnNum + 2,
          meta: { source: "API_EXPLOIT" },
        });
        ctx.events.push({
          type: "EFFECT_APPLIED",
          payload: {
            by: ctx.owner,
            kind: "SILENCE_ABILITIES",
            targetPlayer: ctx.enemy,
            slot: targetSlot,
            expiresAtTurn: turnNum + 2,
            source: "API_EXPLOIT",
          },
        });
      }
    }

    // Engenharia Social: revela mão do inimigo até fim do turno
    if (key === "SOCIAL_ENGINEERING_REVEAL_HAND_UNTIL_END_TURN") {
      const turnNum = Number(ctx.state.turn.number ?? 1);
      addEffect(ctx.state, {
        kind: "REVEAL_HAND",
        owner: ctx.owner,
        targetPlayer: ctx.enemy,
        expiresAtTurn: turnNum + 1,
        meta: { source: "SOCIAL_ENGINEERING" },
      });
      ctx.events.push({
        type: "REVEAL_HAND",
        payload: { by: ctx.owner, target: ctx.enemy, duration: "UNTIL_END_TURN", source: "SOCIAL_ENGINEERING" },
      });
    }
  }
}

function applyAttackerNoDamageTriggers(ctx) {
  for (const t of ctx.attackerTriggers) {
    const key = toUpper(t.key, "");
    if (key === "BRUTE_FORCE_GAIN_ATK_ON_NO_DAMAGE") {
      const amount = Number(t.amount ?? 10);
      const turnNum = Number(ctx.state.turn.number ?? 1);
      addEffect(ctx.state, {
        kind: "MOD_ATK",
        owner: ctx.owner,
        targetPlayer: ctx.owner,
        slot: ctx.attackerSlot,
        amount,
        expiresAtTurn: turnNum + 2,
        meta: { source: "BRUTE_FORCE" },
      });
      ctx.events.push({
        type: "EFFECT_APPLIED",
        payload: { by: ctx.owner, kind: "MOD_ATK", targetPlayer: ctx.owner, slot: ctx.attackerSlot, amount, expiresAtTurn: turnNum + 2, source: "BRUTE_FORCE" },
      });
    }
  }
}

// ====== Regras especiais de overflow (MITM, Ponto Fantasma) ======
function computeOverflowBehavior(ctx) {
  let mode = "PLAYER"; // PLAYER | NONE | SPLIT_HALF_UNIT_HALF_PLAYER | CONDITIONAL_DEF_LTE
  let threshold = null;

  for (const t of ctx.attackerTriggers) {
    const key = toUpper(t.key, "");
    if (key === "MITM_OVERFLOW_SPLIT_HALF_UNIT_HALF_PLAYER") mode = "SPLIT_HALF_UNIT_HALF_PLAYER";
    if (key === "GHOST_POINT_OVERFLOW_ONLY_IF_DEF_LTE") {
      mode = "CONDITIONAL_DEF_LTE";
      const th = Number(t.threshold ?? 30);
      threshold = Number.isFinite(th) ? th : 30;
    }
  }

  return { mode, threshold };
}

// ====== Split damage (Injeção de Script) ======
function hasSplitDamage(attackerTriggers) {
  return attackerTriggers.some((t) => toUpper(t.key, "") === "SCRIPT_INJECTION_SPLIT_DAMAGE_UP_TO_2");
}

// ====== Magias: NEXT_ATTACK_BLOCK / NEXT_ATTACK_REDIRECT ======
function applyNextAttackProtectionIfAny(st, attackerPlayer, defenderPlayer, requestedSlot, events) {
  // Proteções são gravadas com targetPlayer = player protegido (no resolveSpell)
  // - BLOCK: bloqueia ataque completamente (consome)
  // - REDIRECT: redireciona o slot alvo (consome)
  //
  // Aqui consideramos "defenderPlayer" como quem está sendo atacado.

  // 1) BLOCK
  const block = consumeFirstEffect(
    st,
    (e) => e && typeof e === "object" && toUpper(e.kind, "") === "NEXT_ATTACK_BLOCK" && e.targetPlayer === defenderPlayer
  );

  if (block) {
    events.push({
      type: "ATTACK_BLOCKED",
      payload: { by: defenderPlayer, against: attackerPlayer, source: block?.meta?.spell ?? "NEXT_ATTACK_BLOCK" },
    });
    events.push({
      type: "EFFECT_CONSUMED",
      payload: { kind: "NEXT_ATTACK_BLOCK", targetPlayer: defenderPlayer, source: block?.meta?.spell ?? "SPELL" },
    });
    return { blocked: true, redirectedSlot: null };
  }

  // 2) REDIRECT
  const redir = consumeFirstEffect(
    st,
    (e) =>
      e && typeof e === "object" &&
      toUpper(e.kind, "") === "NEXT_ATTACK_REDIRECT" &&
      e.targetPlayer === defenderPlayer &&
      isValidSlot(e.slot)
  );

  if (redir) {
    const toSlot = Number(redir.slot);
    events.push({
      type: "ATTACK_REDIRECTED",
      payload: { by: defenderPlayer, against: attackerPlayer, fromSlot: requestedSlot, toSlot, source: redir?.meta?.spell ?? "NEXT_ATTACK_REDIRECT" },
    });
    events.push({
      type: "EFFECT_CONSUMED",
      payload: { kind: "NEXT_ATTACK_REDIRECT", targetPlayer: defenderPlayer, slot: toSlot, source: redir?.meta?.spell ?? "SPELL" },
    });
    return { blocked: false, redirectedSlot: toSlot };
  }

  return { blocked: false, redirectedSlot: null };
}

export function resolveAttack(state, actionInput) {
  const action = normalizeAction(actionInput);
  const type = toUpper(action?.type, "");
  const payload = isObject(action?.payload) ? action.payload : {};

  if (type !== "ATTACK") {
    return reject("INVALID_RESOLVER", "resolveAttack chamado com ação diferente de ATTACK.");
  }

  const owner = ownerKey(state);
  if (!owner) return reject("INVALID_TURN_OWNER", "turn.owner inválido (esperado P1/P2).");

  const attackerSlotRaw = payload.attackerSlot;
  if (!isValidSlot(attackerSlotRaw)) {
    return reject("INVALID_ATTACKER_SLOT", "attackerSlot deve ser um inteiro entre 0 e 2.");
  }

  const newState = deepClone(state);
  ensureTurn(newState);
  pruneExpiredEffects(newState);

  // Estrutura mínima
  if (!newState.players?.P1 || !newState.players?.P2) return reject("INVALID_PLAYERS", "players.P1 e players.P2 são obrigatórios.");
  if (!newState.board?.P1 || !newState.board?.P2) return reject("INVALID_BOARD", "board.P1 e board.P2 são obrigatórios.");

  const phase = toUpper(newState.turn.phase, "MAIN");
  if (phase !== "MAIN") return reject("INVALID_PHASE", `ATTACK não permitido na fase '${phase}'.`);
  if (newState.turn.hasAttacked) return reject("ALREADY_ATTACKED", "Você já atacou neste turno.");

  const enemyKey = otherKey(owner);
  const myBoard = getBoard(newState, owner);
  const enBoard = getBoard(newState, enemyKey);

  if (!myBoard || myBoard.length < 3) return reject("INVALID_BOARD", "board do atacante deve ter 3 slots.");
  if (!enBoard || enBoard.length < 3) return reject("INVALID_BOARD", "board do defensor deve ter 3 slots.");

  const attackerUnit = myBoard[attackerSlotRaw];
  if (!attackerUnit) return reject("NO_ATTACKER_IN_SLOT", "Não há unidade no slot atacante.");

  // Stats efetivos do atacante
  const atkStats = computeEffectiveStats(newState, owner, attackerSlotRaw, attackerUnit);
  const atk = atkStats.attack;
  if (atk <= 0) return reject("INVALID_ATTACKER", "A unidade atacante não possui ataque válido.");

  const events = [];
  events.push({ type: "ATTACK_DECLARED", payload: { player: owner, attackerSlot: attackerSlotRaw } });

  // Marca ataque (o turno será encerrado)
  newState.turn.hasAttacked = true;

  // ✅ Aplicar proteção do defensor (BLOCK/REDIRECT)
  // O "defensor" aqui é o player inimigo (quem recebe o ataque).
  const protection = applyNextAttackProtectionIfAny(newState, owner, enemyKey, attackerSlotRaw, events);
  if (protection.blocked) {
    // ataque foi consumido (regra: atacar encerra turno)
    const ended = endTurn(newState, { type: "END_TURN", payload: {} }, { internal: true, reason: "ATTACK_BLOCKED" });
    if (ended?.rejected) return ended;
    return { newState: ended.newState, events: events.concat(ended.events ?? []) };
  }

  // Slot alvo pode ser redirecionado
  const targetSlot = protection.redirectedSlot != null ? protection.redirectedSlot : attackerSlotRaw;

  // Target principal é o slot alvo (pode ser o mesmo do atacante, ou redirecionado)
  const primaryTarget = enBoard[targetSlot] ?? null;

  // ===== Caso 1: slot inimigo vazio -> dano direto ao jogador =====
  if (!primaryTarget) {
    const enemyPlayer = newState.players[enemyKey];
    const beforeHp = getHp(enemyPlayer);
    const afterHp = Math.max(0, beforeHp - atk);
    setHp(enemyPlayer, afterHp);

    events.push({
      type: "PLAYER_DAMAGED",
      payload: { from: owner, to: enemyKey, amount: atk, hpBefore: beforeHp, hpAfter: afterHp, source: "ATTACK" },
    });

    if (afterHp <= 0) {
      newState.turn.phase = "ENDED";
      events.push({ type: "GAME_ENDED", payload: { winner: owner, loser: enemyKey, reason: "PLAYER_HP_ZERO" } });
      bumpVersion(newState);
      events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
      return { newState, events };
    }

    const ended = endTurn(newState, { type: "END_TURN", payload: {} }, { internal: true, reason: "ATTACK" });
    if (ended?.rejected) return ended;
    return { newState: ended.newState, events: events.concat(ended.events ?? []) };
  }

  // ===== Caso 2: combate contra unidade =====
  const defenderUnit = primaryTarget;

  const defStats = computeEffectiveStats(newState, enemyKey, targetSlot, defenderUnit);
  const defBase = defStats.defense;
  const lifeBefore = defStats.life;

  const attackerPassives = listPassives(attackerUnit);
  const attackerTriggers = listTriggers(attackerUnit);
  const defenderPassives = listPassives(defenderUnit);
  const defenderTriggers = listTriggers(defenderUnit);

  // Contexto de combate
  const ctx = {
    state: newState,
    events,
    owner,
    enemy: enemyKey,
    attackerSlot: attackerSlotRaw,
    targetSlot,
    attackerUnit,
    defenderUnit,
    attackerPassives,
    attackerTriggers,
    defenderPassives,
    defenderTriggers,
  };

  // Defesa efetiva (aplica ignore def)
  const defEff = applyDefIgnoreFromTriggers(ctx, defBase);

  // Dano base
  let dmgBase = Math.max(0, atk - defEff);

  events.push({
    type: "COMBAT_RESOLVED",
    payload: {
      slot: targetSlot,
      attacker: { unitId: attackerUnit.unitId ?? null, cardId: attackerUnit.cardId ?? null, attack: atk, fromSlot: attackerSlotRaw },
      defender: { unitId: defenderUnit.unitId ?? null, cardId: defenderUnit.cardId ?? null, defense: defEff, lifeBefore, slot: targetSlot },
      damageBase: dmgBase,
    },
  });

  // Se dano base <= 0: triggers "no damage" e encerra
  if (dmgBase <= 0) {
    applyAttackerNoDamageTriggers(ctx);

    const ended = endTurn(newState, { type: "END_TURN", payload: {} }, { internal: true, reason: "ATTACK" });
    if (ended?.rejected) return ended;
    return { newState: ended.newState, events: events.concat(ended.events ?? []) };
  }

  // Reduções (passivas e efeitos)
  let dmgFinal = applyDamageReductions(ctx, dmgBase);

  // Split damage (Injeção de Script): divide o dano final entre até 2 unidades inimigas (se existirem)
  const split = hasSplitDamage(attackerTriggers);

  let damageToPrimary = dmgFinal;
  let damageToSecondary = 0;
  let secondarySlot = null;

  if (split && dmgFinal > 0) {
    for (let s = 0; s < 3; s++) {
      if (s === targetSlot) continue;
      if (enBoard[s]) { secondarySlot = s; break; }
    }
    if (secondarySlot != null) {
      damageToPrimary = floorInt(dmgFinal / 2);
      damageToSecondary = dmgFinal - damageToPrimary;
      events.push({
        type: "DAMAGE_SPLIT",
        payload: { by: owner, fromSlot: attackerSlotRaw, primarySlot: targetSlot, secondarySlot, amountPrimary: damageToPrimary, amountSecondary: damageToSecondary, source: "SCRIPT_INJECTION" },
      });
    }
  }

  const applyDamageToUnit = (who, slot, amount, sourceTag) => {
    const unit = getUnitAt(newState, who, slot);
    if (!unit) return { existed: false, destroyed: false, damageApplied: 0, lifeBefore: 0, lifeAfter: 0, overflow: 0 };

    const lb = statUnit(unit, "life", 0);
    const laRaw = lb - amount;
    const la = Math.max(0, laRaw);
    unit.life = la;

    events.push({
      type: "UNIT_DAMAGED",
      payload: { by: owner, targetPlayer: who, slot, amount, lifeBefore: lb, lifeAfter: la, source: sourceTag ?? "ATTACK" },
    });

    let destroyed = false;
    let overflow = 0;

    if (laRaw <= 0) {
      destroyed = true;
      overflow = Math.max(0, amount - lb);

      setUnitAt(newState, who, slot, null);

      const pl = newState.players[who];
      ensureArray(pl, "discard");

      unit.life = 0;
      pl.discard.push(unit);

      events.push({
        type: "UNIT_DESTROYED",
        payload: { slot, owner: who, unitId: unit.unitId ?? null, cardId: unit.cardId ?? null, source: sourceTag ?? "ATTACK" },
      });
    }

    return { existed: true, destroyed, overflow };
  };

  const r1 = applyDamageToUnit(enemyKey, targetSlot, damageToPrimary, "ATTACK");

  let r2 = null;
  if (damageToSecondary > 0 && secondarySlot != null) {
    r2 = applyDamageToUnit(enemyKey, secondarySlot, damageToSecondary, "ATTACK");
  }

  // Pós-dano (gatilhos) — alvo real do primeiro dano é targetSlot
  const didDamagePrimary = r1.existed && damageToPrimary > 0;
  applyAttackerPostDamageTriggers(ctx, damageToPrimary, didDamagePrimary, { targetSlot });

  // Overflow behavior
  const overflowRule = computeOverflowBehavior(ctx);

  const overflowToApply = [];
  if (r1.destroyed && r1.overflow > 0) overflowToApply.push({ overflow: r1.overflow, slot: targetSlot, defenderDefenseAtTime: defEff });
  if (r2?.destroyed && r2.overflow > 0) overflowToApply.push({ overflow: r2.overflow, slot: secondarySlot, defenderDefenseAtTime: null });

  for (const ov of overflowToApply) {
    const overflow = ov.overflow;
    if (overflow <= 0) continue;

    if (overflowRule.mode === "NONE") {
      events.push({ type: "OVERFLOW_IGNORED", payload: { from: owner, to: enemyKey, amount: overflow } });
      continue;
    }

    if (overflowRule.mode === "CONDITIONAL_DEF_LTE") {
      const threshold = Number(overflowRule.threshold ?? 30);
      const defenderDef = Number(defEff);
      if (!(Number.isFinite(defenderDef) && defenderDef <= threshold)) {
        events.push({
          type: "OVERFLOW_BLOCKED_BY_RULE",
          payload: { from: owner, to: enemyKey, amount: overflow, rule: "GHOST_POINT", defenderDefense: defenderDef, threshold },
        });
        continue;
      }
    }

    if (overflowRule.mode === "SPLIT_HALF_UNIT_HALF_PLAYER") {
      const half = floorInt(overflow / 2);
      const toPlayer = overflow - half;

      const enemyPlayer = newState.players[enemyKey];
      const beforeHp = getHp(enemyPlayer);
      const afterHp = Math.max(0, beforeHp - toPlayer);
      setHp(enemyPlayer, afterHp);

      events.push({
        type: "OVERFLOW_DAMAGE",
        payload: { from: owner, to: enemyKey, amount: toPlayer, hpBefore: beforeHp, hpAfter: afterHp, source: "MITM" },
      });
      events.push({
        type: "OVERFLOW_IGNORED",
        payload: { from: owner, to: enemyKey, amount: half, source: "MITM" },
      });

      if (afterHp <= 0) {
        newState.turn.phase = "ENDED";
        events.push({ type: "GAME_ENDED", payload: { winner: owner, loser: enemyKey, reason: "PLAYER_HP_ZERO" } });
        bumpVersion(newState);
        events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
        return { newState, events };
      }
      continue;
    }

    const enemyPlayer = newState.players[enemyKey];
    const beforeHp = getHp(enemyPlayer);
    const afterHp = Math.max(0, beforeHp - overflow);
    setHp(enemyPlayer, afterHp);

    events.push({
      type: "OVERFLOW_DAMAGE",
      payload: { from: owner, to: enemyKey, amount: overflow, hpBefore: beforeHp, hpAfter: afterHp, source: "ATTACK" },
    });

    if (afterHp <= 0) {
      newState.turn.phase = "ENDED";
      events.push({ type: "GAME_ENDED", payload: { winner: owner, loser: enemyKey, reason: "PLAYER_HP_ZERO" } });
      bumpVersion(newState);
      events.push({ type: "STATE_VERSION_BUMP", payload: { version: newState.version } });
      return { newState, events };
    }
  }

  // Encerrar turno automaticamente
  const ended = endTurn(newState, { type: "END_TURN", payload: {} }, { internal: true, reason: "ATTACK" });
  if (ended?.rejected) return ended;
  return { newState: ended.newState, events: events.concat(ended.events ?? []) };
}

export default resolveAttack;
