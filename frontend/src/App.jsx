// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useParams, useNavigate } from "react-router-dom";

import LandingPage from "./pages/LandingPage/landingpage.jsx";
import Login from "./pages/Login/login.jsx";
import Register from "./pages/Register/register.jsx";

import GameHome from "./pages/GameHome/gameHome.jsx";
import ProfileView from "./pages/GameHome/ProfileView/profileView.jsx";
import CardsView from "./pages/GameHome/CardsView/cardsView.jsx";
import EditDeck from "./pages/GameHome/CardsView/Decks/EditDeck.jsx";

import GameModeSelect from "./pages/GameModeSelect/GameModeSelect.jsx";
import BattleArena from "./pages/BattleArena/battleArena.jsx";

import { apiRequest } from "@/services/api.js";
import { authUtils } from "./utils/auth.js";

function ProtectedRoute({ children }) {
  const token = authUtils.getToken?.();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/**
 * /battle/vs-bot/:difficulty
 * cria a partida no gateway e redireciona para /battle/:matchId
 */
function CreateBotMatchAndRedirect() {
  const { difficulty } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setError("");

        const diff = String(difficulty || "").toLowerCase();
        const finalDiff = diff === "normal" ? "normal" : "easy";

        const res = await apiRequest("/matches", {
          method: "POST",
          body: JSON.stringify({ mode: "vsBot", difficulty: finalDiff }),
        });

        if (cancelled) return;

        if (!res.success) {
          setError(res.error || "Falha ao criar partida");
          return;
        }

        const data = res.data || {};
        const matchId = data.matchId || data.id || data.match?.id;

        if (!matchId) {
          setError("Partida criada, mas o backend não retornou matchId. Verifique /matches.");
          return;
        }

        navigate(`/battle/${matchId}`, {
          replace: true,
          state: {
            matchId,
            initialState: data.state ?? null,
            initialEvents: data.events ?? [],
            mode: "vsBot",
            difficulty: finalDiff,
          },
        });
      } catch (e) {
        if (!cancelled) setError(e?.message || "Erro inesperado ao criar partida");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [difficulty, navigate]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-gray-800 rounded-xl p-6 shadow">
        <h1 className="text-xl font-bold mb-2">Criando partida…</h1>
        <p className="text-gray-300 mb-4">
          Preparando o match contra o bot ({String(difficulty || "easy")}).
        </p>

        {error ? (
          <>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
              onClick={() => navigate("/mode-select", { replace: true })}
            >
              Voltar
            </button>
          </>
        ) : (
          <div className="text-gray-400">Aguarde…</div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        {/* LANDING (abre modal de login/register dentro dela) */}
        <Route path="/" element={<LandingPage />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* GAME HOME */}
        <Route
          path="/gamehome"
          element={
            <ProtectedRoute>
              <GameHome />
            </ProtectedRoute>
          }
        />
        {/* compat (caso alguma tela antiga use /gameHome) */}
        <Route path="/gameHome" element={<Navigate to="/gamehome" replace />} />

        {/* EDITAR PERFIL (rota única e “oficial”) */}
        <Route
          path="/editarPerfil"
          element={
            <ProtectedRoute>
              <ProfileView />
            </ProtectedRoute>
          }
        />
        {/* compat antigas (qualquer uma cai no editor único) */}
        <Route path="/profile/:playerId" element={<Navigate to="/editarPerfil" replace />} />
        <Route path="/profile/firebase/:uid" element={<Navigate to="/editarPerfil" replace />} />

        {/* CARTAS / INVENTÁRIO */}
        <Route
          path="/cards"
          element={
            <ProtectedRoute>
              <CardsView />
            </ProtectedRoute>
          }
        />
        {/* compat antiga */}
        <Route path="/cardsView" element={<Navigate to="/cards" replace />} />

        {/* EDITAR DECK (mantém, pois é específico) */}
        <Route
          path="/deck/edit/:playerId/:deckId"
          element={
            <ProtectedRoute>
              <EditDeck />
            </ProtectedRoute>
          }
        />

        {/* MODE SELECT */}
        <Route
          path="/mode-select"
          element={
            <ProtectedRoute>
              <GameModeSelect />
            </ProtectedRoute>
          }
        />
        {/* compat (teu GameHome usa /gamemode hoje) */}
        <Route path="/gamemode" element={<Navigate to="/mode-select" replace />} />

        {/* BOT MATCH */}
        <Route
          path="/battle/vs-bot/:difficulty"
          element={
            <ProtectedRoute>
              <CreateBotMatchAndRedirect />
            </ProtectedRoute>
          }
        />

        {/* BATTLE */}
        <Route
          path="/battle/:matchId"
          element={
            <ProtectedRoute>
              <BattleArena />
            </ProtectedRoute>
          }
        />
        <Route path="/battle" element={<Navigate to="/mode-select" replace />} />

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default App;
