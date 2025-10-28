import React from "react";
import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage/landingpage.jsx";
import Login from "./pages/Login/login.jsx";
import Register from "./pages/Register/register.jsx";

function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Routes>
        {/* Página inicial */}
        <Route path="/" element={<LandingPage />} />

        {/* Páginas de autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}

export default App;
