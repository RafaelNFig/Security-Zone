import pkg from "boardgame.io/dist/cjs/core.js";
const { INVALID_MOVE } = pkg;

export const effectsRegistry = {
  "SOFTWARE_MALICIOSO": (G, ctx, payload) => {
    const { choice, target, owner, enemy } = payload;
    
    // Validações de tipo seguras (Safe-checks)
    if (choice !== undefined && typeof choice !== 'string' && !Array.isArray(choice)) {
      return INVALID_MOVE;
    }
    const isEnemy = choice && typeof choice.includes === 'function' && choice.includes("DEBUFF");
    const who = isEnemy ? enemy : owner;
    const slot = target?.slot;
    
    if (slot == null || typeof slot !== 'number' || slot < 0 || slot > 2) return INVALID_MOVE;
    
    G.effects.push({
      kind: "MOD_ATK",
      owner,
      targetPlayer: who,
      slot: Math.floor(slot),
      amount: isEnemy ? -10 : 10,
      expiresAtTurn: ctx.turn + 2,
    });
  },
  
  "ESCUDO_DIGITAL": (G, ctx, payload) => {
    const { target, owner } = payload;
    const slot = target?.slot;
    
    if (slot == null || typeof slot !== 'number' || slot < 0 || slot > 2) return INVALID_MOVE;

    const slotIdx = Math.floor(slot);
    const unit = G.board[owner][slotIdx];
    if (!unit) return INVALID_MOVE;

    unit.life = Math.min(unit.lifeMax || unit.life + 30, unit.life + 30);
    
    G.effects.push({
      kind: "MOD_DEF",
      owner,
      targetPlayer: owner,
      slot: slotIdx,
      amount: 10,
      expiresAtRound: Math.ceil(ctx.turn / 2) + 1,
    });
  },

  "LOGS_AUDITORIA": (G, ctx, payload) => {
    const { owner, enemy } = payload;
    const op = G.players[enemy];
    if (op.deck.length > 0) {
      const top = op.deck[0];
      const looksAttack = top.type !== "SPELL" && 
        typeof top.cardId === 'string' && top.cardId.toLowerCase().includes("ataque");

      if (looksAttack) {
        G.effects.push({
          kind: "COST_TAX_NEXT_CARD",
          owner,
          targetPlayer: enemy,
          amount: 1,
          expiresAtTurn: ctx.turn + 1,
        });
      }
    }
  },

  "ATUALIZACAO_SOFTWARE": (G, ctx, payload) => {
    const { choice, redirectToSlot, owner } = payload;
    
    if (choice === "BLOCK") {
      G.effects.push({
        kind: "NEXT_ATTACK_BLOCK",
        owner,
        targetPlayer: owner,
        expiresAtTurn: ctx.turn + 2,
      });
    } else if (choice === "REDIRECT") {
      if (redirectToSlot == null || typeof redirectToSlot !== 'number') return INVALID_MOVE;
      G.effects.push({
        kind: "NEXT_ATTACK_REDIRECT",
        owner,
        targetPlayer: owner,
        slot: Math.floor(redirectToSlot),
        expiresAtTurn: ctx.turn + 2,
      });
    } else {
        return INVALID_MOVE;
    }
  },

  "BACKUP_SEGURO": (G, ctx, payload) => {
    const { restoreCardId, restoreTo, restoreSlot, me, owner } = payload;
    
    if (restoreCardId == null) return INVALID_MOVE;
    
    const targetIdStr = String(restoreCardId);
    const idx = me.discard.findIndex(c => String(c.cardId || c.id || c.CD_ID) === targetIdStr);
    
    if (idx !== -1) {
      if (restoreTo === "HAND" && me.energy >= 3) {
        me.energy -= 3;
        const [restored] = me.discard.splice(idx, 1);
        me.hand.push(restored);
      } else if (restoreTo === "FIELD" && me.energy >= 2 && restoreSlot != null && typeof restoreSlot === 'number') {
        const slotIdx = Math.floor(restoreSlot);
        if (slotIdx >= 0 && slotIdx <= 2 && G.board[owner][slotIdx] == null) {
          me.energy -= 2;
          const [restored] = me.discard.splice(idx, 1);
          G.board[owner][slotIdx] = {
            ...restored,
            type: "UNIT",
            life: Math.max(1, Math.ceil((restored.lifeMax || 1) * 0.2)),
          };
        } else {
            return INVALID_MOVE;
        }
      } else {
          return INVALID_MOVE;
      }
    } else {
        return INVALID_MOVE;
    }
  }
};
