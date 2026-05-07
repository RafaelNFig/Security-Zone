/**
 * Hook: onTurnEnd
 * Executado pelo boardgame.io no fim do turno de cada jogador.
 * Responsável por limpar efeitos expirados.
 */
export function onTurnEnd({ G, ctx, events }) {
  if (!G.effects) return;

  const currentTurn = ctx.turn;
  const currentRound = Math.ceil(ctx.turn / 2);

  G.effects = G.effects.filter(e => {
    if (!e) return false;
    
    if (e.expiresAtTurn && currentTurn >= e.expiresAtTurn) return false;
    if (e.expiresAtRound && currentRound >= e.expiresAtRound) return false;
    
    return true;
  });
}
