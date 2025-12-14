// App.jsx - ADICIONE ESTA ROTA
import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage/landingpage.jsx";
import Login from "./pages/Login/login.jsx";
import Register from "./pages/Register/register.jsx";
import GameHome from "./pages/GameHome/gameHome.jsx";
import ProfileView from "./pages/GameHome/ProfileView/profileView.jsx";
import CardsView from "./pages/GameHome/CardsView/cardsView.jsx";
import EditDeck from "./pages/GameHome/CardsView/Decks/EditDeck.jsx"; // 🔴 IMPORTAÇÃO

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        {/* Página inicial */}
        <Route path="/" element={<LandingPage />} />

        {/* Páginas de autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Game Home */}
        <Route path="/gameHome" element={<GameHome />} />
        
        {/* Profile */}
        <Route path="/profile/:playerId" element={<ProfileView />} />
        <Route path="/editarPerfil" element={<ProfileView />} />

        {/* Cards */}
        <Route path="/cardsView" element={<CardsView />} />

        {/* 🔴 NOVA ROTA PARA EDIÇÃO DE DECK */}
        <Route 
          path="/deck/edit/:playerId/:deckId" 
          element={<EditDeck />} 
        />
      </Routes>
    </div>
  );
}

export default App;