// src/pages/BattleArena/utils/mappers.js

/**
 * Mappers/helpers de UI e normalização de carta.
 */

export function getCardId(card) {
  // engine usa cardId; db pode vir CD_ID; hand normalizada do match-service tende a ter cardId
  return card?.cardId ?? card?.CD_ID ?? card?.id ?? null;
}

export function getCardType(card) {
  // HAND: pode ter type/CD_TYPE; BOARD: unitSnapshot pode não ter type -> assume UNIT
  return String(card?.type ?? card?.CD_TYPE ?? "UNIT").toUpperCase();
}

export function formatTime(totalSeconds) {
  const t = Number(totalSeconds ?? 0);
  const safe = Number.isFinite(t) && t > 0 ? Math.floor(t) : 0;
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function typeBadge(type) {
  if (!type) return "bg-white/10 text-slate-100 border-white/10";
  const t = String(type).toLowerCase();
  if (t.includes("ataque")) return "bg-red-500/12 text-red-200 border-red-400/25";
  if (t.includes("defesa")) return "bg-cyan-500/12 text-cyan-200 border-cyan-400/25";
  if (t.includes("magia") || t.includes("spell")) return "bg-purple-500/12 text-purple-200 border-purple-400/25";
  if (t.includes("unit")) return "bg-emerald-500/12 text-emerald-200 border-emerald-400/25";
  return "bg-white/10 text-slate-100 border-white/10";
}
