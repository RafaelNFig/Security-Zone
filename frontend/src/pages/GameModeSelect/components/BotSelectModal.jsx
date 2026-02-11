import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function BotSelectModal({ onClose, onChoose, bots: botsProp }) {
  // ✅ default: apenas 2 dificuldades suportadas (easy | normal)
  const defaultBots = useMemo(
    () => [
      {
        id: "easy",
        name: "BOT EASY",
        deckName: "Treino Básico",
        img: "/img/bots/bot-easy.png",
        badge: "easy",
        desc: "Joga simples e prioriza jogadas seguras.",
      },
      {
        id: "normal",
        name: "BOT NORMAL",
        deckName: "Treino Avançado",
        img: "/img/bots/bot-normal.png",
        badge: "normal",
        desc: "Joga melhor e pune erros com mais frequência.",
      },
    ],
    []
  );

  // ✅ usa o que vier do pai (se vier), senão usa o default
  const bots = Array.isArray(botsProp) && botsProp.length ? botsProp : defaultBots;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        className="relative w-full max-w-4xl"
      >
        <div className="relative rounded-[28px] border border-white/10 bg-[#070A10]/90 backdrop-blur shadow-[0_30px_160px_rgba(0,0,0,0.65)] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.10]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "54px 54px",
            }}
          />

          <div className="relative px-6 sm:px-8 py-5 flex items-start justify-between gap-4 border-b border-white/10">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                vs bots
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-extrabold">
                Escolha a Dificuldade
              </div>
              <div className="mt-1 text-sm text-slate-200/70">
                Selecione <span className="text-emerald-200 font-semibold">easy</span> ou{" "}
                <span className="text-cyan-200 font-semibold">normal</span>.
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/7 transition flex items-center justify-center"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="relative px-6 sm:px-8 py-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {bots.map((bot) => (
                <BotCard key={bot.id} bot={bot} onChoose={onChoose} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BotCard({ bot, onChoose }) {
  const isEasy = bot.id === "easy";

  const badgeCls = isEasy
    ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-200"
    : "border-cyan-300/25 bg-cyan-500/10 text-cyan-200";

  const dotCls = isEasy
    ? "bg-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.35)]"
    : "bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]";

  return (
    <motion.button
      onClick={() => onChoose(bot)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="text-left rounded-[22px] border border-white/10 bg-white/5 hover:bg-white/7 transition overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.55)]"
      title={`Selecionar ${bot.id}`}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
        <div className="absolute inset-0 bg-[radial-gradient(520px_300px_at_30%_20%,rgba(34,211,238,0.16),transparent_55%),radial-gradient(520px_300px_at_70%_80%,rgba(16,185,129,0.12),transparent_55%)]" />

        <img
          src={bot.img}
          alt={bot.name}
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-slate-200/70">
            npc
          </div>
          <div className={`h-2 w-2 rounded-full ${dotCls}`} />
        </div>

        <div className="absolute bottom-3 left-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl border ${badgeCls}`}>
            <span className="text-[10px] font-mono uppercase tracking-[0.45em]">
              {bot.badge ?? bot.id}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-t border-white/10 bg-black/20">
        <div className="text-sm font-extrabold text-slate-100 truncate">{bot.name}</div>

        {bot.deckName && (
          <div className="mt-1 text-xs text-slate-200/70 truncate">
            Deck:{" "}
            <span className={isEasy ? "text-emerald-200" : "text-cyan-200"}>
              {bot.deckName}
            </span>
          </div>
        )}

        {bot.desc && <div className="mt-2 text-xs text-slate-200/60">{bot.desc}</div>}
      </div>
    </motion.button>
  );
}
