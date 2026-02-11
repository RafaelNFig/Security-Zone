// src/pages/GameModeSelect/GameModeSelect.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Swords, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DeckPickerFooter from "./components/DeckPickerFooter";
import BotSelectModal from "./components/BotSelectModal";

// ✅ client oficial (/api relativo via Nginx)
import { apiRequest } from "@/services/api.js";
import { authUtils } from "@/utils/auth.js";

/** normaliza deck pro formato do footer */
function mapDeck(d) {
  return {
    id: String(d?.DECK_ID ?? d?.id ?? ""),
    name: d?.DECK_NAME ?? d?.name ?? "Deck",
    tag: d?.tag ?? (d?.DECK_IS_ACTIVE ? "Active" : "Deck"),
    cards: Number(d?.cardCount ?? d?.cards ?? 0),
    isActive: !!(d?.DECK_IS_ACTIVE ?? d?.isActive),
  };
}

const BOT_OPTIONS = [
  { id: "easy", name: "Easy Bot", subtitle: "Treino • iniciante" },
  { id: "normal", name: "Normal Bot", subtitle: "Treino • padrão" },
];

export default function GameModeSelect() {
  const navigate = useNavigate();

  const [decks, setDecks] = useState([]);
  const [selectedDeckId, setSelectedDeckId] = useState(null);

  const [showBotModal, setShowBotModal] = useState(false);

  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState(null);

  const selectedDeck = useMemo(
    () => decks.find((d) => String(d.id) === String(selectedDeckId)) || null,
    [decks, selectedDeckId]
  );

  // ✅ deck "válido" = existe id + tem cartas (>0)
  const isDeckValid = useMemo(() => {
    return !!(selectedDeck?.id && Number(selectedDeck?.cards || 0) > 0);
  }, [selectedDeck]);

  // ✅ playerId precisa existir (pra editar perfil / match etc.)
  const playerId = useMemo(() => {
    const p = authUtils.getPlayerData?.() || null;
    return p?.PL_ID ?? p?.id ?? p?.playerId ?? null;
  }, []);

  // ✅ carrega decks reais (gateway)
  useEffect(() => {
    const run = async () => {
      setLoadingDecks(true);
      setError(null);

      try {
        const res = await apiRequest("/decks", { method: "GET" });
        if (!res?.success) throw new Error(res?.error || "Erro ao buscar decks");

        const data = res.data;
        const list = data?.decks || data?.data?.decks || data?.data || data || [];
        const mapped = Array.isArray(list) ? list.map(mapDeck) : [];

        setDecks(mapped);

        // seleciona ativo primeiro, senão o primeiro
        const active = mapped.find((d) => d.isActive);
        setSelectedDeckId(active?.id ?? mapped[0]?.id ?? null);
      } catch (e) {
        setError(e?.message || "Erro ao buscar decks");
        setDecks([]);
        setSelectedDeckId(null);
      } finally {
        setLoadingDecks(false);
      }
    };

    run();
  }, []);

  const handlePickPvp = () => {
    setError("PvP ainda não implementado. Use VS Bots por enquanto.");
  };

  const handlePickBots = () => {
    // ✅ validações pedidas
    if (!playerId) {
      setError("Seu usuário ainda não carregou corretamente (playerId ausente). Faça login novamente.");
      return;
    }
    if (!isDeckValid) {
      setError("Selecione um deck válido (com cartas) antes de iniciar.");
      return;
    }
    setError(null);
    setShowBotModal(true);
  };

  const activateDeckIfNeeded = async (deckId) => {
    const deck = decks.find((d) => String(d.id) === String(deckId));
    if (deck?.isActive) return;

    const res = await apiRequest(`/decks/${encodeURIComponent(deckId)}/activate`, {
      method: "POST",
      body: JSON.stringify({}),
    });

    if (!res?.success) {
      throw new Error(res?.error || "Falha ao ativar o deck.");
    }

    // atualiza local (sem refetch)
    setDecks((prev) =>
      prev.map((d) => ({
        ...d,
        isActive: String(d.id) === String(deckId),
        tag: String(d.id) === String(deckId) ? "Active" : d.tag,
      }))
    );
  };

  /**
   * ✅ cria match BOT no endpoint correto: POST /matches
   * (mesmo padrão do teu App.jsx)
   */
  const createBotMatch = async ({ deckId, difficulty }) => {
    const payload = {
      mode: "vsBot",
      difficulty, // "easy" | "normal"
      deckId,
      playerId, // ajuda backend se ele precisar
    };

    const res = await apiRequest("/matches", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!res?.success) {
      throw new Error(res?.error || "Erro ao criar partida contra bot.");
    }

    const data = res.data || {};
    const matchId = data.matchId || data.id || data.match?.id;

    if (!matchId) {
      throw new Error("Resposta do backend não retornou matchId.");
    }

    return { matchId, data };
  };

  const handleBotChosen = async (bot) => {
    const difficulty = String(bot?.id || "").toLowerCase();
    const deckId = selectedDeckId;

    setShowBotModal(false);
    setError(null);

    if (!playerId) {
      setError("Seu usuário ainda não carregou corretamente (playerId ausente). Faça login novamente.");
      return;
    }
    if (!deckId || !isDeckValid) {
      setError("Selecione um deck válido (com cartas) antes de iniciar.");
      return;
    }
    if (!["easy", "normal"].includes(difficulty)) {
      setError("Bot inválido. Use easy ou normal.");
      return;
    }

    try {
      setLoadingAction(true);

      // ✅ 1) ativa deck selecionado
      await activateDeckIfNeeded(deckId);

      // ✅ 2) cria match BOT
      const { matchId, data } = await createBotMatch({ deckId, difficulty });

      // ✅ 3) redireciona para a partida
      navigate(`/battle/${encodeURIComponent(matchId)}`, {
        replace: true,
        state: {
          matchId,
          deckId,
          difficulty,
          mode: "vsBot",
          initialState: data?.state ?? null,
          initialEvents: data?.events ?? [],
        },
      });
    } catch (e) {
      setError(e?.message || "Erro ao iniciar partida contra bot");
    } finally {
      setLoadingAction(false);
    }
  };

  const uiDecks = useMemo(() => {
    if (!Array.isArray(decks)) return [];
    return decks.map((d) => ({
      id: d.id,
      name: d.name,
      tag: d.isActive ? "Active" : d.tag,
      cards: d.cards ?? 0,
    }));
  }, [decks]);

  return (
    <div className="relative h-screen overflow-hidden bg-[#070A10] text-slate-100 flex flex-col">
      <CyberBackground />
      <ScanBar />

      {/* Header */}
      <header className="relative z-20 shrink-0 mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 pt-4">
        <div className="flex items-center justify-between gap-3">
          {/* ✅ voltar determinístico */}
          <button
            onClick={() => navigate("/gamehome", { replace: true })}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/7 transition"
            disabled={loadingAction}
            title={loadingAction ? "Aguarde..." : "Voltar"}
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

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-hidden mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 pt-5 pb-2">
        <div className="relative h-full rounded-[28px] border border-white/10 bg-white/4 backdrop-blur shadow-[0_25px_120px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="relative h-[calc(100%-56px)]">
            <DiagonalBand
              side="left"
              title="PvP"
              subtitle="Jogador vs Jogador"
              hint="Ranked • Casual • Eventos"
              accent="cyan"
              icon={<Swords size={18} />}
              onClick={handlePickPvp}
              disabled={loadingDecks || loadingAction}
            />

            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="relative">
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
              hint={
                loadingAction
                  ? "Iniciando..."
                  : !playerId
                  ? "Faça login novamente"
                  : !isDeckValid
                  ? "Selecione um deck válido"
                  : "Escolha um NPC"
              }
              accent="emerald"
              icon={<Bot size={18} />}
              onClick={handlePickBots}
              disabled={loadingDecks || loadingAction || !isDeckValid || !playerId}
            />
          </div>

          {/* Barra inferior */}
          <div className="h-[56px] px-5 sm:px-7 flex items-center justify-between gap-3 border-t border-white/10 bg-black/20">
            <div className="text-sm text-slate-200/70 truncate">
              {loadingDecks ? (
                <span className="text-slate-100 font-semibold">Carregando decks...</span>
              ) : (
                <>
                  Deck selecionado:{" "}
                  <span className="text-slate-100 font-semibold">
                    {selectedDeck ? selectedDeck.name : "—"}
                  </span>
                  {selectedDeck?.isActive ? (
                    <span className="ml-2 text-[11px] font-mono text-emerald-200/80">ACTIVE</span>
                  ) : null}
                  {!loadingDecks && selectedDeck && !isDeckValid ? (
                    <span className="ml-2 text-[11px] font-mono text-red-200/80">INVALID</span>
                  ) : null}
                </>
              )}
            </div>

            <div className="hidden sm:block text-xs font-mono text-slate-300/60 whitespace-nowrap">
              &gt; escolha o modo • depois confirme
            </div>
          </div>
        </div>

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 backdrop-blur px-4 py-3 text-sm text-red-100"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer decks (reais do jogador) */}
      <DeckPickerFooter
        decks={uiDecks}
        selectedDeckId={selectedDeckId}
        onSelect={(id) => {
          if (loadingAction) return;
          setSelectedDeckId(id);
          setError(null);
        }}
      />

      {/* Modal Bots */}
      <AnimatePresence>
        {showBotModal && (
          <BotSelectModal
            bots={BOT_OPTIONS}
            onClose={() => setShowBotModal(false)}
            onChoose={handleBotChosen}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------ UI ------------------ */

function DiagonalBand({ side, title, subtitle, hint, icon, accent, onClick, disabled }) {
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
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        "absolute top-0 bottom-0 w-[60%] sm:w-[58%] md:w-[55%]",
        isLeft ? "-left-[12%] sm:-left-[10%]" : "-right-[12%] sm:-right-[10%]",
        "skew-x-[-14deg] md:skew-x-[-16deg]",
        "rounded-[28px] overflow-hidden",
        "border bg-black/25 backdrop-blur transition",
        accentBorder,
        disabled ? "opacity-60 cursor-not-allowed" : "hover:brightness-110",
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
