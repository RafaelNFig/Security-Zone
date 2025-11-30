import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Volume2, X, User, LogOut, Sword, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { authUtils } from "../../utils/auth";
import { useAuth } from "../../firebase/auth";

const GameHome = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { user: firebaseUser, logout: firebaseLogout } = useAuth();

  // 🔥 Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ---------------------------------------
  // 🔥 BUSCAR PERFIL DO BACKEND (OTIMIZADO)
  // ---------------------------------------
  const fetchBackendProfile = useCallback(async () => {
    const token = authUtils.getToken();
    
    console.log('🔐 [GameHome] Token disponível:', token ? 'SIM' : 'NÃO');
    
    if (!token) {
      throw new Error("Token de autenticação não encontrado");
    }

    try {
      console.log('📤 [GameHome] Buscando perfil do backend...');
      const response = await fetch("http://localhost:3000/api/player/profile", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log('📥 [GameHome] Status da resposta:', response.status);

      if (response.status === 401) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (response.status === 404) {
        throw new Error("Perfil não encontrado no servidor.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao buscar perfil`);
      }

      const data = await response.json();
      console.log('✅ [GameHome] Perfil carregado:', data.player?.PL_NAME);
      return data;

    } catch (error) {
      console.error('💥 [GameHome] Erro na requisição:', error.message);
      throw error;
    }
  }, []);

  // ---------------------------------------
  // 🔥 CARREGAR USUÁRIO (OTIMIZADO)
  // ---------------------------------------
  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      setProfileError(null);

      const token = authUtils.getToken();
      const storedPlayerData = authUtils.getPlayerData();

      console.log('🔄 [GameHome] Iniciando carregamento...', {
        token: !!token,
        storedData: !!storedPlayerData,
        firebaseUser: !!firebaseUser
      });

      // 🎯 ESTRATÉGIA DE CARREGAMENTO EM ORDEM DE PRIORIDADE:

      // 1. PRIMEIRO: Backend com token válido
      if (token) {
        try {
          const freshProfile = await fetchBackendProfile();
          if (freshProfile?.player) {
            console.log('✅ [GameHome] Perfil carregado do backend');
            
            // Atualizar cache local
            authUtils.updatePlayerData(freshProfile.player);
            
            setUser({
              ...freshProfile.player,
              name: freshProfile.player.PL_NAME,
              displayName: freshProfile.player.PL_NAME,
              email: freshProfile.player.PL_EMAIL,
              photoURL: freshProfile.player.PL_AVATAR,
              level: freshProfile.player.PL_LEVEL,
              coins: freshProfile.player.PL_COINS,
              gems: freshProfile.player.PL_GEMS,
            });
            
            return; // Sucesso - sair da função
          }
        } catch (backendError) {
          console.warn('⚠️ [GameHome] Backend falhou:', backendError.message);
          // Continuar para fallbacks
        }
      }

      // 2. SEGUNDO: Usuário do Firebase
      if (firebaseUser) {
        console.log('🔥 [GameHome] Usando dados do Firebase');
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          isFirebaseUser: true,
        });
        return;
      }

      // 3. TERCEIRO: Dados armazenados localmente
      if (storedPlayerData) {
        console.log('💾 [GameHome] Usando dados armazenados');
        setUser({
          ...storedPlayerData,
          name: storedPlayerData.PL_NAME,
          displayName: storedPlayerData.PL_NAME,
          email: storedPlayerData.PL_EMAIL,
          photoURL: storedPlayerData.PL_AVATAR,
          level: storedPlayerData.PL_LEVEL,
          coins: storedPlayerData.PL_COINS,
          gems: storedPlayerData.PL_GEMS,
          isCachedUser: true,
        });
        return;
      }

      // 4. FALLBACK: Nenhum dado disponível
      console.log('❌ [GameHome] Nenhum dado de usuário disponível');
      throw new Error("Nenhum usuário autenticado encontrado");

    } catch (error) {
      console.error('💥 [GameHome] Erro ao carregar usuário:', error);
      setProfileError(error.message);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [fetchBackendProfile, firebaseUser]);

  // ---------------------------------------
  // 🔥 EFFECT PRINCIPAL DE CARREGAMENTO
  // ---------------------------------------
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // ---------------------------------------
  // 🔥 ATUALIZAR AO VOLTAR (OTIMIZADO)
  // ---------------------------------------
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) { // Só atualizar se estiver visível e com usuário
        console.log('🔄 [GameHome] Página voltou ao foco - atualizando...');
        loadUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
    };
  }, [user, loadUserData]);

  // ---------------------------------------
  // 🔥 LOGOUT (OTIMIZADO)
  // ---------------------------------------
  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 [GameHome] Iniciando logout...');
      
      // Limpar dados locais
      authUtils.clearAuthData();
      setUser(null);
      setShowDropdown(false);

      // Logout do Firebase se estiver conectado
      if (firebaseUser) {
        await firebaseLogout();
      }

      // Redirecionar para login
      navigate("/", { replace: true });
      
    } catch (error) {
      console.error('💥 [GameHome] Erro no logout:', error);
      // Forçar redirecionamento mesmo com erro
      navigate("/", { replace: true });
    }
  }, [firebaseUser, firebaseLogout, navigate]);

  // ---------------------------------------
  // 🔥 TENTAR NOVAMENTE (OTIMIZADO)
  // ---------------------------------------
  const handleRetry = useCallback(async () => {
    console.log('🔄 [GameHome] Tentando novamente...');
    setIsRetrying(true);
    await loadUserData();
  }, [loadUserData]);

  // ---------------------------------------
  // 🔥 TOGGLE AUDIO
  // ---------------------------------------
  const toggleAudio = useCallback(() => {
    setAudioEnabled(prev => !prev);
    // Aqui você pode adicionar lógica para pausar/retomar áudio
    console.log('🔊 Audio:', audioEnabled ? 'DESLIGADO' : 'LIGADO');
  }, [audioEnabled]);

  // ---------------------------------------
  // 🔥 NAVEGAÇÃO (OTIMIZADA)
  // ---------------------------------------
  const handleViewProfile = useCallback(() => {
    if (user?.PL_ID) {
      navigate(`/profile/${user.PL_ID}`);
    } else if (user?.uid) {
      navigate(`/profile/firebase/${user.uid}`);
    } else {
      console.warn('⚠️ [GameHome] ID do usuário não disponível para navegação');
    }
    setShowDropdown(false);
  }, [user, navigate]);

  const handleViewCards = useCallback(() => {
    navigate("/cardsView");
    setShowDropdown(false);
  }, [navigate]);

  const handlePlayGame = useCallback(() => {
    // Aqui você pode adicionar lógica para iniciar o jogo
    console.log('🎮 Iniciando jogo...');
    // navigate("/game"); // Descomente quando tiver a rota do jogo
  }, []);

  // ---------------------------------------
  // 🔥 FUNÇÕES UTILITÁRIAS (OTIMIZADAS)
  // ---------------------------------------
  const getInitial = useCallback(() => {
    return (user?.displayName?.charAt(0) || user?.PL_NAME?.charAt(0) || "?").toUpperCase();
  }, [user]);

  const getDisplayName = useCallback(() => {
    return user?.displayName || user?.PL_NAME || "Usuário";
  }, [user]);

  const getUserLevel = useCallback(() => {
    return user?.level || user?.PL_LEVEL || 1;
  }, [user]);

  // ---------------------------------------
  // 🎨 COMPONENTES DE ESTADO
  // ---------------------------------------

  // Loading Component
  const LoadingState = () => (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white">
      <div className="text-center">
        <motion.div
          className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-yellow-400 font-semibold">Carregando Security Zone...</p>
        <p className="text-sm text-gray-400 mt-2">Preparando sua aventura</p>
      </div>
    </div>
  );

  // Error State Component
  const ErrorState = () => (
    <div className="w-screen h-screen flex items-center justify-center bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white">
      <div className="text-center bg-[#001D3D]/90 p-8 rounded-2xl border border-red-500/50 backdrop-blur-md max-w-md mx-4">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <X className="text-red-400" size={32} />
        </div>
        <h3 className="text-red-400 text-xl font-bold mb-2">Erro ao Carregar</h3>
        <p className="text-gray-300 mb-6">{profileError}</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-yellow-500 text-black px-6 py-3 rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
          >
            {isRetrying ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
            Tentar Novamente
          </button>
          <button 
            onClick={handleLogout}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-400 transition flex items-center gap-2 font-semibold"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </div>
    </div>
  );

  // ---------------------------------------
  // 🎮 RENDER PRINCIPAL
  // ---------------------------------------

  if (loading) return <LoadingState />;
  if (profileError && !user) return <ErrorState />;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#000814] via-[#001D3D] to-[#000814] text-white font-sans select-none">

      {/* === PARTÍCULAS DE FUNDO === */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 bg-[#FFD60A]/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
              opacity: 0,
            }}
            animate={{
              y: [null, -Math.random() * 100 - 50],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: Math.random() * 4 + 3,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* === NAVBAR === */}
      <nav className="absolute top-0 left-0 w-full flex justify-between items-center px-6 md:px-8 py-4 bg-[#001D3D]/80 backdrop-blur-md border-b border-[#003566]/70 shadow-2xl z-40">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <motion.div 
            className="relative"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFC300] to-[#FFD60A] flex items-center justify-center font-bold text-[#000814] shadow-lg shadow-yellow-500/30 border-2 border-yellow-400">
              {getInitial()}
            </div>
            {user?.isCachedUser && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-[#001D3D]"></div>
            )}
          </motion.div>

          <div className="flex flex-col">
            <span className="text-sm font-semibold text-yellow-400">
              {getDisplayName()}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Sword size={12} />
              <span>Nv. {getUserLevel()}</span>
              {user?.coins !== undefined && (
                <span>• {user.coins} 🪙</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          {/* Audio Toggle */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleAudio}
            className={`p-2 rounded-lg transition ${
              audioEnabled 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            <Volume2 size={20} />
          </motion.button>

          {/* Settings Dropdown */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-lg bg-[#003566]/50 hover:bg-[#003566] transition"
            >
              <Settings size={20} />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-56 bg-[#001D3D]/95 border border-[#003566] rounded-xl shadow-2xl shadow-black/50 backdrop-blur-md overflow-hidden z-50"
                >
                  {/* Profile */}
                  <button
                    onClick={handleViewProfile}
                    className="w-full text-left px-4 py-3 text-yellow-400 hover:bg-[#003566]/60 transition flex items-center gap-3 group"
                  >
                    <User size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Meu Perfil</div>
                      <div className="text-xs text-gray-400">Ver e editar perfil</div>
                    </div>
                  </button>

                  {/* Cards */}
                  <button
                    onClick={handleViewCards}
                    className="w-full text-left px-4 py-3 text-blue-400 hover:bg-[#003566]/60 transition flex items-center gap-3 group"
                  >
                    <Sword size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Minhas Cartas</div>
                      <div className="text-xs text-gray-400">Gerenciar deck</div>
                    </div>
                  </button>

                  {/* Divider */}
                  <div className="h-px bg-[#003566]" />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-[#003566]/60 transition flex items-center gap-3 group"
                  >
                    <LogOut size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Sair</div>
                      <div className="text-xs text-gray-400">Encerrar sessão</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* === BOTÃO JOGAR PRINCIPAL === */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-8 z-30">
        {/* Logo/Image */}
        <motion.div
          className="relative w-64 h-96 rounded-2xl shadow-2xl shadow-yellow-500/30 overflow-hidden"
          animate={{ 
            rotateY: [0, 180, 360],
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Shine Effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD60A]/30 to-transparent pointer-events-none z-10"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />

          <img
            src="/img/loginFake.png"
            alt="Security Zone"
            className="w-full h-full object-cover rounded-2xl border-2 border-yellow-500/40"
          />
        </motion.div>

        {/* Play Button */}
        <motion.button
          onClick={handlePlayGame}
          className="bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] font-bold px-12 py-4 rounded-2xl text-xl shadow-2xl shadow-yellow-500/50 border-2 border-yellow-600 hover:shadow-yellow-500/70 transition-all duration-300 relative overflow-hidden group"
          whileHover={{ 
            scale: 1.05,
            boxShadow: "0 0 40px #FFD60A"
          }}
          whileTap={{ scale: 0.95 }}
          animate={{ 
            scale: [1, 1.02, 1],
            boxShadow: ["0 0 25px #FFD60A", "0 0 35px #FFD60A", "0 0 25px #FFD60A"]
          }}
          transition={{ 
            duration: 2, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        >
          {/* Button Shine */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="relative z-10">🎮 JOGAR AGORA</span>
        </motion.button>

        {/* Glow Effect */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-8 bg-yellow-500/20 blur-2xl rounded-full" />
      </div>

      {/* === EVENTOS/LATERAIS === */}
      <div className="absolute top-40 right-8 flex flex-col gap-6 z-20">
        {[
          { title: "🏆 Torneio Diário", desc: "Ganhe recompensas especiais" },
          { title: "🎯 Missão Semanal", desc: "Complete desafios épicos" },
          { title: "⚡ Evento Relâmpago", desc: "Tempo limitado!" }
        ].map((event, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.2 + 0.5 }}
            whileHover={{ 
              scale: 1.05, 
              borderColor: "#FFD60A",
              boxShadow: "0 0 20px rgba(255, 214, 10, 0.3)"
            }}
            className="w-64 bg-[#001D3D]/90 border border-[#003566] p-4 rounded-xl backdrop-blur-md transition-all cursor-pointer"
          >
            <p className="text-yellow-400 font-semibold mb-2">{event.title}</p>
            <p className="text-sm text-gray-300">{event.desc}</p>
            <div className="mt-2 w-full bg-[#003566] rounded-full h-1">
              <motion.div 
                className="bg-yellow-500 h-1 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${Math.random() * 60 + 20}%` }}
                transition={{ delay: i * 0.3 + 1, duration: 1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* === STATS/INFO LATERAL ESQUERDA === */}
      <div className="absolute top-40 left-8 flex flex-col gap-4 z-20">
        {user && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="w-56 bg-[#001D3D]/90 border border-[#003566] p-4 rounded-xl backdrop-blur-md"
          >
            <h3 className="text-yellow-400 font-semibold mb-3">📊 Estatísticas</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Nível</span>
                <span className="text-yellow-400">{getUserLevel()}</span>
              </div>
              {user.coins !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Moedas</span>
                  <span className="text-yellow-400">{user.coins} 🪙</span>
                </div>
              )}
              {user.gems !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Gemas</span>
                  <span className="text-blue-400">{user.gems} 💎</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Vítorias</span>
                <span className="text-green-400">0</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.9 }}
          className="w-56 bg-[#001D3D]/90 border border-[#003566] p-4 rounded-xl backdrop-blur-md"
        >
          <h3 className="text-yellow-400 font-semibold mb-3">⚡ Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-2">
            <button className="p-2 bg-[#003566] rounded-lg hover:bg-[#004577] transition text-xs">
              🎁 Presentes
            </button>
            <button className="p-2 bg-[#003566] rounded-lg hover:bg-[#004577] transition text-xs">
              👥 Amigos
            </button>
            <button className="p-2 bg-[#003566] rounded-lg hover:bg-[#004577] transition text-xs">
              ⚙️ Config
            </button>
            <button className="p-2 bg-[#003566] rounded-lg hover:bg-[#004577] transition text-xs">
              ❓ Ajuda
            </button>
          </div>
        </motion.div>
      </div>

      {/* === FOOTER === */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-gray-500 text-sm z-20">
        <p>Security Zone • v1.0.0 • {user?.isCachedUser && "📱 Modo Offline"}</p>
      </div>

    </div>
  );
};

export default GameHome;