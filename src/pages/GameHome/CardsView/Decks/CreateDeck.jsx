import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, PlusCircle, Paintbrush, CheckCircle } from "lucide-react";

/**
 * CreateDeck.jsx - versão responsiva
 * - empilha colunas em mobile (md: 2 colunas)
 * - grid de cartas responsivo com scroll
 * - botões e inputs full-width em telas pequenas
 * - modal de sucesso responsivo
 */

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

export default function CreateDeck({ onBack = () => {}, onCreate = () => {} }) {
  const [deckName, setDeckName] = useState("");
  const [selectedCards, setSelectedCards] = useState([]);
  const [deckColor, setDeckColor] = useState("#FFD60A");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showSuccess, setShowSuccess] = useState(false);

  function toggleCard(id) {
    setSelectedCards((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  function handleCreate() {
    if (deckName.trim().length < 2) {
      alert("Digite um nome válido para o deck.");
      return;
    }
    if (selectedCards.length < 3) {
      alert("Selecione pelo menos 3 cartas.");
      return;
    }

    const newDeck = {
      id: Date.now(),
      name: deckName,
      cards: selectedCards,
      color: deckColor,
    };

    onCreate(newDeck);

    // sucesso
    setShowSuccess(true);

    // limpa (mantém cor)
    setDeckName("");
    setSelectedCards([]);
  }

  return (
    <div className="flex-1 w-full h-full bg-[#000814] text-white p-4 md:p-6 lg:p-8 overflow-y-auto">
      {/* Modal de sucesso (responsivo) */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-sm bg-[#001D3D] border border-[#003566] rounded-xl p-5 text-center">
            <CheckCircle size={56} className="text-[#00FF7F] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-[#FFD60A] mb-2">Deck criado!</h2>
            <p className="text-sm text-gray-200 mb-4">Seu deck foi salvo com sucesso.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowSuccess(false)}
                className="px-4 py-2 rounded-lg bg-[#FFD60A] text-black font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-md bg-[#001D3D] border border-[#003566] hover:bg-[#00243a]"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-2xl md:text-3xl font-bold text-[#FFD60A]">Criar Novo Deck</h1>
      </div>

      {/* Form principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* coluna esquerda - informações */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Nome do Deck</label>
            <input
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Ex.: Cyber Defenders"
              className="w-full rounded-xl px-4 py-3 bg-[#001D3D] border border-[#003566] text-white outline-none focus:ring-2 focus:ring-[#FFD60A]/40"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paintbrush size={18} className="text-[#FFD60A]" />
              <span className="text-sm font-medium">Cor do Deck</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* input color nativo - responsivo */}
              <input
                type="color"
                value={deckColor}
                onChange={(e) => setDeckColor(e.target.value)}
                className="w-14 h-10 rounded-md p-0 border-0 cursor-pointer"
                aria-label="Escolher cor do deck"
              />
              {/* sugestões de cor rápidas */}
              <div className="flex gap-2">
                {["#FFD60A", "#8e44ad", "#3a6ff7", "#2ecc71", "#e74c3c"].map((c) => (
                  <button
                    key={c}
                    onClick={() => setDeckColor(c)}
                    aria-label={`Selecionar cor ${c}`}
                    className={`w-8 h-8 rounded-full border-2 ${deckColor === c ? "border-white" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-300 mb-2">Resumo</p>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <p className="text-sm"><span className="font-semibold text-[#FFD60A]">Nome:</span> {deckName || "—"}</p>
              <p className="text-sm"><span className="font-semibold text-[#FFD60A]">Cor:</span> <span className="inline-block w-4 h-4 align-middle ml-2 rounded" style={{ background: deckColor }} /></p>
              <p className="text-sm"><span className="font-semibold text-[#FFD60A]">Cartas selecionadas:</span> {selectedCards.length}</p>
            </div>
          </div>
        </div>

        {/* coluna direita - seleção de cartas */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#001D3D] px-3 py-2 rounded-lg border border-[#003566] text-sm"
              >
                <option value="all">Todas</option>
                <option value="attack">⚔️ Ataque</option>
                <option value="defense">🛡 Defesa</option>
                <option value="magic">✨ Magia</option>
              </select>
              <p className="text-sm text-gray-300 hidden sm:block">Selecione 3–10 cartas</p>
            </div>

            <div className="text-sm text-gray-400">
              <span className="text-[#FFD60A] font-semibold">{selectedCards.length}</span> selecionadas
            </div>
          </div>

          {/* grid responsiva com scroll vertical em altura limitada */}
          <div className="h-[60vh] md:h-[68vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
              {cards
                .filter((c) => typeFilter === "all" || c.type === typeFilter)
                .map((card) => {
                  const isSelected = selectedCards.includes(card.id);
                  return (
                    <motion.button
                      key={card.id}
                      onClick={() => toggleCard(card.id)}
                      whileHover={{ scale: 1.03 }}
                      className={`relative w-full text-left rounded-xl p-2 transition-shadow focus:outline-none
                        ${isSelected ? "ring-2 ring-[#FFD60A] bg-[#1b2b3a]" : "bg-[#001D3D]"}
                        border ${isSelected ? "border-[#FFD60A]" : "border-[#003566]"}
                      `}
                      aria-pressed={isSelected}
                    >
                      <div className="w-full aspect-[3/4] rounded-lg overflow-hidden">
                        <img
                          src={card.img}
                          alt={card.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[#FFD60A] truncate">{card.name}</p>
                        {isSelected && (
                          <span className="inline-flex items-center justify-center bg-[#FFD60A] text-black text-xs px-2 py-0.5 rounded-md">
                            ✓
                          </span>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* botão criar - responsivo */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleCreate}
          className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] font-bold shadow-lg hover:opacity-95 transition"
        >
          <div className="flex items-center gap-2">
            <PlusCircle />
            <span>Criar Deck</span>
          </div>
        </button>
      </div>
    </div>
  );
}
