import pkg from "boardgame.io/dist/cjs/core.js";
const { INVALID_MOVE } = pkg;

import { effectsRegistry } from '../effects/effectsRegistry.js';
import { toGKey, getEnemyGKey } from '../utils/playerMapping.js';

/**
 * Move: castSpell
 * Aplica magias, deduz energia e injeta efeitos no G.effects
 *
 * @param {object} context - { G, ctx } do boardgame.io
 * @param {object} actionPayload - Parâmetros da magia (alvos, escolhas, slots)
 */
export function castSpellMove({ G, ctx }, actionPayload) {
  const { cardId } = actionPayload;
  const owner = toGKey(ctx.currentPlayer);
  const enemy = getEnemyGKey(ctx.currentPlayer);
  const me = G.players[owner];
  
  const targetId = String(cardId);
  const handIndex = me.hand.findIndex(c => String(c.cardId || c.id || c.CD_ID) === targetId);
  
  if (handIndex === -1) return INVALID_MOVE;

  const spellCard = me.hand[handIndex];
  const ctype = spellCard.type || spellCard.CD_TYPE || "UNIT";
  
  if (ctype !== "SPELL") return INVALID_MOVE;

  const baseCost = Number(spellCard.cost || spellCard.CD_COST || 0);
  if (me.energy < baseCost) return INVALID_MOVE;

  // Paga o custo
  me.energy -= baseCost;

  // Remove da mão e joga pro discard
  const [playedCard] = me.hand.splice(handIndex, 1);
  me.discard.push(playedCard);

  const spellKey = spellCard.spellKey || spellCard.CD_SPELL_KEY || "";
  
  if (!G.effects) G.effects = [];

  const effectPayload = { ...actionPayload, me, owner, enemy };
  
  const handler = effectsRegistry[spellKey];
  if (handler) {
    const res = handler(G, ctx, effectPayload);
    if (res === INVALID_MOVE) return INVALID_MOVE;
  }
}
