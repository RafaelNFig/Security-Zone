// src/pages/LandingPage/components/carrosel.jsx
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, Database, Sparkles } from "lucide-react";

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

export default function Carrosel({
  onOpenAuth = () => {},
  cards = [],
  isLoading = false,
}) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState("");

  const normalized = useMemo(() => {
    const list = Array.isArray(cards) ? cards : [];
    return list
      .map((c) => ({
        id: String(c?.id ?? c?.CD_ID ?? ""),
        name: c?.name ?? c?.CD_NAME ?? "Carta",
        type: String(c?.type ?? "").toLowerCase(), // ataque/defesa/magia
        cost: Number(c?.cost ?? 0),
        life: Number(c?.life ?? 0),
        attack: Number(c?.attack ?? 0),
        defense: Number(c?.defense ?? 0),
        img: c?.img ?? null,
      }))
      .filter((c) => c.id);
  }, [cards]);

  const filtered = useMemo(() => {
    if (filter === "all") return normalized;
    return normalized.filter((c) => c.type === filter);
  }, [filter, normalized]);

  const current = useMemo(() => {
    const found = filtered.find((c) => c.id === selected);
    return found || filtered[0] || normalized[0] || null;
  }, [filtered, selected, normalized]);

  // ✅ sempre garante um selected válido quando mudar filtro/lista
  useEffect(() => {
    if (!filtered.length) {
      setSelected("");
      return;
    }
    if (!selected || !filtered.some((c) => c.id === selected)) {
      setSelected(filtered[0].id);
    }
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
              Explore cartas de ataque, defesa e magia. Cada uma representa uma
              ameaça ou contra-medida real do mundo de segurança.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Pill
              active={filter === "all"}
              onClick={() => {
                setFilter("all");
                setSelected("");
              }}
            >
              <Filter className="h-4 w-4" /> Todas
            </Pill>

            <Pill
              active={filter === "ataque"}
              onClick={() => {
                setFilter("ataque");
                setSelected("");
              }}
            >
              Ataque
            </Pill>

            <Pill
              active={filter === "defesa"}
              onClick={() => {
                setFilter("defesa");
                setSelected("");
              }}
            >
              Defesa
            </Pill>

            <Pill
              active={filter === "magia"}
              onClick={() => {
                setFilter("magia");
                setSelected("");
              }}
            >
              Magia
            </Pill>
          </div>
        </div>

        {isLoading && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200/70">
            Carregando cartas...
          </div>
        )}

        {!isLoading && !current && (
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-slate-200/70">
            Nenhuma carta encontrada no banco.
          </div>
        )}

        {!isLoading && current && (
          <div className="mt-10 grid lg:grid-cols-12 gap-6 items-start">
            {/* ===================== VIEWER (ALTURA FIXA) ===================== */}
            <div className="lg:col-span-7">
              <div
                className={[
                  "relative rounded-3xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur shadow-[0_25px_90px_rgba(0,0,0,0.45)]",
                  // ✅ FIXO (sem variável) pra Tailwind compilar
                  "h-[520px] lg:h-[560px]",
                ].join(" ")}
              >
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute -inset-24 bg-cyan-400/10 blur-3xl" />
                </div>

                <div className="relative h-full p-5 sm:p-7 flex flex-col sm:flex-row gap-6">
                  <motion.div
                    key={current?.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="w-full sm:w-[260px] aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 bg-black/20 shrink-0"
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

                  {/* ✅ só scrolla o texto se precisar, sem estourar */}
                  <div className="flex-1 min-w-0 overflow-y-auto pr-1">
                    <div className="text-xs uppercase tracking-widest text-slate-300/60">
                      Access Log
                    </div>

                    <div className="mt-2 text-2xl font-extrabold truncate">
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

            {/* ===================== SELEÇÃO (MESMA ALTURA + SCROLL INTERNO) ===================== */}
            <div className="lg:col-span-5">
              <div
                className={[
                  "rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-5 flex flex-col",
                  // ✅ FIXO (sem variável) pra Tailwind compilar
                  "h-[520px] lg:h-[560px]",
                ].join(" ")}
              >
                <div className="text-xs uppercase tracking-widest text-slate-300/60 shrink-0">
                  Seleção
                </div>

                {/* ✅ SCROLL AQUI (e só aqui) */}
                <div className="mt-4 flex-1 min-h-0 overflow-y-auto pr-2">
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
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
                            {c.img ? (
                              <img
                                src={c.img}
                                alt={c.name}
                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                                onError={(e) =>
                                  (e.currentTarget.style.display = "none")
                                }
                              />
                            ) : null}
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
          </div>
        )}

        <div className="mt-12 h-px w-full bg-gradient-to-r from-cyan-400/0 via-cyan-400/35 to-cyan-400/0" />
      </div>
    </section>
  );
}
