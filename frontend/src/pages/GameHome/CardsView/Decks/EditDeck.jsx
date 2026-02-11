import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Save,
  X,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Search,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import DeckActions from "./DeckActions";

// ✅ usa o client centralizado (Nginx: /api -> gateway-api)
import { apiRequest } from "@/services/api.js";

const DEFAULT_DECK_MIN = 5;
const DEFAULT_DECK_MAX = 20;

export default function EditDeck() {
  const { playerId, deckId } = useParams();
  const navigate = useNavigate();

  const pid = useMemo(() => Number(playerId), [playerId]);

  const [deck, setDeck] = useState(null);
  const [deckName, setDeckName] = useState("");
  const [selectedCards, setSelectedCards] = useState([]); // IDs com repetição
  const [originalDeck, setOriginalDeck] = useState(null);

  const [availableCards, setAvailableCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filters, setFilters] = useState({ type: "all", search: "" });

  // ---------- helpers (compatíveis com DB/engine) ----------
  function getCardId(card) {
    return card?.id ?? card?.cardId ?? card?.CD_ID ?? null;
  }

  function normalizeType(t) {
    const v = String(t || "").toLowerCase();
    if (v === "ataque" || v === "defesa" || v === "magia") return v;
    return v;
  }

  function getMaxInDeck(card) {
    const v = card?.maxInDeck ?? card?.CD_MAX_IN_DECK ?? 3;
    return Number.isFinite(Number(v)) ? Number(v) : 3;
  }

  function safeStr(v) {
    return String(v ?? "");
  }

  // ✅ NOVO: clicar na carta selecionada remove 1 cópia (atalho)
  const onSelectedCardClickRemoveOne = useCallback(
    (cardId) => {
      if (saving) return;
      removeCardCopy(cardId);
    },
    // removeCardCopy é declarado abaixo com useCallback (hoist via closure funciona)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [saving]
  );

  // Carregar deck + cartas do jogador
  useEffect(() => {
    if (!deckId || !playerId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ GET deck específico
        const deckRes = await apiRequest(`/player/${pid}/decks/${deckId}`, {
          method: "GET",
        });

        if (!deckRes?.success) {
          throw new Error(deckRes?.error || "Falha ao buscar deck");
        }

        const deckData = deckRes.data;
        if (!deckData?.success || !deckData?.deck) {
          throw new Error(deckData?.error || "Erro ao carregar deck");
        }

        // ✅ GET cartas do jogador
        const cardsRes = await apiRequest(`/player/${pid}/cards`, {
          method: "GET",
        });

        if (!cardsRes?.success) {
          throw new Error(cardsRes?.error || "Falha ao buscar cartas");
        }

        const cardsData = cardsRes.data;
        if (!cardsData?.success || !cardsData?.cards) {
          throw new Error(cardsData?.error || "Erro ao carregar cartas");
        }

        const foundDeck = deckData.deck;

        // Converter deck.cards [{id, quantity}] -> array de IDs repetidos
        const cardIds = [];
        (foundDeck.cards || []).forEach((c) => {
          const id = c?.id ?? c?.cardId ?? c?.CD_ID;
          const q = Number(c?.quantity ?? 1);
          if (id == null || !Number.isFinite(q)) return;
          for (let i = 0; i < q; i++) cardIds.push(id);
        });

        setDeck(foundDeck);
        setDeckName(foundDeck.name || "");
        setSelectedCards(cardIds);
        setOriginalDeck({ name: foundDeck.name || "", cards: [...cardIds] });
        setAvailableCards(Array.isArray(cardsData.cards) ? cardsData.cards : []);
      } catch (err) {
        setError(err?.message || "Erro ao carregar");
        console.error("Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [deckId, playerId, pid]);

  // Contagem de cartas selecionadas
  const cardCounts = useMemo(() => {
    const counts = {};
    selectedCards.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [selectedCards]);

  const getCardCount = useCallback((id) => cardCounts[id] || 0, [cardCounts]);

  // Agrupar selecionadas (pra lista)
  const groupedSelectedCards = useMemo(() => {
    const uniqueIds = [...new Set(selectedCards)];
    return uniqueIds
      .map((id) => {
        const cardInfo = availableCards.find((c) => getCardId(c) === id);
        if (!cardInfo) return null;

        const maxInDeck = getMaxInDeck(cardInfo);
        const displayName =
          cardInfo?.name ?? cardInfo?.CD_NAME ?? "Carta sem nome";
        const displayType = normalizeType(
          cardInfo?.type ?? cardInfo?.CD_TYPE ?? "desconhecido"
        );

        return {
          ...cardInfo,
          id,
          count: cardCounts[id],
          maxInDeck,
          displayName,
          displayType,
        };
      })
      .filter(Boolean);
  }, [selectedCards, availableCards, cardCounts]);

  // Filtrar cartas disponíveis
  const filteredCards = useMemo(() => {
    const term = String(filters.search || "").toLowerCase();
    const typeFilter = filters.type;

    return availableCards.filter((card) => {
      const cardName = safeStr(card?.name ?? card?.CD_NAME).toLowerCase();
      const cardType = normalizeType(card?.type ?? card?.CD_TYPE);
      const matchesType = typeFilter === "all" || cardType === typeFilter;
      const matchesSearch = term === "" || cardName.includes(term);
      return matchesType && matchesSearch;
    });
  }, [availableCards, filters]);

  // Add/remove cartas
  const addCard = useCallback(
    (card) => {
      const cardId = getCardId(card);
      const cardName = card?.name ?? card?.CD_NAME ?? "Carta";
      if (cardId == null) {
        alert("Carta inválida: sem ID.");
        return;
      }

      const currentCount = cardCounts[cardId] || 0;
      const maxDeckLimit = getMaxInDeck(card);

      if (currentCount >= maxDeckLimit) {
        alert(
          `Limite máximo de ${maxDeckLimit} cópias de "${cardName}" por deck`
        );
        return;
      }

      if (selectedCards.length >= DEFAULT_DECK_MAX) {
        alert(`Limite máximo de ${DEFAULT_DECK_MAX} cartas no deck atingido`);
        return;
      }

      setSelectedCards((prev) => [...prev, cardId]);
    },
    [cardCounts, selectedCards.length]
  );

  const removeCardCopy = useCallback((cardId) => {
    setSelectedCards((prev) => {
      const index = prev.indexOf(cardId);
      if (index === -1) return prev;
      const newArr = [...prev];
      newArr.splice(index, 1);
      return newArr;
    });
  }, []);

  const removeAllCopies = useCallback((cardId) => {
    setSelectedCards((prev) => prev.filter((id) => id !== cardId));
  }, []);

  // ✅ agora que removeCardCopy existe, ajusta o callback do click
  useEffect(() => {
    // noop: apenas para satisfazer o linter caso você use regras estritas
  }, [removeCardCopy]);

  // Mudanças pendentes?
  const hasChanges = useMemo(() => {
    if (!originalDeck) return false;
    const nameChanged = deckName !== originalDeck.name;

    const a = [...selectedCards].sort((x, y) => Number(x) - Number(y));
    const b = [...originalDeck.cards].sort((x, y) => Number(x) - Number(y));
    const cardsChanged =
      a.length !== b.length || !a.every((id, i) => id === b[i]);

    return nameChanged || cardsChanged;
  }, [deckName, selectedCards, originalDeck]);

  // Salvar deck (PUT)
  const handleSave = useCallback(async () => {
    if (deckName.trim().length < 2) {
      alert("Nome inválido (mínimo 2 caracteres).");
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

    setSaving(true);

    try {
      const updateRes = await apiRequest(`/player/${pid}/decks/${deckId}`, {
        method: "PUT",
        body: JSON.stringify({ name: deckName, cardIds: selectedCards }),
      });

      if (!updateRes?.success) {
        throw new Error(updateRes?.error || "Falha ao atualizar deck");
      }

      const updateData = updateRes.data;
      if (updateData?.success) {
        setShowSuccess(true);
        setOriginalDeck({ name: deckName, cards: [...selectedCards] });
        setDeck((prev) =>
          prev
            ? { ...prev, name: deckName, totalCards: selectedCards.length }
            : prev
        );

        setTimeout(() => {
          setShowSuccess(false);
          navigate(-1);
        }, 2000);
      } else {
        throw new Error(updateData?.error || "Erro ao atualizar deck");
      }
    } catch (err) {
      alert(`Erro ao salvar: ${err?.message || "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  }, [deckName, selectedCards, deckId, pid, navigate]);

  const handleReset = () => {
    if (window.confirm("Descartar todas as alterações?") && originalDeck) {
      setDeckName(originalDeck.name);
      setSelectedCards([...originalDeck.cards]);
    }
  };

  const handleDeckAction = useCallback(
    (action, data) => {
      switch (action) {
        case "toggleActive":
          setDeck((prev) =>
            prev ? { ...prev, isActive: data.isActive } : prev
          );
          break;
        case "delete":
          navigate(-1);
          break;
        default:
          break;
      }
    },
    [navigate]
  );

  // Render states
  if (!deckId || !playerId) {
    return (
      <ErrorScreen message="Parâmetros inválidos" onBack={() => navigate(-1)} />
    );
  }

  if (loading) return <LoadingScreen />;

  if (error || !deck) {
    return (
      <ErrorScreen
        message={error || "Deck não encontrado"}
        onBack={() => navigate(-1)}
      />
    );
  }

  const totalCards = selectedCards.length;
  const isDeckValid =
    deckName.trim().length >= 2 &&
    totalCards >= DEFAULT_DECK_MIN &&
    totalCards <= DEFAULT_DECK_MAX;

  const isTooLarge = totalCards > DEFAULT_DECK_MAX;

  return (
    <div className="flex-1 w-full h-full bg-[#000814] text-white p-4 md:p-6 lg:p-8 overflow-y-auto">
      <AnimatePresence>
        {showSuccess && <SuccessModal onClose={() => setShowSuccess(false)} />}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            disabled={saving}
            className="p-2 rounded-md bg-[#001D3D] border border-[#003566] hover:bg-[#00243a] disabled:opacity-50"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#FFD60A] truncate max-w-xs">
              Editar: {deck.name}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
              !hasChanges || saving
                ? "opacity-50 cursor-not-allowed"
                : "bg-blue-800 hover:bg-blue-700"
            }`}
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Descartar</span>
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || !isDeckValid || saving}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-bold ${
              !hasChanges || !isDeckValid || saving
                ? "opacity-50 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {saving ? (
              <>
                <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Salvar</span>
              </>
            )}
          </button>

          <DeckActions
            deckId={deckId}
            deckName={deckName}
            isActive={deck.isActive}
            playerId={pid}
            compact={true}
            onActionComplete={handleDeckAction}
            isTooLarge={isTooLarge}
            maxCards={DEFAULT_DECK_MAX}
            totalCards={totalCards}
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Esquerda */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566]">
            <label className="block text-sm font-semibold text-[#FFD60A] mb-2">
              Nome do Deck
            </label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              className="w-full rounded-lg px-4 py-3 bg-[#000814] border border-[#003566] text-white focus:ring-2 focus:ring-[#FFD60A]/40 disabled:opacity-50"
              disabled={saving}
              maxLength={50}
            />
          </div>

          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566]">
            <h3 className="text-lg font-bold text-[#FFD60A] mb-3">
              Informações
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span
                  className={deck.isActive ? "text-green-400" : "text-gray-400"}
                >
                  {deck.isActive ? "Ativo" : "Inativo"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cartas:</span>
                <span>
                  {totalCards}/{DEFAULT_DECK_MAX}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ID:</span>
                <span className="font-mono text-[#FFD60A]">#{deck.id}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-[#FFD60A]">
                Cartas no Deck ({totalCards}/{DEFAULT_DECK_MAX})
              </h2>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1">
              {groupedSelectedCards.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-[#003566] rounded-lg">
                  <div className="text-4xl mb-2 opacity-30">🃏</div>
                  <p className="text-gray-500">Nenhuma carta selecionada</p>
                </div>
              ) : (
                groupedSelectedCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onSelectedCardClickRemoveOne(card.id)}
                    disabled={saving}
                    title="Clique para remover 1 cópia"
                    className={`w-full text-left p-3 rounded-lg bg-[#000814] border border-[#003566] transition ${
                      saving
                        ? "opacity-60 cursor-not-allowed"
                        : "hover:border-[#FFD60A]/40 hover:bg-[#0b1422]"
                    }`}
                  >
                    <div className="flex justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#FFD60A] text-sm truncate">
                          {card.displayName}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs px-2 py-0.5 rounded ${
                              card.displayType === "ataque"
                                ? "bg-red-500/20"
                                : card.displayType === "defesa"
                                ? "bg-blue-500/20"
                                : "bg-purple-500/20"
                            }`}
                          >
                            {card.displayType}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            (clique para -1)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white bg-[#003566] px-2 py-1 rounded min-w-[2rem] text-center">
                          {card.count}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAllCopies(card.id);
                          }}
                          disabled={saving}
                          className="p-1 rounded hover:bg-red-900/30 disabled:opacity-30"
                          title="Remover todas"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-[#0d1b2a] p-1 rounded">
                      <span className="text-xs text-gray-500 ml-2">
                        {card.count}/{card.maxInDeck}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCardCopy(card.id);
                          }}
                          disabled={saving || card.count <= 0}
                          className="px-2 bg-red-900/50 text-xs rounded py-1 disabled:opacity-30"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addCard(card);
                          }}
                          disabled={
                            saving ||
                            card.count >= card.maxInDeck ||
                            totalCards >= DEFAULT_DECK_MAX
                          }
                          className="px-2 bg-green-900/50 text-xs rounded py-1 disabled:opacity-30"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] text-sm">
            <h3 className="text-sm font-semibold text-[#FFD60A] mb-2">
              Validações
            </h3>
            <div className="space-y-2">
              <div
                className={
                  deckName.trim().length >= 2 ? "text-green-400" : "text-red-400"
                }
              >
                {deckName.trim().length >= 2
                  ? "✅ Nome válido"
                  : "❌ Nome muito curto"}
              </div>
              <div
                className={totalCards >= DEFAULT_DECK_MIN ? "text-green-400" : "text-red-400"}
              >
                {totalCards >= DEFAULT_DECK_MIN
                  ? "✅ Mínimo de cartas"
                  : `❌ Mínimo ${DEFAULT_DECK_MIN} cartas (${totalCards}/${DEFAULT_DECK_MIN})`}
              </div>
              <div
                className={totalCards <= DEFAULT_DECK_MAX ? "text-green-400" : "text-red-400"}
              >
                {totalCards <= DEFAULT_DECK_MAX
                  ? "✅ Máximo respeitado"
                  : `❌ Máximo ${DEFAULT_DECK_MAX} cartas (${totalCards}/${DEFAULT_DECK_MAX})`}
              </div>
              {hasChanges && (
                <div className="pt-2 mt-2 border-t border-white/10 text-yellow-500">
                  ⚠️ Alterações não salvas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Direita */}
        <div className="lg:col-span-2">
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] h-full flex flex-col">
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                  placeholder="Buscar cartas..."
                  className="w-full rounded-lg px-4 py-2 pl-10 bg-[#000814] border border-[#003566] text-white focus:ring-2 focus:ring-[#FFD60A]/40 disabled:opacity-50"
                  disabled={saving}
                />
                <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
              </div>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="rounded-lg px-3 py-2 bg-[#000814] border border-[#003566] text-white focus:ring-2 focus:ring-[#FFD60A]/40 disabled:opacity-50"
                disabled={saving}
              >
                <option value="all">Todas</option>
                <option value="ataque">Ataque</option>
                <option value="defesa">Defesa</option>
                <option value="magia">Magia</option>
              </select>
            </div>

            <div className="overflow-y-auto pr-2 flex-1">
              {filteredCards.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-10 flex-1">
                  <p className="text-gray-500">Nenhuma carta encontrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                  {filteredCards.map((card) => {
                    const cardId = getCardId(card);
                    const cardName = card?.name ?? card?.CD_NAME ?? "Sem nome";
                    const cardType = normalizeType(
                      card?.type ?? card?.CD_TYPE ?? "desconhecido"
                    );
                    const cardImg = card?.img ?? card?.CD_IMAGE ?? null;
                    const maxInDeck = getMaxInDeck(card);
                    const count = cardId != null ? getCardCount(cardId) : 0;
                    const canAdd =
                      cardId != null &&
                      count < maxInDeck &&
                      totalCards < DEFAULT_DECK_MAX;

                    return (
                      <motion.button
                        key={cardId ?? `${cardName}-${Math.random()}`}
                        onClick={() => canAdd && addCard(card)}
                        whileHover={{ scale: canAdd ? 1.02 : 1 }}
                        className={`relative text-left rounded-lg p-2 border-2 flex flex-col h-full ${
                          !canAdd
                            ? "opacity-60 cursor-not-allowed border-[#003566] bg-[#000814]"
                            : "hover:bg-[#1b2b3a] border-[#003566] hover:border-[#FFD60A]/50"
                        } ${
                          count > 0
                            ? "ring-1 ring-[#FFD60A] bg-[#1b2b3a]/40"
                            : "bg-[#000814]"
                        }`}
                        disabled={!canAdd || saving}
                        title={
                          !canAdd
                            ? `Limite (${count}/${maxInDeck}) ou deck cheio`
                            : `Adicionar ${cardName}`
                        }
                      >
                        {count > 0 && (
                          <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                            {count}
                          </div>
                        )}

                        <div className="w-full aspect-[3/4] bg-gradient-to-br from-[#001D3D] to-[#003566] rounded mb-2 overflow-hidden">
                          {cardImg ? (
                            <img
                              src={cardImg}
                              alt={cardName}
                              className="w-full h-full object-cover"
                              onError={(e) => (e.currentTarget.style.display = "none")}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl mb-1">🃏</div>
                                <div className="text-xs text-gray-500">{cardName}</div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-1 mt-auto">
                          <div className="truncate text-sm font-semibold text-[#FFD60A]">
                            {cardName}
                          </div>
                          <div className="flex justify-between items-center">
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded ${
                                cardType === "ataque"
                                  ? "bg-red-500/20"
                                  : cardType === "defesa"
                                  ? "bg-blue-500/20"
                                  : "bg-purple-500/20"
                              }`}
                            >
                              {String(cardType || "").slice(0, 3)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {count}/{maxInDeck}
                            </span>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex justify-center items-center h-full bg-[#000814]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD60A]"></div>
    </div>
  );
}

function ErrorScreen({ message, onBack }) {
  return (
    <div className="flex-1 w-full h-full bg-[#000814] p-8 flex flex-col items-center justify-center">
      <AlertCircle size={48} className="text-red-400 mb-4" />
      <h2 className="text-xl font-bold text-red-400 mb-2">Erro</h2>
      <p className="text-gray-400 mb-6 text-center max-w-md">{message}</p>
      <button
        onClick={onBack}
        className="px-6 py-3 bg-[#FFD60A] text-black font-bold rounded-lg hover:bg-[#FFC300] transition-colors"
      >
        Voltar
      </button>
    </div>
  );
}

function SuccessModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-[#001D3D] border border-[#003566] rounded-xl p-5 text-center"
      >
        <CheckCircle size={56} className="text-green-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-[#FFD60A] mb-2">
          ✅ Deck Atualizado!
        </h2>
        <p className="text-gray-200 mb-4">Alterações salvas com sucesso.</p>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#003566] hover:bg-[#004880] text-white rounded-lg transition-colors"
        >
          Continuar
        </button>
      </motion.div>
    </motion.div>
  );
}
