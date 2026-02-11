// src/pages/Register/register.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { playerService } from "../../services/api.js";
import { authUtils } from "../../utils/auth.js";
import { motion, AnimatePresence } from "framer-motion";

// ✅ client oficial (/api relativo via Nginx)
import { apiRequest } from "../../services/api.js";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // { type: "success" | "info", title, message }

  const redirectTimerRef = useRef(null);

  // ✅ helper: sleep 2s
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ✅ Só redireciona se a sessão for realmente válida no gateway (evita auto-login indevido)
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

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const disabled = loading || checkingSession;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;

    setLoading(true);
    setError("");
    setNotice(null);

    try {
      const result = await playerService.register(formData);

      if (!result?.success) {
        setError(result?.error || "Erro ao realizar cadastro.");
        return;
      }

      // ✅ Notificação estilizada
      setNotice({
        type: "success",
        title: "Conta criada com sucesso",
        message: "Redirecionando para o login em instantes…",
      });

      // ✅ espera 2 segundos antes de redirecionar
      await sleep(2000);

      navigate("/login", {
        replace: true,
        state: {
          registered: true,
          email: formData.email,
        },
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Erro ao realizar cadastro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden bg-[#070A10] text-slate-100 flex flex-col">
      <CyberBackground />

      <header className="absolute top-0 left-0 right-0 z-20 mx-auto max-w-6xl px-4 sm:px-6 pt-4">
        <button
          onClick={() => navigate(-1)}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-2xl px-4 py-2
                     bg-white/5 border border-white/10 hover:bg-white/10 transition
                     disabled:opacity-60 disabled:cursor-not-allowed"
        >
          ← Voltar
        </button>
      </header>

      <main className="relative z-10 h-screen flex items-start justify-center px-4 pt-[clamp(64px,10vh,120px)]">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="w-full max-w-lg"
        >
          <div
            className="relative rounded-[28px] border border-white/10 bg-white/4 backdrop-blur
                       shadow-[0_30px_160px_rgba(0,0,0,0.65)]
                       overflow-hidden max-h-[min(640px,85vh)]"
          >
            <CornerBrackets />

            <div className="relative px-5 sm:px-8 pt-6 pb-4 border-b border-white/10">
              <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                registration
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold">Criar conta</h2>
              <p className="mt-2 text-sm text-slate-200/70">
                Crie sua conta para começar sua jornada em Security Zone.
              </p>
            </div>

            <div className="relative px-5 sm:px-8 py-5 overflow-y-auto">
              {/* ✅ Notificação (topo do container) */}
              <AnimatePresence>
                {notice && (
                  <motion.div
                    key="notice"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={[
                      "mb-4 rounded-2xl border px-4 py-3 text-sm relative overflow-hidden",
                      notice.type === "success"
                        ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                        : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100",
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 opacity-[0.12] pointer-events-none"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                      }}
                    />
                    <div className="relative">
                      <div className="text-xs font-mono uppercase tracking-[0.45em] opacity-80">
                        status
                      </div>
                      <div className="mt-1 font-extrabold">{notice.title}</div>
                      <div className="mt-1 text-slate-100/80">{notice.message}</div>

                      <div className="mt-3 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                          className="h-full w-full bg-white/30"
                          initial={{ x: "-100%" }}
                          animate={{ x: "0%" }}
                          transition={{ duration: 2, ease: "linear" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <div className="mb-4 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                    nome de usuário
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={disabled}
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10
                               px-4 py-2.5 outline-none
                               focus:border-cyan-300/30 focus:ring-2 focus:ring-cyan-300/10
                               disabled:opacity-60"
                    placeholder="Seu nickname"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                    email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={disabled}
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10
                               px-4 py-2.5 outline-none
                               focus:border-emerald-300/30 focus:ring-2 focus:ring-emerald-300/10
                               disabled:opacity-60"
                    placeholder="seu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                    senha
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    minLength={6}
                    required
                    disabled={disabled}
                    className="mt-2 w-full rounded-2xl bg-black/30 border border-white/10
                               px-4 py-2.5 outline-none
                               focus:border-yellow-300/30 focus:ring-2 focus:ring-yellow-300/10
                               disabled:opacity-60"
                    placeholder="mínimo 6 caracteres"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={disabled}
                  whileHover={!disabled ? { scale: 1.02 } : undefined}
                  whileTap={!disabled ? { scale: 0.98 } : undefined}
                  className={[
                    "mt-2 w-full py-2.5 rounded-2xl font-extrabold transition relative overflow-hidden border",
                    disabled
                      ? "bg-white/5 text-slate-200/50 border-white/10 cursor-not-allowed"
                      : "bg-gradient-to-b from-[#FFD60A] to-[#FFC300] text-[#000814] border-yellow-600 shadow-2xl shadow-yellow-500/35",
                  ].join(" ")}
                >
                  {!disabled && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      animate={{ x: ["-120%", "120%"] }}
                      transition={{ duration: 2.2, repeat: Infinity }}
                    />
                  )}
                  <span className="relative z-10">
                    {loading ? "Cadastrando..." : checkingSession ? "Carregando..." : "Cadastrar"}
                  </span>
                </motion.button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-200/70">
                Já possui conta?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="text-cyan-200 hover:text-cyan-100 font-semibold transition"
                  disabled={disabled}
                >
                  Entrar
                </button>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

/* ---------- helpers ---------- */

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

function CyberBackground() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_-10%,rgba(34,211,238,0.16),transparent_60%),radial-gradient(800px_520px_at_15%_30%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(760px_520px_at_85%_60%,rgba(168,85,247,0.10),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_50%_120%,rgba(0,0,0,0.92),transparent_58%)]" />
    </div>
  );
}
