/**
 * Simple shuffle function for arrays.
 */
function shuffle(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Compra a mão inicial (5 cartas) e aplica Mulligan se não tiver cartas <= 2 de custo.
 */
function drawInitialHand(deck) {
  let shuffled = shuffle(deck);
  let hand = shuffled.splice(0, 5);

  const hasLowCost = hand.some(c => Number(c.cost || c.CD_COST || 0) <= 2);
  
  if (!hasLowCost && shuffled.length > 0) {
    // Mulligan: devolve a mão pro deck, re-embaralha e saca 5 de novo
    shuffled = shuffle([...shuffled, ...hand]);
    hand = shuffled.splice(0, 5);
    
    // Se ainda não tiver baixo custo, força a troca da primeira por uma do deck com menor custo
    const stillNoLowCost = !hand.some(c => Number(c.cost || c.CD_COST || 0) <= 2);
    if (stillNoLowCost) {
      const lowCostIdx = shuffled.findIndex(c => Number(c.cost || c.CD_COST || 0) <= 2);
      if (lowCostIdx !== -1) {
        const [lowCostCard] = shuffled.splice(lowCostIdx, 1);
        const cardToReturn = hand.shift();
        hand.push(lowCostCard);
        shuffled.push(cardToReturn);
        shuffled = shuffle(shuffled);
      }
    }
  }

  return { deck: shuffled, hand };
}

/**
 * Factory function para construir o estado inicial (G) do jogo.
 * @param {object} setupData - Dados injetados na criação da partida (ex: decks escolhidos).
 */
export function getInitialState(ctx, setupData) {
  const p1RawDeck = setupData?.p1Deck ?? [];
  const p2RawDeck = setupData?.p2Deck ?? [];

  const p1Setup = drawInitialHand(p1RawDeck);
  const p2Setup = drawInitialHand(p2RawDeck);

  return {
    version: 0,
    players: {
      P1: { hp: 100, energyMax: 2, energy: 2, deck: p1Setup.deck, hand: p1Setup.hand, discard: [] },
      P2: { hp: 100, energyMax: 2, energy: 2, deck: p2Setup.deck, hand: p2Setup.hand, discard: [] }
    },
    board: {
      P1: [null, null, null],
      P2: [null, null, null]
    },
    // Effects temporários gerenciados preferencialmente pelo EffectsPlugin no futuro
    effects: []
  };
}
