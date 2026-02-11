// frontend/src/pages/BattleArena/components/EndTurnButton.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Loader2 } from "lucide-react";

export default function EndTurnButton({ disabled = false, busy = false, onClick }) {
  const blocked = disabled || busy;

  return (
    <motion.button
      type="button"
      onClick={blocked ? undefined : onClick}
      disabled={blocked}
      whileHover={blocked ? {} : { y: -2, scale: 1.02 }}
      whileTap={blocked ? {} : { scale: 0.98 }}
      className={[
        "relative w-full h-[58px] rounded-2xl overflow-hidden select-none",
        "border backdrop-blur shadow-[0_22px_90px_rgba(0,0,0,0.80)]",
        blocked
          ? "cursor-not-allowed opacity-70 border-white/12 bg-black/35"
          : "cursor-pointer border-cyan-300/20 bg-black/40",
      ].join(" ")}
      title={blocked ? (busy ? "Enviando..." : "Aguarde sua vez") : "Encerrar turno"}
    >
      <div
        className={[
          "absolute inset-0",
          blocked
            ? "opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_55%)]"
            : "opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_55%)]",
        ].join(" ")}
      />
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.65)]" />

      <div className="absolute left-3 top-3 w-3 h-3 border-l-2 border-t-2 border-white/25" />
      <div className="absolute right-3 top-3 w-3 h-3 border-r-2 border-t-2 border-white/25" />
      <div className="absolute left-3 bottom-3 w-3 h-3 border-l-2 border-b-2 border-white/25" />
      <div className="absolute right-3 bottom-3 w-3 h-3 border-r-2 border-b-2 border-white/25" />

      <div className="relative h-full w-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={[
              "w-10 h-10 rounded-xl border flex items-center justify-center relative overflow-hidden",
              blocked
                ? "border-white/12 bg-white/5"
                : "border-cyan-300/25 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]",
            ].join(" ")}
          >
            <AnimatePresence initial={false}>
              {busy ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center"
                >
                  <Loader2 size={18} className={blocked ? "text-slate-200/60 animate-spin" : "text-cyan-200 animate-spin"} />
                </motion.div>
              ) : (
                <motion.div
                  key="sword"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center justify-center"
                >
                  <Swords size={18} className={blocked ? "text-slate-200/60" : "text-cyan-200"} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="text-left leading-tight">
            <div
              className={[
                "text-xs font-mono tracking-[0.26em] uppercase",
                blocked ? "text-slate-200/50" : "text-cyan-200/80",
              ].join(" ")}
            >
              Ação
            </div>
            <div
              className={[
                "text-sm font-extrabold tracking-wider",
                blocked ? "text-slate-200/70" : "text-slate-100",
              ].join(" ")}
            >
              {busy ? "Enviando..." : "Encerrar Turno"}
            </div>
          </div>
        </div>

        <div
          className={[
            "text-[10px] font-mono tracking-widest",
            blocked ? "text-slate-200/45" : "text-emerald-200/80",
          ].join(" ")}
        >
          {busy ? "..." : blocked ? "WAIT" : "OK"}
        </div>
      </div>
    </motion.button>
  );
}
