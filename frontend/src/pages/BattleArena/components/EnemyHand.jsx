// frontend/src/pages/BattleArena/components/EnemyHand.jsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { getCardId } from "../utils/mappers.js";

const VERSO_URL = "/img/cards/verso.png";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

export default function EnemyHand({
  enemyHand = [],
  enemyHandCount = 0,

  // 🔥 aumentados
  cardWidth = 128,
  cardHeight = 178,
  maxShown = 5,

  // ✅ mais alto (antes 300)
  y = 10,
  containerWidth = 820,
  containerHeight = 240,
}) {
  const { cardsToShow, showCount } = useMemo(() => {
    const arr = Array.isArray(enemyHand) ? enemyHand : [];
    const hasRevealList = arr.length > 0;

    if (hasRevealList) {
      const sliced = arr.slice(0, maxShown);
      return { cardsToShow: sliced, showCount: sliced.length };
    }

    const count = clamp(Number(enemyHandCount ?? 0) || 0, 0, maxShown);
    return {
      cardsToShow: new Array(count).fill({ hidden: true }),
      showCount: count,
    };
  }, [enemyHand, enemyHandCount, maxShown]);

  const fan = useMemo(() => {
    const span = 40; // 🔥 arco maior
    const out = [];
    for (let i = 0; i < showCount; i++) {
      const t = showCount === 1 ? 0 : i / (showCount - 1);
      out.push(-span / 2 + t * span);
    }
    return out;
  }, [showCount]);

  return (
    <div
      className="absolute z-[25] left-1/2 -translate-x-1/2 pointer-events-none"
      style={{ top: y, width: containerWidth, height: containerHeight }}
    >
      <div className="relative w-full h-full">
        {cardsToShow.map((card, i) => {
          const isHidden =
            Boolean(card?.hidden) ||
            !card ||
            (!card?.revealed &&
              card?.hidden !== false &&
              card?.CD_IMAGE == null &&
              card?.img == null &&
              card?.image == null &&
              card?.name == null);

          const key = getCardId(card)
            ? `enemy-${getCardId(card)}-${i}`
            : `enemy-${i}-${isHidden ? "h" : "r"}`;

          const img = card?.img ?? card?.CD_IMAGE ?? card?.image ?? null;
          const name = card?.CD_NAME ?? card?.name ?? "CARD";
          const type = toUpper(card?.CD_TYPE ?? card?.type ?? "", "");

          return (
            <motion.div
              key={key}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/18 shadow-[0_20px_70px_rgba(0,0,0,0.85)] overflow-hidden bg-black/45"
              style={{
                width: cardWidth,
                height: cardHeight,
                transform: `translate(-50%, -50%) rotate(${fan[i] ?? 0}deg) translateY(-22px)`,
              }}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              title={isHidden ? "Carta do inimigo" : `${name}${type ? ` • ${type}` : ""}`}
            >
              {isHidden ? (
                <img
                  src={VERSO_URL}
                  alt="verso"
                  className="w-full h-full object-cover opacity-95"
                />
              ) : img ? (
                <img
                  src={img}
                  alt={name}
                  className="w-full h-full object-cover opacity-95"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  <div className="text-xs font-mono text-slate-200/70">REVEALED</div>
                  <div className="mt-1 text-[11px] font-mono text-slate-200/60 px-2 text-center line-clamp-2">
                    {name}
                  </div>
                </div>
              )}

              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.18),transparent_58%)]" />
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_35px_rgba(0,0,0,0.65)]" />
            </motion.div>
          );
        })}

        {Number(enemyHandCount ?? 0) > maxShown && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div className="rounded-xl border border-white/15 bg-black/55 backdrop-blur px-3 py-1 text-[11px] font-mono text-slate-200/75">
              +{Number(enemyHandCount) - maxShown}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
