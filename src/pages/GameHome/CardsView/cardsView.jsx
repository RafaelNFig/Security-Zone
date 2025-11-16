import React, { useState } from "react";
import { Search, Settings, X, Bell, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";

import DecksView from "./Decks/decksView";
import CreateDeck from "./Decks/CreateDeck";

const cards = [
    { id: 1, name: "Página Fake de Login", type: "attack", img: "/img/loginFake.png" },
    { id: 2, name: "Detector de Redes Falsas", type: "defense", img: "/img/detectarede.png" },
    { id: 3, name: "Captura de Pacotes", type: "atack", img: "/img/capturapacotes.png" },
    { id: 4, name: "Atualização de Software", type: "magic", img: "/img/atualizacao.png" },
    { id: 5, name: "Escudo Digital", type: "magic", img: "/img/escudo.png" },
    { id: 6, name: "Evil Twin", type: "attack", img: "/img/eviltwin.png" },
    { id: 7, name: "Injeçao de Script", type: "attack", img: "/img/injecaoscript.png" },
    { id: 8, name: "Software Malicioso", type: "magic", img: "/img/malicioso.png" },
    { id: 9, name: "Modo de Navegação", type: "defense", img: "/img/modonavega.png" },
    { id: 10, name: "Senha Forte++", type: "defense", img: "/img/senhaforte.png" },
    { id: 11, name: "VPN Ativada", type: "defense", img: "/img/vpn.png" },
    { id: 12, name: "Firewall Básico", type: "defense", img: "/img/firewall.png" },
];

function CardsView() {
    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // 🔵 controle de páginas internas
    const [page, setPage] = useState("cards");
    const [decks, setDecks] = useState([]);

    function handleCreateDeck(newDeck) {
        setDecks([...decks, newDeck]);
        setPage("decks"); // volta para a lista de decks
    }

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

                        {/* GRID DE CARTAS */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-6">
                            {cards
                                .filter((c) => {
                                    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
                                    const matchesType = filter === "all" || c.type === filter;
                                    return matchesSearch && matchesType;
                                })
                                .map((card) => (
                                    <motion.div
                                        key={card.id}
                                        whileHover={{ scale: 1.05 }}
                                        className="relative bg-[#001D3D]/70 rounded-xl border border-[#003566] shadow-[0_0_25px_#003566] p-4 cursor-pointer backdrop-blur-md"
                                    >
                                        <p className="text-center font-bold text-[#FFD60A] mb-2 tracking-wide">
                                            {card.name}
                                        </p>

                                        <div className="w-full flex justify-center">
                                            <img
                                                src={card.img}
                                                alt={card.name}
                                                className="w-full h-auto rounded-lg shadow-lg"
                                            />
                                        </div>

                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFD60A] rounded-full shadow-[0_0_10px_#FFD60A]" />
                                    </motion.div>
                                ))}
                        </div>
                    </>
                )}

                {page === "decks" && <DecksView decks={decks} setDecks={setDecks} setPage={setPage} />}
                {page === "create" && <CreateDeck onCreate={handleCreateDeck} onBack={() => setPage("decks")} />}
            </main>
        </div>
    );
}

export default CardsView;
