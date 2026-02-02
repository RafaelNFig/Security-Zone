import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Volume2,
  X,
  User,
  LogOut,
  Sword,
  RefreshCw,
  Shield,
} from "lucide-react";
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

    console.log("🔐 [GameHome] Token disponível:", token ? "SIM" : "NÃO");

    if (!token) {
      throw new Error("Token de autenticação não encontrado");
    }

    try {
      console.log("📤 [GameHome] Buscando perfil do backend...");
      const response = await fetch("http://localhost:3000/api/player/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      console.log("📥 [GameHome] Status da resposta:", response.status);

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
      console.log("✅ [GameHome] Perfil carregado:", data.player?.PL_NAME);
      return data;
    } catch (error) {
      console.error("💥 [GameHome] Erro na requisição:", error.message);
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

      console.log("🔄 [GameHome] Iniciando carregamento...", {
        token: !!token,
        storedData: !!storedPlayerData,
        firebaseUser: !!firebaseUser,
      });

      // 1) Backend com token válido
      if (token) {
        try {
          const freshProfile = await fetchBackendProfile();
          if (freshProfile?.player) {
            console.log("✅ [GameHome] Perfil carregado do backend");

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

            return;
          }
        } catch (backendError) {
          console.warn("⚠️ [GameHome] Backend falhou:", backendError.message);
        }
      }

      // 2) Firebase
      if (firebaseUser) {
        console.log("🔥 [GameHome] Usando dados do Firebase");
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

      // 3) Cache local
      if (storedPlayerData) {
        console.log("💾 [GameHome] Usando dados armazenados");
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

      // 4) Nada
      console.log("❌ [GameHome] Nenhum dado de usuário disponível");
      throw new Error("Nenhum usuário autenticado encontrado");
    } catch (error) {
      console.error("💥 [GameHome] Erro ao carregar usuário:", error);
      setProfileError(error.message);
    } finally {
      setLoading(false);
      setIsRetrying(false);
    }
  }, [fetchBackendProfile, firebaseUser]);

  // Effect principal
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Atualizar ao voltar ao foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log("🔄 [GameHome] Página voltou ao foco - atualizando...");
        loadUserData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [user, loadUserData]);

  // Logout
  const handleLogout = useCallback(async () => {
    try {
      console.log("🚪 [GameHome] Iniciando logout...");

      authUtils.clearAuthData();
      setUser(null);
      setShowDropdown(false);

      if (firebaseUser) {
        await firebaseLogout();
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error("💥 [GameHome] Erro no logout:", error);
      navigate("/", { replace: true });
    }
  }, [firebaseUser, firebaseLogout, navigate]);

  // Retry
  const handleRetry = useCallback(async () => {
    console.log("🔄 [GameHome] Tentando novamente...");
    setIsRetrying(true);
    await loadUserData();
  }, [loadUserData]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => !prev);
    console.log("🔊 Audio:", audioEnabled ? "DESLIGADO" : "LIGADO");
  }, [audioEnabled]);

  // Navegação
  const handleViewProfile = useCallback(() => {
    if (user?.PL_ID) {
      navigate(`/profile/${user.PL_ID}`);
    } else if (user?.uid) {
      navigate(`/profile/firebase/${user.uid}`);
    } else {
      console.warn("⚠️ [GameHome] ID do usuário não disponível para navegação");
    }
    setShowDropdown(false);
  }, [user, navigate]);

  const handleViewCards = useCallback(() => {
    navigate("/cardsView");
    setShowDropdown(false);
  }, [navigate]);

  const handlePlayGame = useCallback(() => {
    console.log("🎮 Iniciando jogo...");
    // navigate("/game");
  }, []);

  // Utilitários
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
  // 🎨 COMPONENTES DE ESTADO (NOVO VISUAL)
  // ---------------------------------------
  const LoadingState = () => (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
      <CyberBg />
      <div className="relative text-center">
        <motion.div
          className="w-16 h-16 border-4 border-emerald-300/80 border-t-transparent rounded-full mx-auto mb-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <p className="text-emerald-200 font-semibold">Carregando Security Zone...</p>
        <p className="text-sm text-slate-300/70 mt-2 font-mono">
          &gt; booting_operator_ui...
        </p>
      </div>
    </div>
  );

  const ErrorState = () => (
    <div className="w-screen h-screen flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden">
      <CyberBg />
      <div className="relative text-center bg-white/5 p-8 rounded-2xl border border-red-400/30 backdrop-blur-md max-w-md mx-4 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <div className="w-16 h-16 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-400/25">
          <X className="text-red-300" size={32} />
        </div>
        <h3 className="text-red-200 text-xl font-extrabold mb-2">Falha ao carregar</h3>
        <p className="text-slate-200/70 mb-6">{profileError}</p>

        <div className="flex gap-4 justify-center">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="bg-emerald-400/15 border border-emerald-300/30 text-emerald-100 px-6 py-3 rounded-xl
              hover:bg-emerald-400/20 transition disabled:opacity-50 flex items-center gap-2 font-semibold"
          >
            {isRetrying ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Tentar novamente
          </button>

          <button
            onClick={handleLogout}
            className="bg-red-500/15 border border-red-400/30 text-red-100 px-6 py-3 rounded-xl
              hover:bg-red-500/20 transition flex items-center gap-2 font-semibold"
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
    <div className="relative w-screen min-h-screen overflow-hidden bg-slate-950 text-slate-100 font-sans select-none">
      <CyberBg />

      {/* Partículas (agora neon) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 bg-cyan-300/25 rounded-full"
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

      {/* === TOPBAR (mesmo estilo da landing) === */}
      <nav className="sticky top-0 left-0 w-full flex justify-between items-center px-6 md:px-8 py-4 bg-slate-950/70 backdrop-blur border-b border-white/10 shadow-2xl z-40">
        {/* User */}
        <div className="flex items-center gap-3">
          <motion.div className="relative" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <div className="absolute -inset-2 rounded-full bg-emerald-400/10 blur-xl" />
            <div className="relative w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-extrabold text-emerald-100">
              {getInitial()}
            </div>

            {user?.isCachedUser && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-slate-950" />
            )}
          </motion.div>

          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-emerald-200">
              {getDisplayName()}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-300/70">
              <Sword size={12} />
              <span className="font-mono">LVL {getUserLevel()}</span>
              {user?.coins !== undefined && (
                <span className="font-mono">• {user.coins} 🪙</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleAudio}
            className={`p-2 rounded-xl border transition ${audioEnabled
                ? "bg-emerald-400/10 border-emerald-300/20 text-emerald-200"
                : "bg-red-500/10 border-red-400/20 text-red-200"
              }`}
            title="Áudio"
          >
            <Volume2 size={20} />
          </motion.button>

          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.08, rotate: 90 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/7 transition"
              title="Menu"
            >
              <Settings size={20} />
            </motion.button>

            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  className="absolute right-0 mt-2 w-60 bg-slate-950/90 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 backdrop-blur overflow-hidden z-50"
                >
                  <button
                    onClick={handleViewProfile}
                    className="w-full text-left px-4 py-3 text-emerald-200 hover:bg-white/5 transition flex items-center gap-3 group"
                  >
                    <User size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Meu Perfil</div>
                      <div className="text-xs text-slate-300/70">Ver e editar perfil</div>
                    </div>
                  </button>

                  <button
                    onClick={handleViewCards}
                    className="w-full text-left px-4 py-3 text-cyan-200 hover:bg-white/5 transition flex items-center gap-3 group"
                  >
                    <Shield size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Cartas & Decks</div>
                      <div className="text-xs text-slate-300/70">Gerenciar coleção</div>
                    </div>
                  </button>

                  <div className="h-px bg-white/10" />

                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-200 hover:bg-white/5 transition flex items-center gap-3 group"
                  >
                    <LogOut size={18} className="group-hover:scale-110 transition" />
                    <div>
                      <div className="font-semibold">Sair</div>
                      <div className="text-xs text-slate-300/70">Encerrar sessão</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* === CENTRO: CARTA + JOGAR === */}
      <div className="relative mx-auto max-w-6xl px-6 md:px-8 pt-10 pb-10">
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: painéis */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            {user && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 shadow-[0_12px_50px_rgba(0,0,0,0.40)]"
              >
                <h3 className="text-emerald-200 font-semibold mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)]" />
                  Estatísticas
                </h3>
                <div className="space-y-2 text-sm">
                  <Row label="Nível" value={`LVL ${getUserLevel()}`} />
                  {user.coins !== undefined && <Row label="Moedas" value={`${user.coins} 🪙`} />}
                  {user.gems !== undefined && <Row label="Gemas" value={`${user.gems} 💎`} valueClass="text-cyan-200" />}
                  <Row label="Vitórias" value="0" valueClass="text-emerald-200" />
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 shadow-[0_12px_50px_rgba(0,0,0,0.40)]"
            >
              <h3 className="text-slate-200/80 font-semibold mb-3">Ações rápidas</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MiniBtn>🎁 Presentes</MiniBtn>
                <MiniBtn>👥 Amigos</MiniBtn>
                <MiniBtn>⚙️ Config</MiniBtn>
                <MiniBtn>❓ Ajuda</MiniBtn>
              </div>
            </motion.div>
          </div>

          {/* CENTER: card + CTA */}
          <div className="lg:col-span-6 flex flex-col items-center gap-6">
            <motion.div
              className="relative w-64 h-96 rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur
                shadow-[0_30px_110px_rgba(0,0,0,0.55)]"
              animate={{ rotateY: [0, 180, 360] }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* sheen */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-200/20 to-transparent pointer-events-none z-10"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <img
                src="/img/loginFake.png"
                alt="Security Zone"
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />

              <div className="absolute bottom-0 left-0 right-0 p-3 z-20">
                <div className="text-[10px] uppercase tracking-widest text-slate-200/70 font-mono">
                  ACCESS • READY
                </div>
                <div className="text-sm font-semibold text-slate-100">Security Zone</div>
              </div>
            </motion.div>

            <motion.button
              onClick={() => navigate("/battle")}
              className="relative overflow-hidden rounded-2xl px-12 py-4 text-lg font-extrabold
                bg-emerald-400/15 border border-emerald-300/30 text-emerald-100
                shadow-[0_0_80px_rgba(16,185,129,0.25)]"
              whileHover={{ scale: 1.05, boxShadow: "0 0 70px rgba(16,185,129,0.35)" }}
              whileTap={{ scale: 0.95 }}
              animate={{
                scale: [1, 1.02, 1],
                boxShadow: [
                  "0 0 40px rgba(16,185,129,0.18)",
                  "0 0 70px rgba(34,211,238,0.18)",
                  "0 0 40px rgba(16,185,129,0.18)",
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <span className="relative z-10">🎮 JOGAR AGORA</span>
            </motion.button>

            <div className="text-xs text-slate-300/70 font-mono text-center">
              &gt; dica: comece protegendo (defesa) e finalize com timing (magia)
            </div>
          </div>

          {/* RIGHT: eventos */}
          <div className="hidden lg:flex lg:col-span-3 flex-col gap-4">
            {[
              { title: "🏆 Torneio Diário", desc: "Ganhe recompensas especiais", accent: "emerald" },
              { title: "🎯 Missão Semanal", desc: "Complete desafios épicos", accent: "cyan" },
              { title: "⚡ Evento Relâmpago", desc: "Tempo limitado!", accent: "purple" },
            ].map((event, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.15 + 0.35 }}
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 28px rgba(34,211,238,0.14)",
                }}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur p-4 shadow-[0_12px_50px_rgba(0,0,0,0.40)] transition-all cursor-pointer"
              >
                <p className="text-slate-100 font-semibold mb-1">{event.title}</p>
                <p className="text-sm text-slate-200/70">{event.desc}</p>

                <div className="mt-3 w-full bg-black/25 rounded-full h-1 overflow-hidden border border-white/10">
                  <motion.div
                    className={[
                      "h-1 rounded-full",
                      event.accent === "emerald"
                        ? "bg-emerald-300/80"
                        : event.accent === "cyan"
                          ? "bg-cyan-300/80"
                          : "bg-purple-300/80",
                    ].join(" ")}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.random() * 60 + 20}%` }}
                    transition={{ delay: i * 0.25 + 0.8, duration: 1 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="mt-10 text-center text-slate-300/60 text-xs font-mono">
          Security Zone • v1.0.0 •
        </div>
      </div>
    </div>
  );
};

export default GameHome;

/* ---------------- helpers ---------------- */

function Row({ label, value, valueClass = "text-emerald-200" }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-300/70">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function MiniBtn({ children }) {
  return (
    <button className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/7 transition">
      {children}
    </button>
  );
}

function CyberBg() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* base glow */}
      <div className="absolute inset-0 bg-[radial-gradient(1000px_600px_at_50%_-10%,rgba(34,211,238,0.14),transparent_60%),radial-gradient(900px_500px_at_20%_20%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(800px_500px_at_80%_55%,rgba(168,85,247,0.10),transparent_55%)]" />
      {/* grid */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          maskImage: "radial-gradient(60% 50% at 50% 30%, black 40%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(60% 50% at 50% 30%, black 40%, transparent 70%)",
        }}
      />
      {/* scanlines */}
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
        }}
      />
      {/* vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_50%_110%,rgba(0,0,0,0.9),transparent_55%)]" />
    </div>
  );
}
