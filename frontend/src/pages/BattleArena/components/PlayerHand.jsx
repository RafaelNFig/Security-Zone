// src/pages/BattleArena/components/PlayerHand.jsx
import React from "react";
import { motion } from "framer-motion";

export default function PlayerHand({
  hand = [],
  isLoading = false,
  err = null,
  rotations = [],
  getCardKey,
  renderCard,
  maxCards = 5,
}) {
  const cards = Array.isArray(hand) ? hand.slice(0, maxCards) : [];

  return (
    <div className="relative w-full">
      {/* 🔥 menor largura */}
      <div className="mx-auto w-full max-w-[980px] px-2">
        {/* 🔥 altura reduzida */}
        <div className="relative h-[150px] overflow-hidden">
          
          {/* base mais discreta */}
          <div className="absolute inset-x-0 bottom-0 rounded-[26px] border border-white/10 bg-black/40 backdrop-blur shadow-[0_15px_60px_rgba(0,0,0,0.7)] h-[54px]" />
          <div className="absolute inset-x-0 bottom-0 rounded-[26px] pointer-events-none shadow-[inset_0_0_45px_rgba(34,211,238,0.08)] h-[54px]" />

          {/* fade superior */}
          <div className="absolute inset-x-0 top-0 h-[22px] pointer-events-none bg-[linear-gradient(to_bottom,rgba(0,0,0,0.85),transparent)]" />

          {!isLoading && !err && (
            <div
              className="absolute inset-0 flex items-end justify-center gap-2"
              style={{ paddingBottom: 6 }}
            >
              {cards.map((card, i) => (
                <motion.div
                  key={getCardKey?.(card, i) ?? `${i}`}
                  className="relative"
                  style={{
                    // 🔥 cartas levemente menores
                    width: 100,
                    height: 140,
                    transform: `rotate(${rotations[i] ?? 0}deg) translateY(2px)`,
                    transformOrigin: "bottom center",
                  }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  {renderCard?.(card, i)}
                </motion.div>
              ))}

              {cards.length === 0 && (
                <div className="rounded-xl border border-white/12 bg-black/40 backdrop-blur px-4 py-2 text-sm text-slate-200/70">
                  Sem cartas na mão.
                </div>
              )}
            </div>
          )}

          {(isLoading || err) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-white/12 bg-black/40 backdrop-blur px-4 py-3 text-xs font-mono text-slate-200/75">
                {isLoading ? "Carregando mão..." : `Erro: ${String(err)}`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
