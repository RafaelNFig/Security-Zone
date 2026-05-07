import { toGKey } from '../utils/playerMapping.js';

/**
 * Hook: onTurnBegin
 * Executado pelo boardgame.io no início do turno de cada jogador.
 * Responsável por sacar carta, resetar energia e aplicar Mulligan caso não haja unidades invocáveis.
 */
export function onTurnBegin({ G, ctx, events }) {
  const owner = toGKey(ctx.currentPlayer);
  const pl = G.players[owner];

  // Energia
  pl.energyMax = (pl.energyMax || 0) + 1;
  if (pl.energyMax > 10) pl.energyMax = 10;
  pl.energy = pl.energyMax;

  // Compra 1 carta
  if (pl.deck.length > 0) {
    const drawn = pl.deck.shift();
    pl.hand.push(drawn);
  } else if (pl.discard.length > 0) {
    pl.deck = [...pl.discard].reverse();
    pl.discard = [];
    const drawn = pl.deck.shift();
    if (drawn) pl.hand.push(drawn);
  }

  // --- Mulligan Contínuo ---
  // Verifica se o jogador tem ao menos 1 UNIT com cost <= pl.energy
  const isPlayableUnit = (c) => {
    if (!c) return false;
    const type = c.type || c.CD_TYPE || "";
    const cost = Number(c.cost ?? c.CD_COST ?? 0);
    return (type.toUpperCase() === "UNIT" && cost <= 2);
  };

  const hasPlayableUnit = pl.hand.some(isPlayableUnit);

  if (!hasPlayableUnit && pl.deck.length > 0) {
    const handSize = pl.hand.length;
    let newDeck = [...pl.deck, ...pl.hand];
    
    // Embaralhamento simples
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }

    let newHand = newDeck.splice(0, handSize);

    // Garante que veio algo jogável (force swap) se ainda não veio e se existir no deck
    const stillNoPlayable = !newHand.some(isPlayableUnit);

    if (stillNoPlayable) {
      const playableIdx = newDeck.findIndex(isPlayableUnit);
      if (playableIdx !== -1) {
        const [playableCard] = newDeck.splice(playableIdx, 1);
        const cardToReturn = newHand.shift();
        newHand.push(playableCard);
        if (cardToReturn) newDeck.push(cardToReturn);
        
        // re-shuffle final
        for (let i = newDeck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
      }
    }

    pl.deck = newDeck;
    pl.hand = newHand;
    
    // Registrar ação para o UI poder apresentar de alguma forma (como log/toast)
    if (!G.logs) G.logs = [];
    G.logs.push({ turn: ctx.turn, player: owner, message: `Mulligan ativado por falta de unidades de custo <= ${pl.energy}.` });
  }
}
