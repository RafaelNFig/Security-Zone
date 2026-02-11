// src/pages/Login/login.jsx
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { authUtils } from "../../utils/auth.js";
import { useAuth } from "../../firebase/auth.js";
import { motion } from "framer-motion";

// ✅ client oficial (/api relativo via Nginx)
import { apiRequest } from "../../services/api.js";

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState("");

  const { loading: googleLoading, loginWithGoogle } = useAuth();

  // ✅ Só redireciona se a sessão for realmente válida no gateway
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setCheckingSession(true);

        const token = authUtils.getToken?.();
        if (!token) return;

        const res = await apiRequest("/auth/session", { method: "GET" });

        const isAuthed =
          res?.data?.isAuthenticated === true || res?.data?.authenticated === true;

        if (!cancelled && res?.success && isAuthed) {
          navigate("/gamehome", { replace: true });
        } else {
          authUtils.clearAuthData();
        }
      // eslint-disable-next-line no-unused-vars
      } catch (_e) {
        authUtils.clearAuthData();
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const disabled = loading || googleLoading || checkingSession;

  /* ===============================
        LOGIN TRADICIONAL
  ================================ */
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (disabled) return;

      setLoading(true);
      setError("");

      try {
        // ✅ rota real do gateway: POST /api/player/login
        const res = await apiRequest("/player/login", {
          method: "POST",
          body: JSON.stringify(formData),
        });

        if (res?.success && res?.data?.token && res?.data?.player) {
          authUtils.setAuthData(res.data.token, res.data.player);
          navigate("/gamehome", { replace: true });
          return;
        }

        setError(res?.error || "Falha no login.");
      } catch (err) {
        console.error("❌ Erro no login:", err);
        setError(err?.message || "Erro ao tentar fazer login.");
      } finally {
        setLoading(false);
      }
    },
    [disabled, formData, navigate]
  );

  /* ===============================
        LOGIN COM GOOGLE
  ================================ */
  const handleGoogleLogin = useCallback(async () => {
    if (disabled) return;

    try {
      setError("");

      // ✅ agora o loginWithGoogle já finaliza (troca token no gateway e salva player)
      await loginWithGoogle();

      navigate("/gamehome", { replace: true });
    } catch (err) {
      console.error("Erro no login Google:", err);
      setError(err?.message || "Erro ao fazer login com Google.");
    }
  }, [disabled, loginWithGoogle, navigate]);

  return (
    <div className="relative h-screen overflow-hidden bg-[#070A10] text-slate-100 flex flex-col">
      <CyberBackground />
      <ScanBar />

      <header
        className="absolute top-0 left-0 right-0 z-20
                   mx-auto max-w-6xl px-4 sm:px-6 md:px-8 pt-4"
      >
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/7 transition"
          >
            <span className="text-sm font-semibold">← Voltar</span>
          </button>

          <div className="text-right">
            <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
              security zone
            </div>
            <div className="text-lg sm:text-xl font-extrabold">Acesso</div>
          </div>
        </div>
      </header>

      <main className="relative z-10 h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-lg"
        >
          <div className="relative rounded-[28px] border border-white/10 bg-white/4 backdrop-blur shadow-[0_30px_160px_rgba(0,0,0,0.65)] overflow-hidden max-h-[min(640px,85vh)]">
            <CornerBrackets />

            <div
              className="absolute inset-0 opacity-[0.10]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
                backgroundSize: "52px 52px",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 7px)",
              }}
            />

            <div className="relative px-5 sm:px-8 pt-6 pb-4 border-b border-white/10">
              <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                authentication
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight">
                Entrar na conta
              </h2>
              <p className="mt-2 text-sm text-slate-200/70">
                Acesse para continuar sua jornada e gerenciar seus decks.
              </p>
            </div>

            <div className="relative px-5 sm:px-8 py-5 overflow-y-auto">
              {error && (
                <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {/* Google */}
              <motion.button
                onClick={handleGoogleLogin}
                disabled={disabled}
                whileHover={!disabled ? { scale: 1.01 } : undefined}
                whileTap={!disabled ? { scale: 0.99 } : undefined}
                className={[
                  "w-full flex items-center justify-center gap-3 py-2.5 rounded-2xl",
                  "bg-white text-slate-900 font-extrabold transition relative overflow-hidden",
                  disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-100",
                ].join(" ")}
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                <span className="relative z-10">
                  {googleLoading || checkingSession ? "Carregando..." : "Entrar com Google"}
                </span>
              </motion.button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-slate-300/60 text-xs font-mono uppercase tracking-[0.45em]">
                  ou
                </span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              {/* Tradicional */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60"
                  >
                    email
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={disabled}
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-2.5
                               outline-none focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10
                               placeholder:text-slate-400/60"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60"
                  >
                    senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={disabled}
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-2.5
                               outline-none focus:border-emerald-300/30 focus:ring-2 focus:ring-emerald-300/10
                               placeholder:text-slate-400/60"
                    placeholder="Sua senha"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.01 } : undefined}
                  whileTap={!disabled ? { scale: 0.99 } : undefined}
                  className={[
                    "w-full py-2.5 rounded-2xl font-extrabold transition relative overflow-hidden border",
                    disabled
                      ? "bg-white/5 text-slate-200/50 border-white/10 cursor-not-allowed"
                      : "bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] border-yellow-600 shadow-2xl shadow-yellow-500/35 hover:shadow-yellow-500/50",
                  ].join(" ")}
                >
                  {!disabled && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  <span className="relative z-10">{loading ? "Entrando..." : "Entrar"}</span>
                </motion.button>
              </form>

              <div className="mt-5">
                <p className="text-center text-sm text-slate-200/70">
                  Ainda não tem conta?{" "}
                  <button
                    onClick={() => navigate("/register")}
                    className="text-cyan-200 hover:text-cyan-100 transition font-semibold"
                    disabled={disabled}
                    type="button"
                  >
                    Cadastre-se
                  </button>
                </p>

                <div className="mt-3 text-center text-xs font-mono text-slate-300/60">
                  &gt; dica: use um email válido para sincronizar seus decks
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

/* ---------- UI helpers ---------- */

function CornerBrackets() {
  const b = "border-white/15";
  return (
    <div className="pointer-events-none absolute inset-0">
      <span className={`absolute left-4 top-4 h-3 w-3 border-l border-t ${b}`} />
      <span className={`absolute right-4 top-4 h-3 w-3 border-r border-t ${b}`} />
      <span className={`absolute left-4 bottom-4 h-3 w-3 border-l border-b ${b}`} />
      <span className={`absolute right-4 bottom-4 h-3 w-3 border-r border-b ${b}`} />
    </div>
  );
}

function ScanBar() {
  return (
    <motion.div
      className="pointer-events-none absolute left-0 right-0 h-10 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent blur-[0.5px]"
      animate={{ y: ["-10%", "110%"] }}
      transition={{ duration: 3.8, repeat: Infinity, ease: "linear" }}
    />
  );
}

function CyberBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(800px_520px_at_15%_30%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(760px_520px_at_85%_60%,rgba(168,85,247,0.10),transparent_55%)]" />
      <div
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(34,211,238,0.10) 1px, transparent 1px), linear-gradient(rgba(16,185,129,0.08) 1px, transparent 1px)",
          backgroundSize: "120px 60px",
          maskImage: "radial-gradient(70% 60% at 50% 35%, black 45%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 35%, black 45%, transparent 75%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 2px, transparent 6px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_120%,rgba(0,0,0,0.92),transparent_58%)]" />
    </div>
  );
}
