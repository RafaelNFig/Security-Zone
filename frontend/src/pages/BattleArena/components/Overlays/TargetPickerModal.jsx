// src/pages/BattleArena/components/Overlays/TargetPickerModal.jsx
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { X, Swords, Sparkles, Target, Shield } from "lucide-react";

function toUpper(v, fb = "") {
  return String(v ?? fb).trim().toUpperCase();
}

/**
 * TargetPickerModal (UNIFICADO)
 * - 1 modal que resolve:
 *   (1) selecionar "tipo de ação" (ATAQUE ou HABILIDADE)  [opcional]
 *   (2) selecionar variação A/B (ou lista)                [opcional]
 *   (3) selecionar alvo (SELF/ENEMY + slot 0..2)          [opcional]
 *
 * ✅ Compatível com o uso antigo:
 * - se receber props.mode === "PICK_SLOT", ele só faz seleção de alvo/slot e chama onPick({side,slot})
 *
 * Props principais:
 * - title?: string
 * - subtitle?: string
 * - onClose?: fn
 * - onCancel?: fn (alias)
 *
 * Back-compat (modo antigo):
 * - mode: "PICK_SLOT"
 * - allowEnemy?: boolean
 * - allowSelf?: boolean
 * - defaultSide?: "SELF"|"ENEMY"
 * - onPick?: ({side,slot})=>void
 *
 * Novo fluxo unificado (recomendado):
 * - flow?: {
 *     pickAction?: boolean, // mostra ATAQUE/HABILIDADE
 *     actionOptions?: [{ key:"ATTACK"|"ABILITY"|string, label, icon? }]
 *     pickChoice?: boolean,
 *     choices?: [{ key:string, label:string, hint?:string }]
 *     pickTarget?: boolean,
 *     allowEnemy?: boolean,
 *     allowSelf?: boolean,
 *     defaultSide?: "SELF"|"ENEMY",
 *     slotAvailability?: {
 *       SELF?: [bool,bool,bool],
 *       ENEMY?: [bool,bool,bool]
 *     }, // se não vier, assume todos true
 *   }
 * - onConfirm?: ({ actionKey, choiceKey, side, slot })=>void
 */
export default function TargetPickerModal(props) {
  const {
    title = "Selecionar alvo",
    subtitle = "",
    onClose,
    onCancel,

    // back-compat
    mode = null,
    allowEnemy: allowEnemyLegacy,
    allowSelf: allowSelfLegacy,
    defaultSide: defaultSideLegacy = "ENEMY",
    onPick,

    // novo
    flow,
    onConfirm,
  } = props;

  const isLegacyPickSlot = toUpper(mode, "") === "PICK_SLOT";

  const allowEnemy = Boolean(
    isLegacyPickSlot ? allowEnemyLegacy : flow?.allowEnemy ?? true
  );
  const allowSelf = Boolean(
    isLegacyPickSlot ? allowSelfLegacy : flow?.allowSelf ?? true
  );

  const defaultSide = toUpper(
    isLegacyPickSlot ? defaultSideLegacy : flow?.defaultSide ?? "ENEMY",
    "ENEMY"
  );

  const actionOptions =
    flow?.actionOptions && Array.isArray(flow.actionOptions) && flow.actionOptions.length
      ? flow.actionOptions
      : [
          { key: "ATTACK", label: "Ataque", icon: "SWORDS" },
          { key: "ABILITY", label: "Habilidade", icon: "SPARKLES" },
        ];

  const choices = Array.isArray(flow?.choices) ? flow.choices : [];

  const wantsPickAction = Boolean(flow?.pickAction) && !isLegacyPickSlot;
  const wantsPickChoice = Boolean(flow?.pickChoice) && !isLegacyPickSlot && choices.length > 0;
  const wantsPickTarget =
    isLegacyPickSlot ? true : Boolean(flow?.pickTarget ?? true);

  const [step, setStep] = useState(() => {
    if (isLegacyPickSlot) return "TARGET";
    if (wantsPickAction) return "ACTION";
    if (wantsPickChoice) return "CHOICE";
    if (wantsPickTarget) return "TARGET";
    return "DONE";
  });

  const [actionKey, setActionKey] = useState(null);
  const [choiceKey, setChoiceKey] = useState(null);
  const [side, setSide] = useState(() => {
    if (defaultSide === "SELF" && allowSelf) return "SELF";
    if (defaultSide === "ENEMY" && allowEnemy) return "ENEMY";
    return allowEnemy ? "ENEMY" : "SELF";
  });

  const slotAvailability = useMemo(() => {
    const fallback = {
      SELF: [true, true, true],
      ENEMY: [true, true, true],
    };
    if (isLegacyPickSlot) return fallback;

    const sa = flow?.slotAvailability;
    const norm = {
      SELF: Array.isArray(sa?.SELF) ? sa.SELF.slice(0, 3) : fallback.SELF,
      ENEMY: Array.isArray(sa?.ENEMY) ? sa.ENEMY.slice(0, 3) : fallback.ENEMY,
    };
    while (norm.SELF.length < 3) norm.SELF.push(true);
    while (norm.ENEMY.length < 3) norm.ENEMY.push(true);
    return norm;
  }, [flow, isLegacyPickSlot]);

  function close() {
    if (typeof onClose === "function") return onClose();
    if (typeof onCancel === "function") return onCancel();
  }

  function goNextFromAction(k) {
    setActionKey(k);
    if (wantsPickChoice) setStep("CHOICE");
    else if (wantsPickTarget) setStep("TARGET");
    else setStep("DONE");
  }

  function goNextFromChoice(k) {
    setChoiceKey(k);
    if (wantsPickTarget) setStep("TARGET");
    else setStep("DONE");
  }

  function finishPick(targetSlot) {
    const payload = { side, slot: targetSlot };

    if (isLegacyPickSlot) {
      onPick?.(payload);
      close();
      return;
    }

    onConfirm?.({
      actionKey,
      choiceKey,
      side,
      slot: targetSlot,
    });
    close();
  }

  const canToggleSide = (allowEnemy && allowSelf) && wantsPickTarget;
  const canShowEnemy = allowEnemy && wantsPickTarget;
  const canShowSelf = allowSelf && wantsPickTarget;

  return (
    <div className="absolute inset-0 z-[90] flex items-center justify-center p-4">
      {/* backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />

      <motion.div
        className="relative w-full max-w-[720px] rounded-3xl border border-white/12 bg-black/60 backdrop-blur shadow-[0_24px_120px_rgba(0,0,0,0.85)] overflow-hidden"
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.985 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        {/* header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold tracking-wide text-slate-100">{title}</div>
            {subtitle ? (
              <div className="mt-1 text-xs font-mono text-slate-200/65">{subtitle}</div>
            ) : null}

            {!isLegacyPickSlot && (
              <div className="mt-2 text-[10px] font-mono text-slate-200/55">
                {step === "ACTION" && "Passo 1: escolha ATAQUE ou HABILIDADE"}
                {step === "CHOICE" && "Passo 2: escolha a variação (A/B)"}
                {step === "TARGET" && "Passo 3: escolha o alvo (lado e slot)"}
              </div>
            )}
          </div>

          <button
            onClick={close}
            className="shrink-0 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 transition p-2"
            title="Fechar"
          >
            <X size={16} className="text-slate-200/80" />
          </button>
        </div>

        {/* content */}
        <div className="p-5">
          {/* STEP: ACTION */}
          {step === "ACTION" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {actionOptions.map((opt) => {
                const k = String(opt.key ?? "");
                const active = actionKey === k;

                const Icon =
                  opt.icon === "SWORDS" ? Swords : opt.icon === "SPARKLES" ? Sparkles : Target;

                return (
                  <button
                    key={k}
                    onClick={() => goNextFromAction(k)}
                    className={[
                      "text-left rounded-2xl border px-4 py-4 transition backdrop-blur",
                      active
                        ? "border-emerald-300/30 bg-emerald-400/10"
                        : "border-white/12 bg-white/5 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "w-10 h-10 rounded-xl border flex items-center justify-center",
                          active ? "border-emerald-300/30 bg-emerald-500/10" : "border-white/12 bg-black/30",
                        ].join(" ")}
                      >
                        <Icon size={18} className={active ? "text-emerald-200" : "text-cyan-200"} />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-100">{opt.label ?? k}</div>
                        <div className="text-[10px] font-mono text-slate-200/60">
                          {k === "ATTACK" ? "Ataque padrão (sem custo extra)" : "Ativar habilidade (consome energia/limites)"}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP: CHOICE (A/B) */}
          {step === "CHOICE" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {choices.map((c) => {
                const k = String(c.key ?? "");
                const active = choiceKey === k;

                return (
                  <button
                    key={k}
                    onClick={() => goNextFromChoice(k)}
                    className={[
                      "text-left rounded-2xl border px-4 py-4 transition backdrop-blur",
                      active
                        ? "border-cyan-300/30 bg-cyan-400/10"
                        : "border-white/12 bg-white/5 hover:bg-white/8",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          "w-10 h-10 rounded-xl border flex items-center justify-center",
                          active ? "border-cyan-300/30 bg-cyan-500/10" : "border-white/12 bg-black/30",
                        ].join(" ")}
                      >
                        <Shield size={18} className={active ? "text-cyan-200" : "text-slate-200/70"} />
                      </div>
                      <div>
                        <div className="text-sm font-extrabold text-slate-100">{c.label ?? k}</div>
                        {c.hint ? (
                          <div className="text-[10px] font-mono text-slate-200/60">{c.hint}</div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-200/60">Selecionar variação</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP: TARGET */}
          {step === "TARGET" && (
            <div className="space-y-4">
              {/* side toggle */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs font-mono text-slate-200/70">
                  Lado do alvo:
                </div>

                <div className="flex items-center gap-2">
                  {canShowEnemy && (
                    <button
                      onClick={() => setSide("ENEMY")}
                      disabled={!allowEnemy}
                      className={[
                        "px-3 py-2 rounded-xl border text-xs font-mono transition",
                        side === "ENEMY"
                          ? "border-red-300/30 bg-red-500/10 text-red-100"
                          : "border-white/12 bg-white/5 text-slate-200/70 hover:bg-white/8",
                        !canToggleSide && "opacity-70 cursor-default",
                      ].join(" ")}
                      title="Selecionar oponente"
                    >
                      ENEMY
                    </button>
                  )}

                  {canShowSelf && (
                    <button
                      onClick={() => setSide("SELF")}
                      disabled={!allowSelf}
                      className={[
                        "px-3 py-2 rounded-xl border text-xs font-mono transition",
                        side === "SELF"
                          ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                          : "border-white/12 bg-white/5 text-slate-200/70 hover:bg-white/8",
                        !canToggleSide && "opacity-70 cursor-default",
                      ].join(" ")}
                      title="Selecionar você"
                    >
                      SELF
                    </button>
                  )}
                </div>
              </div>

              {/* slots */}
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slot) => {
                  const ok = Boolean((slotAvailability?.[side] ?? [true, true, true])[slot]);
                  return (
                    <button
                      key={slot}
                      onClick={() => ok && finishPick(slot)}
                      disabled={!ok}
                      className={[
                        "rounded-2xl border px-4 py-4 text-left transition backdrop-blur",
                        ok
                          ? "border-white/12 bg-white/5 hover:bg-white/8"
                          : "border-white/8 bg-black/30 opacity-50 cursor-not-allowed",
                      ].join(" ")}
                      title={ok ? `Selecionar slot ${slot}` : "Slot inválido"}
                    >
                      <div className="text-[10px] font-mono text-slate-200/60">SLOT</div>
                      <div className="mt-1 text-lg font-extrabold text-slate-100">{slot}</div>
                      <div className="mt-1 text-[10px] font-mono text-slate-200/55">
                        {side === "ENEMY" ? "Alvo inimigo" : "Alvo aliado"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {!allowEnemy && !allowSelf && (
                <div className="text-xs font-mono text-red-100">
                  Nenhum lado habilitado para seleção de alvo.
                </div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-4 border-t border-white/10 flex items-center justify-between gap-3">
          <button
            onClick={close}
            className="px-3 py-2 rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 transition text-xs font-mono text-slate-200/80"
          >
            Cancelar
          </button>

          {!isLegacyPickSlot && (
            <div className="text-[10px] font-mono text-slate-200/50 text-right">
              {actionKey ? `Ação: ${actionKey}` : "Ação: -"}{" "}
              {wantsPickChoice ? `• Choice: ${choiceKey ?? "-"}` : ""}
              {wantsPickTarget ? ` • Target: ${side}` : ""}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
