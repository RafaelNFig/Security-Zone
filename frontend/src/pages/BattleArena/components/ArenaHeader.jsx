// frontend/src/pages/BattleArena/components/ArenaHeader.jsx
import React from "react";
import { X, Timer, Sparkles, HeartPulse } from "lucide-react";

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

/**
 * ArenaHeader
 * - Voltar
 * - Hint/status
 * - Tempo
 * - ✅ HUD compacto: HP P1/P2 + dono do turno
 */
export default function ArenaHeader({
  hint,
  secondsLeft,
  matchId,
  onBack,
  formatTime,

  // ✅ novos (pra deixar “jogável” e claro)
  viewerSide = "P1",
  turnOwnerSide = "P1",
  phase = "MAIN",
  myHp = 100,
  enemyHp = 100,
}) {
  const PH = toUpper(phase, "MAIN");
  const ended = PH === "ENDED";
  const myTurn = !ended && toUpper(turnOwnerSide) === toUpper(viewerSide);

  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-[260px]">
        <button
          className="rounded-xl border border-white/15 bg-black/35 backdrop-blur p-2 hover:bg-white/5 transition shadow-[0_8px_30px_rgba(0,0,0,0.55)]"
          title="Voltar"
          onClick={onBack}
          type="button"
        >
          <X size={16} />
        </button>

        <div
          className="flex items-center gap-2 rounded-xl border border-white/12 bg-black/30 backdrop-blur px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          style={{ maxWidth: 720 }}
          title={hint}
        >
          <Sparkles size={14} className="text-cyan-200 shrink-0" />
          <span className="text-xs text-slate-200/80 font-mono truncate">{hint}</span>
        </div>
      </div>

      <div className="flex items-start gap-2">
        {/* ✅ Turn + HP */}
        <div className="rounded-xl border border-white/15 bg-black/35 backdrop-blur px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
          <div className="flex items-center justify-between gap-2">
            <div
              className={[
                "text-[10px] font-mono tracking-widest px-2 py-1 rounded-xl border",
                ended
                  ? "border-red-300/20 bg-red-500/10 text-red-100/80"
                  : myTurn
                  ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/80"
                  : "border-white/10 bg-white/5 text-slate-200/70",
              ].join(" ")}
              title={ended ? "Partida encerrada" : myTurn ? "Sua vez" : "Vez do bot"}
            >
              {ended ? "ENDED" : myTurn ? "YOUR TURN" : "ENEMY TURN"}
            </div>

            <div className="text-[10px] font-mono text-slate-200/55">{PH}</div>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-200/60">
                <HeartPulse size={12} className="text-emerald-300/80" />
                YOU
              </div>
              <div className="text-sm font-extrabold font-mono text-slate-100">{myHp}</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-200/60">
                <HeartPulse size={12} className="text-red-300/80" />
                BOT
              </div>
              <div className="text-sm font-extrabold font-mono text-slate-100">{enemyHp}</div>
            </div>
          </div>

          {matchId && (
            <div className="mt-2 text-[9px] font-mono text-slate-200/45">
              MATCH {String(matchId)}
            </div>
          )}
        </div>

        {/* TEMPO */}
        <div className="rounded-xl border border-white/15 bg-black/35 backdrop-blur px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.55)]">
          <div className="flex items-center gap-2 text-[10px] text-slate-200/70 font-mono">
            <Timer size={12} className="text-cyan-200" />
            TEMPO
          </div>
          <div className="font-extrabold text-lg font-mono tracking-wider">{formatTime(secondsLeft)}</div>
        </div>
      </div>
    </div>
  );
}
