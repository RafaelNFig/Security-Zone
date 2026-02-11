// src/pages/BattleArena/utils/actionBuilders.js

/**
 * Builders padronizados (frontend).
 * O contrato do gateway é:
 * POST /matches/:id/actions
 * body: { action: { type, payload }, clientActionId }
 */

export function normalizeActionType(type) {
  return String(type || "").toUpperCase();
}

export function buildAction(type, payload = {}) {
  return {
    type: normalizeActionType(type),
    payload: payload && typeof payload === "object" ? payload : {},
  };
}

export function buildEndTurnAction() {
  return buildAction("END_TURN", {});
}

export function buildAttackAction(attackerSlot) {
  return buildAction("ATTACK", { attackerSlot });
}

export function buildPlayCardAction(cardId, slot) {
  return buildAction("PLAY_CARD", { cardId, slot });
}

export function buildCastSpellAction(cardId) {
  return buildAction("CAST_SPELL", { cardId });
}

export function makeClientActionId() {
  return (crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`).toString();
}
