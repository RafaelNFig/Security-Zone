/**
 * Pipeline de Dano e Mitigação
 */

export function computeEffectiveStats(G, who, slot, unit) {
  if (!unit) return { life: 0, attack: 0, defense: 0 };
  
  const base = {
    life: Number(unit.life || 0),
    attack: Number(unit.attack || 0),
    defense: Number(unit.defense || 0),
  };

  const effs = effectsForUnit(G, who, slot);
  let atkMod = 0;
  let defMod = 0;

  for (const e of effs) {
    const kind = String(e.kind || "").toUpperCase();
    const amt = Number(e.amount || 0);
    if (!Number.isFinite(amt)) continue;

    if (kind === "MOD_ATK") atkMod += amt;
    if (kind === "MOD_DEF") defMod += amt;
  }

  return {
    life: base.life,
    attack: base.attack + atkMod,
    defense: base.defense + defMod,
  };
}

export function effectsForUnit(G, who, slot) {
  if (!G.effects) return [];
  return G.effects.filter(e => e && e.targetPlayer === who && e.slot === slot);
}

export function effectsForPlayer(G, who) {
  if (!G.effects) return [];
  return G.effects.filter(e => e && e.targetPlayer === who && e.slot == null);
}

export function consumeFirstEffect(G, predicate) {
  if (!G.effects) return null;
  const idx = G.effects.findIndex(predicate);
  if (idx === -1) return null;
  const [removed] = G.effects.splice(idx, 1);
  return removed || null;
}

export function applyDamageReductions(G, ctxInfo, damage) {
  let dmg = damage;
  const { enemy, targetSlot } = ctxInfo;
  
  const effs = effectsForUnit(G, enemy, targetSlot);
  for (const e of effs) {
    const kind = String(e.kind || "").toUpperCase();
    const amt = Number(e.amount || 0);

    if (kind === "REDUCE_DAMAGE_FLAT" && Number.isFinite(amt) && amt > 0) {
      dmg = Math.max(0, dmg - amt);
    }
    if (kind === "REDUCE_DAMAGE_PERCENT" && Number.isFinite(amt) && amt > 0) {
      dmg = Math.floor(dmg * (1 - amt / 100));
    }
  }

  return dmg;
}
