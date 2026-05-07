import pkg from "boardgame.io/dist/cjs/core.js";
const { INVALID_MOVE } = pkg;
import { computeEffectiveStats, applyDamageReductions, consumeFirstEffect } from '../utils/damagePipeline.js';
import { toGKey, getEnemyGKey } from '../utils/playerMapping.js';

/**
 * Move: attack
 * Resolve lógica de combate entre slots, dano direto e overflows.
 */
export function attackMove({ G, ctx, events }, actionPayload) {
  const { attackerSlot: rawAttackerSlot } = actionPayload;

  // Regra: Não é permitido atacar no primeiro turno (quem começa não ataca)
  if (ctx.turn === 1) return INVALID_MOVE;

  const owner = toGKey(ctx.currentPlayer);
  const enemyKey = getEnemyGKey(ctx.currentPlayer);

  if (rawAttackerSlot == null || typeof rawAttackerSlot !== 'number') return INVALID_MOVE;
  const attackerSlot = Math.floor(rawAttackerSlot);
  if (attackerSlot < 0 || attackerSlot > 2) return INVALID_MOVE;

  const myBoard = G.board[owner];
  const enBoard = G.board[enemyKey];

  const attackerUnit = myBoard[attackerSlot];
  if (!attackerUnit) return INVALID_MOVE;

  const atkStats = computeEffectiveStats(G, owner, attackerSlot, attackerUnit);
  const atk = atkStats.attack;
  if (atk <= 0) return INVALID_MOVE;

  // BLOCK
  const block = consumeFirstEffect(G, e => 
    e && e.kind === "NEXT_ATTACK_BLOCK" && e.targetPlayer === enemyKey
  );

  if (block) {
    events.endTurn();
    return;
  }

  // REDIRECT
  const redir = consumeFirstEffect(G, e =>
    e && e.kind === "NEXT_ATTACK_REDIRECT" && e.targetPlayer === enemyKey && e.slot != null
  );

  const redirSlot = redir ? Number(redir.slot) : attackerSlot;
  const targetSlot = Math.floor(redirSlot);
  const defenderUnit = enBoard[targetSlot];

  if (!defenderUnit) {
    // Dano direto no jogador
    const enemyPlayer = G.players[enemyKey];
    enemyPlayer.hp = Math.max(0, enemyPlayer.hp - atk);
    events.endTurn();
    return;
  }

  const defStats = computeEffectiveStats(G, enemyKey, targetSlot, defenderUnit);
  const defBase = defStats.defense;

  let dmgBase = Math.max(0, atk - defBase);
  if (dmgBase <= 0) {
    events.endTurn();
    return;
  }

  const ctxInfo = { enemy: enemyKey, targetSlot };
  const dmgFinal = applyDamageReductions(G, ctxInfo, dmgBase);

  defenderUnit.life = Math.max(0, defenderUnit.life - dmgFinal);

  if (defenderUnit.life <= 0) {
    enBoard[targetSlot] = null;
    G.players[enemyKey].discard.push(defenderUnit);
  }

  events.endTurn();
}
