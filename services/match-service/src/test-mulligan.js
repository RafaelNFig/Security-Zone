import { getInitialState } from '../../../shared/game-engine/src/setup/initialState.js';

// Mock Deck P1
const p1Deck = Array.from({ length: 30 }, (_, i) => ({
  id: `card_p1_${i}`,
  cost: i % 2 === 0 ? 5 : 4, // TODAS as cartas tem custo > 2, para forçar Mulligan extremo
}));
// Força 1 carta de custo baixo
p1Deck.push({ id: 'low_cost_1', cost: 1 });

// Mock Deck P2
const p2Deck = Array.from({ length: 30 }, (_, i) => ({
  id: `card_p2_${i}`,
  cost: 1, // TODAS as cartas tem custo <= 2, sem Mulligan
}));

const ctx = {};
const setupData = { p1Deck, p2Deck };

const G = getInitialState(ctx, setupData);

console.log("== Resultado do Teste de Setup e Mulligan ==");
console.log("P1 Hand (Deve ter o low_cost_1 pois era a única carta <= 2 e ativou o Mulligan):");
console.log(G.players.P1.hand.map(c => `[${c.id} - cost: ${c.cost}]`).join(', '));
console.log("P1 Deck Restante:", G.players.P1.deck.length);

console.log("\nP2 Hand (Normal, sem mulligan extremo necessário):");
console.log(G.players.P2.hand.map(c => `[${c.id} - cost: ${c.cost}]`).join(', '));
console.log("P2 Deck Restante:", G.players.P2.deck.length);

if (G.players.P1.hand.some(c => c.cost <= 2)) {
    console.log("\n✅ Mulligan test OK para P1 (conseguiu carta de custo baixo)");
} else {
    console.log("\n❌ Mulligan falhou para P1");
}
