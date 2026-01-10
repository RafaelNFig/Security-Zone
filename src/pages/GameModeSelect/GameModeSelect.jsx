import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Swords, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DeckPickerFooter from "./components/DeckPickerFooter";
import BotSelectModal from "./components/BotSelectModal";

export default function GameModeSelect() {
  const navigate = useNavigate();

  // ✅ FRONT ONLY (mock) — TODO BACKEND: trocar por fetch dos decks do jogador
  const decks = useMemo(
    () => [
      { id: "d1", name: "Deck Inicial", tag: "Balanced", cards: 20 },
      { id: "d2", name: "Firewall Rush", tag: "Aggro", cards: 20 },
      { id: "d3", name: "Crypto Control", tag: "Control", cards: 20 },
    ],
    []
  );

  const [selectedDeckId, setSelectedDeckId] = useState(decks[0]?.id ?? null);
  const [showBotModal, setShowBotModal] = useState(false);

  const selectedDeck = decks.find((d) => d.id === selectedDeckId);

  const handlePickPvp = () => {
    console.log("PvP com deck:", selectedDeckId);
    // TODO BACKEND: iniciar matchmaking PvP com { deckId: selectedDeckId }
  };

  const handlePickBots = () => {
    setShowBotModal(true);
  };

  const handleBotChosen = (bot) => {
    setShowBotModal(false);
    console.log("VS Bot:", bot.id, "Deck player:", selectedDeckId);
    // TODO BACKEND: iniciar partida contra bot com { deckId: selectedDeckId, botId: bot.id }
  };

  return (
    // ✅ Tela 100% fixa, sem scroll
    <div className="relative h-screen overflow-hidden bg-[#070A10] text-slate-100 flex flex-col">
      <CyberBackground />
      <ScanBar />

      {/* Header fixo (não empurra layout pra scroll) */}
      <header className="relative z-20 shrink-0 mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/7 transition"
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-semibold">Voltar</span>
          </button>

          <div className="text-right">
            <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
              game mode
            </div>
            <div className="text-lg sm:text-xl font-extrabold">Selecione o Modo</div>
          </div>
        </div>
      </header>

      {/* Main ocupa o resto da tela e NÃO rola */}
      <main className="relative z-10 flex-1 overflow-hidden mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 pt-5 pb-2">
        <div className="relative h-full rounded-[28px] border border-white/10 bg-white/4 backdrop-blur shadow-[0_25px_120px_rgba(0,0,0,0.55)] overflow-hidden">
          {/* Área das faixas ocupa tudo menos a barra inferior de info */}
          <div className="relative h-[calc(100%-56px)]">
            <DiagonalBand
              side="left"
              title="PvP"
              subtitle="Jogador vs Jogador"
              hint="Ranked • Casual • Eventos"
              accent="cyan"
              icon={<Swords size={18} />}
              onClick={handlePickPvp}
            />

            {/* VS no centro */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative"
              >
                <div className="absolute -inset-10 rounded-full bg-cyan-300/10 blur-2xl" />
                <div className="relative rounded-3xl border border-white/10 bg-black/25 px-7 py-5 backdrop-blur">
                  <div className="text-[12px] font-mono uppercase tracking-[0.45em] text-slate-300/70 text-center">
                    versus
                  </div>
                  <div className="mt-1 text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-100">
                    VS
                  </div>
                </div>
              </motion.div>
            </div>

            <DiagonalBand
              side="right"
              title="VS. Bots"
              subtitle="Treino / Campanha"
              hint="Escolha um NPC"
              accent="emerald"
              icon={<Bot size={18} />}
              onClick={handlePickBots}
            />
          </div>

          {/* Barra inferior (fixa dentro do card) */}
          <div className="h-[56px] px-5 sm:px-7 flex items-center justify-between gap-3 border-t border-white/10 bg-black/20">
            <div className="text-sm text-slate-200/70 truncate">
              Deck selecionado:{" "}
              <span className="text-slate-100 font-semibold">
                {selectedDeck ? selectedDeck.name : "—"}
              </span>
            </div>

            <div className="hidden sm:block text-xs font-mono text-slate-300/60 whitespace-nowrap">
              &gt; escolha o modo • depois confirme
            </div>
          </div>
        </div>
      </main>

      {/* ✅ Footer menor (fixo) */}
      <DeckPickerFooter
        decks={decks}
        selectedDeckId={selectedDeckId}
        onSelect={setSelectedDeckId}
      />

      {/* Modal Bots */}
      <AnimatePresence>
        {showBotModal && (
          <BotSelectModal
            onClose={() => setShowBotModal(false)}
            onChoose={handleBotChosen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------ UI ------------------ */

function DiagonalBand({ side, title, subtitle, hint, icon, accent, onClick }) {
  const isLeft = side === "left";

  const accentGlow =
    accent === "cyan"
      ? "from-cyan-400/25 via-cyan-300/10 to-transparent"
      : "from-emerald-400/25 via-emerald-300/10 to-transparent";

  const accentBorder =
    accent === "cyan" ? "border-cyan-300/20" : "border-emerald-300/20";

  const accentText =
    accent === "cyan" ? "text-cyan-200" : "text-emerald-200";

  return (
    <button
      onClick={onClick}
      className={[
        "absolute top-0 bottom-0 w-[60%] sm:w-[58%] md:w-[55%]",
        isLeft ? "-left-[12%] sm:-left-[10%]" : "-right-[12%] sm:-right-[10%]",
        "skew-x-[-14deg] md:skew-x-[-16deg]",
        "rounded-[28px] overflow-hidden",
        "border bg-black/25 backdrop-blur transition",
        accentBorder,
        "hover:brightness-110",
        "focus:outline-none",
      ].join(" ")}
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${accentGlow}`} />

      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      <div className={`relative h-full w-full flex items-center ${isLeft ? "justify-end" : "justify-start"}`}>
        <div
          className={[
            "w-[72%] sm:w-[68%] md:w-[60%]",
            isLeft ? "pr-6 sm:pr-10 md:pr-12 text-right" : "pl-6 sm:pl-10 md:pl-12 text-left",
            "skew-x-[14deg] md:skew-x-[16deg]",
          ].join(" ")}
        >
          <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/70">
            <span className={`inline-flex items-center justify-center h-7 w-7 rounded-xl border border-white/10 bg-white/5 ${accentText}`}>
              {icon}
            </span>
            mode
          </div>

          <div className="mt-3 text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className={accentText}>{title}</span>
          </div>

          <div className="mt-2 text-sm text-slate-200/70">{subtitle}</div>

          <div className="mt-4 text-xs font-mono text-slate-300/60">
            &gt; {hint}
          </div>

          <div className="mt-6 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
            click to enter
          </div>
        </div>
      </div>

      <CornerBrackets />
    </button>
  );
}

function CornerBrackets() {
  const b = "border-white/15";
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className={`absolute left-4 top-4 h-3 w-3 border-l border-t ${b}`} />
      <span className={`absolute right-4 top-4 h-3 w-3 border-r border-t ${b}`} />
      <span className={`absolute left-4 bottom-4 h-3 w-3 border-l border-b ${b}`} />
      <span className={`absolute right-4 bottom-4 h-3 w-3 border-r border-b ${b}`} />
    </div>
  );
}

function ScanBar() {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 right-0 h-10 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent blur-[0.5px]"
      animate={{ y: ["-10%", "110%"] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

function CyberBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(800px_520px_at_15%_30%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(760px_520px_at_85%_60%,rgba(168,85,247,0.10),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(34,211,238,0.10) 1px, transparent 1px), linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px)",
          backgroundSize: "120px 60px",
          maskImage: "radial-gradient(70% 60% at 50% 35%, black 45%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 35%, black 45%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_120%,rgba(0,0,0,0.92),transparent_58%)]" />
    </div>
  );
}
