// bot-service/src/controllers/botControllers.js
/**
 * Bot Controller
 * - Recebe { state, difficulty }
 * - Decide qual bot usar (easy/normal/hard)
 * - Retorna action no formato compatível com match-service/rules-service:
 *
 * Compatibilidade:
 * - bots podem retornar: PLAY_CARD, CAST_SPELL, ACTIVATE_ABILITY, ATTACK, END_TURN
 * - Controller NÃO valida regras do jogo; apenas valida shape mínimo e faz fallback seguro.
 */

import { decideMove as decideEasy } from "../ai/botEasy.js";
import { decideMove as decideNormal } from "../ai/botNormal.js";

function nowIso() {
  return new Date().toISOString();
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function normalizeDifficulty(v) {
  const d = String(v || "easy").toLowerCase();
  if (d === "hard") return "hard";
  if (d === "normal") return "normal";
  return "easy";
}

function normalizeAction(action) {
  // garante shape mínimo esperado pelo match/rules
  if (!isObject(action)) return null;

  const type = String(action.type || "").trim().toUpperCase();
  if (!type) return null;

  const payload = isObject(action.payload) ? action.payload : {};

  // Sanitização mínima por tipo (não é validação de regra; apenas “shape”)
  if (type === "PLAY_CARD") {
    const cardId = payload.cardId;
    const slot = payload.slot;
    if (cardId == null || String(cardId).trim() === "") return null;
    if (!Number.isInteger(slot)) return null;
    return { type, payload: { cardId: String(cardId), slot } };
  }

  if (type === "CAST_SPELL") {
    const cardId = payload.cardId;
    if (cardId == null || String(cardId).trim() === "") return null;
    // Mantém extras (slot/target/etc.) se existirem
    return { type, payload: { ...payload, cardId: String(cardId) } };
  }

  if (type === "ATTACK") {
    const attackerSlot = payload.attackerSlot;
    if (!Number.isInteger(attackerSlot)) return null;
    return { type, payload: { attackerSlot } };
  }

  if (type === "ACTIVATE_ABILITY") {
    // resolveAbility normalmente aceita payload.source.slot, abilityKey opcional
    const src = payload.source;
    const slot = src?.slot;
    if (!Number.isInteger(slot)) return null;

    const out = { type, payload: { ...payload, source: { slot } } };
    if (payload.abilityKey != null && String(payload.abilityKey).trim() !== "") {
      out.payload.abilityKey = String(payload.abilityKey);
    } else {
      // se vazio, remove para não mandar string vazia
      delete out.payload.abilityKey;
    }
    return out;
  }

  if (type === "END_TURN") {
    return { type, payload: {} };
  }

  // Tipo desconhecido -> rejeita (controller faz fallback)
  return null;
}

function buildFallbackAction(meta = {}) {
  return {
    type: "END_TURN",
    payload: {},
    meta: { fallback: true, at: nowIso(), ...meta },
  };
}

function shouldAvoidMoves(state) {
  // Se não estiver em MAIN, ou se não for turno do bot, devolve END_TURN
  // (o match-service já tem proteções, mas aqui evita lixo).
  const owner = state?.turn?.owner;
  const phase = String(state?.turn?.phase || "MAIN").toUpperCase();
  if (owner !== "P2") return true;
  if (phase !== "MAIN") return true;
  return false;
}

/**
 * POST /move
 * body: { state, difficulty }
 */
export async function move(req, res) {
  try {
    const state = req.body?.state;
    const difficulty = normalizeDifficulty(req.body?.difficulty);

    if (!isObject(state)) {
      return res.status(400).json({
        success: false,
        error: "INVALID_STATE",
        message: "Envie { state: {...}, difficulty?: 'easy'|'normal'|'hard' }",
      });
    }

    if (shouldAvoidMoves(state)) {
      return res.status(200).json(buildFallbackAction({ reason: "NOT_BOT_TURN_OR_PHASE" }));
    }

    // escolhe estratégia
    let chosen = "easy";
    let action;

    if (difficulty === "normal") {
      chosen = "normal";
      action = decideNormal({ state, difficulty });
    } else if (difficulty === "hard") {
      // hard ainda não implementado: usa normal como fallback
      chosen = "hard(normal-fallback)";
      action = decideNormal({ state, difficulty: "normal" });
    } else {
      chosen = "easy";
      action = decideEasy({ state, difficulty });
    }

    const normalized = normalizeAction(action);

    if (!normalized) {
      // Não devolve erro 500 por bug do bot, devolve fallback seguro
      return res.status(200).json(buildFallbackAction({ chosen, difficulty, reason: "INVALID_BOT_ACTION" }));
    }

    return res.status(200).json({
      ...normalized,
      meta: { difficulty, chosen, at: nowIso() },
    });
  } catch (err) {
    console.error("[bot-service] move error:", err);
    // Mesmo em crash, devolve fallback seguro para não travar o match loop
    return res.status(200).json(buildFallbackAction({ reason: "BOT_CRASH" }));
  }
}

/**
 * GET /health
 */
export function health(req, res) {
  return res.json({
    ok: true,
    service: "bot-service",
    time: nowIso(),
    strategies: ["easy", "normal", "hard(normal-fallback)"],
    actions: ["PLAY_CARD", "CAST_SPELL", "ACTIVATE_ABILITY", "ATTACK", "END_TURN"],
  });
}

export default {
  move,
  health,
};
