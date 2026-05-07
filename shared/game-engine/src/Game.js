import pkg from "boardgame.io/dist/cjs/core.js";
const { ActivePlayers } = pkg;
import { getInitialState } from "./setup/initialState.js";
import { attackMove, playCardMove, castSpellMove, activateAbilityMove } from "./moves/index.js";
import { onTurnBegin } from "./hooks/onTurnBegin.js";
import { onTurnEnd } from "./hooks/onTurnEnd.js";
import { turnPhases } from "./phases/turnPhases.js";

export const SecurityZoneGame = {
  name: "security-zone",

  setup: getInitialState,

  turn: {
    activePlayers: ActivePlayers.ALL_ONCE,
    onBegin: onTurnBegin,
    onEnd: onTurnEnd
  },

  moves: {
    attack: attackMove,
    playCard: playCardMove,
    castSpell: castSpellMove,
    activateAbility: activateAbilityMove
  },

  phases: turnPhases,

  endIf: ({ G, ctx }) => {
    if (G.players.P1.hp <= 0) return { winner: "P2" };
    if (G.players.P2.hp <= 0) return { winner: "P1" };
  }
};
