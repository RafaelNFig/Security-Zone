// frontend/src/pages/BattleArena/components/Board.jsx
import React from "react";
import BoardSlot from "./BoardSlot.jsx";

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

export default function Board({
  slots = [],
  dragging = false,
  hoverSlot = null,
  setHoverSlot,
  canDropInSlot,
  onDropSlot,
  onAttackSlot,
  onAbilitySlot,
  isMyTurn = false,
  phase = "MAIN",
  turnMeta = null,
}) {
  const isMain = toUpper(phase, "MAIN") === "MAIN";
  const hasAttacked = Boolean(turnMeta?.hasAttacked);
  const abilityUsed = Boolean(turnMeta?.abilityUsed);

  const canUsePrimary = isMyTurn && isMain;
  const canUseAbility = isMyTurn && isMain && !hasAttacked && !abilityUsed;

  return (
    <div
      className="absolute z-[20] left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2"
      style={{ width: 1700 }} // 🔥 bem maior
    >
      {/* ENEMY ROW */}
      <div className="grid grid-cols-3 gap-24">
        {[0, 1, 2].map((idx) => (
          <BoardSlot
            key={idx}
            card={slots[idx]}
            dragging={dragging}
            isHover={hoverSlot === idx}
            canAccept={false}
            onHover={() => setHoverSlot?.(idx)}
            onLeave={() => setHoverSlot?.(null)}
            onDrop={() => {}}
            onPrimary={() => {}}
            statsPosition="top"
            locked
          />
        ))}
      </div>

      {/* 🔥 espaço vertical maior entre linhas */}
      <div style={{ height: 200 }} />

      {/* PLAYER ROW */}
      <div className="grid grid-cols-3 gap-24">
        {[3, 4, 5].map((idx) => (
          <BoardSlot
            key={idx}
            card={slots[idx]}
            dragging={dragging}
            isHover={hoverSlot === idx}
            canAccept={dragging && canDropInSlot?.(idx)}
            onHover={() => setHoverSlot?.(idx)}
            onLeave={() => setHoverSlot?.(null)}
            onDrop={() => onDropSlot?.(idx)}
            onPrimary={() => onAttackSlot?.(idx - 3)}
            onSecondary={() => onAbilitySlot?.(idx - 3)}
            statsPosition="bottom"
            locked={false}
            disabledPrimary={!canUsePrimary}
            disabledSecondary={!canUseAbility}
          />
        ))}
      </div>
    </div>
  );
}
