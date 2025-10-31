import React, { useState } from 'react';
import ModalAuth from "./modalAuth"; // Importe o modal

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Estado do modal aqui

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-700 z-40">
        
        {/* Container Principal */}
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          
          <h1 className="text-2xl font-bold text-cyan-400">Security Zone</h1>
          
          {/* Menu Padrão (Desktop) - EXATAMENTE IGUAL AO GameEx */}
          <div className="hidden md:flex gap-8">
            <button
              onClick={() => setIsModalOpen(true)} // Direto igual no GameEx
              className="px-6 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-extrabold uppercase tracking-wider shadow-lg shadow-yellow-500/30 hover:scale-105 transition-transform"
            >
              Jogar Agora 🎮
            </button>
          </div>
          
          {/* Botão Hamburguer (Mobile) */}
          <button 
            onClick={toggleMenu} 
            className="md:hidden text-cyan-400 text-2xl focus:outline-none"
          >
            {isMenuOpen ? '✕' : '☰'} 
          </button>
        </div>

        {/* Menu Mobile */}
        <div 
          className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} bg-slate-900 border-t border-slate-800`}
        >
          <div className="flex flex-col items-center py-4 space-y-3">
            <button
              onClick={() => setIsModalOpen(true)} // Direto igual no GameEx
              className="px-6 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-extrabold uppercase tracking-wider shadow-lg shadow-yellow-500/30 hover:scale-105 transition-transform"
            >
              Jogar Agora 🎮
            </button>
          </div>
        </div>
      </nav>

      {/* Modal - EXATAMENTE IGUAL AO GameEx */}
      {isModalOpen && <ModalAuth onClose={() => setIsModalOpen(false)} />}
    </>
  );
}