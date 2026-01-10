import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Network, Lock, Sparkles } from "lucide-react";

const chips = [
  { icon: ShieldCheck, label: "Defesa real" },
  { icon: Network, label: "Ameaças de Wi-Fi aberto" },
  { icon: Lock, label: "Estratégia + aprendizado" },
];

const floatingCards = [
  { img: "/img/vpn.png", alt: "Carta VPN" },
  { img: "/img/firewall.png", alt: "Carta Firewall" },
  { img: "/img/atualizacao.png", alt: "Carta Atualização" },
];

export default function GameEx({ onOpenAuth = () => {} }) {
  return (
    <section id="sobre" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 pt-16 pb-10 sm:pt-20 sm:pb-16">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* Left: text */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/70">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)]" />
              Access Level: Authorized
            </div>

            <h1 className="mt-4 text-4xl sm:text-5xl font-extrabold tracking-tight">
              Entre na{" "}
              <span className="text-emerald-300 drop-shadow-[0_0_18px_rgba(16,185,129,0.25)]">
                Security Zone
              </span>
              .
            </h1>

            <p className="mt-4 text-base sm:text-lg text-slate-200/75 leading-relaxed">
              Um card game cyberpunk onde{" "}
              <span className="text-slate-100">redes Wi-Fi abertas</span> viram
              ameaça — e conhecimento vira sua{" "}
              <span className="text-emerald-200">defesa</span>. Monte seu deck,
              gerencie custo, use magia de segurança (VPN, patch, firewall) e
              sobreviva à zona.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {chips.map((c) => (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-slate-200/80"
                >
                  <c.icon className="h-4 w-4 text-cyan-300" />
                  {c.label}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenAuth}
                className="relative inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
                  bg-emerald-400/15 border border-emerald-300/30 text-emerald-100
                  shadow-[0_0_60px_rgba(16,185,129,0.22)]"
              >
                <Sparkles className="h-4 w-4" />
                Jogar agora
                <span className="absolute inset-0 rounded-2xl ring-1 ring-white/10" />
              </motion.button>

              <button
                onClick={() => {
                  const el = document.getElementById("cartas");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
                  bg-white/5 border border-white/10 text-slate-100 hover:bg-white/7 transition"
              >
                Ver cartas
              </button>
            </div>

            <div className="mt-6 text-xs text-slate-300/60">
              * Baseado em riscos reais: sniffing, fake hotspot e roubo de sessão.
            </div>
          </div>

          {/* Right: floating cards */}
          <div className="lg:col-span-6">
            <div className="relative">
              <div className="absolute -inset-10 bg-cyan-400/10 blur-3xl rounded-full" />
              <div className="absolute -bottom-10 -right-6 bg-emerald-400/10 blur-3xl rounded-full h-80 w-80" />

              <div className="relative h-[360px] sm:h-[420px]">
                {floatingCards.map((c, idx) => (
                  <motion.div
                    key={c.img}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 + idx * 0.12, duration: 0.55 }}
                    whileHover={{ y: -6, rotate: idx === 1 ? 0 : idx === 0 ? -2 : 2 }}
                    className={[
                      "absolute rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur",
                      "shadow-[0_30px_90px_rgba(0,0,0,0.45)]",
                      idx === 0
                        ? "left-0 top-10 w-[200px] sm:w-[240px] rotate-[-6deg]"
                        : idx === 1
                        ? "left-[26%] top-0 w-[220px] sm:w-[260px] rotate-[2deg] z-10"
                        : "right-0 top-16 w-[200px] sm:w-[240px] rotate-[8deg]",
                    ].join(" ")}
                  >
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                      <div className="absolute -inset-20 bg-emerald-400/10 blur-2xl opacity-60" />
                    </div>
                    <img
                      src={c.img}
                      alt={c.alt}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <div className="text-xs uppercase tracking-widest text-slate-200/70">
                        Protocol
                      </div>
                      <div className="text-sm font-semibold text-slate-100">
                        {c.alt}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-4">
                <div className="text-xs uppercase tracking-widest text-slate-200/70">
                  System Hint
                </div>
                <div className="mt-1 text-sm text-slate-200/75">
                  Crie um deck equilibrado: defesa segura no early game e magia
                  no timing certo.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/35 to-cyan-400/0" />
    </section>
  );
}