const express = require('express');
const crypto = require('crypto');

// Memória do servidor (MVP) - armazena as partidas
const matches = new Map();

function matchRoutes(SecurityZoneGame) {
  const router = express.Router();

  /**
   * POST /matches
   * Cria uma partida, roda o setup do game-engine e devolve o estado inicial.
   */
  router.post('/matches', async (req, res) => {
    const { mode, difficulty, bot, botDeckCards, playerId, deckId, p1DeckCards } = req.body ?? {};

    try {
      const matchId = crypto.randomUUID();

      const setupData = {
        mode: mode || 'VSBOT',
        difficulty: difficulty || 'easy',
        playerId,
        deckId,
        bot,
        p1Deck: p1DeckCards || [],
        p2Deck: botDeckCards || []
      };

      const ctx = {
        numPlayers: 2,
        playOrder: ["0", "1"],
        currentPlayer: "0",
        turn: 1,
        phase: "MAIN",
        hasAttacked: false,
        random: { Number: Math.random }
      };

      // Inicializa o G
      let G = SecurityZoneGame.setup(ctx, setupData);
      G.setupData = { mode: setupData.mode, difficulty: setupData.difficulty };

      const eventsObj = { endTurn: () => {} };

      // Executa hook de início de turno para o P1 (saca carta)
      if (SecurityZoneGame.turn && SecurityZoneGame.turn.onBegin) {
         SecurityZoneGame.turn.onBegin({ G, ctx, events: eventsObj });
      }

      matches.set(matchId, { G, ctx });

      const sanitizedG = JSON.parse(JSON.stringify(G));
      sanitizedG.players.P2.hand = sanitizedG.players.P2.hand.map(c => ({ id: "hidden", type: "hidden" }));

      res.status(201).json({
        success: true,
        matchId,
        mode: G.setupData?.mode,
        difficulty: G.setupData?.difficulty,
        state: { 
          ...sanitizedG, 
          turn: { owner: "P1", number: 1, phase: "MAIN", hasAttacked: false } 
        },
        events: []
      });
    } catch (err) {
      console.error('[matchRoutes] Erro ao criar partida:', err);
      res.status(500).json({ success: false, error: 'MATCH_CREATE_ERROR', message: err.message });
    }
  });

  /**
   * GET /matches/:id
   * Retorna o estado atual da partida (sanitizado).
   */
  router.get('/matches/:id', async (req, res) => {
    const { id } = req.params;
    const { internal } = req.query;
    const match = matches.get(id);

    if (!match) {
      return res.status(404).json({ success: false, error: 'MATCH_NOT_FOUND' });
    }

    const { G, ctx } = match;

    const sanitizedG = JSON.parse(JSON.stringify(G));
    
    // Censurar mão inimiga (P2) se não for o próprio bot consultando
    if (internal !== 'true') {
      sanitizedG.players.P2.hand = sanitizedG.players.P2.hand.map(c => ({ id: "hidden", type: "hidden" }));
    }

    console.log(`[GET /matches/:id] internal=${internal}. P2 hand length: ${sanitizedG.players.P2.hand.length}. First item ID: ${sanitizedG.players.P2.hand[0]?.id || sanitizedG.players.P2.hand[0]?.CD_ID}`);

    res.status(200).json({ 
      success: true, 
      mode: G.setupData?.mode,
      difficulty: G.setupData?.difficulty,
      state: { 
        ...sanitizedG, 
        turn: { 
           owner: ctx.currentPlayer === "0" ? "P1" : "P2", 
           number: ctx.turn, 
           phase: ctx.phase || "MAIN",
           hasAttacked: ctx.hasAttacked || false
        } 
      } 
    });
  });

  /**
   * POST /matches/:id/actions
   * Executa um move do engine e atualiza o estado in-memory.
   */
  router.post('/matches/:id/actions', async (req, res) => {
    const { id } = req.params;
    const { action, clientActionId } = req.body ?? {};
    const match = matches.get(id);

    if (!match) {
      return res.status(404).json({ success: false, error: 'MATCH_NOT_FOUND' });
    }

    let { G, ctx } = match;

    const eventsObj = {
      endTurn: () => {
        // EndTurn hook
        if (SecurityZoneGame.turn && SecurityZoneGame.turn.onEnd) {
           SecurityZoneGame.turn.onEnd({ G, ctx, events: eventsObj });
        }

        // Troca jogador e avança turno se for P2
        if (ctx.currentPlayer === "0") {
          ctx.currentPlayer = "1";
        } else {
          ctx.currentPlayer = "0";
          ctx.turn += 1;
        }
        ctx.hasAttacked = false;

        // BeginTurn hook pro próximo jogador
        if (SecurityZoneGame.turn && SecurityZoneGame.turn.onBegin) {
           SecurityZoneGame.turn.onBegin({ G, ctx, events: eventsObj });
        }
      }
    };

    try {
      if (action.type === "END_TURN") {
        eventsObj.endTurn();
      } else {
        // Encontra a action no objeto game
        const moveFnName = Object.keys(SecurityZoneGame.moves).find(
           k => k.toLowerCase() === action.type.replace(/_/g, "").toLowerCase()
        );
        
        let moveFn = null;
        if (moveFnName) moveFn = SecurityZoneGame.moves[moveFnName];

        if (!moveFn) {
           return res.status(400).json({ success: false, error: 'INVALID_MOVE', message: `Move ${action.type} não encontrado.` });
        }

        if (action.type === "ATTACK") ctx.hasAttacked = true;

        const moveResult = moveFn({ G, ctx, events: eventsObj }, action.payload);
        
        // Retorno especial de moves do boardgame.io
        if (moveResult === "INVALID_MOVE") {
           return res.json({ success: true, rejected: { code: "INVALID_MOVE" } });
        }
      }

      G.version = (G.version || 0) + 1;
      
      const sanitizedG = JSON.parse(JSON.stringify(G));
      sanitizedG.players.P2.hand = sanitizedG.players.P2.hand.map(c => ({ id: "hidden", type: "hidden" }));

      res.status(200).json({
         success: true,
         state: {
            ...sanitizedG,
            turn: {
               owner: ctx.currentPlayer === "0" ? "P1" : "P2", 
               number: ctx.turn, 
               phase: ctx.phase || "MAIN",
               hasAttacked: ctx.hasAttacked || false
            }
         },
         events: []
      });
    } catch(err) {
       console.error("[matchRoutes] Erro na action", err);
       res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'match-service' });
  });

  router.post('/matches/:id/abort', (req, res) => {
    matches.delete(req.params.id);
    res.json({ success: true });
  });

  return router;
}

module.exports = { matchRoutes };
