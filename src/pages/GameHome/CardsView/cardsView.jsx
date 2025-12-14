import React, { useState, useEffect } from "react";
import { Search, Settings, X, Bell, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";

import DecksView from "./Decks/decksView";
import CreateDeck from "./Decks/CreateDeck";

function CardsView() {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [page, setPage] = useState("cards");
    const [decks, setDecks] = useState([]);
    
    // Estados para cartas da API
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // 🔵 Buscar cartas da API
    useEffect(() => {
        const fetchPlayerCards = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                // Por enquanto, use playerId = 1 (KLB)
                // Depois substitua pelo ID do jogador logado
                const playerId = 1;
                const response = await fetch(`http://localhost:3000/api/player/${playerId}/cards`);
                
                if (!response.ok) {
                    throw new Error(`Erro HTTP: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.success) {
                    setCards(data.cards);
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

    function handleCreateDeck(newDeck) {
        setDecks([...decks, newDeck]);
        setPage("decks");
    }

    // 🔵 Filtrar cartas
    const filteredCards = cards.filter((card) => {
        const matchesSearch = card.name.toLowerCase().includes(search.toLowerCase());
        // Ajuste o tipo para corresponder aos valores da API
        const cardType = card.type; // "defesa", "ataque", "magia"
        const matchesType = filter === "all" || 
                           (filter === "attack" && cardType === "ataque") ||
                           (filter === "defense" && cardType === "defesa") ||
                           (filter === "magic" && cardType === "magia");
        return matchesSearch && matchesType;
    });

    return (
        <div className="flex w-screen h-screen bg-[#000814] text-white select-none">

            {/* SIDEBAR — FIXA */}
            <motion.aside
                animate={{ width: sidebarOpen ? 256 : 70 }}
                transition={{ duration: 0.3 }}
                className="
                    fixed left-0 top-0
                    h-screen 
                    overflow-y-auto 
                    bg-[#001D3D]/80 border-r border-[#003566] 
                    backdrop-blur-md shadow-[0_0_35px_rgba(0,0,0,0.4)]
                    flex flex-col justify-between p-4
                "
            >
                {/* Botão de recolher */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="mb-4 p-2 rounded-lg bg-[#000814] border border-[#003566] hover:bg-[#003566] transition-all self-end"
                >
                    {sidebarOpen ? <ChevronsLeft size={20} /> : <ChevronsRight size={20} />}
                </button>

                {/* BOTÕES */}
                <div className={`flex flex-col gap-4 w-full ${sidebarOpen ? "" : "items-center"}`}>

                    <button
                        onClick={() => setPage("decks")}
                        className={`flex items-center justify-${sidebarOpen ? "start" : "center"} gap-3 w-full px-${sidebarOpen ? "4" : "0"} py-2 bg-[#000814] hover:bg-[#003566] text-[#FFD60A] border border-[#FFD60A]/40 rounded-2xl shadow-inner transition-all`}>
                        {sidebarOpen ? "📚 Decks" : "📚"}
                    </button>

                    <button
                        onClick={() => setPage("cards")}
                        className={`flex items-center justify-${sidebarOpen ? "start" : "center"} gap-3 w-full px-${sidebarOpen ? "4" : "0"} py-2 bg-[#000814] hover:bg-[#003566] text-[#FFD60A] border border-[#FFD60A]/40 rounded-2xl shadow-inner transition-all`}>
                        {sidebarOpen ? "🃏 Cards" : "🃏"}
                    </button>

                    <button className={`flex items-center justify-${sidebarOpen ? "start" : "center"} gap-3 w-full px-${sidebarOpen ? "4" : "0"} py-2 bg-[#000814] hover:bg-[#003566] text-[#FFD60A] border border-[#FFD60A]/40 rounded-2xl shadow-inner transition-all`}>
                        {sidebarOpen ? "⭐ Favoritos" : "⭐"}
                    </button>
                </div>

                {/* Botão final — Criar Deck */}
                <button
                    onClick={() => setPage("create")}
                    className={`w-full py-${sidebarOpen ? "3" : "2"} mt-6 bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] font-bold rounded-2xl shadow-[0_0_20px_#FFD60A] hover:shadow-[0_0_35px_#FFD60A] transition-all flex items-center justify-center`}
                >
                    {sidebarOpen ? "➕ Novo deck" : "➕"}
                </button>
            </motion.aside>

            {/* MAIN */}
            <main
                className={`flex-1 h-full p-6 transition-all duration-300 ${sidebarOpen ? "ml-[256px]" : "ml-[70px]"}`}
            >
                {/* 🔵 CONTEÚDO DINÂMICO */}
                {page === "cards" && (
                    <>
                        {/* TOPBAR */}
                        <div className="flex items-center gap-4 mb-6">
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-[#001D3D] px-4 py-2 rounded-lg border border-[#003566]"
                            >
                                <option value="all">All cards</option>
                                <option value="attack">Attack</option>
                                <option value="defense">Defense</option>
                                <option value="magic">Magic</option>
                            </select>

                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-[#001D3D] px-4 py-2 pl-10 rounded-lg border border-[#003566]"
                                />
                                <Search className="absolute left-3 top-2.5 opacity-60" size={18} />
                            </div>

                            <Bell className="cursor-pointer hover:text-[#FFD60A]" />
                            <Settings className="cursor-pointer hover:text-[#FFD60A]" />
                            <X className="cursor-pointer hover:text-red-500" />
                        </div>

                        {/* 🔵 ESTADOS DE CARREGAMENTO/ERRO */}
                        {isLoading && (
                            <div className="flex justify-center items-center h-64">
                                <div className="text-[#FFD60A] animate-pulse">
                                    Carregando cartas...
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
                                <p className="text-red-400">Erro: {error}</p>
                                <button 
                                    onClick={() => window.location.reload()}
                                    className="mt-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        )}

                        {/* 🔵 MENSAGEM SE NÃO HOUVER CARTAS */}
                        {!isLoading && !error && filteredCards.length === 0 && (
                            <div className="flex flex-col justify-center items-center h-64 text-center">
                                <div className="text-6xl mb-4">🃏</div>
                                <h3 className="text-xl text-[#FFD60A] mb-2">Nenhuma carta encontrada</h3>
                                <p className="text-gray-400">
                                    {search || filter !== "all" 
                                        ? "Tente alterar os filtros de busca" 
                                        : "Você ainda não possui cartas no inventário"}
                                </p>
                            </div>
                        )}

                        {/* 🔵 GRID DE CARTAS */}
                        {!isLoading && !error && filteredCards.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-6">
                                {filteredCards.map((card) => (
                                    <motion.div
                                        key={card.id}
                                        whileHover={{ scale: 1.05 }}
                                        className="relative bg-[#001D3D]/70 rounded-xl border border-[#003566] shadow-[0_0_25px_#003566] p-4 cursor-pointer backdrop-blur-md"
                                    >
                                        {/* BADGE DE QUANTIDADE */}
                                        {card.quantity > 1 && (
                                            <div className="absolute -top-2 -right-2 bg-[#FFD60A] text-[#000814] rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shadow-lg">
                                                {card.quantity}
                                            </div>
                                        )}

                                        <p className="text-center font-bold text-[#FFD60A] mb-2 tracking-wide">
                                            {card.name}
                                        </p>

                                        <div className="w-full flex justify-center mb-2">
                                            {card.img ? (
                                                <img
                                                    src={card.img}
                                                    alt={card.name}
                                                    className="w-full h-auto rounded-lg shadow-lg"
                                                    onError={(e) => {
                                                        e.target.src = "https://via.placeholder.com/150x200/001D3D/FFD60A?text=Carta";
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-40 bg-[#003566] rounded-lg flex items-center justify-center">
                                                    <span className="text-gray-400">Sem imagem</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* INFO DA CARTA */}
                                        <div className="text-xs text-gray-300 mt-2">
                                            <div className="flex justify-between">
                                                <span>Tipo: <span className="text-[#FFD60A]">{card.type}</span></span>
                                                <span>Custo: <span className="text-[#FFD60A]">{card.cost}</span></span>
                                            </div>
                                            {card.life !== null && (
                                                <div>Vida: <span className="text-green-400">{card.life}</span></div>
                                            )}
                                            {card.attack !== null && (
                                                <div>Ataque: <span className="text-red-400">{card.attack}</span></div>
                                            )}
                                            {card.defense !== null && (
                                                <div>Defesa: <span className="text-blue-400">{card.defense}</span></div>
                                            )}
                                        </div>

                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFD60A] rounded-full shadow-[0_0_10px_#FFD60A]" />
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </>
                )}

                {page === "decks" && <DecksView decks={decks} setDecks={setDecks} setPage={setPage} />}
                {page === "create" && <CreateDeck onCreate={handleCreateDeck} onBack={() => setPage("decks")} />}
            </main>
        </div>
    );
}

export default CardsView;