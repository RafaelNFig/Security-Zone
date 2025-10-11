import React from "react";

function App() {
  return (
    // CORRIGIDO: Usando min-h-screen para garantir que o div ocupe a altura total do viewport
    // e permitir que justify-center e items-center funcionem perfeitamente.
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
          Security Zone 🔐
        </h1>
        <p className="text-gray-300 sm:text-lg md:text-xl">
          Aprenda segurança digital de forma divertida!
        </p>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          Começar
        </button>
      </div>
    </div>
  );
}

export default App;