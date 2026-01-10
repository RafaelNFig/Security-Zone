import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export default function BotSelectModal({ onClose, onChoose }) {
  const bots = useMemo(
    () => [
      { id: "b1", name: "Sentinela", deckName: "Defesa Perimetral", img: "/img/bots/bot1.png" },
      { id: "b2", name: "Specter", deckName: "Phishing & Shadows", img: "/img/bots/bot2.png" },
      { id: "b3", name: "Kernel", deckName: "Root Control", img: "/img/bots/bot3.png" },
    ],
    []
  );

  const emptySlots = useMemo(() => Array.from({ length: 3 }).map((_, i) => `empty-${i}`), []);

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
        className="relative w-full max-w-5xl max-h-[85vh]"
      >
        <div className="relative h-full rounded-[28px] border border-white/10 bg-[#070A10]/90 backdrop-blur shadow-[0_30px_160px_rgba(0,0,0,0.65)] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.10]"
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
                Escolha um NPC
              </div>
              <div className="mt-1 text-sm text-slate-200/70">
                Cards vazios = expansão futura.
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/7 transition flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          {/* ✅ área interna pode rolar se crescer no futuro (sem rolar a página) */}
          <div className="relative px-6 sm:px-8 py-6 overflow-y-auto h-[calc(85vh-88px)]">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {bots.map((bot) => (
                <BotCard key={bot.id} bot={bot} onChoose={onChoose} />
              ))}
              {emptySlots.map((id) => (
                <EmptyBotSlot key={id} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BotCard({ bot, onChoose }) {
  return (
    <motion.button
      onClick={() => onChoose(bot)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="text-left rounded-[22px] border border-white/10 bg-white/5 hover:bg-white/7 transition overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.55)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
        <div className="absolute inset-0 bg-[radial-gradient(400px_260px_at_30%_20%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(420px_260px_at_70%_80%,rgba(16,185,129,0.14),transparent_55%)]" />
        <img
          src={bot.img}
          alt={bot.name}
          onError={(e) => (e.currentTarget.style.display = "none")}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-[0.45em] text-slate-200/70">npc</div>
          <div className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.35)]" />
        </div>
      </div>

      <div className="px-4 py-4 border-t border-white/10 bg-black/20">
        <div className="text-sm font-extrabold text-slate-100 truncate">{bot.name}</div>
        <div className="mt-1 text-xs text-slate-200/70 truncate">
          Deck: <span className="text-cyan-200">{bot.deckName}</span>
        </div>
      </div>
    </motion.button>
  );
}

function EmptyBotSlot() {
  return (
    <div className="rounded-[22px] border border-dashed border-white/15 bg-white/3 overflow-hidden">
      <div className="aspect-[3/4] flex items-center justify-center text-slate-300/60">
        <div className="text-center">
          <div className="text-[11px] font-mono uppercase tracking-[0.45em]">slot</div>
          <div className="mt-1 text-sm font-semibold">Em breve</div>
        </div>
      </div>
      <div className="px-4 py-4 border-t border-white/10 bg-black/15">
        <div className="text-sm font-semibold text-slate-200/60">NPC ???</div>
        <div className="mt-1 text-xs text-slate-300/50">Deck: —</div>
      </div>
    </div>
  );
}
