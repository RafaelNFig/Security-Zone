import pkg from "boardgame.io/dist/cjs/core.js";
const { INVALID_MOVE } = pkg;
import { toGKey } from '../utils/playerMapping.js';

/**
 * Move: playCard
 * Invoca uma unidade da mão para o tabuleiro deduzindo energia.
 */
export function playCardMove({ G, ctx }, actionPayload) {
  console.log("[playCardMove] Iniciando move. payload:", actionPayload);
  const { cardId, slot: rawSlot } = actionPayload;
  const owner = toGKey(ctx.currentPlayer);
  
  if (rawSlot == null || typeof rawSlot !== 'number') {
     console.log("[playCardMove] rawSlot inválido:", rawSlot);
     return INVALID_MOVE;
  }
  const slot = Math.floor(rawSlot);
  if (slot < 0 || slot > 2) {
     console.log("[playCardMove] slot fora dos limites:", slot);
     return INVALID_MOVE;
  }

  const me = G.players[owner];
  const myBoard = G.board[owner];

  if (myBoard[slot] != null) {
     console.log("[playCardMove] Slot ocupado:", slot);
     return INVALID_MOVE;
  }

  const targetId = String(cardId);
  const handIndex = me.hand.findIndex((c) => String(c.cardId || c.id || c.CD_ID) === targetId);
  
  if (handIndex === -1) {
     console.log(`[playCardMove] Carta não encontrada na mão. targetId: ${targetId}. Mão:`, me.hand.map(c => c.cardId || c.id || c.CD_ID));
     return INVALID_MOVE;
  }

  const card = me.hand[handIndex];
  const cardType = card.type || card.CD_TYPE || "UNIT";
  
  if (cardType === "SPELL") {
     console.log("[playCardMove] Tentou jogar SPELL como UNIT.");
     return INVALID_MOVE;
  }

  const baseCost = Number(card.cost || card.CD_COST || 0);
  const cost = Math.max(0, baseCost);

  if (me.energy < cost) {
     console.log(`[playCardMove] Sem energia. Custo: ${cost}, Energia: ${me.energy}`);
     return INVALID_MOVE;
  }

  // 1) Remove da mão
  const [playedCard] = me.hand.splice(handIndex, 1);
  console.log(`[playCardMove] Carta ${playedCard.cardId || playedCard.id} removida da mão. Tamanho da mão agora: ${me.hand.length}`);

  // 2) Gasta energia
  me.energy -= cost;

  // 3) Snapshot unit
  const unitLife = Math.max(1, Number(playedCard.life || playedCard.CD_LIFE || 1));
  const unitAttack = Math.max(0, Number(playedCard.attack || playedCard.atk || playedCard.CD_ATTACK || 0));
  const unitDefense = Math.max(0, Number(playedCard.defense || playedCard.def || playedCard.CD_DEFENSE || 0));

  const instanceId = `u_${owner}_${playedCard.cardId || playedCard.id}_${ctx.turn}_${Math.floor(ctx.random.Number() * 100000)}`;

  const unitSnapshot = {
    ...playedCard,
    type: "UNIT",
    owner,
    instanceId,
    unitId: instanceId, // compatibilidade
    life: unitLife,
    lifeMax: unitLife,
    attack: unitAttack,
    defense: unitDefense,
  };

  // 4) Coloca no board
  myBoard[slot] = unitSnapshot;
}
