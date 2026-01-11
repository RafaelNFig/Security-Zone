import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, PlusCircle, CheckCircle, AlertCircle, X } from "lucide-react";

export default function CreateDeck({ onBack = () => {}, onCreate = () => {} }) {
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

  // 🔵 Para testes: playerId fixo = 1
  const playerId = 1;

  // 🔵 Buscar cartas do jogador
  useEffect(() => {
    const fetchPlayerCards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `http://localhost:3000/api/player/${playerId}/cards`
        );

        if (!response.ok) {
          throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setAvailableCards(data.cards);
        } else {
          throw new Error(data.error || "Erro ao carregar cartas");
        }
      } catch (err) {
        setError(err.message);
        console.error("❌ Erro ao buscar cartas:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlayerCards();
  }, []);

  // 🔵 Contar quantas cópias de cada carta estão selecionadas
  const getCardCount = (cardId) => {
    return selectedCards.filter((id) => id === cardId).length;
  };

  // 🔵 Adicionar carta ao deck
  const addCard = (card) => {
    const cardCount = getCardCount(card.id);

    // 🔴 VALIDAÇÃO: Máximo de cópias por deck (CD_MAX_IN_DECK)
    if (cardCount >= card.CD_MAX_IN_DECK) {
      alert(
        `Limite máximo de ${card.CD_MAX_IN_DECK} cópias de "${card.name}" por deck`
      );
      return;
    }

    // 🔴 VALIDAÇÃO: Máximo 15 cartas no total
    if (selectedCards.length >= 15) {
      alert("Limite máximo de 15 cartas no deck atingido");
      return;
    }

    setSelectedCards([...selectedCards, card.id]);
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
    setSelectedCards(selectedCards.filter((id) => id !== cardId));
  };

  // 🔵 Agrupar cartas selecionadas para exibição
  const groupedSelectedCards = selectedCards.reduce((acc, cardId) => {
    const card = availableCards.find((c) => c.id === cardId);
    if (!card) return acc;

    if (!acc[cardId]) {
      acc[cardId] = {
        id: card.id,
        name: card.name,
        type: card.type,
        count: 0,
        maxInDeck: card.maxInDeck || 3,
      };
    }
    acc[cardId].count++;
    return acc;
  }, {});

  // 🔵 Filtrar cartas disponíveis
  const filteredCards = availableCards.filter((card) => {
    const matchesType = typeFilter === "all" || card.type === typeFilter;
    const matchesSearch =
      card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // 🔵 Criar deck na API
  const handleCreateDeck = async () => {
    // 🔴 VALIDAÇÕES FINAIS
    if (deckName.trim().length < 2) {
      alert("Digite um nome válido para o deck (mínimo 2 caracteres).");
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

    setIsCreating(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/player/${playerId}/decks`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: deckName,
            cardIds: selectedCards, // Já é o array com IDs repetidos
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        // Sucesso - mostrar mensagem
        setShowSuccess(true);

        // Chamar callback se fornecido
        if (onCreate) {
          onCreate({
            id: data.deckId,
            name: deckName,
            cards: selectedCards.length,
          });
        }

        // Limpar formulário após 2 segundos e voltar
        setTimeout(() => {
          setDeckName("");
          setSelectedCards([]);
          setShowSuccess(false);
          if (onBack) onBack(); // Voltar para lista de decks
        }, 2000);
      } else {
        alert(`❌ Erro ao criar deck: ${data.error}`);
      }
    } catch (err) {
      console.error("❌ Erro ao criar deck:", err);
      alert("❌ Erro ao criar deck. Verifique o console para mais detalhes.");
    } finally {
      setIsCreating(false);
    }
  };

  // 🔵 Calcular totais
  const totalCards = selectedCards.length;
  const uniqueCards = Object.keys(groupedSelectedCards).length;
  const isDeckValid =
    deckName.trim().length >= 2 && totalCards >= 5 && totalCards <= 15;

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
              <h2 className="text-xl font-extrabold text-[#FFD60A] mb-2 tracking-wide">
                🎉 Deck criado!
              </h2>
              <p className="text-sm text-slate-200/80 mb-4">
                Seu deck{" "}
                <span className="text-slate-100 font-semibold">
                  "{deckName}"
                </span>{" "}
                foi criado com sucesso.
              </p>

              <button
                onClick={() => {
                  setShowSuccess(false);
                  if (onBack) onBack();
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
            >
              <ArrowLeft size={18} className="text-cyan-200" />
            </motion.button>

            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#FFD60A] tracking-wide">
                Criar Novo Deck
              </h1>
              <p className="text-sm text-slate-300/70">
                Selecione 5 a 15 cartas para criar seu deck
              </p>
            </div>
          </div>

          {/* Contadores */}
          <div className="hidden md:flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-slate-300/60 uppercase tracking-widest">
                Cartas no deck
              </div>
              <div
                className={`text-xl font-extrabold ${
                  totalCards < 5
                    ? "text-red-300"
                    : totalCards > 15
                    ? "text-red-300"
                    : "text-emerald-300"
                }`}
              >
                {totalCards} / 5-15
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-300/60 uppercase tracking-widest">
                Únicas
              </div>
              <div className="text-xl font-extrabold text-cyan-200">
                {uniqueCards}
              </div>
            </div>
          </div>
        </div>

        {/* INFO: Player ID sendo usado (apenas para testes) */}
        <div className="mb-4 rounded-2xl border border-cyan-300/10 bg-white/5 backdrop-blur p-3 text-sm shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03)]">
          <span className="text-cyan-200 font-semibold">🛠️ Modo teste:</span>{" "}
          <span className="text-slate-200/80">
            Usando Player ID = {playerId} (KLB)
          </span>
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

              <div
                className={`mt-2 text-xs ${
                  deckName.trim().length >= 2 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {deckName.trim().length >= 2 ? "✓ Nome válido" : "✗ Mínimo 2 caracteres"}
              </div>
            </div>

            {/* Cartas Selecionadas */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-extrabold text-[#FFD60A] tracking-wide">
                  Cartas no Deck
                </h2>
                <div
                  className={`text-sm font-extrabold ${
                    totalCards < 5
                      ? "text-red-300"
                      : totalCards > 15
                      ? "text-red-300"
                      : "text-emerald-300"
                  }`}
                >
                  {totalCards} cartas
                </div>
              </div>

              {totalCards === 0 ? (
                <div className="text-center py-8 rounded-xl border border-dashed border-white/10 bg-black/20">
                  <div className="text-4xl mb-2">🃏</div>
                  <p className="text-slate-300/70">Nenhuma carta selecionada</p>
                  <p className="text-xs text-slate-400/60 mt-1">
                    Selecione pelo menos 5 cartas
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

                            <span className="text-[11px] text-slate-300/60">
                              Máx: {card.maxInDeck} cópias
                            </span>
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
                              const cardData = availableCards.find(
                                (c) => c.id === card.id
                              );
                              if (cardData) addCard(cardData);
                            }}
                            className="px-2.5 py-1 text-xs rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-50 transition"
                            disabled={
                              card.count >= card.maxInDeck ||
                              totalCards >= 15 ||
                              isCreating
                            }
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

            {/* Validações */}
            <div className="p-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
              <h3 className="text-xs font-bold text-[#FFD60A] mb-3 uppercase tracking-widest">
                Validações do Deck
              </h3>

              <div className="space-y-2 text-sm">
                <div
                  className={`flex items-center gap-2 ${
                    deckName.trim().length >= 2
                      ? "text-emerald-300"
                      : "text-red-300"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      deckName.trim().length >= 2 ? "bg-emerald-300" : "bg-red-300"
                    }`}
                  />
                  Nome do deck válido
                </div>

                <div
                  className={`flex items-center gap-2 ${
                    totalCards >= 5 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      totalCards >= 5 ? "bg-emerald-300" : "bg-red-300"
                    }`}
                  />
                  Mínimo 5 cartas ({totalCards}/5)
                </div>

                <div
                  className={`flex items-center gap-2 ${
                    totalCards <= 15 ? "text-emerald-300" : "text-red-300"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      totalCards <= 15 ? "bg-emerald-300" : "bg-red-300"
                    }`}
                  />
                  Máximo 15 cartas ({totalCards}/15)
                </div>
              </div>
            </div>

            {/* Botão criar */}
            <motion.button
              whileHover={(!isDeckValid || isCreating) ? {} : { scale: 1.02 }}
              whileTap={(!isDeckValid || isCreating) ? {} : { scale: 0.99 }}
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
                  <div className="absolute left-3 top-2.5 opacity-70 text-cyan-200">
                    🔍
                  </div>
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

                  {/* seta */}
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
                          const selectedCount = getCardCount(card.id);
                          const isAtMax = selectedCount >= (card.maxInDeck || 3);
                          const canAddMore = !isAtMax && totalCards < 15;

                          return (
                            <motion.button
                              key={card.id}
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
                                }
                              `}
                              disabled={!canAddMore || isCreating}
                              title={
                                !canAddMore
                                  ? `Limite atingido (${selectedCount}/${card.maxInDeck})`
                                  : `Adicionar ${card.name}`
                              }
                            >
                              {/* Badge de quantidade selecionada */}
                              {selectedCount > 0 && (
                                <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-black text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg">
                                  {selectedCount}
                                </div>
                              )}

                              {/* Imagem da carta */}
                              <div className="w-full aspect-[3/4] rounded-xl overflow-hidden mb-2 border border-white/10 bg-black/20">
                                {card.img ? (
                                  <img
                                    src={card.img}
                                    alt={card.name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                    <span className="text-slate-400/60 text-xs">
                                      Carta
                                    </span>
                                  </div>
                                )}

                                {/* brilho */}
                                <div className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.18),transparent_55%)]" />
                              </div>

                              {/* Info da carta */}
                              <div>
                                <p className="text-sm font-semibold text-[#FFD60A] truncate">
                                  {card.name}
                                </p>

                                <div className="flex justify-between items-center mt-1">
                                  <span
                                    className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                                      card.type === "ataque"
                                        ? "bg-red-500/10 text-red-200 border-red-500/20"
                                        : card.type === "defesa"
                                        ? "bg-cyan-500/10 text-cyan-200 border-cyan-500/20"
                                        : "bg-purple-500/10 text-purple-200 border-purple-500/20"
                                    }`}
                                  >
                                    {card.type.charAt(0).toUpperCase()}
                                  </span>

                                  <span className="text-[11px] text-slate-300/60">
                                    Custo: {card.cost}
                                  </span>
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
