import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Volume2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authUtils } from "../../utils/auth";
import { useAuth } from "../../firebase/auth";

const GameHome = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Hook do Firebase Auth
  const { user: firebaseUser, logout: firebaseLogout } = useAuth();

  // Carregar dados do usuário
  useEffect(() => {
    const loadUserData = () => {
      try {
        // Primeiro tenta pegar do Firebase Auth (Google Login)
        if (firebaseUser) {
          console.log("Usuário do Firebase:", firebaseUser);
          setUser({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            // Para compatibilidade com seu sistema
            PL_NAME: firebaseUser.displayName,
            PL_EMAIL: firebaseUser.email
          });
          setLoading(false);
          return;
        }

        // Fallback: tenta pegar do localStorage (login tradicional)
        const userData = authUtils.getPlayerData();
        console.log("Usuário do localStorage:", userData);
        
        if (userData) {
          // Formata os dados para padrão único
          const formattedUser = {
            name: userData.PL_NAME || userData.displayName || userData.name,
            email: userData.PL_EMAIL || userData.email,
            displayName: userData.PL_NAME || userData.displayName || userData.name,
            photoURL: userData.photoURL || userData.PL_AVATAR,
            // Mantém dados originais para compatibilidade
            ...userData
          };
          setUser(formattedUser);
        }
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [firebaseUser]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Função para obter a primeira letra do nome
  const getInitial = () => {
    if (!user) return "N";
    
    // Tenta pegar do displayName, PL_NAME, ou name
    const name = user.displayName || user.PL_NAME || user.name || "N";
    return name.charAt(0).toUpperCase();
  };

  // Função para obter o nome completo
  const getDisplayName = () => {
    if (!user) return "Carregando...";
    
    return user.displayName || user.PL_NAME || user.name || "Usuário";
  };

  // 🔥 LOGOUT COMPLETO - Ambos os sistemas
  const handleLogout = async () => {
    try {
      console.log("Iniciando logout...");
      
      // 1. Limpa dados do localStorage (sistema tradicional)
      authUtils.clearAuthData();
      
      // 2. Se estiver logado com Google, faz logout do Firebase também
      if (firebaseUser) {
        console.log("Fazendo logout do Firebase...");
        await firebaseLogout();
      }
      
      // 3. Limpa estado local
      setUser(null);
      
      // 4. Redireciona para a página inicial
      console.log("Logout concluído, redirecionando...");
      navigate("/");
      
    } catch (error) {
      console.error("Erro durante o logout:", error);
      // Mesmo com erro, tenta limpar os dados locais e redirecionar
      authUtils.clearAuthData();
      setUser(null);
      navigate("/");
    }
  };

  // Logout do dropdown (opcional - mantém para ter duas opções)
  const handleDropdownLogout = async () => {
    await handleLogout();
  };

  if (loading) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-yellow-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white font-sans">
      {/* --- Partículas de fundo --- */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
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

      {/* --- Navbar --- */}
      <nav className="absolute top-0 left-0 w-full flex justify-between items-center px-6 md:px-10 py-4 bg-[#001D3D]/60 backdrop-blur-md border-b border-[#003566]/70 shadow-[0_0_25px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Avatar do usuário com primeira letra do nome */}
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#FFC300] to-[#FFD60A] flex items-center justify-center font-extrabold text-[#000814] shadow-[0_0_15px_#FFD60A]">
            {getInitial()}
          </div>
          
          {/* Nome do usuário */}
          <span className="bg-[#003566]/60 px-3 md:px-4 py-1 md:py-2 rounded-md text-xs md:text-sm border border-[#FFD60A]/30 shadow-inner">
            {getDisplayName()}
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-6 relative" ref={dropdownRef}>
          <Volume2 className="cursor-pointer hover:text-[#FFD60A] transition" size={20} />

          {/* --- Ícone Settings + Dropdown --- */}
          <div className="relative">
            <Settings
              className="cursor-pointer hover:text-[#FFD60A] transition"
              size={20}
              onClick={() => setShowDropdown(!showDropdown)}
            />

            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-0 mt-2 w-48 bg-[#001D3D]/90 border border-[#003566] rounded-xl shadow-[0_0_15px_rgba(255,214,10,0.2)] backdrop-blur-md overflow-hidden z-50"
              >
                <button
                  onClick={() => navigate("/perfil")}
                  className="block w-full text-left px-4 py-2 text-sm text-[#FFD60A] hover:bg-[#003566]/60 transition"
                >
                  👤 Visualizar Perfil
                </button>
                <button
                  onClick={() => navigate("/editarperfil")}
                  className="block w-full text-left px-4 py-2 text-sm text-[#FFD60A] hover:bg-[#003566]/60 transition"
                >
                  ✏️ Editar Perfil
                </button>
                <div className="h-px bg-[#003566]"></div>
                <button
                  onClick={handleDropdownLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-[#003566]/60 transition"
                >
                  🚪 Sair
                </button>
              </motion.div>
            )}
          </div>

          {/* 🔥 BOTÃO X AGORA FAZ LOGOUT COMPLETO */}
          <X
            className="cursor-pointer hover:text-red-500 transition hover:scale-110"
            size={20}
            onClick={handleLogout}
            title="Sair da conta"
          />
        </div>
      </nav>

      {/* Resto do código permanece igual... */}
      <motion.button
        className="absolute top-24 left-1/2 -translate-x-1/2 bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] font-extrabold px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl text-lg md:text-xl shadow-[0_0_25px_#FFD60A] border border-[#000814] hover:shadow-[0_0_45px_#FFD60A] transition-all tracking-wide"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        JOGAR
      </motion.button>

      <motion.div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-72 md:w-64 md:h-96 rounded-2xl bg-gradient-to-b from-[#001D3D] via-[#003566] to-[#000814] border border-[#FFD60A]/40 shadow-[0_0_60px_#003566] overflow-hidden"
        animate={{ rotateY: [0, 180, 360] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD60A]/25 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <h3 className="text-[#FFD60A] text-base md:text-lg font-bold tracking-widest mb-2">
            SECURITY ZONE
          </h3>
          <p className="text-xs md:text-sm text-gray-300 uppercase">
            Digital Defense Card
          </p>
        </div>
      </motion.div>

      <div className="absolute bottom-[30%] left-1/2 -translate-x-1/2 w-40 md:w-52 h-6 md:h-8 bg-[#FFD60A]/10 blur-xl rounded-full"></div>

      <div className="absolute top-40 left-1/2 md:left-10 md:top-40 -translate-x-1/2 md:translate-x-0 flex flex-col md:items-start items-center gap-4 md:gap-6 w-full md:w-auto px-6">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.05 }}
            className="w-64 md:w-60 bg-[#001D3D]/80 border border-[#003566] p-4 rounded-xl hover:border-[#FFD60A] shadow-[0_0_15px_rgba(255,214,10,0.1)] backdrop-blur-md transition"
          >
            <p className="text-[#FFD60A] font-semibold mb-1">🌀 Evento #{i}</p>
            <p className="text-sm text-gray-300 text-center md:text-left">
              Algo interessante aconteceu no Security Zone...
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default GameHome;