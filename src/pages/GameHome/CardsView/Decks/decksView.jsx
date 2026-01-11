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
      case "toggleActive":
        setDecks(decks.map((d) => (d.id === data.deckId ? { ...d, isActive: data.isActive } : d)));
        if (data.message) alert(data.message);
        break;

      case "delete":
        setDecks(decks.filter((d) => d.id !== data.deckId));
        if (data.message) alert(data.message);
        fetchDecks(); // Recarrega lista após exclusão
        break;

      case "edit":
        // 🔴 NAVEGAÇÃO PARA EDIÇÃO VIA REACT ROUTER
        console.log("🚀 Navegando para edição:", `/deck/edit/${playerId}/${data.deckId}`);
        navigate(`/deck/edit/${playerId}/${data.deckId}`);
        break;

      case "duplicate":
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
  const filteredDecks = decks.filter((deck) =>
    deck.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full h-full text-white select-none overflow-hidden">
      {/* brilho/grade (sutil) — não briga com o fundo do CardsView */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:46px_46px]" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-purple-500/10 blur-3xl" />

      {/* CONTEÚDO */}
      <div className="relative h-full w-full p-4 md:p-6 lg:p-8 overflow-y-auto">
        {/* CABEÇALHO */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold text-[#FFD60A] tracking-wide">
              Meus Decks
            </h1>
            <p className="text-slate-300/70 text-sm">
              {decks.length} {decks.length === 1 ? "deck criado" : "decks criados"}
            </p>
          </div>

          <motion.button
            onClick={goToCreate}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl
                       bg-gradient-to-r from-[#FFD60A] to-[#FFC300] text-[#000814] font-extrabold
                       border border-yellow-500/30
                       shadow-[0_0_28px_rgba(255,214,10,0.22)]
                       hover:shadow-[0_0_44px_rgba(255,214,10,0.30)]
                       transition"
          >
            <Plus size={18} />
            Novo Deck
          </motion.button>
        </div>

        {/* BUSCA */}
        <div className="mb-6">
          <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur
                          shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
            <input
              type="text"
              placeholder="Buscar deck pelo nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent px-4 py-3 pl-12 rounded-2xl text-white outline-none
                         placeholder:text-slate-400/60
                         focus:ring-2 focus:ring-yellow-300/20 focus:border-yellow-300/30"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-200/80"
              size={18}
            />
          </div>
        </div>

        {/* LISTA */}
        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-10 text-center
                          shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#FFD60A] mb-4" />
            <div className="animate-pulse text-[#FFD60A] font-semibold">Carregando decks...</div>
          </div>
        ) : filteredDecks.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-10 text-center
                          shadow-[0_12px_60px_rgba(0,0,0,0.35)]">
            <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bg-black/30 border border-white/10
                            flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.10)]">
              🎴
            </div>

            <h3 className="text-xl font-extrabold text-[#FFD60A] mb-2">
              {search ? "Nenhum deck encontrado" : "Nenhum deck criado"}
            </h3>

            <p className="text-slate-300/70 mb-6">
              {search ? "Tente buscar por outro nome" : "Crie seu primeiro deck para começar a jogar"}
            </p>

            {!search && (
              <motion.button
                onClick={goToCreate}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-2xl font-extrabold text-[#000814]
                           bg-gradient-to-r from-[#FFD60A] to-[#FFC300]
                           border border-yellow-500/30
                           shadow-[0_0_28px_rgba(255,214,10,0.22)]
                           hover:shadow-[0_0_44px_rgba(255,214,10,0.30)]
                           transition"
              >
                Criar Primeiro Deck
              </motion.button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredDecks.map((deck) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -3 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className={`relative rounded-2xl border backdrop-blur p-5
                            shadow-[0_18px_80px_rgba(0,0,0,0.45)] transition
                            ${
                              deck.isActive
                                ? "bg-emerald-500/10 border-emerald-300/20 hover:border-emerald-200/30"
                                : "bg-white/5 border-white/10 hover:border-white/20"
                            }`}
              >
                {/* glow hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity
                                bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.16),transparent_60%)]" />

                {/* Header */}
                <div className="flex justify-between items-start mb-4 gap-3">
                  <div className="flex-1 min-w-0">
                    <h2
                      className="text-xl font-extrabold text-[#FFD60A] mb-1 cursor-pointer hover:underline truncate"
                      onClick={() => goToEdit(deck.id)}
                      title={deck.name}
                    >
                      {deck.name}
                    </h2>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] px-2 py-1 rounded-lg border font-extrabold tracking-wide
                          ${
                            deck.isActive
                              ? "bg-emerald-500/10 text-emerald-200 border-emerald-400/20"
                              : "bg-white/5 text-slate-200/70 border-white/10"
                          }`}
                      >
                        {deck.isActive ? "ATIVO" : "INATIVO"}
                      </span>

                      <span className="text-sm text-slate-300/70">
                        {deck.totalCards} carta{deck.totalCards !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
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
                </div>

                {/* Cards Preview */}
                <div
                  className="mb-4 cursor-pointer rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 transition-colors p-3"
                  onClick={() => goToEdit(deck.id)}
                  title="Clique para editar este deck"
                >
                  <div className="space-y-1">
                    {deck.cards.slice(0, 3).map((card, idx) => (
                      <div
                        key={`${deck.id}-${card.id}-${idx}`}
                        className="flex justify-between text-sm gap-3"
                      >
                        <span className="truncate text-slate-200/80">{card.name}</span>
                        <span className="text-[#FFD60A] font-extrabold min-w-[2rem] text-right">
                          x{card.quantity}
                        </span>
                      </div>
                    ))}

                    {deck.cards.length > 3 && (
                      <div className="text-xs text-slate-300/60 mt-2">
                        + {deck.cards.length - 3} carta{deck.cards.length - 3 !== 1 ? "s" : ""}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-white/10 flex justify-between items-center gap-3">
                  <div className="text-xs text-slate-300/60">
                    Criado em {new Date(deck.createdAt).toLocaleDateString("pt-BR")}
                  </div>

                  <button
                    onClick={() => goToEdit(deck.id)}
                    className="text-sm text-[#FFD60A] hover:text-[#FFC300] flex items-center gap-1 transition-colors font-extrabold"
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
    </div>
  );
};

export default DecksView;
