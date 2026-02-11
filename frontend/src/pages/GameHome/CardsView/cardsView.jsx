// src/pages/CardsView/cardsView.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Settings,
  X,
  Bell,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import DecksView from "./Decks/decksView";
import CreateDeck from "./Decks/CreateDeck";

// ✅ Usa o client oficial (/api -> gateway-api via Nginx)
import { apiRequest } from "@/services/api.js";
import { authUtils } from "@/utils/auth.js";

// ✅ helper: resolve ID da carta de forma robusta (evita key undefined)
function getCardKey(card, idx) {
  const id =
    card?.id ??
    card?.cardId ??
    card?.CD_ID ??
    card?.CARD_ID ??
    card?.uuid ??
    null;

  // se não tiver id, faz fallback determinístico usando name+idx
  if (id != null && String(id).trim() !== "") return String(id);
  const name = String(card?.name ?? "card");
  return `${name}-${idx}`;
}

function CardsView() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [page, setPage] = useState("cards");
  const [decks, setDecks] = useState([]);

  // Estados para cartas da API
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ pega playerId do storage (robusto)
  const playerId = useMemo(() => {
    const player = authUtils.getPlayerData?.() || null;
    return player?.PL_ID ?? player?.id ?? player?.playerId ?? null;
  }, []);

  // ✅ função reutilizável pra recarregar cartas
  const reloadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!playerId) {
        throw new Error(
          "playerId ausente. Faça login novamente para carregar seu inventário."
        );
      }

      // ✅ Gateway: GET /api/player/:playerId/cards
      const res = await apiRequest(
        `/player/${encodeURIComponent(playerId)}/cards`,
        { method: "GET" }
      );

      if (!res?.success) {
        throw new Error(
          res?.error || `Erro ao buscar cartas (status ${res?.status ?? "?"})`
        );
      }

      // ✅ aceita formatos comuns de resposta
      const data = res.data;
      const list =
        data?.cards ||
        data?.data?.cards ||
        data?.data ||
        (Array.isArray(data) ? data : []) ||
        [];

      setCards(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err?.message || "Falha ao buscar cartas");
      console.error("❌ Erro ao buscar cartas:", err);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  // 🔵 Buscar cartas da API (via playerId do usuário logado)
  useEffect(() => {
    reloadCards();
  }, [reloadCards]);

  function handleCreateDeck(newDeck) {
    setDecks((prev) => [...prev, newDeck]);
    setPage("decks");
  }

  // 🔵 Filtrar cartas
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchesSearch = String(card?.name ?? "")
        .toLowerCase()
        .includes(search.toLowerCase());

      const cardType = String(card?.type ?? "").toLowerCase(); // "defesa", "ataque", "magia"
      const matchesType =
        filter === "all" ||
        (filter === "attack" && cardType === "ataque") ||
        (filter === "defense" && cardType === "defesa") ||
        (filter === "magic" && cardType === "magia");

      return matchesSearch && matchesType;
    });
  }, [cards, search, filter]);

  // ✅ Só front: evita Tailwind dinâmico
  const navBtnClass =
    "w-full rounded-2xl border transition-all shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]";
  const navBtnOpen = "flex items-center justify-start gap-3 px-4 py-2";
  const navBtnClosed = "flex items-center justify-center px-0 py-2";

  // ✅ botão X: volta SEMPRE pro GameHome (rota oficial)
  const handleClose = () => {
    // se quiser “resetar” UI local ao sair:
    setPage("cards");
    setSearch("");
    setFilter("all");
    navigate("/gamehome", { replace: true });
  };

  return (
    <div className="relative flex w-screen h-screen bg-[#000814] text-white select-none overflow-hidden">
      {/* ====== BACKGROUND CYBER (somente estilo) ====== */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 h-[380px] w-[380px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[460px] w-[460px] rounded-full bg-yellow-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/8 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_bottom,transparent,rgba(255,255,255,0.06),transparent)] bg-[size:100%_6px]" />
      </div>

      {/* SIDEBAR — FIXA */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 70 }}
        transition={{ duration: 0.3 }}
        className="
          fixed left-0 top-0 z-40
          h-screen overflow-y-auto
          bg-black/35
          border-r border-white/10
          backdrop-blur-xl
          shadow-[0_0_60px_rgba(0,0,0,0.55)]
          flex flex-col justify-between p-4
        "
      >
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className={`${sidebarOpen ? "block" : "hidden"} select-none`}>
              <div className="text-[10px] font-mono tracking-[0.35em] text-slate-300/60">
                SECURITY ZONE
              </div>
              <div className="text-sm font-extrabold text-yellow-300">
                INVENTORY
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="
                p-2 rounded-xl
                bg-white/5 border border-white/10
                hover:bg-white/10 transition-all
              "
              title={sidebarOpen ? "Recolher" : "Expandir"}
            >
              {sidebarOpen ? (
                <ChevronsLeft size={20} />
              ) : (
                <ChevronsRight size={20} />
              )}
            </button>
          </div>

          <div
            className={`flex flex-col gap-3 w-full ${
              sidebarOpen ? "" : "items-center"
            }`}
          >
            <button
              onClick={() => setPage("decks")}
              className={`${navBtnClass} ${
                sidebarOpen ? navBtnOpen : navBtnClosed
              } bg-white/5 hover:bg-white/10 border-white/10 text-yellow-300`}
            >
              <span className="text-lg">📚</span>
              {sidebarOpen && (
                <span className="font-semibold tracking-wide">Decks</span>
              )}
            </button>

            <button
              onClick={() => setPage("cards")}
              className={`${navBtnClass} ${
                sidebarOpen ? navBtnOpen : navBtnClosed
              } bg-white/5 hover:bg-white/10 border-white/10 text-yellow-300`}
            >
              <span className="text-lg">🃏</span>
              {sidebarOpen && (
                <span className="font-semibold tracking-wide">Cards</span>
              )}
            </button>

            <button
              className={`${navBtnClass} ${
                sidebarOpen ? navBtnOpen : navBtnClosed
              } bg-white/5 hover:bg-white/10 border-white/10 text-yellow-300`}
            >
              <span className="text-lg">⭐</span>
              {sidebarOpen && (
                <span className="font-semibold tracking-wide">Favoritos</span>
              )}
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={() => setPage("create")}
            className={`
              relative w-full mt-6 rounded-2xl font-extrabold
              ${sidebarOpen ? "py-3" : "py-2"}
              bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814]
              border border-yellow-300/40
              shadow-[0_0_26px_rgba(255,214,10,0.35)]
              hover:shadow-[0_0_40px_rgba(255,214,10,0.55)]
              transition-all overflow-hidden
              flex items-center justify-center
            `}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
              animate={{ x: ["-120%", "120%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="relative z-10">
              {sidebarOpen ? "➕ Novo deck" : "➕"}
            </span>
          </button>

          <div
            className={`mt-6 text-[10px] font-mono text-slate-300/40 ${
              sidebarOpen ? "text-left" : "text-center"
            }`}
          >
            v1.0 • UI CYBER
          </div>
        </div>
      </motion.aside>

      {/* MAIN */}
      <main
        className={`relative z-10 flex-1 h-full p-6 transition-all duration-300 ${
          sidebarOpen ? "ml-[256px]" : "ml-[70px]"
        } overflow-y-auto min-w-0`}
      >
        {page === "cards" && (
          <>
            {/* TOPBAR */}
            <div
              className="
                mb-6
                rounded-2xl
                border border-white/10
                bg-black/25
                backdrop-blur-xl
                shadow-[0_18px_70px_rgba(0,0,0,0.55)]
                p-4
              "
            >
              <div className="flex items-center gap-4 min-w-0">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="
                    bg-white/5
                    px-4 py-2
                    rounded-xl
                    border border-white/10
                    outline-none
                    focus:border-yellow-300/40
                    text-slate-100
                  "
                >
                  <option value="all" className="bg-[#000814] text-slate-100">
                    All cards
                  </option>
                  <option
                    value="attack"
                    className="bg-[#000814] text-slate-100"
                  >
                    Attack
                  </option>
                  <option
                    value="defense"
                    className="bg-[#000814] text-slate-100"
                  >
                    Defense
                  </option>
                  <option
                    value="magic"
                    className="bg-[#000814] text-slate-100"
                  >
                    Magic
                  </option>
                </select>

                <div className="relative flex-1 min-w-0">
                  <input
                    type="text"
                    placeholder="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="
                      w-full
                      bg-white/5
                      px-4 py-2 pl-10
                      rounded-xl
                      border border-white/10
                      outline-none
                      focus:border-cyan-300/40
                      placeholder:text-slate-300/40
                    "
                  />
                  <Search
                    className="absolute left-3 top-2.5 text-slate-200/50"
                    size={18}
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    <Bell className="hover:text-yellow-300" size={18} />
                  </button>
                  <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition">
                    <Settings className="hover:text-cyan-200" size={18} />
                  </button>

                  {/* ✅ X volta pro GameHome */}
                  <button
                    onClick={handleClose}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-red-500/15 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    title="Voltar para o GameHome"
                  >
                    <X className="hover:text-red-400" size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-4 h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent" />
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center items-center h-64">
                <div className="text-[#FFD60A] font-mono tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full border-2 border-yellow-300 border-t-transparent animate-spin" />
                    Carregando cartas...
                  </span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-900/25 border border-red-400/30 rounded-2xl p-4 mb-4 backdrop-blur">
                <p className="text-red-300">Erro: {error}</p>
                <div className="flex gap-3 mt-3">
                  <button
                    onClick={reloadCards}
                    className="
                      px-4 py-2 rounded-xl
                      bg-white/5 border border-white/10
                      hover:bg-white/10 transition
                    "
                  >
                    Recarregar
                  </button>
                  <button
                    onClick={handleClose}
                    className="
                      px-4 py-2 rounded-xl
                      bg-red-500/15 border border-red-400/25
                      hover:bg-red-500/20 transition
                    "
                  >
                    Voltar
                  </button>
                </div>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && filteredCards.length === 0 && (
              <div className="flex flex-col justify-center items-center h-64 text-center">
                <div className="text-6xl mb-4 drop-shadow-[0_0_18px_rgba(255,214,10,0.25)]">
                  🃏
                </div>
                <h3 className="text-xl text-[#FFD60A] mb-2 font-extrabold tracking-wide">
                  Nenhuma carta encontrada
                </h3>
                <p className="text-slate-300/60 max-w-lg">
                  {search || filter !== "all"
                    ? "Tente alterar os filtros de busca"
                    : "Você ainda não possui cartas no inventário"}
                </p>
              </div>
            )}

            {/* Grid */}
            {!isLoading && !error && filteredCards.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mt-6 pb-10">
                {filteredCards.map((card, idx) => (
                  <motion.div
                    key={getCardKey(card, idx)}
                    whileHover={{ scale: 1.05 }}
                    className="
                      relative overflow-hidden
                      rounded-2xl
                      border border-white/10
                      bg-white/5
                      backdrop-blur-xl
                      shadow-[0_20px_80px_rgba(0,0,0,0.55)]
                      p-4
                      cursor-pointer
                    "
                  >
                    <div className="pointer-events-none absolute -top-10 -left-10 w-32 h-32 bg-cyan-500/10 blur-2xl rounded-full" />
                    <div className="pointer-events-none absolute -bottom-12 -right-12 w-40 h-40 bg-yellow-500/10 blur-2xl rounded-full" />

                    {Number(card?.quantity || 0) > 1 && (
                      <div className="absolute top-3 right-3 bg-[#FFD60A] text-[#000814] rounded-full w-8 h-8 flex items-center justify-center font-black text-sm shadow-[0_0_18px_rgba(255,214,10,0.45)]">
                        {card.quantity}
                      </div>
                    )}

                    <p className="text-center font-extrabold text-[#FFD60A] mb-2 tracking-wide drop-shadow">
                      {card.name}
                    </p>

                    <div className="w-full flex justify-center mb-3">
                      {card.img ? (
                        <img
                          src={card.img}
                          alt={card.name}
                          className="w-full h-44 object-cover rounded-xl border border-white/10 shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src =
                              "https://via.placeholder.com/150x200/001D3D/FFD60A?text=Carta";
                          }}
                        />
                      ) : (
                        <div className="w-full h-44 bg-black/25 rounded-xl border border-white/10 flex items-center justify-center">
                          <span className="text-slate-300/50">Sem imagem</span>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-slate-200/80 mt-2 space-y-1">
                      <div className="flex justify-between">
                        <span>
                          Tipo:{" "}
                          <span className="text-[#FFD60A] font-semibold">
                            {card.type}
                          </span>
                        </span>
                        <span>
                          Custo:{" "}
                          <span className="text-[#FFD60A] font-semibold">
                            {card.cost}
                          </span>
                        </span>
                      </div>

                      {card.life !== null && card.life !== undefined && (
                        <div>
                          Vida:{" "}
                          <span className="text-emerald-300 font-semibold">
                            {card.life}
                          </span>
                        </div>
                      )}
                      {card.attack !== null && card.attack !== undefined && (
                        <div>
                          Ataque:{" "}
                          <span className="text-red-300 font-semibold">
                            {card.attack}
                          </span>
                        </div>
                      )}
                      {card.defense !== null && card.defense !== undefined && (
                        <div>
                          Defesa:{" "}
                          <span className="text-cyan-200 font-semibold">
                            {card.defense}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#FFD60A] rounded-full shadow-[0_0_14px_rgba(255,214,10,0.55)]" />

                    <motion.div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      initial={{ x: "-120%" }}
                      animate={{ x: "120%" }}
                      transition={{
                        duration: 3.2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.4,
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Decks / Create */}
        {page === "decks" && (
          <DecksView decks={decks} setDecks={setDecks} setPage={setPage} />
        )}
        {page === "create" && (
          <CreateDeck
            onCreate={handleCreateDeck}
            onBack={() => {
              setPage("decks");
              // opcional: se quiser garantir que cartas estejam atualizadas ao voltar depois
              // reloadCards();
            }}
          />
        )}
      </main>
    </div>
  );
}

export default CardsView;
