import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

const decks = [
  { id: 1, name: "Deck de Defesa", cards: 12 },
  { id: 2, name: "Wi-Fi Attack", cards: 14 },
  { id: 3, name: "Firewall Guardians", cards: 10 },
];

const DecksView = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1f] to-[#111] p-6 text-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-wide">Meus Decks</h1>

        <a
          href="/CreateDeck"
          className="flex items-center gap-2 bg-purple-600 px-5 py-2 rounded-xl
          hover:bg-purple-700 transition-all shadow-lg"
        >
          <Plus size={20} />
          Criar Deck
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <motion.div
            key={deck.id}
            whileHover={{ scale: 1.04 }}
            className="p-5 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10
            shadow-[0_0_15px_rgba(140,60,255,0.3)] cursor-pointer 
            hover:shadow-[0_0_25px_rgba(140,60,255,0.7)]
            transition-all"
          >
            <h2 className="text-xl font-semibold mb-2">{deck.name}</h2>
            <p className="text-sm opacity-80">{deck.cards} cartas</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default DecksView;
