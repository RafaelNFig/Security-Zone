import React, { useEffect, useMemo, useState } from "react";
import Navbar from "./components/navbar";
import GameEx from "./components/gameEx";
import Descriptions from "./components/descriptions";
import Carrosel from "./components/carrosel";
import Footer from "./components/footer";
import ModalAuth from "./components/modalAuth";

// ✅ client oficial
import { apiRequest } from "@/services/api.js";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  // ✅ cards do banco (para imagens e dados reais)
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);

  const sections = useMemo(
    () => [
      { id: "sobre", label: "Sobre" },
      { id: "como-jogar", label: "Como jogar" },
      { id: "cartas", label: "Cartas" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;

    async function loadCards() {
      setCardsLoading(true);
      try {
        const res = await apiRequest("/cards", { method: "GET" });
        const list =
          res?.data?.cards ||
          res?.data?.data?.cards ||
          res?.data?.data ||
          res?.data ||
          [];

        if (!alive) return;
        setCards(Array.isArray(list) ? list : []);
      // eslint-disable-next-line no-unused-vars
      } catch (e) {
        if (!alive) return;
        setCards([]);
      } finally {
        // eslint-disable-next-line no-unsafe-finally
        if (!alive) return;
        setCardsLoading(false);
      }
    }

    loadCards();
    return () => {
      alive = false;
    };
  }, []);

  return (
    // ✅ NÃO trave overflow da página inteira (isso quebra/mascara scroll interno)
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Cyber background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_50%_-10%,rgba(34,211,238,0.14),transparent_60%),radial-gradient(900px_500px_at_20%_20%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(800px_500px_at_80%_55%,rgba(168,85,247,0.10),transparent_55%)]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            maskImage:
              "radial-gradient(60% 50% at 50% 30%, black 40%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(60% 50% at 50% 30%, black 40%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_110%,rgba(0,0,0,0.9),transparent_55%)]" />
      </div>

      <Navbar sections={sections} onOpenAuth={() => setAuthOpen(true)} />

      <main className="relative">
        <GameEx onOpenAuth={() => setAuthOpen(true)} cards={cards} />
        <Descriptions onOpenAuth={() => setAuthOpen(true)} />

        <Carrosel
          onOpenAuth={() => setAuthOpen(true)}
          cards={cards}
          isLoading={cardsLoading}
        />

        <Footer />
      </main>

      {authOpen && (
        <ModalAuth isOpen={authOpen} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  );
}
