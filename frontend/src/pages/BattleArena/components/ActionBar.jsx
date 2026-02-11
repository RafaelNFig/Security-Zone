// frontend/src/pages/BattleArena/components/ActionBar.jsx
import React from "react";
import EndTurnButton from "./EndTurnButton.jsx";

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

/**
 * ActionBar
 * - UI + bloqueios coerentes com regras do rules-service
 * - Não executa regras, só reflete estado e trava botões corretamente.
 */
export default function ActionBar({
  turnOwnerSide,
  viewerSide,
  phase,
  turnCount,
  isMyTurn,
  isLoading,
  isSending = false, // ✅ novo: vindo do useActionQueue
  hasAttacked = false, // ✅ novo: state.turn.hasAttacked
  abilityUsed = false, // ✅ novo: state.turn.abilityUsed
  onEndTurn,
}) {
  const PH = toUpper(phase, "MAIN");
  const ended = PH === "ENDED";

  const ownerLabel = ended ? "Encerrada" : turnOwnerSide === viewerSide ? "Sua vez" : "Vez do bot";
  const phaseLabel = ended ? "ENDED" : PH;

  const endTurnDisabled = !isMyTurn || isLoading || isSending || ended;

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs text-slate-200/70 font-mono tracking-wider">TURNO</div>
          <div
            className={[
              "text-[10px] font-mono px-2 py-1 rounded-xl border",
              ended
                ? "border-red-300/20 bg-red-500/10 text-red-100/80"
                : isMyTurn
                ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/80"
                : "border-white/10 bg-white/5 text-slate-200/70",
            ].join(" ")}
          >
            {phaseLabel}
          </div>
        </div>

        <div className="mt-1 text-base font-semibold text-slate-100">{ownerLabel}</div>

        <div className="mt-1 text-[10px] font-mono text-slate-200/60">
          TURN #{turnCount} • {phaseLabel}
        </div>

        {/* ✅ status real do turno (útil com habilidade + regras) */}
        {!ended && (
          <div className="mt-3 flex flex-wrap gap-2">
            <div
              className={[
                "text-[10px] font-mono px-2 py-1 rounded-xl border",
                hasAttacked ? "border-amber-300/20 bg-amber-500/10 text-amber-100/80" : "border-white/10 bg-white/5 text-slate-200/60",
              ].join(" ")}
              title="Após atacar, não pode usar spells/habilidades"
            >
              {hasAttacked ? "ATACOU" : "NÃO ATACOU"}
            </div>

            <div
              className={[
                "text-[10px] font-mono px-2 py-1 rounded-xl border",
                abilityUsed ? "border-cyan-300/20 bg-cyan-500/10 text-cyan-100/80" : "border-white/10 bg-white/5 text-slate-200/60",
              ].join(" ")}
              title="Só 1 habilidade por turno"
            >
              {abilityUsed ? "SKILL USADA" : "SKILL LIVRE"}
            </div>

            {isSending && (
              <div className="text-[10px] font-mono px-2 py-1 rounded-xl border border-white/10 bg-white/5 text-slate-200/60">
                ENVIANDO...
              </div>
            )}
          </div>
        )}
      </div>

      <EndTurnButton
        disabled={endTurnDisabled}
        busy={isSending} // ✅ opcional, se seu botão suportar
        onClick={onEndTurn}
      />
    </div>
  );
}
