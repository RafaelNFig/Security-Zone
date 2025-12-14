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

export default function EditDeck() {
  // Parâmetros da rota
  const { playerId, deckId } = useParams();
  const navigate = useNavigate();

  // Estados principais
  const [deck, setDeck] = useState(null);
  const [deckName, setDeckName] = useState("");
  const [selectedCards, setSelectedCards] = useState([]); // IDs das cartas
  const [originalDeck, setOriginalDeck] = useState(null);
  const [availableCards, setAvailableCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [filters, setFilters] = useState({ type: "all", search: "" });

  // Carregar dados do deck
  useEffect(() => {
    if (!deckId || !playerId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar deck específico
        const deckResponse = await fetch(
          `http://localhost:3000/api/player/${playerId}/decks/${deckId}`
        );
        const deckData = await deckResponse.json();

        // Buscar cartas disponíveis
        const cardsResponse = await fetch(
          `http://localhost:3000/api/player/${playerId}/cards`
        );
        const cardsData = await cardsResponse.json();

        if (!deckData.success || !deckData.deck) {
          throw new Error(deckData.error || "Erro ao carregar deck");
        }

        if (!cardsData.success || !cardsData.cards) {
          throw new Error(cardsData.error || "Erro ao carregar cartas");
        }

        const foundDeck = deckData.deck;

        // Converter cartas para array de IDs
        const cardIds = [];
        foundDeck.cards.forEach((card) => {
          for (let i = 0; i < card.quantity; i++) {
            cardIds.push(card.id);
          }
        });

        setDeck(foundDeck);
        setDeckName(foundDeck.name);
        setSelectedCards(cardIds);
        setOriginalDeck({ name: foundDeck.name, cards: [...cardIds] });
        setAvailableCards(cardsData.cards);
      } catch (err) {
        setError(err.message);
        console.error("Erro ao carregar:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [deckId, playerId]);

  // Calcular contagem de cartas
  const cardCounts = useMemo(() => {
    const counts = {};
    selectedCards.forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
    return counts;
  }, [selectedCards]);

  const getCardCount = useCallback((id) => cardCounts[id] || 0, [cardCounts]);

  // Agrupar cartas selecionadas
  const groupedSelectedCards = useMemo(() => {
    const uniqueIds = [...new Set(selectedCards)];
    return uniqueIds
      .map((id) => {
        const cardInfo = availableCards.find((c) => c.id === id);
        if (!cardInfo) return null;

        const maxInDeck = cardInfo.maxInDeck || cardInfo.CD_MAX_IN_DECK || 3;
        return {
          ...cardInfo,
          id,
          count: cardCounts[id],
          maxInDeck,
          displayName: cardInfo.name || cardInfo.CD_NAME || "Carta sem nome",
          displayType: cardInfo.type || cardInfo.CD_TYPE || "desconhecido",
        };
      })
      .filter((card) => card !== null);
  }, [selectedCards, availableCards, cardCounts]);

  // Filtrar cartas disponíveis
  const filteredCards = useMemo(() => {
    const term = filters.search.toLowerCase();
    return availableCards.filter((card) => {
      const cardName = card.name || card.CD_NAME || "";
      const cardType = card.type || card.CD_TYPE || "";
      const matchesType = filters.type === "all" || cardType === filters.type;
      const matchesSearch =
        term === "" || cardName.toLowerCase().includes(term);
      return matchesType && matchesSearch;
    });
  }, [availableCards, filters]);

  // Manipulação de cartas
  const addCard = useCallback(
    (card) => {
      const cardId = card.id || card.CD_ID || 0;
      const cardName = card.name || card.CD_NAME || "Carta";
      const currentCount = cardCounts[cardId] || 0;
      const maxDeckLimit = card.CD_MAX_IN_DECK || card.maxInDeck || 3;

      if (currentCount >= maxDeckLimit) {
        alert(
          `Limite máximo de ${maxDeckLimit} cópias de "${cardName}" por deck`
        );
        return;
      }

      if (selectedCards.length >= 15) {
        alert("Limite máximo de 15 cartas no deck atingido");
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

  // Verificar alterações
  const hasChanges = useMemo(() => {
    if (!originalDeck) return false;
    const nameChanged = deckName !== originalDeck.name;
    const cardsChanged =
      selectedCards.length !== originalDeck.cards.length ||
      ![...selectedCards]
        .sort()
        .every((id, i) => id === [...originalDeck.cards].sort()[i]);
    return nameChanged || cardsChanged;
  }, [deckName, selectedCards, originalDeck]);

  // Salvar alterações
  const handleSave = useCallback(async () => {
    if (deckName.trim().length < 2) {
      alert("Nome inválido (mínimo 2 caracteres).");
      return;
    }

    if (selectedCards.length < 5) {
      alert("O deck deve ter no mínimo 5 cartas.");
      return;
    }

    if (selectedCards.length > 15) {
      alert("O deck deve ter no máximo 15 cartas.");
      return;
    }

    setSaving(true);

    try {
      const updateRes = await fetch(
        `http://localhost:3000/api/player/${playerId}/decks/${deckId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: deckName, cardIds: selectedCards }),
        }
      );

      const updateData = await updateRes.json();

      if (updateData.success) {
        setShowSuccess(true);
        setOriginalDeck({ name: deckName, cards: [...selectedCards] });
        setDeck((prev) =>
          prev
            ? { ...prev, name: deckName, totalCards: selectedCards.length }
            : null
        );

        setTimeout(() => {
          setShowSuccess(false);
          navigate(-1);
        }, 2000);
      } else {
        throw new Error(updateData.error || "Erro ao atualizar deck");
      }
    } catch (err) {
      alert(`Erro ao salvar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }, [deckName, selectedCards, deckId, playerId, navigate]);

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
          if (deck) {
            setDeck((prev) =>
              prev ? { ...prev, isActive: data.isActive } : null
            );
          }
          break;
        case "delete":
          navigate(-1);
          break;
        default:
          break;
      }
    },
    [deck, navigate]
  );

  // Estados de renderização
  if (!deckId || !playerId) {
    return (
      <ErrorScreen message="Parâmetros inválidos" onBack={() => navigate(-1)} />
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

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
    deckName.trim().length >= 2 && totalCards >= 5 && totalCards <= 15;

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
            playerId={parseInt(playerId)}
            compact={true}
            onActionComplete={handleDeckAction}
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna esquerda */}
        <div className="lg:col-span-1 space-y-6">
          {/* Nome do deck */}
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

          {/* Informações do deck */}
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
                <span>{totalCards}/15</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">ID:</span>
                <span className="font-mono text-[#FFD60A]">#{deck.id}</span>
              </div>
            </div>
          </div>

          {/* Cartas selecionadas */}
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-[#FFD60A]">
                Cartas no Deck ({totalCards}/15)
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
                  <div
                    key={card.id}
                    className="p-3 rounded-lg bg-[#000814] border border-[#003566]"
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white bg-[#003566] px-2 py-1 rounded min-w-[2rem] text-center">
                          {card.count}
                        </span>
                        <button
                          onClick={() => removeAllCopies(card.id)}
                          disabled={saving}
                          className="p-1 rounded hover:bg-red-900/30 disabled:opacity-30"
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
                          onClick={() => removeCardCopy(card.id)}
                          disabled={saving || card.count <= 0}
                          className="px-2 bg-red-900/50 text-xs rounded py-1 disabled:opacity-30"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => addCard(card)}
                          disabled={
                            saving ||
                            card.count >= card.maxInDeck ||
                            totalCards >= 15
                          }
                          className="px-2 bg-green-900/50 text-xs rounded py-1 disabled:opacity-30"
                        >
                          +1
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Validações */}
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] text-sm">
            <h3 className="text-sm font-semibold text-[#FFD60A] mb-2">
              Validações
            </h3>
            <div className="space-y-2">
              <div
                className={
                  deckName.trim().length >= 2
                    ? "text-green-400"
                    : "text-red-400"
                }
              >
                {deckName.trim().length >= 2
                  ? "✅ Nome válido"
                  : "❌ Nome muito curto"}
              </div>
              <div
                className={totalCards >= 5 ? "text-green-400" : "text-red-400"}
              >
                {totalCards >= 5
                  ? "✅ Mínimo de cartas"
                  : `❌ Mínimo 5 cartas (${totalCards}/5)`}
              </div>
              <div
                className={totalCards <= 15 ? "text-green-400" : "text-red-400"}
              >
                {totalCards <= 15
                  ? "✅ Máximo respeitado"
                  : `❌ Máximo 15 cartas (${totalCards}/15)`}
              </div>
              {hasChanges && (
                <div className="pt-2 mt-2 border-t border-white/10 text-yellow-500">
                  ⚠️ Alterações não salvas
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita - Cartas disponíveis */}
        <div className="lg:col-span-2">
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] h-full flex flex-col">
            {/* Filtros */}
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
                <Search
                  className="absolute left-3 top-2.5 text-gray-400"
                  size={20}
                />
              </div>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters({ ...filters, type: e.target.value })
                }
                className="rounded-lg px-3 py-2 bg-[#000814] border border-[#003566] text-white focus:ring-2 focus:ring-[#FFD60A]/40 disabled:opacity-50"
                disabled={saving}
              >
                <option value="all">Todas</option>
                <option value="ataque">Ataque</option>
                <option value="defesa">Defesa</option>
                <option value="magia">Magia</option>
              </select>
            </div>

            {/* Grid de cartas */}
            <div className="overflow-y-auto pr-2 flex-1">
              {filteredCards.length === 0 ? (
                <div className="flex flex-col justify-center items-center py-10 flex-1">
                  <p className="text-gray-500">Nenhuma carta encontrada</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-4">
                  {filteredCards.map((card) => {
                    const cardId = card.id || card.CD_ID || 0;
                    const cardName = card.name || card.CD_NAME || "Sem nome";
                    const cardType =
                      card.type || card.CD_TYPE || "desconhecido";
                    const cardImg =
                      card.img ||
                      (card.CD_IMAGE ? `/img/${card.CD_IMAGE}` : null);
                    const maxInDeck =
                      card.maxInDeck || card.CD_MAX_IN_DECK || 3;
                    const count = getCardCount(cardId);
                    const canAdd = count < maxInDeck && totalCards < 15;

                    return (
                      <motion.button
                        key={cardId}
                        onClick={() => canAdd && addCard(card)}
                        whileHover={{ scale: canAdd ? 1.02 : 1 }}
                        className={`relative text-left rounded-lg p-2 border-2 flex flex-col h-full ${
                          !canAdd
                            ? "opacity-60 cursor-not-allowed"
                            : "hover:bg-[#1b2b3a] border-[#003566] hover:border-[#FFD60A]/50"
                        } ${
                          count > 0
                            ? "ring-1 ring-[#FFD60A] bg-[#1b2b3a]/40"
                            : "bg-[#000814]"
                        }`}
                        disabled={!canAdd || saving}
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
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl mb-1">🃏</div>
                                <div className="text-xs text-gray-500">
                                  {cardName}
                                </div>
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
                              {cardType.slice(0, 3)}
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

// Componentes auxiliares
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
