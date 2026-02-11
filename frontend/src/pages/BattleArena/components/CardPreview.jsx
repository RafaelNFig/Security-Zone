// src/pages/BattleArena/components/CardPreview.jsx
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";
import { typeBadge } from "../utils/mappers.js";

/**
 * CardPreview
 * - Tooltip/preview genérico
 * - Use com hover (mão/board) quando você começar a refinar UX
 * - Agora ele é “ready” mas não precisa estar plugado
 */
export default function CardPreview({ open = false, card = null, onClose }) {
  if (!open || !card) return null;

  const name = card?.CD_NAME ?? card?.name ?? "CARD";
  const type = card?.CD_TYPE ?? card?.type ?? "";
  const cost = card?.CD_COST ?? card?.cost ?? 0;

  const atk = card?.attack ?? card?.CD_ATTACK ?? null;
  const def = card?.defense ?? card?.CD_DEFENSE ?? null;
  const hp = card?.life ?? card?.CD_LIFE ?? null;

  const img = card?.CD_IMAGE ?? card?.img ?? null;
  const desc = card?.CD_HABILITY ?? card?.description ?? null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[90] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />

        <motion.div
          className="relative w-[340px] max-w-[92vw] rounded-2xl border border-white/15 bg-black/50 backdrop-blur shadow-[0_25px_120px_rgba(0,0,0,0.85)] overflow-hidden"
          initial={{ y: 14, scale: 0.98, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 14, scale: 0.98, opacity: 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.14),transparent_60%)]" />

          <div className="relative p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-extrabold text-[#FFD60A] truncate">{name}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className={["inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border", typeBadge(type)].join(" ")}>
                    <Shield size={12} className="opacity-80" />
                    <span className="font-mono">{type || "-"}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-200/70">CUSTO: {cost}</div>
                </div>
              </div>

              <button
                className="px-2 py-1 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition text-[10px] font-mono text-slate-200/75"
                onClick={onClose}
              >
                fechar
              </button>
            </div>

            <div className="mt-3 w-full h-[190px] rounded-xl border border-white/12 bg-black/35 overflow-hidden">
              {img ? (
                <img
                  src={img}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-200/60 font-mono">SEM IMAGEM</div>
              )}
            </div>

            {(atk != null || def != null || hp != null) && (
              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-slate-200/75">
                <span className="text-red-200">ATK:{atk ?? "-"}</span>
                <span className="text-cyan-200">DEF:{def ?? "-"}</span>
                <span className="text-emerald-200">HP:{hp ?? "-"}</span>
              </div>
            )}

            {desc ? (
              <div className="mt-3 text-[11px] text-slate-200/80 leading-relaxed">
                {String(desc)}
              </div>
            ) : null}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
