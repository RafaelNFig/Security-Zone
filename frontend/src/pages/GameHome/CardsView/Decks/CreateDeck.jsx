import React, { useMemo, useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, PlusCircle, CheckCircle, AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

// ✅ usa o client do front (Nginx: /api -> gateway-api)
import { apiRequest } from "@/services/api.js";
import { authUtils } from "@/utils/auth.js";

const DEFAULT_DECK_MAX = 20;
const DEFAULT_DECK_MIN = 5;

export default function CreateDeck({ onBack = () => {}, onCreate = () => {} }) {
  const navigate = useNavigate();

  // 🔵 Estados principais
  const [deckName, setDeckName] = useState("");
  const [selectedCards, setSelectedCards] = useState([]); // Array de card IDs (com repetições)
  const [showSuccess, setShowSuccess] = useState(false);

  // 🔵 Estados para API
  const [availableCards, setAvailableCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  // 🔵 Estados de filtro e busca
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ playerId real do usuário logado
  const playerId = useMemo(() => {
    const p = authUtils.getPlayerData?.() || null;
    return p?.PL_ID ?? p?.id ?? p?.playerId ?? null;
  }, []);

  // ---------- helpers: compatível com o formato do backend ----------
  function getCardId(card) {
    return card?.id ?? card?.cardId ?? card?.CD_ID ?? null;
  }

  function getMaxInDeck(card) {
    const v = card?.maxInDeck ?? card?.CD_MAX_IN_DECK ?? 3;
    return Number.isFinite(Number(v)) ? Number(v) : 3;
  }

  function normalizeType(t) {
    const v = String(t || "").toLowerCase();
    if (v === "ataque" || v === "defesa" || v === "magia") return v;
    return v;
  }

  function safeStr(v) {
    return String(v ?? "");
  }

  // ✅ Botão X: volta pro GameHome (rota oficial)
  const handleCloseToHome = useCallback(() => {
    navigate("/gamehome", { replace: true });
  }, [navigate]);

  // 🔵 Buscar cartas do jogador (via gateway /api)
  useEffect(() => {
    const fetchPlayerCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (!playerId) {
          throw new Error("playerId ausente. Faça login novamente.");
        }

        const res = await apiRequest(`/player/${encodeURIComponent(playerId)}/cards`, {
          method: "GET",
        });

        if (!res?.success) {
          throw new Error(res?.error || "Erro ao carregar cartas");
        }

        const data = res.data;

        // aceita formatos comuns:
        // { success:true, cards:[...] }
        // { cards:[...] }
        // { data:{cards:[...]} }
        const list = data?.cards || data?.data?.cards || [];
        if (Array.isArray(list)) {
          setAvailableCards(list);
        } else if (data?.success && Array.isArray(data?.cards)) {
          setAvailableCards(data.cards);
        } else {
          setAvailableCards([]);
        }
      } catch (err) {
        setError(err?.message || "Erro ao buscar cartas");
        console.error("❌ Erro ao buscar cartas:", err);
        setAvailableCards([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerCards();
  }, [playerId]);

  // 🔵 Contar quantas cópias de cada carta estão selecionadas
  const getCardCount = (cardId) => selectedCards.filter((id) => id === cardId).length;

  // 🔵 Adicionar carta ao deck
  const addCard = (card) => {
    const cardId = getCardId(card);
    if (cardId == null) {
      alert("Carta inválida: sem id.");
      return;
    }

    const cardCount = getCardCount(cardId);
    const maxInDeck = getMaxInDeck(card);

    if (cardCount >= maxInDeck) {
      alert(`Limite máximo de ${maxInDeck} cópias de "${card.name}" por deck`);
      return;
    }

    if (selectedCards.length >= DEFAULT_DECK_MAX) {
      alert(`Limite máximo de ${DEFAULT_DECK_MAX} cartas no deck atingido`);
      return;
    }

    setSelectedCards((prev) => [...prev, cardId]);
  };

  // 🔵 Remover uma cópia específica de carta
  const removeCardCopy = (cardId) => {
    const index = selectedCards.findIndex((id) => id === cardId);
    if (index !== -1) {
      const newSelectedCards = [...selectedCards];
      newSelectedCards.splice(index, 1);
      setSelectedCards(newSelectedCards);
    }
  };

  // 🔵 Remover todas as cópias de uma carta
  const removeAllCopies = (cardId) => {
    setSelectedCards((prev) => prev.filter((id) => id !== cardId));
  };

  // 🔵 Agrupar cartas selecionadas para exibição
  const groupedSelectedCards = useMemo(() => {
    return selectedCards.reduce((acc, cardId) => {
      const card = availableCards.find((c) => getCardId(c) === cardId);
      if (!card) return acc;

      if (!acc[cardId]) {
        acc[cardId] = {
          id: cardId,
          name: card.name,
          type: normalizeType(card.type),
          count: 0,
          maxInDeck: getMaxInDeck(card),
        };
      }
      acc[cardId].count++;
      return acc;
    }, {});
  }, [selectedCards, availableCards]);

  // 🔵 Filtrar cartas disponíveis
  const filteredCards = useMemo(() => {
    return availableCards.filter((card) => {
      const cardType = normalizeType(card.type);
      const matchesType = typeFilter === "all" || cardType === typeFilter;

      const haystack = `${safeStr(card.name)} ${safeStr(card.description)}`.toLowerCase();
      const matchesSearch = haystack.includes(String(searchTerm || "").toLowerCase());

      return matchesType && matchesSearch;
    });
  }, [availableCards, typeFilter, searchTerm]);

  // 🔵 Criar deck na API
  const handleCreateDeck = async () => {
    if (!playerId) {
      alert("playerId ausente. Refaça login.");
      return;
    }

    if (deckName.trim().length < 2) {
      alert("Digite um nome válido para o deck (mínimo 2 caracteres).");
      return;
    }
    if (selectedCards.length < DEFAULT_DECK_MIN) {
      alert(`O deck deve ter no mínimo ${DEFAULT_DECK_MIN} cartas.`);
      return;
    }
    if (selectedCards.length > DEFAULT_DECK_MAX) {
      alert(`O deck deve ter no máximo ${DEFAULT_DECK_MAX} cartas.`);
      return;
    }

    setIsCreating(true);

    try {
      const res = await apiRequest(`/player/${encodeURIComponent(playerId)}/decks`, {
        method: "POST",
        body: JSON.stringify({
          name: deckName,
          cardIds: selectedCards,
        }),
      });

      if (!res?.success) {
        throw new Error(res?.error || "Falha ao criar deck");
      }

      const data = res.data || {};

      // tenta pegar deckId de formatos diferentes
      const deckId = data?.deckId ?? data?.id ?? data?.deck?.id ?? data?.data?.deckId ?? null;

      setShowSuccess(true);

      if (typeof onCreate === "function") {
        onCreate({
          id: String(deckId ?? ""),
          deckId: deckId ?? null,
          name: deckName,
          cards: selectedCards.length,
          totalCards: selectedCards.length,
          maxCards: DEFAULT_DECK_MAX,
        });
      }

      // volta para decks com um pequeno delay só pra mostrar o sucesso
      setTimeout(() => {
        setDeckName("");
        setSelectedCards([]);
        setShowSuccess(false);
        if (typeof onBack === "function") onBack();
      }, 1200);
    } catch (err) {
      console.error("❌ Erro ao criar deck:", err);
      alert(`❌ Erro ao criar deck: ${err?.message || "verifique o console"}`);
    } finally {
      setIsCreating(false);
    }
  };

  // 🔵 Calcular totais
  const totalCards = selectedCards.length;
  const isDeckValid =
    deckName.trim().length >= 2 &&
    totalCards >= DEFAULT_DECK_MIN &&
    totalCards <= DEFAULT_DECK_MAX;

  return (
    <div className="relative flex-1 w-full h-full text-white select-none overflow-hidden">
      {/* FUNDO CYBER */}
      <div className="absolute inset-0 bg-[#000814]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.14),transparent_55%),radial-gradient(circle_at_bottom,rgba(168,85,247,0.12),transparent_60%)]" />
      <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-400/10 blur-3xl rounded-full" />
      <div className="absolute -bottom-28 -right-24 w-80 h-80 bg-purple-500/10 blur-3xl rounded-full" />

      {/* CONTEÚDO */}
      <div className="relative w-full h-full p-4 md:p-6 lg:p-8 overflow-y-auto">
        {/* Modal de sucesso */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 text-center shadow-[0_20px_80px_rgba(0,0,0,0.65)]">
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-28 h-28 bg-emerald-400/10 blur-2xl rounded-full" />
              <CheckCircle size={56} className="text-emerald-300 mx-auto mb-3" />
              <h2 className="text-xl font-extrabold text-[#FFD60A] mb-2 tracking-wide">🎉 Deck criado!</h2>
              <p className="text-sm text-slate-200/80 mb-4">
                Seu deck <span className="text-slate-100 font-semibold">"{deckName}"</span> foi criado com sucesso.
              </p>

              <button
                onClick={() => {
                  setShowSuccess(false);
                  if (typeof onBack === "function") onBack();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-[#000814] font-extrabold shadow-[0_0_28px_rgba(255,214,10,0.22)] hover:shadow-[0_0_44px_rgba(255,214,10,0.30)] transition"
              >
                Voltar para Decks
              </button>
            </div>
          </motion.div>
        )}

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={onBack}
              className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition shadow-[0_0_20px_rgba(34,211,238,0.10)]"
              aria-label="Voltar"
              disabled={isCreating}
              title="Voltar"
            >
              <ArrowLeft size={18} className="text-cyan-200" />
            </motion.button>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#FFD60A] tracking-wide">Criar Novo Deck</h1>
              <p className="text-sm text-slate-300/70">
                Selecione {DEFAULT_DECK_MIN} a {DEFAULT_DECK_MAX} cartas para criar seu deck
              </p>
            </div>
          </div>

          {/* ✅ X para sair do inventário e voltar pro GameHome */}
          <button
            onClick={handleCloseToHome}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/15 transition"
            title="Voltar para o GameHome"
            disabled={isCreating}
          >
            <X size={18} className="hover:text-red-400" />
          </button>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1: Formulário e cartas selecionadas */}
          <div className="lg:col-span-1 space-y-6">
            {/* Nome do deck */}
            <div className="relative p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
              <div className="absolute -top-10 -left-10 w-32 h-32 bg-cyan-400/10 blur-2xl rounded-full" />
              <label className="block text-xs font-bold text-[#FFD60A] mb-2 uppercase tracking-widest">
                Nome do Deck *
              </label>

              <input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="Ex.: Deck Defensivo"
                className="w-full rounded-xl px-4 py-3 bg-black/30 border border-white/10 text-white outline-none
                           focus:ring-2 focus:ring-cyan-300/10 focus:border-cyan-300/30
                           placeholder:text-slate-400/60"
                disabled={isCreating}
              />

              <div className={`mt-2 text-xs ${deckName.trim().length >= 2 ? "text-emerald-300" : "text-red-300"}`}>
                {deckName.trim().length >= 2 ? "✓ Nome válido" : "✗ Mínimo 2 caracteres"}
              </div>
            </div>

            {/* Cartas Selecionadas */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-extrabold text-[#FFD60A] tracking-wide">Cartas no Deck</h2>
                <div
                  className={`text-sm font-extrabold ${
                    totalCards < DEFAULT_DECK_MIN
                      ? "text-red-300"
                      : totalCards > DEFAULT_DECK_MAX
                        ? "text-red-300"
                        : "text-emerald-300"
                  }`}
                >
                  {totalCards}/{DEFAULT_DECK_MAX} cartas
                </div>
              </div>

              {totalCards === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-white/10 bg-black/20">
                  <div className="text-4xl mb-2">🃏</div>
                  <p className="text-slate-300/70">Nenhuma carta selecionada</p>
                  <p className="text-xs text-slate-400/60 mt-1">
                    Selecione pelo menos {DEFAULT_DECK_MIN} cartas
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {Object.values(groupedSelectedCards).map((card) => (
                    <div
                      key={card.id}
                      className="p-3 rounded-xl bg-black/25 border border-white/10 hover:border-white/20 transition"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-slate-100 truncate">
                            <span className="text-[#FFD60A]">{card.name}</span>
                          </h3>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                                card.type === "ataque"
                                  ? "bg-red-500/10 text-red-200 border-red-500/20"
                                  : card.type === "defesa"
                                    ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/20"
                                    : "bg-purple-500/10 text-purple-200 border-purple-500/20"
                              }`}
                            >
                              {card.type}
                            </span>

                            <span className="text-[11px] text-slate-300/60">Máx: {card.maxInDeck} cópias</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-lg font-extrabold text-white bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                            {card.count}
                          </span>

                          <button
                            onClick={() => removeAllCopies(card.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-300 border border-transparent hover:border-red-500/20 transition"
                            title="Remover todas"
                            disabled={isCreating}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-[11px] text-slate-300/60">
                          Cópias: {card.count}/{card.maxInDeck}
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => removeCardCopy(card.id)}
                            className="px-2.5 py-1 text-xs rounded-lg bg-red-500/10 border border-red-500/20 text-red-200 hover:bg-red-500/15 disabled:opacity-50 transition"
                            disabled={card.count <= 0 || isCreating}
                          >
                            -1
                          </button>

                          <button
                            onClick={() => {
                              const cardData = availableCards.find((c) => getCardId(c) === card.id);
                              if (cardData) addCard(cardData);
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50 transition"
                            disabled={card.count >= card.maxInDeck || totalCards >= DEFAULT_DECK_MAX || isCreating}
                          >
                            +1
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botão criar */}
            <motion.button
              whileHover={!isDeckValid || isCreating ? {} : { scale: 1.02 }}
              whileTap={!isDeckValid || isCreating ? {} : { scale: 0.99 }}
              onClick={handleCreateDeck}
              disabled={!isDeckValid || isCreating}
              className={`w-full py-3 rounded-2xl font-extrabold text-lg transition-all border
                ${
                  !isDeckValid || isCreating
                    ? "bg-white/5 border-white/10 text-slate-300/60 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-[#000814] border-yellow-500/30 shadow-[0_0_28px_rgba(255,214,10,0.22)] hover:shadow-[0_0_44px_rgba(255,214,10,0.30)]"
                }`}
            >
              {isCreating ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black" />
                  Criando deck...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <PlusCircle size={20} />
                  Criar Deck
                </div>
              )}
            </motion.button>
          </div>

          {/* Coluna 2-3: Cartas disponíveis */}
          <div className="lg:col-span-2">
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_12px_60px_rgba(0,0,0,0.35)] h-full">
              {/* Barra de busca e filtros */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Buscar cartas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 pl-10 bg-black/30 border border-white/10 text-white
                               focus:outline-none focus:ring-2 focus:ring-cyan-300/10 focus:border-cyan-300/30
                               placeholder:text-slate-400/60"
                    disabled={isLoading || isCreating}
                  />
                  <div className="absolute left-3 top-2.5 opacity-70 text-cyan-200">🔍</div>
                </div>

                <div className="relative sm:w-56">
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl px-3 py-2.5 pr-10 bg-black/30 border border-white/10 text-white
                               focus:outline-none focus:ring-2 focus:ring-cyan-300/10 focus:border-cyan-300/30"
                    disabled={isLoading || isCreating}
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="all" className="bg-[#000814] text-white">
                      Todas as cartas
                    </option>
                    <option value="ataque" className="bg-[#000814] text-white">
                      ⚔️ Ataque
                    </option>
                    <option value="defesa" className="bg-[#000814] text-white">
                      🛡️ Defesa
                    </option>
                    <option value="magia" className="bg-[#000814] text-white">
                      ✨ Magia
                    </option>
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-200/60">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 10l5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Estados de carregamento/erro */}
              {isLoading && (
                <div className="h-64 flex justify-center items-center">
                  <div className="text-[#FFD60A] animate-pulse text-xl font-semibold">
                    Carregando suas cartas...
                  </div>
                </div>
              )}

              {error && (
                <div className="h-64 flex flex-col justify-center items-center text-center p-4">
                  <AlertCircle className="text-red-300 mb-2" size={32} />
                  <p className="text-red-300 font-semibold">Erro ao carregar cartas</p>
                  <p className="text-slate-300/70 text-sm mt-1">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 hover:bg-red-500/15 transition text-sm"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {/* Grid de cartas */}
              {!isLoading && !error && (
                <>
                  {filteredCards.length === 0 ? (
                    <div className="h-64 flex flex-col justify-center items-center text-center p-4">
                      <div className="text-4xl mb-2">🃏</div>
                      <p className="text-slate-300/70">Nenhuma carta encontrada</p>
                      <p className="text-slate-400/60 text-sm mt-1">
                        {searchTerm || typeFilter !== "all"
                          ? "Tente alterar os filtros de busca"
                          : "Você não possui cartas no inventário"}
                      </p>
                    </div>
                  ) : (
                    <div className="h-[60vh] overflow-y-auto pr-2">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {filteredCards.map((card) => {
                          const cardId = getCardId(card);
                          const selectedCount = cardId != null ? getCardCount(cardId) : 0;
                          const maxInDeck = getMaxInDeck(card);
                          const isAtMax = selectedCount >= maxInDeck;
                          const canAddMore = !isAtMax && totalCards < DEFAULT_DECK_MAX;

                          return (
                            <motion.button
                              key={cardId ?? `${card.name}-${Math.random()}`}
                              onClick={() => canAddMore && addCard(card)}
                              whileHover={{ scale: canAddMore ? 1.03 : 1 }}
                              whileTap={{ scale: canAddMore ? 0.99 : 1 }}
                              className={`relative w-full text-left rounded-2xl p-2 transition-all focus:outline-none border
                                ${
                                  !canAddMore
                                    ? "opacity-60 cursor-not-allowed bg-black/20 border-white/10"
                                    : "cursor-pointer hover:bg-white/5 bg-black/25 border-white/10 hover:border-white/20"
                                }
                                ${
                                  selectedCount > 0
                                    ? "ring-2 ring-cyan-300/25 border-cyan-300/30 shadow-[0_0_22px_rgba(34,211,238,0.12)]"
                                    : ""
                                }`}
                              disabled={!canAddMore || isCreating}
                              title={
                                !canAddMore
                                  ? `Limite atingido (${selectedCount}/${maxInDeck})`
                                  : `Adicionar ${card.name}`
                              }
                            >
                              {selectedCount > 0 && (
                                <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-black text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg">
                                  {selectedCount}
                                </div>
                              )}

                              <div className="w-full aspect-[3/4] rounded-xl overflow-hidden mb-2 border border-white/10 bg-black/20 relative">
                                {card.img ? (
                                  <img
                                    src={card.img}
                                    alt={card.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                    <span className="text-slate-400/60 text-xs">Carta</span>
                                  </div>
                                )}
                                <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.18),transparent_55%)]" />
                              </div>

                              <div>
                                <p className="text-sm font-semibold text-[#FFD60A] truncate">{card.name}</p>

                                <div className="flex justify-between items-center mt-1">
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                                      normalizeType(card.type) === "ataque"
                                        ? "bg-red-500/10 text-red-200 border-red-500/20"
                                        : normalizeType(card.type) === "defesa"
                                          ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/20"
                                          : "bg-purple-500/10 text-purple-200 border-purple-500/20"
                                    }`}
                                  >
                                    {String(card.type || "").charAt(0).toUpperCase()}
                                  </span>

                                  <span className="text-[11px] text-slate-300/60">Custo: {card.cost}</span>
                                </div>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
