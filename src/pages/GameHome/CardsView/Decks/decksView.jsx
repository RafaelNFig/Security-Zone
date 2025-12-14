import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, ChevronRight } from "lucide-react";
import DeckActions from "./DeckActions";
import { useNavigate } from "react-router-dom"; // 🔴 IMPORTE ESTE HOOK

const DecksView = () => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const playerId = 1;
  const navigate = useNavigate(); // 🔴 HOOK PARA NAVEGAÇÃO

  // 🔵 Buscar decks
  useEffect(() => {
    fetchDecks();
  }, []);

  const fetchDecks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/player/${playerId}/decks`);
      const data = await res.json();
      if (data.success) setDecks(data.decks);
    } catch (err) {
      console.error("Erro ao buscar decks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔵 Handler para ações - ATUALIZADA PARA USAR NAVIGATE
  const handleDeckAction = (action, data) => {
    console.log(`Ação recebida: ${action}`, data);
    
    switch (action) {
      case 'toggleActive':
        setDecks(decks.map(d => 
          d.id === data.deckId ? { ...d, isActive: data.isActive } : d
        ));
        if (data.message) alert(data.message);
        break;
        
      case 'delete':
        setDecks(decks.filter(d => d.id !== data.deckId));
        if (data.message) alert(data.message);
        fetchDecks(); // Recarrega lista após exclusão
        break;
        
      case 'edit':
        // 🔴 NAVEGAÇÃO PARA EDIÇÃO VIA REACT ROUTER
        console.log("🚀 Navegando para edição:", `/deck/edit/${playerId}/${data.deckId}`);
        navigate(`/deck/edit/${playerId}/${data.deckId}`);
        break;
        
      case 'duplicate':
        fetchDecks(); // Recarrega lista
        break;
        
      default:
        console.log(`Ação não tratada: ${action}`);
    }
  };

  // 🔵 Navegação ATUALIZADA
  const goToCreate = () => navigate("/deck/create"); // Ou a rota que você quiser
  const goToEdit = (deckId) => {
    console.log("🎯 Indo editar deck:", deckId);
    navigate(`/deck/edit/${playerId}/${deckId}`);
  };

  // 🔵 Filtro
  const filteredDecks = decks.filter(deck =>
    deck.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full h-full bg-[#000814] text-white p-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#FFD60A]">Meus Decks</h1>
          <p className="text-gray-400">
            {decks.length} {decks.length === 1 ? 'deck criado' : 'decks criados'}
          </p>
        </div>
        <button
          onClick={goToCreate}
          className="px-4 py-2 bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-black font-bold rounded-lg hover:shadow-[0_0_15px_#FFD60A] transition-all hover:scale-105"
        >
          <Plus className="inline mr-2" size={20} />
          Novo Deck
        </button>
      </div>

      {/* Barra de busca */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar deck pelo nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#001D3D] border border-[#003566] rounded-lg px-4 py-3 pl-12 text-white focus:outline-none focus:ring-2 focus:ring-[#FFD60A]/50"
          />
          <Search className="absolute left-4 top-3.5 opacity-60" size={20} />
        </div>
      </div>

      {/* Lista de decks */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD60A] mb-4"></div>
          <div className="animate-pulse text-[#FFD60A]">Carregando decks...</div>
        </div>
      ) : filteredDecks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🎴</div>
          <h3 className="text-xl text-[#FFD60A] mb-2">
            {search ? "Nenhum deck encontrado" : "Nenhum deck criado"}
          </h3>
          <p className="text-gray-400 mb-4">
            {search ? "Tente buscar por outro nome" : "Crie seu primeiro deck para começar a jogar"}
          </p>
          {!search && (
            <button
              onClick={goToCreate}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-black font-bold rounded-xl hover:shadow-[0_0_20px_#FFD60A] transition-all"
            >
              Criar Primeiro Deck
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDecks.map((deck) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`p-5 rounded-xl border-2 transition-all ${
                deck.isActive
                  ? 'bg-gradient-to-br from-green-900/20 to-green-900/5 border-green-500/50 hover:border-green-400'
                  : 'bg-gradient-to-br from-[#001D3D] to-[#000814] border-[#003566] hover:border-[#FFD60A]/30'
              }`}
            >
              {/* Cabeçalho */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  <h2 
                    className="text-xl font-bold text-[#FFD60A] mb-1 cursor-pointer hover:underline truncate"
                    onClick={() => goToEdit(deck.id)}
                    title={deck.name}
                  >
                    {deck.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      deck.isActive 
                        ? 'bg-green-700/50 text-green-300' 
                        : 'bg-gray-700/50 text-gray-300'
                    }`}>
                      {deck.isActive ? 'ATIVO' : 'INATIVO'}
                    </span>
                    <span className="text-sm text-gray-400">
                      {deck.totalCards} carta{deck.totalCards !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                
                {/* DeckActions */}
                <DeckActions
                  deckId={deck.id}
                  deckName={deck.name}
                  isActive={deck.isActive}
                  playerId={playerId}
                  compact={true}
                  onActionComplete={handleDeckAction}
                  hideEditButton={true}
                />
              </div>

              {/* Cartas - Área clicável */}
              <div 
                className="mb-4 cursor-pointer hover:bg-white/5 p-2 rounded transition-colors"
                onClick={() => goToEdit(deck.id)}
                title="Clique para editar este deck"
              >
                <div className="space-y-1">
                  {deck.cards.slice(0, 3).map((card, idx) => (
                    <div key={`${deck.id}-${card.id}-${idx}`} className="flex justify-between text-sm hover:text-white transition-colors">
                      <span className="truncate text-gray-300">{card.name}</span>
                      <span className="text-[#FFD60A] font-bold min-w-[2rem] text-right">x{card.quantity}</span>
                    </div>
                  ))}
                  {deck.cards.length > 3 && (
                    <div className="text-xs text-gray-400 mt-2">
                      + {deck.cards.length - 3} carta{deck.cards.length - 3 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé */}
              <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  Criado em {new Date(deck.createdAt).toLocaleDateString('pt-BR')}
                </div>
                <button
                  onClick={() => goToEdit(deck.id)}
                  className="text-sm text-[#FFD60A] hover:text-[#FFC300] flex items-center gap-1 transition-colors font-medium"
                  title="Editar este deck"
                >
                  Editar
                  <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecksView;