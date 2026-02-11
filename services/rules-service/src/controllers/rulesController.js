// rules-service/src/controllers/rulesController.js
// Controller stateless do rules-service (ESM).
// Contrato:
//   Input:  { state, action }
//   Output: success -> { success:true, newState, events }
//           reject  -> { success:false, rejected, events }

import crypto from "crypto";

import validateAction from "../engine/validateAction.js";
import resolvePlayCard from "../engine/resolvePlayCard.js";
import resolveAttack from "../engine/resolveAttack.js";
import resolveSpell from "../engine/resolveSpell.js";
import resolveAbility from "../engine/resolveAbility.js";
import endTurn from "../engine/endTurn.js";

function nowIso() {
  return new Date().toISOString();
}

function clone(obj) {
  return globalThis.structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj ?? {}));
}

function newId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function ensureStateShape(state) {
  const s = clone(state ?? {});
  s.version ??= 0;

  s.turn ??= { owner: "P1", number: 1, phase: "MAIN", hasAttacked: false, abilityUsed: false, abilityUsedBy: null };

  // garante flags novas sem quebrar states antigos
  s.turn.owner ??= "P1";
  s.turn.number ??= 1;
  s.turn.phase ??= "MAIN";
  s.turn.hasAttacked ??= false;
  s.turn.abilityUsed ??= false;
  s.turn.abilityUsedBy ??= null;

  s.players ??= {
    P1: { hp: 100, energyMax: 2, energy: 2, deck: [], hand: [], discard: [] },
    P2: { hp: 100, energyMax: 2, energy: 2, deck: [], hand: [], discard: [] },
  };

  // garante subestruturas
  for (const k of ["P1", "P2"]) {
    s.players[k] ??= { hp: 100, energyMax: 2, energy: 2, deck: [], hand: [], discard: [] };
    s.players[k].hp ??= 100;
    s.players[k].energyMax ??= 2;
    s.players[k].energy ??= s.players[k].energyMax;
    s.players[k].deck ??= [];
    s.players[k].hand ??= [];
    s.players[k].discard ??= [];
  }

  s.board ??= { P1: [null, null, null], P2: [null, null, null] };
  s.board.P1 ??= [null, null, null];
  s.board.P2 ??= [null, null, null];

  // garante 3 slots
  if (!Array.isArray(s.board.P1) || s.board.P1.length < 3) s.board.P1 = [null, null, null];
  if (!Array.isArray(s.board.P2) || s.board.P2.length < 3) s.board.P2 = [null, null, null];

  s.effects ??= [];
  if (!Array.isArray(s.effects)) s.effects = [];

  return s;
}

// Normaliza events: garante id/ts para replay/debug (sem alterar a semântica)
// Também normaliza "data" -> "payload" pra evitar eventos mistos.
function decorateEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return [];
  return events.map((e) => {
    if (e && typeof e === "object") {
      const payload = e.payload ?? e.data ?? (e.data === 0 ? 0 : undefined);
      const out = {
        id: e.id ?? newId(),
        ts: e.ts ?? nowIso(),
        ...e,
      };
      if (payload !== undefined) out.payload = payload;
      delete out.data; // padroniza
      return out;
    }
    return { id: newId(), ts: nowIso(), type: "UNKNOWN_EVENT", payload: { raw: e } };
  });
}

/**
 * resolveGame(state, action) -> { success, newState, events } ou { success:false, rejected, events }
 * Controller puro (stateless): valida e delega para engine.
 */
export function resolveGame(state, action) {
  const s = ensureStateShape(state);

  if (!action || typeof action !== "object") {
    return {
      success: false,
      newState: null,
      events: decorateEvents([]),
      rejected: { code: "INVALID_ACTION", message: "Action inválida: body ausente ou não-objeto." },
    };
  }

  // validação comum (turno/fase/payload/energia/slot etc.)
  const v = validateAction(s, action);
  if (!v?.ok) {
    return {
      success: false,
      newState: null,
      events: decorateEvents(v?.events ?? []),
      rejected: v?.rejected ?? { code: "INVALID_ACTION", message: "Ação rejeitada." },
    };
  }

  let out;
  const type = String(action.type ?? "").toUpperCase();

  switch (type) {
    case "PLAY_CARD":
      out = resolvePlayCard(s, action);
      break;

    case "ATTACK":
      out = resolveAttack(s, action);
      break;

    case "CAST_SPELL":
      out = resolveSpell(s, action);
      break;

    case "ACTIVATE_ABILITY":
      out = resolveAbility(s, action);
      break;

    case "END_TURN":
      out = endTurn(s, action);
      break;

    default:
      out = { rejected: { code: "UNKNOWN_ACTION", message: `Ação não suportada: ${action.type}` }, events: [] };
  }

  if (out?.rejected) {
    return {
      success: false,
      newState: null,
      events: decorateEvents(out.events ?? []),
      rejected: out.rejected,
    };
  }

  return {
    success: true,
    newState: out?.newState ?? s,
    events: decorateEvents(out?.events ?? []),
  };
}

/**
 * POST /resolve (Express handler)
 */
export function resolveHandler(req, res) {
  try {
    const { state, action } = req.body || {};
    const out = resolveGame(state, action);
    return res.status(out.success ? 200 : 400).json(out);
  } catch (e) {
    console.error("[rules-service] resolve error:", e);
    return res.status(500).json({
      success: false,
      newState: null,
      events: decorateEvents([]),
      rejected: { code: "RULES_CRASH", message: "Falha interna no rules-service.", details: { message: e?.message } },
    });
  }
}

/**
 * GET /health
 */
export function healthHandler(req, res) {
  return res.json({
    ok: true,
    service: "rules-service",
    time: nowIso(),
  });
}

export default {
  resolveGame,
  resolveHandler,
  healthHandler,
};
