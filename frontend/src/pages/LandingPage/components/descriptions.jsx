import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Swords,
  Wand2,
  WifiOff,
  Radio,
  KeyRound,
  ChevronRight,
} from "lucide-react";

function Section({ id, title, subtitle, children }) {
  return (
    <section id={id} className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="mb-10 sm:mb-12">
          <div className="text-xs uppercase tracking-widest text-slate-300/60">
            {subtitle}
          </div>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight">
            {title}
          </h2>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/35 to-emerald-400/0" />
        </div>
        {children}
      </div>
    </section>
  );
}

function GlassCard({ children, className = "" }) {
  return (
    <div
      className={[
        "rounded-2xl bg-white/5 border border-white/10 backdrop-blur",
        "shadow-[0_12px_50px_rgba(0,0,0,0.40)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function Descriptions({ onOpenAuth = () => {} }) {
  const steps = [
    {
      code: "STEP 01",
      title: "Monte seu deck",
      desc: "Escolha cartas de ataque, defesa e magia. Equilíbrio vence.",
    },
    {
      code: "STEP 02",
      title: "Gerencie custo",
      desc: "Cada ação tem um custo. Planejamento > força bruta.",
    },
    {
      code: "STEP 03",
      title: "Identifique ameaças",
      desc: "A zona muda. Adapte sua defesa conforme o ataque.",
    },
    {
      code: "STEP 04",
      title: "Sobreviva",
      desc: "Derrube a vida do inimigo antes que derrubem a sua.",
    },
  ];

  const types = [
    {
      icon: Swords,
      title: "Ataque",
      accent: "text-pink-300",
      border: "border-pink-300/25",
      desc: "Pressão e impacto. Explora falhas do inimigo.",
      bullets: ["Dano direto", "Custo médio", "Finalizações rápidas"],
    },
    {
      icon: Shield,
      title: "Defesa",
      accent: "text-cyan-300",
      border: "border-cyan-300/25",
      desc: "Bloqueia, reduz e segura o jogo até virar.",
      bullets: ["Mitigação de dano", "Sustentação", "Controle"],
    },
    {
      icon: Wand2,
      title: "Magia",
      accent: "text-emerald-300",
      border: "border-emerald-300/25",
      desc: "Contra-medidas de segurança que mudam a partida.",
      bullets: ["VPN / Patch", "Efeitos especiais", "Timing importa"],
    },
  ];

  const realWorld = [
    {
      icon: Radio,
      title: "Fake Hotspot",
      desc: "Rede falsa que imita uma legítima para capturar tráfego.",
    },
    {
      icon: KeyRound,
      title: "Roubo de sessão",
      desc: "Sequestro de sessão quando a conexão não está protegida.",
    },
    {
      icon: WifiOff,
      title: "Sniffing",
      desc: "Captura de pacotes em redes abertas para extrair dados.",
    },
  ];

  return (
    <>
      <Section
        id="como-jogar"
        subtitle="Manual do Operador"
        title="Como o jogo funciona"
      >
        <div className="grid lg:grid-cols-12 gap-6">
          <GlassCard className="lg:col-span-5 p-6">
            <div className="text-xs uppercase tracking-widest text-slate-200/70">
              Mission briefing
            </div>
            <p className="mt-3 text-slate-200/75 leading-relaxed">
              Security Zone transforma{" "}
              <span className="text-slate-100">segurança da informação</span> em
              estratégia. Você constrói um deck e usa cartas como{" "}
              <span className="text-emerald-200">defesas reais</span> (VPN, firewall,
              atualização) para sobreviver a ataques típicos de redes Wi-Fi abertas.
            </p>

            <button
              onClick={onOpenAuth}
              className="mt-6 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
                bg-emerald-400/15 border border-emerald-300/30 text-emerald-100 hover:bg-emerald-400/20 transition"
            >
              Iniciar acesso
              <ChevronRight className="h-4 w-4" />
            </button>

            <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-slate-300/70 font-mono">
                &gt; Tip: defesa primeiro, magia no timing certo.
              </div>
            </div>
          </GlassCard>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.code}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-widest text-slate-300/60">
                      {s.code}
                    </div>
                    <div className="h-2 w-2 rounded-full bg-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.35)]" />
                  </div>
                  <div className="mt-2 text-lg font-semibold">{s.title}</div>
                  <div className="mt-1 text-sm text-slate-200/70">
                    {s.desc}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </Section>

      <Section id="tipos" subtitle="Banco de cartas" title="Tipos de cartas">
        <div className="grid md:grid-cols-3 gap-4">
          {types.map((t) => (
            <GlassCard key={t.title} className={`p-6 border ${t.border}`}>
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                  <t.icon className={`h-5 w-5 ${t.accent}`} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-300/60">
                    Module
                  </div>
                  <div className="text-xl font-semibold">{t.title}</div>
                </div>
              </div>

              <div className="mt-3 text-sm text-slate-200/75">{t.desc}</div>

              <ul className="mt-4 space-y-2">
                {t.bullets.map((b) => (
                  <li
                    key={b}
                    className="text-sm text-slate-200/70 flex items-center gap-2"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/80" />
                    {b}
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section
        id="ameaças"
        subtitle="Segurança na vida real"
        title="O que você aprende jogando"
      >
        <div className="grid lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 grid sm:grid-cols-3 gap-4">
            {realWorld.map((r) => (
              <GlassCard key={r.title} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                    <r.icon className="h-5 w-5 text-amber-300" />
                  </div>
                  <div className="font-semibold">{r.title}</div>
                </div>
                <div className="mt-2 text-sm text-slate-200/70">{r.desc}</div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="lg:col-span-5 p-6 border border-cyan-300/20">
            <div className="text-xs uppercase tracking-widest text-slate-300/60">
              Security note
            </div>
            <div className="mt-2 text-xl font-semibold">
              Wi-Fi aberto não é “internet grátis”.
            </div>
            <p className="mt-3 text-sm text-slate-200/75 leading-relaxed">
              Em redes públicas, ataques podem acontecer em minutos. No jogo, você
              aprende a reconhecer riscos e aplicar contra-medidas como um
              profissional — só que em forma de batalha.
            </p>

            <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs text-slate-300/70 font-mono">
                &gt; Objetivo: transformar “medo de rede aberta” em estratégia.
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-purple-400/0 via-purple-400/30 to-purple-400/0" />
      </Section>
    </>
  );
}
