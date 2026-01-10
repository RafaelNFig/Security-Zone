import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Filter, Database, Sparkles } from "lucide-react";

const cardsData = [
  { id: "vpn", name: "VPN", type: "magia", cost: 3, life: 0, attack: 0, defense: 20, img: "/img/vpn.png" },
  { id: "firewall", name: "Firewall", type: "defesa", cost: 2, life: 0, attack: 0, defense: 18, img: "/img/firewall.png" },
  { id: "atualizacao", name: "Atualização Crítica", type: "magia", cost: 2, life: 0, attack: 0, defense: 12, img: "/img/atualizacao.png" },
  { id: "captura", name: "Captura de Pacotes", type: "ataque", cost: 2, life: 0, attack: 16, defense: 0, img: "/img/capturapacotes.png" },
  { id: "loginfake", name: "Login Fake", type: "ataque", cost: 2, life: 0, attack: 14, defense: 0, img: "/img/loginFake.png" },
  { id: "eviltwin", name: "Evil Twin", type: "ataque", cost: 3, life: 0, attack: 20, defense: 0, img: "/img/eviltwin.png" },
];

function Pill({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold border transition",
        active
          ? "bg-emerald-400/15 border-emerald-300/30 text-emerald-100"
          : "bg-white/5 border-white/10 text-slate-200/70 hover:text-slate-100 hover:bg-white/7",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function Carrosel({ onOpenAuth = () => {} }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(cardsData[0]?.id ?? "");

  const filtered = useMemo(() => {
    if (filter === "all") return cardsData;
    return cardsData.filter((c) => c.type === filter);
  }, [filter]);

  const current = useMemo(() => {
    return filtered.find((c) => c.id === selected) || filtered[0] || cardsData[0];
  }, [filtered, selected]);

  return (
    <section id="cartas" className="relative py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/70">
              <Database className="h-4 w-4 text-cyan-300" />
              CARD DATABASE
            </div>
            <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
              Coleção de cartas
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-200/70 max-w-2xl">
              Explore cartas de ataque, defesa e magia. Cada uma representa uma ameaça
              ou contra-medida real do mundo de segurança.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill active={filter === "all"} onClick={() => setFilter("all")}>
              <Filter className="h-4 w-4" /> Todas
            </Pill>
            <Pill
              active={filter === "ataque"}
              onClick={() => {
                setFilter("ataque");
                setSelected(cardsData.find((c) => c.type === "ataque")?.id ?? "");
              }}
            >
              Ataque
            </Pill>
            <Pill
              active={filter === "defesa"}
              onClick={() => {
                setFilter("defesa");
                setSelected(cardsData.find((c) => c.type === "defesa")?.id ?? "");
              }}
            >
              Defesa
            </Pill>
            <Pill
              active={filter === "magia"}
              onClick={() => {
                setFilter("magia");
                setSelected(cardsData.find((c) => c.type === "magia")?.id ?? "");
              }}
            >
              Magia
            </Pill>
          </div>
        </div>

        <div className="mt-10 grid lg:grid-cols-12 gap-6">
          {/* Viewer */}
          <div className="lg:col-span-7">
            <div className="relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur shadow-[0_25px_90px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute -inset-24 bg-cyan-400/10 blur-3xl" />
              </div>

              <div className="relative p-5 sm:p-7 flex flex-col sm:flex-row gap-6">
                <motion.div
                  key={current?.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="w-full sm:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-black/20"
                >
                  {current?.img ? (
                    <img
                      src={current.img}
                      alt={current.name}
                      className="w-full h-full object-cover"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : null}
                </motion.div>

                <div className="flex-1">
                  <div className="text-xs uppercase tracking-widest text-slate-300/60">
                    Access Log
                  </div>
                  <div className="mt-2 text-2xl font-extrabold">
                    {current?.name ?? "Carta"}
                  </div>

                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/70">
                    Type:{" "}
                    <span className="text-slate-100 font-semibold">
                      {current?.type ?? "-"}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="Custo" value={current?.cost ?? 0} />
                    <Stat label="Vida" value={current?.life ?? 0} />
                    <Stat label="Ataque" value={current?.attack ?? 0} />
                    <Stat label="Defesa" value={current?.defense ?? 0} />
                  </div>

                  <div className="mt-6 text-sm text-slate-200/75 leading-relaxed">
                    {current?.type === "ataque" &&
                      "Carta ofensiva: pressione o inimigo explorando brechas e derrubando a vida rapidamente."}
                    {current?.type === "defesa" &&
                      "Carta defensiva: reduz o impacto e te mantém vivo até virar o jogo."}
                    {current?.type === "magia" &&
                      "Carta de magia: efeitos especiais de segurança — vira a partida com timing."}
                  </div>

                  <button
                    onClick={onOpenAuth}
                    className="mt-7 inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold
                      bg-emerald-400/15 border border-emerald-300/30 text-emerald-100 hover:bg-emerald-400/20 transition"
                  >
                    <Sparkles className="h-4 w-4" />
                    Criar deck agora
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          <div className="lg:col-span-5">
            <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5">
              <div className="text-xs uppercase tracking-widest text-slate-300/60">
                Seleção
              </div>

              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
                {filtered.map((c) => {
                  const active = c.id === current?.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelected(c.id)}
                      className={[
                        "group relative rounded-2xl overflow-hidden border bg-black/20 transition",
                        active
                          ? "border-emerald-300/35 shadow-[0_0_40px_rgba(16,185,129,0.18)]"
                          : "border-white/10 hover:border-white/20",
                      ].join(" ")}
                      title={c.name}
                    >
                      <div className="aspect-[2/3]">
                        <img
                          src={c.img}
                          alt={c.name}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                          onError={(e) => (e.currentTarget.style.display = "none")}
                        />
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-[10px] text-slate-100 font-semibold truncate">
                        {c.name}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/35 to-cyan-400/0" />
      </div>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-[11px] uppercase tracking-widest text-slate-300/60">
        {label}
      </div>
      <div className="mt-1 text-lg font-extrabold text-slate-100">{value}</div>
    </div>
  );
}
