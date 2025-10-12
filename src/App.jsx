import React from "react";
// Importe as ferramentas de roteamento
import { Routes, Route } from 'react-router-dom';
// Importe a LandingPage
import LandingPage from './pages/LandingPage/landingpage.jsx'; 
// Não precisamos do Link aqui, pois não haverá navegação nesta tela

function App() {
  return (
    // O div principal deve envolver apenas a lógica de roteamento agora
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <Routes>
        {/*
          Esta é a mudança chave:
          A rota principal (path="/") agora renderiza o seu componente <LandingPage />.
        */}
        <Route 
          path="/" 
          element={<LandingPage />} 
        />
        
        {/* Se você ainda precisar da tela de Introdução (IntroScreen) com o botão,
          você pode mapeá-la para outra rota, como "/intro". 
          (Eu a removi para manter o foco na LandingPage inicial).
        */}
      </Routes>
    </div>
  );
}

export default App;