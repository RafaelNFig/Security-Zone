import React, { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EditarPerfil = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    senha: "",
    confirmarSenha: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Dados salvos:", formData);
    // Aqui entraria a lógica para salvar no backend
  };

  return (
    <div className="relative w-screen h-screen flex items-center justify-center bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white font-sans overflow-hidden">
      {/* --- Partículas de fundo --- */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 bg-[#FFD60A]/40 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              y: [Math.random() * window.innerHeight, -20],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* --- Container principal --- */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 bg-[#001D3D]/80 border border-[#003566] rounded-3xl shadow-[0_0_30px_rgba(255,214,10,0.2)] backdrop-blur-md p-8 md:p-10 w-[90%] max-w-md"
      >
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#FFD60A] text-center mb-6 tracking-wide">
          ✏️ Editar Perfil
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Nome de Usuário</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#000814]/70 border border-[#003566] text-white focus:outline-none focus:border-[#FFD60A] placeholder-gray-500"
              placeholder="Digite seu nome de usuário"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">E-mail</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#000814]/70 border border-[#003566] text-white focus:outline-none focus:border-[#FFD60A] placeholder-gray-500"
              placeholder="exemplo@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Nova Senha</label>
            <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#000814]/70 border border-[#003566] text-white focus:outline-none focus:border-[#FFD60A]"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-1">Confirmar Senha</label>
            <input
              type="password"
              name="confirmarSenha"
              value={formData.confirmarSenha}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-[#000814]/70 border border-[#003566] text-white focus:outline-none focus:border-[#FFD60A]"
              placeholder="••••••••"
              required
            />
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.05 }}
            className="mt-4 bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] font-extrabold py-3 rounded-xl shadow-[0_0_25px_#FFD60A] border border-[#000814] hover:shadow-[0_0_40px_#FFD60A] transition-all tracking-wide"
          >
            <Save className="inline-block mr-2" size={18} />
            Salvar Alterações
          </motion.button>
        </form>

        {/* --- Botão de voltar --- */}
        <button
          onClick={() => navigate("/gamehome")}
          className="absolute top-5 left-5 text-[#FFD60A] hover:text-white transition"
        >
          <ArrowLeft size={24} />
        </button>
      </motion.div>
    </div>
  );
};

export default EditarPerfil;
