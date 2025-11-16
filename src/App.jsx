import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage/landingpage.jsx";
import Login from "./pages/Login/login.jsx";
import Register from "./pages/Register/register.jsx";
import GameHome from "./pages/GameHome/gameHome.jsx";
import ProfileView from "./pages/GameHome/ProfileView/profileView.jsx";

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
        
        {/* Profile - Rota principal do perfil */}
        <Route path="/profile/:playerId" element={<ProfileView />} />
        
        {/* Rota legada para compatibilidade - pode remover depois */}
        <Route path="/editarPerfil" element={<ProfileView />} />
      </Routes>
    </div>
  );
}

export default App;