import React from "react";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

export default function DeckPickerFooter({ decks, selectedDeckId, onSelect }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      {/* ✅ menos padding vertical */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 pb-2">
        <div className="relative rounded-2xl border border-white/10 bg-black/35 backdrop-blur shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <div className="relative px-4 sm:px-5 py-2">
            {/* header do footer mais compacto */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-xl bg-white/5 border border-white/10 text-cyan-200">
                  <Layers size={16} />
                </span>
                deck
              </div>

              <div className="text-[11px] text-slate-300/60 font-mono">
                {decks.length} decks
              </div>
            </div>

            {/* ✅ carrossel mais baixo */}
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {decks.map((d) => {
                const active = d.id === selectedDeckId;
                return (
                  <motion.button
                    key={d.id}
                    onClick={() => onSelect(d.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={[
                      "shrink-0 w-[170px] sm:w-[190px] rounded-xl p-3 border text-left transition",
                      active
                        ? "bg-cyan-400/10 border-cyan-300/25 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
                        : "bg-white/5 border-white/10 hover:bg-white/7",
                    ].join(" ")}
                  >
                    <div className="text-sm font-extrabold text-slate-100 truncate">
                      {d.name}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-200/70 truncate">
                      {d.tag ? `${d.tag} • ` : ""}{d.cards ?? "??"} cartas
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
