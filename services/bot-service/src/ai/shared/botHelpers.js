// bot-service/src/ai/shared/botHelpers.js
// Utilitários compartilhados para as IAs (EASY e NORMAL)

export function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function toUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
}

export function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function isValidSlot(s) {
  return Number.isInteger(s) && s >= 0 && s <= 2;
}

export function getBotSide() {
  return "P2";
}

export function getEnemySide(side) {
  return side === "P1" ? "P2" : "P1";
}

export function getPlayer(state, side) {
  return isObject(state?.players?.[side]) ? state.players[side] : null;
}

export function getBoard(state, side) {
  const b = state?.board?.[side];
  if (!Array.isArray(b)) return [null, null, null];
  const out = b.slice(0, 3);
  while (out.length < 3) out.push(null);
  return out;
}

export function getEnergy(state, side) {
  const p = getPlayer(state, side);
  return safeNum(p?.energy, 0);
}

export function getUnitAttackValue(unit) {
  if (!unit || !isObject(unit)) return 0;
  return safeNum(unit.attack ?? unit.atk ?? 0, 0);
}

export function getUnitDefenseValue(unit) {
  if (!unit || !isObject(unit)) return 0;
  return safeNum(unit.defense ?? unit.def ?? 0, 0);
}

export function makeEndTurn() {
  return { type: "END_TURN", payload: {} };
}

export function makePlayCard(cardId, slot) {
  return { type: "PLAY_CARD", payload: { cardId: String(cardId), slot } };
}

export function makeCastSpell(cardId, extraPayload = {}) {
  return { type: "CAST_SPELL", payload: { cardId: String(cardId), ...extraPayload } };
}

export function makeAttack(attackerSlot) {
  return { type: "ATTACK", payload: { attackerSlot } };
}
