// frontend/src/pages/BattleArena/utils/stateSelectors.js

/**
 * Seletores tolerantes (suportam shapes diferentes vindos do gateway/match-service)
 * Objetivo: battleArena/components nunca “adivinham” paths do state.
 */

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

function safeSide(v) {
  const s = toUpper(v, "P1");
  return s === "P2" ? "P2" : "P1";
}

/**
 * ViewerSide REAL:
 * - prioridade: state.viewerSide / state.meta.viewerSide
 * - fallback: localStorage.securityZoneViewerSide
 * - fallback final: P1
 *
 * Obs: gateway/match-service normalmente devolvem state sanitizado pro viewer,
 * mas é melhor detectar e não fixar.
 */
export function getViewerSide(state = null) {
  const fromState =
    state?.viewerSide ??
    state?.meta?.viewerSide ??
    state?.matchMeta?.viewerSide ??
    null;

  if (fromState) return safeSide(fromState);

  try {
    const ls = localStorage.getItem("securityZoneViewerSide");
    if (ls) return safeSide(ls);
  } catch {
    // ignore
  }

  return "P1";
}

export function pickHandFromState(state, side) {
  const s = safeSide(side);
  return state?.players?.[s]?.hand || state?.[s]?.hand || state?.hand || [];
}

export function pickEnemyHandCount(state, viewerSide) {
  const v = safeSide(viewerSide);
  const other = v === "P1" ? "P2" : "P1";
  const p = state?.players?.[other];
  const n = Number(p?.handCount ?? (Array.isArray(p?.hand) ? p.hand.length : 0));
  return Number.isFinite(n) ? n : 0;
}

export function pickBoardFromState(state, side) {
  const s = safeSide(side);
  return state?.board?.[s] || state?.[s]?.board || state?.board?.[s?.toLowerCase?.()] || [];
}

export function pickTurnOwner(state) {
  return safeSide(state?.turn?.owner || "P1");
}

export function pickTurnNumber(state) {
  const n = Number(state?.turn?.number ?? 1);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function pickPhase(state) {
  return toUpper(state?.turn?.phase, "MAIN");
}

export function pickHasAttacked(state) {
  return Boolean(state?.turn?.hasAttacked);
}

export function pickAbilityUsed(state) {
  return Boolean(state?.turn?.abilityUsed);
}

export function pickEnergy(state, side) {
  const s = safeSide(side);
  const p = state?.players?.[s];
  const energy = Number(p?.energy ?? 0);
  const energyMax = Number(p?.energyMax ?? 0);

  return {
    energy: Number.isFinite(energy) ? energy : 0,
    energyMax: Number.isFinite(energyMax) ? energyMax : 0,
  };
}

export function pickHp(state, side) {
  const s = safeSide(side);
  const p = state?.players?.[s];
  const hp = Number(p?.hp ?? p?.life ?? 100);
  return Number.isFinite(hp) ? hp : 100;
}

/** Normaliza board sempre em 3 slots */
export function pickBoard3(state, side) {
  const b = pickBoardFromState(state, side);
  const arr = Array.isArray(b) ? b.slice(0, 3) : [];
  while (arr.length < 3) arr.push(null);
  return arr;
}

/** Slots 0..2 = enemy, 3..5 = player */
export function buildSlots(enemyBoard3, myBoard3) {
  return [
    enemyBoard3?.[0] ?? null,
    enemyBoard3?.[1] ?? null,
    enemyBoard3?.[2] ?? null,
    myBoard3?.[0] ?? null,
    myBoard3?.[1] ?? null,
    myBoard3?.[2] ?? null,
  ];
}
