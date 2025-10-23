import { useState } from "react";
import Mockup from "../../../../public/img/logoSZ.png";
import ModalAuth from "./modalAuth.jsx";

export default function GameEx() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section
      id="inicio"
      className="pt-24 pb-16 text-center bg-gradient-to-b from-slate-900 to-slate-800"
    >
      <div className="mt-2 flex justify-center">
        <img
          src={Mockup}
          alt="Mockup do jogo"
          className="w-full max-w-md rounded-xl shadow-lg shadow-yellow-500/20"
        />
      </div>

      <div className="flex items-center justify-center gap-4 mt-12">
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-8 py-3 rounded-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-extrabold uppercase tracking-wider shadow-lg shadow-yellow-500/30 hover:scale-105 transition-transform"
        >
          Jogar Agora 🎮
        </button>
      </div>

      {isModalOpen && <ModalAuth onClose={() => setIsModalOpen(false)} />}
    </section>
  );
}
