import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage/landingpage.jsx";
import Login from "./pages/Login/login.jsx";
import Register from "./pages/Register/register.jsx";
import Navbar from "./pages/LandingPage/components/navbar.jsx"; // Importe a Navbar
import GameHome from "./pages/GameHome/gameHome.jsx";
import EditarPerfil from "./pages/GameHome/EditarPerfil/editarPerfil.jsx";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Adicione a Navbar aqui */}
      
      
      <Routes>
        {/* Página inicial */}
        <Route path="/" element={<LandingPage />} />

        {/* Páginas de autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Game Home */}
        <Route path="/gameHome" element={<GameHome />} />
        <Route path="/editarPerfil" element={<EditarPerfil />} />
      </Routes>
    </div>
  );
}

export default App;