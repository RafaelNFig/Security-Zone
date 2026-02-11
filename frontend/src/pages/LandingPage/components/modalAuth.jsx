import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { X, UserPlus, LogIn } from "lucide-react";

export default function ModalAuth({ onClose }) {
  const navigate = useNavigate();

  const handleCreateAccount = () => {
    navigate("/register");
    onClose();
  };

  const handleLogin = () => {
    navigate("/login");
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative w-full max-w-3xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="relative rounded-[28px] border border-white/10 bg-[#070A10]/90 backdrop-blur shadow-[0_30px_160px_rgba(0,0,0,0.65)] overflow-hidden">
          {/* Cyber background layers */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_10%,rgba(34,211,238,0.18),transparent_55%),radial-gradient(900px_520px_at_80%_90%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(900px_520px_at_50%_120%,rgba(0,0,0,0.9),transparent_60%)]" />
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
          </div>

          {/* Scanline */}
          <motion.div
            className="pointer-events-none absolute left-0 right-0 h-10 bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent blur-[0.5px]"
            animate={{ y: ["-10%", "110%"] }}
            transition={{ duration: 3.8, repeat: Infinity, ease: "linear" }}
          />

          {/* Corner brackets */}
          <CornerBrackets />

          {/* Header */}
          <div className="relative px-6 sm:px-8 py-6 border-b border-white/10">
            <div className="text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
              access required
            </div>

            <div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-100">
                Cadastre-se para jogar
              </h2>

              <div className="text-xs font-mono text-slate-300/60">
                &gt; escolha uma opção abaixo
              </div>
            </div>

            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-10 w-10 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/7 transition flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={18}/>
            </button>
          </div>

          {/* Body */}
          <div className="relative px-6 sm:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Create account */}
              <motion.button
                onClick={handleCreateAccount}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="text-left rounded-[22px] border border-emerald-300/20 bg-emerald-400/10 hover:bg-emerald-400/14 transition overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.55)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-200/70">
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-2xl border border-white/10 bg-white/5 text-emerald-200">
                        <UserPlus size={18} />
                      </span>
                      new account
                    </div>

                    <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.35)]" />
                  </div>

                  <div className="mt-4 text-xl font-extrabold text-emerald-100">
                    Criar conta
                  </div>

                  <p className="mt-1 text-sm text-slate-200/70">
                    Primeiro acesso? Crie seu perfil e monte seu deck.
                  </p>

                  <div className="mt-5 h-px bg-white/10" />

                  <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                    click to create
                  </div>
                </div>

                {/* shine */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  animate={{ x: ["-120%", "120%"] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.button>

              {/* Login */}
              <motion.button
                onClick={handleLogin}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="text-left rounded-[22px] border border-cyan-300/20 bg-cyan-400/10 hover:bg-cyan-400/14 transition overflow-hidden shadow-[0_18px_70px_rgba(0,0,0,0.55)]"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-200/70">
                      <span className="inline-flex items-center justify-center h-9 w-9 rounded-2xl border border-white/10 bg-white/5 text-cyan-200">
                        <LogIn size={18} />
                      </span>
                      sign in
                    </div>

                    <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.35)]" />
                  </div>

                  <div className="mt-4 text-xl font-extrabold text-cyan-100">
                    Entrar
                  </div>

                  <p className="mt-1 text-sm text-slate-200/70">
                    Já tem conta? Acesse e continue sua jornada.
                  </p>

                  <div className="mt-5 h-px bg-white/10" />

                  <div className="mt-3 text-[11px] font-mono uppercase tracking-[0.45em] text-slate-300/60">
                    click to login
                  </div>
                </div>

                {/* shine */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
                  animate={{ x: ["-120%", "120%"] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="mt-6 flex justify-center">
              <div className="w-2/3 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            </div>

            {/* Bottom hint */}
            <div className="mt-4 text-center text-xs font-mono text-slate-300/60">
              &gt; dica: use email válido para receber recursos e recompensas
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
