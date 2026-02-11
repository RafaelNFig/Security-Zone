// frontend/src/pages/BattleArena/components/BoardSlot.jsx
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";
import { typeBadge } from "../utils/mappers.js";

export default function BoardSlot({
  card,
  dragging,
  canAccept,
  isHover,
  onHover,
  onLeave,
  onDrop,
  onPrimary,
  onSecondary,
  locked = false,
  disabledPrimary = false,
  disabledSecondary = false,
}) {
  const showAccept = dragging && canAccept;

  const name = card?.CD_NAME ?? card?.name ?? card?.cardName ?? "UNIT";
  const type = card?.CD_TYPE ?? card?.type ?? "UNIT";
  const cost = card?.CD_COST ?? card?.cost ?? 0;

  const atk = card?.attack ?? card?.CD_ATTACK ?? "-";
  const def = card?.defense ?? card?.CD_DEFENSE ?? "-";
  const hp = card?.life ?? card?.CD_LIFE ?? "-";

  const hasAbility = Boolean(
    card?.hasAbility ||
      card?.abilityKey ||
      card?.abilityCost != null ||
      (Array.isArray(card?.abilities) && card.abilities.length > 0) ||
      card?.effect?.abilityKey ||
      card?.effect?.key ||
      card?.effect?.kind
  );

  const statsBar = (
    <div className="flex items-center justify-between text-[12px] font-mono text-slate-200/80">
      <span className="text-red-300">ATK:{atk}</span>
      <span className="text-cyan-300">DEF:{def}</span>
      <span className="text-emerald-300">HP:{hp}</span>
    </div>
  );

  function handlePrimaryClick() {
    if (locked || !card || disabledPrimary) return;
    onPrimary?.();
  }

  function handleSecondary() {
    if (locked || !card || disabledSecondary) return;
    if (!hasAbility) return;
    onSecondary?.();
  }

  return (
    <div
      onDragOver={(e) => {
        if (locked) return;
        e.preventDefault();
        onHover?.();
      }}
      onDragEnter={() => !locked && onHover?.()}
      onDragLeave={() => !locked && onLeave?.()}
      onDrop={(e) => {
        if (locked) return;
        e.preventDefault();
        onDrop?.();
      }}
      onContextMenu={(e) => {
        if (locked) return;
        e.preventDefault();
        handleSecondary();
      }}
      onClick={(e) => {
        if (e.shiftKey) {
          handleSecondary();
          return;
        }
        handlePrimaryClick();
      }}
      className={[
        "relative rounded-3xl border backdrop-blur overflow-hidden transition-all",
        "shadow-[0_30px_120px_rgba(0,0,0,0.85)]",
        locked ? "border-white/10 opacity-95" : showAccept ? "border-emerald-300/45" : "border-white/20",
        isHover && showAccept ? "scale-[1.02]" : "",
        "bg-black/40",
      ].join(" ")}
      style={{ width: 340, height: 220 }} // 🔥 AUMENTADO
    >
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_68%)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(0,0,0,0.55)]" />

      <AnimatePresence>
        {showAccept && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-emerald-500/15"
          >
            <div className="absolute inset-0 border-2 border-emerald-300/45 rounded-3xl shadow-[0_0_40px_rgba(16,185,129,0.35)]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-200 font-extrabold tracking-widest text-lg">
              SUMMON
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!card ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="text-slate-200/90 font-extrabold tracking-[0.4em] text-lg">SLOT</div>
          <div className="text-[12px] font-mono text-slate-200/50">
            {locked ? "enemy" : "solte aqui"}
          </div>
        </div>
      ) : (
        <motion.div
          className="relative w-full h-full p-3"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <div className="w-full h-full rounded-2xl border border-white/15 bg-black/50 overflow-hidden flex relative">
            
            {!locked && hasAbility && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSecondary();
                }}
                disabled={disabledSecondary}
                className={[
                  "absolute z-20 right-3 top-3 w-9 h-9 rounded-xl border backdrop-blur flex items-center justify-center",
                  disabledSecondary
                    ? "cursor-not-allowed opacity-60 border-white/12 bg-white/5"
                    : "border-emerald-300/30 bg-emerald-500/12 hover:bg-emerald-500/18",
                ].join(" ")}
              >
                <Sparkles size={16} className="text-emerald-200" />
              </button>
            )}

            {/* 🔥 imagem maior */}
            <div className="w-[45%] h-full bg-white/5 flex items-center justify-center relative">
              {card?.img || card?.CD_IMAGE ? (
                <img
                  src={card?.img ?? card?.CD_IMAGE}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              ) : (
                <div className="text-sm text-slate-200/70 font-mono">UNIT</div>
              )}
            </div>

            <div className="flex-1 p-3 flex flex-col justify-between">
              <div>
                <div className="text-lg font-extrabold text-[#FFD60A] truncate pr-12">
                  {name}
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <div
                    className={[
                      "inline-flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg border",
                      typeBadge(type),
                    ].join(" ")}
                  >
                    <Shield size={14} />
                    <span className="font-mono">{type || "-"}</span>
                  </div>
                  <div className="text-[12px] font-mono text-slate-200/80">
                    C:{cost}
                  </div>
                </div>
              </div>

              {statsBar}

              {!locked && (
                <div className="text-[11px] text-slate-200/60 font-mono">
                  {disabledPrimary
                    ? "(aguarde turno)"
                    : hasAbility
                    ? "(clique: atacar • shift/botão direito: habilidade)"
                    : "(clique p/ atacar)"}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
