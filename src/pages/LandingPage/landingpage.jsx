import React, { useMemo, useState } from "react";
import Navbar from "./components/navbar";
import GameEx from "./components/gameEx";
import Descriptions from "./components/descriptions";
import Carrosel from "./components/carrosel";
import Footer from "./components/footer";

// Se você já tem o ModalAuth pronto, mantém o teu import.
// Ajuste o caminho se estiver diferente.
import ModalAuth from "./components/modalAuth";

export default function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);

  const sections = useMemo(
    () => [
      { id: "sobre", label: "Sobre" },
      { id: "como-jogar", label: "Como jogar" },
      { id: "cartas", label: "Cartas" },
    ],
    []
  );

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Cyber background */}
      <div className="pointer-events-none absolute inset-0">
        {/* base gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_50%_-10%,rgba(34,211,238,0.14),transparent_60%),radial-gradient(900px_500px_at_20%_20%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(800px_500px_at_80%_55%,rgba(168,85,247,0.10),transparent_55%)]" />
        {/* subtle grid */}
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
        {/* scanlines */}
        <div
          className="absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
          }}
        />
        {/* bottom vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_110%,rgba(0,0,0,0.9),transparent_55%)]" />
      </div>

      <Navbar
        sections={sections}
        onOpenAuth={() => setAuthOpen(true)}
      />

      <main className="relative">
        {/* HERO (GameEx virou hero/entrada) */}
        <GameEx onOpenAuth={() => setAuthOpen(true)} />

        {/* Conteúdo */}
        <Descriptions onOpenAuth={() => setAuthOpen(true)} />
        <Carrosel onOpenAuth={() => setAuthOpen(true)} />
        <Footer />
      </main>

      {/* Modal de login/register */}
      {authOpen && (
        <ModalAuth
          isOpen={authOpen}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
