// src/pages/GameModeSelect/components/DeckPickerFooter.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Layers, RefreshCw, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/services/api.js";

function normalizeDeck(d) {
  const id = d?.DECK_ID ?? d?.id ?? d?.deckId ?? null;
  const name = d?.DECK_NAME ?? d?.name ?? "Deck";
  const isActive = Boolean(d?.DECK_IS_ACTIVE ?? d?.isActive ?? false);

  const tag = d?.tag ?? d?.DECK_TAG ?? "";
  const cards =
    d?.cards ??
    d?.cardCount ??
    d?._count?.cardsInDeck ??
    d?.cardsInDeckCount ??
    d?.count ??
    null;

  return { id, name, isActive, tag, cards, raw: d };
}

export default function DeckPickerFooter({ decks: decksProp, selectedDeckId, onSelect }) {
  const hasPropDecks = Array.isArray(decksProp) && decksProp.length > 0;

  const [loading, setLoading] = useState(!hasPropDecks);
  const [error, setError] = useState(null);
  const [decksRemote, setDecksRemote] = useState([]);

  const decks = useMemo(() => {
    const base = hasPropDecks ? decksProp : decksRemote;
    return (base || []).map(normalizeDeck).filter((d) => d.id != null);
  }, [hasPropDecks, decksProp, decksRemote]);

  // Se não veio por props, busca do backend
  const fetchDecks = async () => {
    setLoading(true);
    setError(null);

    const res = await apiRequest("/decks", { method: "GET" });
    if (!res?.success) {
      setError(res?.error || "Erro ao carregar decks");
      setDecksRemote([]);
      setLoading(false);
      return;
    }

    // ✅ aceita: {decks:[...]}, {data:{decks:[...]}}, {data:[...]}, ou [...]
    const data = res.data;
    const list =
      data?.decks ||
      data?.data?.decks ||
      data?.data ||
      data ||
      [];

    setDecksRemote(Array.isArray(list) ? list : []);
    setLoading(false);
  };

  useEffect(() => {
    if (!hasPropDecks) fetchDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPropDecks]);

  // Auto-seleciona deck ativo (apenas se ainda não tiver seleção)
  useEffect(() => {
    if (!onSelect) return;
    if (selectedDeckId != null) return;
    if (!decks || decks.length === 0) return;

    const active = decks.find((d) => d.isActive) || decks[0];
    if (active?.id != null) onSelect(active.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decks, selectedDeckId]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 pb-2">
        <div className="relative rounded-2xl border border-white/10 bg-black/35 backdrop-blur shadow-[0_20px_80px_rgba(0,0,0,0.6)] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "52px 52px",
            }}
          />

          <div className="relative px-4 sm:px-5 py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                <span className="inline-flex items-center justify-center h-7 w-7 rounded-xl bg-white/5 border border-white/10 text-cyan-200">
                  <Layers size={16} />
                </span>
                deck
              </div>

              <div className="flex items-center gap-2">
                {!hasPropDecks && (
                  <button
                    onClick={fetchDecks}
                    className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-300/70 hover:text-slate-100 transition"
                    title="Recarregar decks"
                    type="button"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                    reload
                  </button>
                )}

                <div className="text-[11px] text-slate-300/60 font-mono">{decks.length} decks</div>
              </div>
            </div>

            {loading && (
              <div className="mt-2 text-xs text-slate-200/60 font-mono">carregando decks...</div>
            )}

            {error && !loading && (
              <div className="mt-2 flex items-center gap-2 text-xs font-mono text-red-200/80">
                <AlertTriangle size={14} />
                {error}
              </div>
            )}

            {!loading && !error && decks.length === 0 && (
              <div className="mt-2 text-xs text-slate-200/60 font-mono">
                nenhum deck encontrado (crie um deck e marque como ativo)
              </div>
            )}

            <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
              {decks.map((d) => {
                const active = String(d.id) === String(selectedDeckId);
                return (
                  <motion.button
                    key={d.id}
                    onClick={() => onSelect?.(d.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={[
                      "shrink-0 w-[170px] sm:w-[190px] rounded-xl p-3 border text-left transition",
                      active
                        ? "bg-cyan-400/10 border-cyan-300/25 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
                        : "bg-white/5 border-white/10 hover:bg-white/7",
                    ].join(" ")}
                    type="button"
                    title={d.isActive ? "Deck ativo" : "Selecionar deck"}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-extrabold text-slate-100 truncate">{d.name}</div>
                      {d.isActive && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-emerald-300/20 bg-emerald-500/10 text-emerald-200">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-0.5 text-xs text-slate-200/70 truncate">
                      {d.tag ? `${d.tag} • ` : ""}
                      {d.cards ?? "??"} cartas
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
