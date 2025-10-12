import React, { useState } from 'react';
// useState para gerenciar o estado do menu

export default function Navbar() {
  // 1. Define o estado inicial do menu (fechado)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 2. Função para alternar o estado: de aberto para fechado e vice-versa
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-700 z-50">
      
      {/* Container Principal */}
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        
        <h1 className="text-2xl font-bold text-cyan-400">Security Zone</h1>
        
        {/* Menu Padrão (Desktop) */}
        <ul className="hidden md:flex gap-8">
          <li><a href="#Login" className="hover:text-cyan-400 transition">Login</a></li>
          <li><a href="#cadastro" className="hover:text-cyan-400 transition">Cadastro</a></li>
        </ul>
        
        {/* 3. Botão Hamburguer (Mobile) - Adiciona o onClick */}
        <button 
          onClick={toggleMenu} 
          className="md:hidden text-cyan-400 text-1xl focus:outline-none"
          // Mude o ícone com base no estado
        >
          {isMenuOpen ? '✕' : '☰'} 
        </button>
      </div>

      {/* 4. Menu Mobile (Aparece/Desaparece com o estado) */}
      <div 
        // Usa o estado isMenuOpen para aplicar classes de exibição
        className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} bg-slate-900 border-t border-slate-800`}
      >
        <ul className="flex flex-col items-center py-4 space-y-3">
          <li><a 
            href="#Login" 
            className="block py-2 hover:text-cyan-400 transition"
            onClick={toggleMenu} // Fecha o menu ao clicar em um link
          >
            Login
          </a></li>
          <li><a 
            href="#cadastro" 
            className="block py-2 hover:text-cyan-400 transition"
            onClick={toggleMenu} // Fecha o menu ao clicar em um link
          >
            Cadastro
          </a></li>
        </ul>
      </div>
    </nav>
  );
}