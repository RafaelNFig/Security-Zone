// shared/game-engine/index.cjs
// Wrapper CommonJS para ambientes que não suportam ESM puro (como o match-service CJS).
// Usa import() dinâmico para carregar o módulo ESM e re-exporta tudo de forma CJS.

let _cached = null;

async function load() {
  if (_cached) return _cached;
  _cached = await import('./src/Game.js');
  return _cached;
}

// Exporta a promise - o consumer deve fazer:
//   const { SecurityZoneGame } = await require('@security-zone/game-engine').load();
module.exports = { load };
