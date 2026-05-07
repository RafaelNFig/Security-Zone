/**
 * Mapeamento entre o currentPlayer do boardgame.io ("0", "1") e 
 * as chaves do estado G ("P1", "P2").
 */

export function toGKey(currentPlayerIndex) {
  const idx = String(currentPlayerIndex).trim();
  if (idx === "0") return "P1";
  if (idx === "1") return "P2";
  // Fallback caso receba já no formato correto
  if (idx === "P1" || idx === "P2") return idx;
  return "P1"; // Default
}

export function getEnemyGKey(currentPlayerIndex) {
  const gKey = toGKey(currentPlayerIndex);
  return gKey === "P1" ? "P2" : "P1";
}
