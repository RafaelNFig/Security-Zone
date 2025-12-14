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
        const response = await fetch(`http://localhost:3000/api/player/${playerId}/cards`);
        
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
    return selectedCards.filter(id => id === cardId).length;
  };

  // 🔵 Adicionar carta ao deck
  const addCard = (card) => {
    const cardCount = getCardCount(card.id);
    
    // 🔴 VALIDAÇÃO: Máximo de cópias por deck (CD_MAX_IN_DECK)
    if (cardCount >= card.CD_MAX_IN_DECK) {
      alert(`Limite máximo de ${card.CD_MAX_IN_DECK} cópias de "${card.name}" por deck`);
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
    const index = selectedCards.findIndex(id => id === cardId);
    if (index !== -1) {
      const newSelectedCards = [...selectedCards];
      newSelectedCards.splice(index, 1);
      setSelectedCards(newSelectedCards);
    }
  };

  // 🔵 Remover todas as cópias de uma carta
  const removeAllCopies = (cardId) => {
    setSelectedCards(selectedCards.filter(id => id !== cardId));
  };

  // 🔵 Agrupar cartas selecionadas para exibição
  const groupedSelectedCards = selectedCards.reduce((acc, cardId) => {
    const card = availableCards.find(c => c.id === cardId);
    if (!card) return acc;
    
    if (!acc[cardId]) {
      acc[cardId] = {
        id: card.id,
        name: card.name,
        type: card.type,
        count: 0,
        maxInDeck: card.maxInDeck || 3
      };
    }
    acc[cardId].count++;
    return acc;
  }, {});

  // 🔵 Filtrar cartas disponíveis
  const filteredCards = availableCards.filter(card => {
    const matchesType = typeFilter === "all" || card.type === typeFilter;
    const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      const response = await fetch(`http://localhost:3000/api/player/${playerId}/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deckName,
          cardIds: selectedCards // Já é o array com IDs repetidos
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Sucesso - mostrar mensagem
        setShowSuccess(true);
        
        // Chamar callback se fornecido
        if (onCreate) {
          onCreate({
            id: data.deckId,
            name: deckName,
            cards: selectedCards.length
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
  const isDeckValid = deckName.trim().length >= 2 && totalCards >= 5 && totalCards <= 15;

  return (
    <div className="flex-1 w-full h-full bg-[#000814] text-white p-4 md:p-6 lg:p-8 overflow-y-auto">
      {/* Modal de sucesso */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm bg-[#001D3D] border border-[#003566] rounded-xl p-5 text-center">
            <CheckCircle size={56} className="text-[#00FF7F] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#FFD60A] mb-2">🎉 Deck criado!</h2>
            <p className="text-sm text-gray-200 mb-4">Seu deck "{deckName}" foi criado com sucesso.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowSuccess(false);
                  if (onBack) onBack();
                }}
                className="px-4 py-2 rounded-lg bg-[#FFD60A] text-black font-semibold"
              >
                Voltar para Decks
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-md bg-[#001D3D] border border-[#003566] hover:bg-[#00243a]"
            aria-label="Voltar"
            disabled={isCreating}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#FFD60A]">Criar Novo Deck</h1>
            <p className="text-sm text-gray-400">Selecione 5 a 15 cartas para criar seu deck</p>
          </div>
        </div>
        
        {/* 🔵 Contadores */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm text-gray-400">Cartas no deck</div>
            <div className={`text-xl font-bold ${totalCards < 5 ? 'text-red-400' : totalCards > 15 ? 'text-red-400' : 'text-green-400'}`}>
              {totalCards} / 5-15
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">Cartas únicas</div>
            <div className="text-xl font-bold text-[#FFD60A]">{uniqueCards}</div>
          </div>
        </div>
      </div>

      {/* 🔵 INFO: Player ID sendo usado (apenas para testes) */}
      <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-lg text-sm">
        <span className="text-blue-300">🛠️ Modo teste:</span> Usando Player ID = {playerId} (KLB)
      </div>

      {/* 🔵 Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 🔵 Coluna 1: Formulário e cartas selecionadas */}
        <div className="lg:col-span-1 space-y-6">
          {/* Nome do deck */}
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566]">
            <label className="block text-sm font-semibold text-[#FFD60A] mb-2">Nome do Deck *</label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Ex.: Deck Defensivo"
              className="w-full rounded-lg px-4 py-3 bg-[#000814] border border-[#003566] text-white outline-none focus:ring-2 focus:ring-[#FFD60A]/40"
              disabled={isCreating}
            />
            <div className="mt-2 text-xs text-gray-400">
              {deckName.trim().length >= 2 ? '✓ Nome válido' : '✗ Mínimo 2 caracteres'}
            </div>
          </div>

          {/* 🔵 Cartas Selecionadas */}
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566]">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-[#FFD60A]">Cartas no Deck</h2>
              <div className={`text-sm font-bold ${totalCards < 5 ? 'text-red-400' : totalCards > 15 ? 'text-red-400' : 'text-green-400'}`}>
                {totalCards} cartas
              </div>
            </div>
            
            {totalCards === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-[#003566] rounded-lg">
                <div className="text-4xl mb-2">🃏</div>
                <p className="text-gray-400">Nenhuma carta selecionada</p>
                <p className="text-xs text-gray-500 mt-1">Selecione pelo menos 5 cartas</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Object.values(groupedSelectedCards).map(card => (
                  <div key={card.id} className="p-3 rounded-lg bg-[#000814] border border-[#003566]">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-[#FFD60A]">{card.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            card.type === 'ataque' ? 'bg-red-500/20 text-red-300' : 
                            card.type === 'defesa' ? 'bg-blue-500/20 text-blue-300' : 
                            'bg-purple-500/20 text-purple-300'
                          }`}>
                            {card.type}
                          </span>
                          <span className="text-xs text-gray-400">
                            Máx: {card.maxInDeck} cópias
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white bg-[#003566] px-2 py-1 rounded">
                          {card.count}
                        </span>
                        <button
                          onClick={() => removeAllCopies(card.id)}
                          className="p-1 rounded hover:bg-red-900/30 text-red-400"
                          title="Remover todas"
                          disabled={isCreating}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Controles de quantidade */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        Cópias: {card.count}/{card.maxInDeck}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => removeCardCopy(card.id)}
                          className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded disabled:opacity-50"
                          disabled={card.count <= 0 || isCreating}
                        >
                          -1
                        </button>
                        <button
                          onClick={() => {
                            const cardData = availableCards.find(c => c.id === card.id);
                            if (cardData) addCard(cardData);
                          }}
                          className="px-2 py-1 text-xs bg-green-700 hover:bg-green-600 rounded disabled:opacity-50"
                          disabled={card.count >= card.maxInDeck || totalCards >= 15 || isCreating}
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

          {/* 🔵 Validações */}
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566]">
            <h3 className="text-sm font-semibold text-[#FFD60A] mb-3">Validações do Deck</h3>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${deckName.trim().length >= 2 ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${deckName.trim().length >= 2 ? 'bg-green-400' : 'bg-red-400'}`} />
                Nome do deck válido
              </div>
              <div className={`flex items-center gap-2 ${totalCards >= 5 ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${totalCards >= 5 ? 'bg-green-400' : 'bg-red-400'}`} />
                Mínimo 5 cartas ({totalCards}/5)
              </div>
              <div className={`flex items-center gap-2 ${totalCards <= 15 ? 'text-green-400' : 'text-red-400'}`}>
                <div className={`w-2 h-2 rounded-full ${totalCards <= 15 ? 'bg-green-400' : 'bg-red-400'}`} />
                Máximo 15 cartas ({totalCards}/15)
              </div>
            </div>
          </div>

          {/* 🔵 Botão criar */}
          <button
            onClick={handleCreateDeck}
            disabled={!isDeckValid || isCreating}
            className={`w-full py-3 rounded-xl font-bold text-lg transition-all
              ${!isDeckValid || isCreating
                ? 'bg-gray-700 cursor-not-allowed opacity-50' 
                : 'bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-[#000814] hover:shadow-[0_0_20px_#FFD60A]'
              }`}
          >
            {isCreating ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                Criando deck...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <PlusCircle size={20} />
                Criar Deck
              </div>
            )}
          </button>
        </div>

        {/* 🔵 Coluna 2-3: Cartas disponíveis */}
        <div className="lg:col-span-2">
          <div className="p-4 rounded-xl bg-[#001D3D] border border-[#003566] h-full">
            {/* Barra de busca e filtros */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Buscar cartas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg px-4 py-2 pl-10 bg-[#000814] border border-[#003566] text-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/40"
                  disabled={isLoading || isCreating}
                />
                <div className="absolute left-3 top-2.5 opacity-60">
                  🔍
                </div>
              </div>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-lg px-3 py-2 bg-[#000814] border border-[#003566] text-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/40"
                disabled={isLoading || isCreating}
              >
                <option value="all">Todas as cartas</option>
                <option value="ataque">⚔️ Ataque</option>
                <option value="defesa">🛡️ Defesa</option>
                <option value="magia">✨ Magia</option>
              </select>
            </div>

            {/* 🔵 Estados de carregamento/erro */}
            {isLoading && (
              <div className="h-64 flex justify-center items-center">
                <div className="text-[#FFD60A] animate-pulse text-xl">
                  Carregando suas cartas...
                </div>
              </div>
            )}

            {error && (
              <div className="h-64 flex flex-col justify-center items-center text-center p-4">
                <AlertCircle className="text-red-400 mb-2" size={32} />
                <p className="text-red-400">Erro ao carregar cartas</p>
                <p className="text-gray-400 text-sm mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-sm"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* 🔵 Grid de cartas */}
            {!isLoading && !error && (
              <>
                {filteredCards.length === 0 ? (
                  <div className="h-64 flex flex-col justify-center items-center text-center p-4">
                    <div className="text-4xl mb-2">🃏</div>
                    <p className="text-gray-400">Nenhuma carta encontrada</p>
                    <p className="text-gray-500 text-sm mt-1">
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
                            whileHover={{ scale: canAddMore ? 1.05 : 1 }}
                            className={`relative w-full text-left rounded-lg p-2 transition-all focus:outline-none
                              ${!canAddMore ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#1b2b3a]'}
                              ${selectedCount > 0 ? 'ring-2 ring-[#FFD60A] bg-[#1b2b3a]/50' : 'bg-[#000814]'}
                              border ${selectedCount > 0 ? 'border-[#FFD60A]' : 'border-[#003566]'}
                            `}
                            disabled={!canAddMore || isCreating}
                            title={!canAddMore ? `Limite atingido (${selectedCount}/${card.maxInDeck})` : `Adicionar ${card.name}`}
                          >
                            {/* Badge de quantidade selecionada */}
                            {selectedCount > 0 && (
                              <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-black text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-lg">
                                {selectedCount}
                              </div>
                            )}

                            {/* Imagem da carta */}
                            <div className="w-full aspect-[3/4] rounded-md overflow-hidden mb-2">
                              {card.img ? (
                                <img
                                  src={card.img}
                                  alt={card.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-[#003566] flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">Carta</span>
                                </div>
                              )}
                            </div>

                            {/* Info da carta */}
                            <div>
                              <p className="text-sm font-semibold text-[#FFD60A] truncate">{card.name}</p>
                              <div className="flex justify-between items-center mt-1">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  card.type === 'ataque' ? 'bg-red-500/20 text-red-300' : 
                                  card.type === 'defesa' ? 'bg-blue-500/20 text-blue-300' : 
                                  'bg-purple-500/20 text-purple-300'
                                }`}>
                                  {card.type.charAt(0).toUpperCase()}
                                </span>
                                <span className="text-xs text-gray-400">Custo: {card.cost}</span>
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
  );
}