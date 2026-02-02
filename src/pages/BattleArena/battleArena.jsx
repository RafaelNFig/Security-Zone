import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Timer, Hourglass, Shield, Skull, Layers, Sparkles, Swords } from "lucide-react";

const ARENA_BG_URL = "/img/arena-bg.jpg";
const PLAYER_ID_FALLBACK = 1;
const CARDS_ENDPOINT = (playerId) => `http://localhost:3000/api/player/${playerId}/cards`;

// Palco “design”
const STAGE_W = 1600;
const STAGE_H = 900;

function formatTime(totalSeconds) {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function typeBadge(type) {
  if (!type) return "bg-white/10 text-slate-100 border-white/10";
  const t = type.toLowerCase();
  if (t.includes("ataque")) return "bg-red-500/12 text-red-200 border-red-400/25";
  if (t.includes("defesa")) return "bg-cyan-500/12 text-cyan-200 border-cyan-400/25";
  if (t.includes("magia")) return "bg-purple-500/12 text-purple-200 border-purple-400/25";
  return "bg-white/10 text-slate-100 border-white/10";
}

export default function Arena() {
  const playerId = PLAYER_ID_FALLBACK;

  // ✅ agora o scale é calculado pelo “espaço do centro” (arena area), não pela tela inteira
  const arenaBoxRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = arenaBoxRef.current;
    if (!el) return;

    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;

      // contain dentro do centro
      const s = Math.min(w / STAGE_W, h / STAGE_H);
      setScale(Math.max(0.42, s));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);

    window.addEventListener("resize", compute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, []);

  // timer
  const [secondsLeft, setSecondsLeft] = useState(10 * 60);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  // turno + botão
  const [turnOwner, setTurnOwner] = useState("Jogador");
  const [turnCount, setTurnCount] = useState(1);
  const [endTurnToast, setEndTurnToast] = useState(false);

  const endTurn = () => {
    setTurnOwner((prev) => (prev === "Jogador" ? "Oponente" : "Jogador"));
    setTurnCount((c) => c + 1);

    setEndTurnToast(true);
    window.setTimeout(() => setEndTurnToast(false), 1100);
  };

  const isMyTurn = turnOwner === "Jogador";

  // cards
  const [hand, setHand] = useState([]);
  const [slots, setSlots] = useState(() => Array.from({ length: 6 }, () => null));
  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState(null);

  // drag
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState("Arraste uma carta da mão para um SLOT.");
  const dragCardRef = useRef(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setErr(null);
      try {
        const res = await fetch(CARDS_ENDPOINT(playerId));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const cards = data?.success ? data.cards : [];

        const picked = cards.slice(0, 5).map((c, idx) => ({
          id: c.id ?? `${idx}`,
          name: c.name ?? "CARD",
          type: c.type ?? "magia",
          cost: c.cost ?? 0,
          img: c.img ?? null,
          attack: c.attack ?? null,
          defense: c.defense ?? null,
          life: c.life ?? null,
          description: c.description ?? "",
        }));

        setHand(picked);
      } catch (e) {
        setErr(e.message || "Erro ao carregar cartas");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [playerId]);

  const topFanRotation = useMemo(() => [-18, -9, 0, 9, 18], []);
  const bottomFanRotation = useMemo(() => [-16, -8, 0, 8, 16], []);

  const canDropInSlot = (slotIndex) => slots[slotIndex] == null;

  const onDragStartCard = (card, fromIndex) => {
    dragCardRef.current = { card, fromIndex };
    setDragging(true);
    setHint("Solte a carta em um SLOT vazio.");
  };

  const onDragEndCard = () => {
    setDragging(false);
    setHoverSlot(null);
    setHint("Arraste uma carta da mão para um SLOT.");
  };

  const onDropSlot = (slotIndex) => {
    const payload = dragCardRef.current;
    if (!payload) return;
    if (!canDropInSlot(slotIndex)) return;

    const { card, fromIndex } = payload;
    setHand((prev) => prev.filter((_, i) => i !== fromIndex));
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = card;
      return next;
    });

    dragCardRef.current = null;
    setDragging(false);
    setHoverSlot(null);
    setHint("Carta posicionada! Clique no SLOT para devolver à mão.");
  };

  const removeFromSlot = (slotIndex) => {
    const card = slots[slotIndex];
    if (!card) return;
    setSlots((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setHand((prev) => [...prev, card]);
    setHint("Carta devolvida para a mão.");
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-black">
      {/* fundo */}
      <div className="absolute inset-0 bg-center bg-cover" style={{ backgroundImage: `url(${ARENA_BG_URL})` }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,0,0,0.10),rgba(0,0,0,0.92))]" />
      <div className="absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_55%,transparent_40%,rgba(0,0,0,0.85))]" />
      <div className="absolute inset-0 backdrop-blur-[1px]" />

      {/* ✅ layout responsivo: topo / corpo / mão */}
      <div className="relative z-10 h-full w-full p-3 sm:p-4 lg:p-6">
        <div className="mx-auto h-full w-full max-w-[1900px] grid grid-rows-[auto_1fr_auto] gap-3 sm:gap-4">
          {/* TOPO */}
          <div className="flex items-start justify-between gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-4 min-w-[280px]">
              <button
                className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur p-3 hover:bg-white/5 transition shadow-[0_10px_40px_rgba(0,0,0,0.55)]"
                title="Voltar"
                onClick={() => window.history.back()}
              >
                <X size={18} />
              </button>

              <div
                className="flex items-center gap-3 rounded-2xl border border-white/12 bg-black/30 backdrop-blur px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
                style={{ maxWidth: 760 }}
                title={hint}
              >
                <Sparkles size={16} className="text-cyan-200 shrink-0" />
                <span className="text-sm text-slate-200/80 font-mono truncate">{hint}</span>
              </div>
            </div>

            <HudChip title="TEMPO" icon={<Timer size={16} className="text-cyan-200" />}>
              <span className="font-extrabold text-2xl font-mono tracking-wider">{formatTime(secondsLeft)}</span>
            </HudChip>
          </div>

          {/* ✅ CORPO (colunas responsivas, laterais menores / centro maior) */}
          <div className="min-h-0 grid grid-cols-1 lg:grid-cols-[clamp(190px,16vw,230px)_1fr_clamp(200px,17vw,240px)] gap-3 sm:gap-4">
            {/* ESQUERDA */}
            <div className="min-h-0 flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <ZoneCard title="DECK ZONE" icon={<Layers size={16} />} tone="cyan" />
              </div>

              <div className="flex flex-col gap-3">
                <HudChip title="TURNO" icon={<Hourglass size={16} className="text-amber-200" />}>
                  <div className="flex items-end justify-between gap-6">
                    <div>
                      <div className="text-base font-semibold text-slate-100">{turnOwner}</div>
                      <div className="text-[10px] font-mono text-slate-200/60">TURN #{turnCount}</div>
                    </div>
                  </div>
                </HudChip>

                <EndTurnButton disabled={!isMyTurn} onClick={endTurn} />
              </div>

              <div className="mt-auto">
                <EnergyOrb />
              </div>
            </div>

            {/* ARENA (CENTRO) */}
            <div className="min-h-0 flex items-center justify-center">
              {/* ✅ este box define o “tamanho disponível” pro palco */}
              <div
                ref={arenaBoxRef}
                className="relative w-full h-full max-h-[calc(100dvh-220px)] lg:max-h-[calc(100dvh-190px)]"
              >
                {/* garante proporção 16:9 sem estourar */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {/* ✅ centro pode ser mais largo */}
                  <div className="relative w-full h-full max-w-[1650px] max-h-full aspect-[16/9]">
                    {/* palco escalado */}
                    <div
                      className="absolute left-1/2 top-1/2"
                      style={{
                        width: STAGE_W,
                        height: STAGE_H,
                        transform: `translate(-50%, -50%) scale(${scale})`,
                        transformOrigin: "center",
                      }}
                    >
                      <ArenaAtmosphere />

                      {/* board layers */}
                      <div className="absolute inset-0 z-[5]">
                        <ArenaFloor />
                      </div>
                      <div className="absolute inset-0 z-[6]">
                        <ArenaLanes />
                      </div>
                      <div className="absolute inset-0 z-[12]">
                        <ArenaZonesOverlay />
                      </div>

                      <div className="absolute inset-[18px] rounded-3xl border border-cyan-300/15" />

                      {/* Oponente hand (top-center) */}
                      <div
                        className="absolute z-[25] left-1/2 -translate-x-1/2 pointer-events-none"
                        style={{ top: 78, width: 430, height: 160 }}
                      >
                        <div className="relative w-full h-full">
                          {topFanRotation.map((rot, i) => (
                            <div
                              key={i}
                              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-black/35 border border-white/14 shadow-[0_12px_40px_rgba(0,0,0,0.65)] overflow-hidden"
                              style={{
                                width: 90,
                                height: 120,
                                transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(-10px)`,
                              }}
                            >
                              <div className="h-full w-full relative">
                                <div className="absolute inset-0 opacity-55 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_60%)]" />
                                <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:14px_14px]" />
                                <div className="absolute inset-0 shadow-[inset_0_0_22px_rgba(0,0,0,0.40)]" />
                                <div className="relative text-[10px] text-center mt-3 text-slate-200/75 font-mono">
                                  VERSO
                                  <div className="mt-1">CARD</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <CenterArenaRing />

                      {/* ✅ SLOTS ficam maiores quando o scale sobe; mantive width 860 */}
                      <div
                        className="absolute z-[20] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        style={{ width: 860 }}
                      >
                        <div className="grid grid-cols-3 gap-14">
                          {[0, 1, 2].map((idx) => (
                            <BattleSlot
                              key={idx}
                              card={slots[idx]}
                              dragging={dragging}
                              isHover={hoverSlot === idx}
                              canAccept={dragging && canDropInSlot(idx)}
                              onHover={() => setHoverSlot(idx)}
                              onLeave={() => setHoverSlot(null)}
                              onDrop={() => onDropSlot(idx)}
                              onRemove={() => removeFromSlot(idx)}
                            />
                          ))}
                        </div>

                        <div style={{ height: 95 }} />

                        <div className="grid grid-cols-3 gap-14">
                          {[3, 4, 5].map((idx) => (
                            <BattleSlot
                              key={idx}
                              card={slots[idx]}
                              dragging={dragging}
                              isHover={hoverSlot === idx}
                              canAccept={dragging && canDropInSlot(idx)}
                              onHover={() => setHoverSlot(idx)}
                              onLeave={() => setHoverSlot(null)}
                              onDrop={() => onDropSlot(idx)}
                              onRemove={() => removeFromSlot(idx)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* toast fica fora do palco (não briga com nada) */}
                <AnimatePresence>
                  {endTurnToast && (
                    <motion.div
                      className="absolute z-[40] left-1/2 -translate-x-1/2 top-2"
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    >
                      <div className="rounded-2xl border border-white/12 bg-black/40 backdrop-blur px-4 py-2 shadow-[0_18px_70px_rgba(0,0,0,0.7)]">
                        <div className="text-xs font-mono text-slate-200/80 tracking-widest">TURNO ENCERRADO</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* DIREITA */}
            <div className="min-h-0 flex flex-col gap-4 items-end">
              <div className="flex flex-col gap-3 items-end">
                <ZoneCard title="DEAD ZONE" icon={<Skull size={16} />} layout="landscape" tone="purple" />
                <ZoneCard title="DEAD ZONE" icon={<Skull size={16} />} layout="landscape" tone="purple" />
              </div>

              <div className="mt-auto">
                <ZoneCard title="DECK ZONE" icon={<Layers size={16} />} tone="cyan" />
              </div>
            </div>
          </div>

          {/* MÃO (sempre embaixo, 100% largura) */}
          <div className="relative">
            <div className="mx-auto w-full max-w-[1100px]">
              <div className="relative w-full h-[190px]">
                <div className="absolute inset-x-0 bottom-0 rounded-[34px] border border-white/12 bg-black/35 backdrop-blur shadow-[0_20px_80px_rgba(0,0,0,0.75)] h-[70px]" />
                <div className="absolute inset-x-0 bottom-0 rounded-[34px] pointer-events-none shadow-[inset_0_0_60px_rgba(34,211,238,0.10)] h-[70px]" />

                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-xl border border-white/15 bg-black/35 backdrop-blur px-4 py-2 text-sm text-slate-200/80">
                      Carregando mão...
                    </div>
                  </div>
                )}

                {err && !isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-xl border border-red-400/25 bg-red-500/10 backdrop-blur px-4 py-2 text-sm text-red-100">
                      Erro: {err}
                    </div>
                  </div>
                )}

                {!isLoading && !err && (
                  <div className="absolute inset-0 flex items-end justify-center gap-4" style={{ paddingBottom: 10 }}>
                    {hand.slice(0, 5).map((card, i) => (
                      <motion.div
                        key={`${card.id}-${i}`}
                        className="relative"
                        style={{
                          width: 120,
                          height: 170,
                          transform: `rotate(${bottomFanRotation[i] ?? 0}deg)`,
                          transformOrigin: "bottom center",
                        }}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <DraggableCard card={card} onDragStart={() => onDragStartCard(card, i)} onDragEnd={onDragEndCard} />
                      </motion.div>
                    ))}

                    {hand.length === 0 && (
                      <div className="rounded-xl border border-white/15 bg-black/35 backdrop-blur px-4 py-3 text-sm text-slate-200/80">
                        Você não tem cartas na mão.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- COMPONENTS -------------------- */

function EndTurnButton({ disabled, onClick }) {
  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { y: -2, scale: 1.02 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      className={[
        "relative w-full h-[58px] rounded-2xl overflow-hidden select-none",
        "border backdrop-blur shadow-[0_22px_90px_rgba(0,0,0,0.80)]",
        disabled ? "cursor-not-allowed opacity-60 border-white/12 bg-black/35" : "cursor-pointer border-cyan-300/20 bg-black/40",
      ].join(" ")}
      title={disabled ? "Aguarde sua vez" : "Encerrar turno"}
    >
      <div
        className={[
          "absolute inset-0",
          disabled
            ? "opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_55%)]"
            : "opacity-70 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.22),transparent_55%)]",
        ].join(" ")}
      />
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:14px_14px]" />
      <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.65)]" />

      <div className="absolute left-3 top-3 w-3 h-3 border-l-2 border-t-2 border-white/25" />
      <div className="absolute right-3 top-3 w-3 h-3 border-r-2 border-t-2 border-white/25" />
      <div className="absolute left-3 bottom-3 w-3 h-3 border-l-2 border-b-2 border-white/25" />
      <div className="absolute right-3 bottom-3 w-3 h-3 border-r-2 border-b-2 border-white/25" />

      <div className="relative h-full w-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={[
              "w-10 h-10 rounded-xl border flex items-center justify-center",
              disabled ? "border-white/12 bg-white/5" : "border-cyan-300/25 bg-cyan-500/10 shadow-[0_0_30px_rgba(34,211,238,0.25)]",
            ].join(" ")}
          >
            <Swords size={18} className={disabled ? "text-slate-200/60" : "text-cyan-200"} />
          </div>

          <div className="text-left leading-tight">
            <div className={["text-xs font-mono tracking-[0.26em] uppercase", disabled ? "text-slate-200/50" : "text-cyan-200/80"].join(" ")}>
              Ação
            </div>
            <div className={["text-sm font-extrabold tracking-wider", disabled ? "text-slate-200/70" : "text-slate-100"].join(" ")}>
              Encerrar Turno
            </div>
          </div>
        </div>

        <div className={["text-[10px] font-mono tracking-widest", disabled ? "text-slate-200/45" : "text-emerald-200/80"].join(" ")}>
          {disabled ? "WAIT" : "OK"}
        </div>
      </div>
    </motion.button>
  );
}

function ArenaAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-400/12 blur-3xl rounded-full" />
      <div className="absolute -bottom-28 -right-24 w-[520px] h-[520px] bg-purple-500/10 blur-3xl rounded-full" />
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.10)_1px,transparent_1px)] [background-size:72px_72px]" />
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: "repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 7px)",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(900px_600px_at_50%_115%,rgba(0,0,0,0.92),transparent_55%)]" />
    </div>
  );
}

function ArenaFloor() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2"
        style={{
          width: 1180,
          height: 720,
          transform: "translateX(-50%) translateY(-10%) perspective(1200px) rotateX(58deg)",
          transformOrigin: "center",
        }}
      >
        <div className="absolute inset-0 rounded-[60px] bg-black/30 border border-white/10 shadow-[0_60px_160px_rgba(0,0,0,0.85)]" />
        <div
          className="absolute inset-0 rounded-[60px] opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(34,211,238,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(34,211,238,0.18) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-cyan-300/25 shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
        <div className="absolute inset-0 rounded-[60px] bg-[radial-gradient(circle_at_50%_52%,rgba(168,85,247,0.20),transparent_50%)]" />
        <div className="absolute inset-0 rounded-[60px] shadow-[inset_0_0_120px_rgba(0,0,0,0.75)]" />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_50%_35%,rgba(255,214,10,0.10),transparent_62%)]" />
    </div>
  );
}

function ArenaLanes() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 top-[210px] -translate-x-1/2 w-[980px] h-[250px] rounded-[48px] border border-purple-300/10 bg-purple-500/5 shadow-[0_0_90px_rgba(168,85,247,0.10)]" />
      <div className="absolute left-1/2 bottom-[210px] -translate-x-1/2 w-[980px] h-[250px] rounded-[48px] border border-cyan-300/10 bg-cyan-500/5 shadow-[0_0_90px_rgba(34,211,238,0.10)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[980px] h-[360px] rounded-[64px] bg-[radial-gradient(circle_at_center,rgba(255,214,10,0.10),transparent_62%)]" />
    </div>
  );
}

function ZoneLabel({ text, tone = "cyan" }) {
  const toneCls =
    tone === "purple"
      ? "text-purple-200/80 border-purple-300/20 bg-purple-500/8"
      : tone === "gold"
      ? "text-yellow-200/85 border-yellow-300/20 bg-yellow-500/8"
      : "text-cyan-200/80 border-cyan-300/20 bg-cyan-500/8";

  return (
    <div className={["inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border backdrop-blur", "shadow-[0_10px_40px_rgba(0,0,0,0.55)]", toneCls].join(" ")}>
      <span className="text-[10px] font-extrabold tracking-[0.28em] uppercase">{text}</span>
    </div>
  );
}

function ArenaZonesOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 295 }}>
        <ZoneLabel text="ENEMY FIELD" tone="purple" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 290 }}>
        <ZoneLabel text="YOUR FIELD" tone="cyan" />
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: "50%" }}>
        <ZoneLabel text="DUEL CORE" tone="gold" />
      </div>
    </div>
  );
}

function CenterArenaRing() {
  return (
    <div className="absolute z-[10] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <motion.div
        className="rounded-full opacity-80"
        style={{
          width: 560,
          height: 560,
          background: "radial-gradient(circle at center, rgba(34,211,238,0.18), transparent 65%)",
        }}
        animate={{ opacity: [0.65, 0.85, 0.65] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 rounded-full opacity-35"
        style={{
          background: "conic-gradient(from 180deg, rgba(168,85,247,0.12), rgba(34,211,238,0.15), rgba(16,185,129,0.10), rgba(168,85,247,0.12))",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 rounded-full opacity-20 shadow-[inset_0_0_120px_rgba(0,0,0,0.7)]" />
    </div>
  );
}

function HudChip({ title, icon, children }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-black/35 backdrop-blur px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.55)]">
      <div className="flex items-center gap-2 text-xs text-slate-200/70">
        {icon}
        <span className="font-mono tracking-wider">{title}</span>
      </div>
      <div>{children}</div>
    </div>
  );
}

/* ZoneCard (landscape menor + portrait menor) */
function ZoneCard({ title, icon, layout = "portrait", tone = "cyan" }) {
  const isLandscape = layout === "landscape";
  // ✅ menores (laterais deixam o centro respirar)
  const sizeStyle = isLandscape ? { width: 230, height: 84 } : { width: 120, height: 170 };

  const toneFrame =
    tone === "purple"
      ? "border-purple-300/22 bg-purple-500/10"
      : tone === "gold"
      ? "border-yellow-300/22 bg-yellow-500/8"
      : "border-cyan-300/22 bg-cyan-500/10";

  const glow =
    tone === "purple"
      ? "shadow-[0_18px_70px_rgba(168,85,247,0.20)]"
      : tone === "gold"
      ? "shadow-[0_18px_70px_rgba(255,214,10,0.18)]"
      : "shadow-[0_18px_70px_rgba(34,211,238,0.18)]";

  const halo =
    tone === "purple"
      ? "bg-[radial-gradient(circle_at_20%_10%,rgba(168,85,247,0.26),transparent_62%)]"
      : tone === "gold"
      ? "bg-[radial-gradient(circle_at_20%_10%,rgba(255,214,10,0.22),transparent_62%)]"
      : "bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.24),transparent_62%)]";

  const labelColor = tone === "purple" ? "text-purple-100/90" : tone === "gold" ? "text-yellow-100/90" : "text-cyan-100/90";

  return (
    <div className={["rounded-2xl border backdrop-blur relative overflow-hidden shrink-0", "bg-black/40 border-white/12", glow].join(" ")} style={sizeStyle}>
      <div className={["absolute inset-0 opacity-80", halo].join(" ")} />
      <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(to_right,rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className={["absolute inset-[6px] rounded-xl border", toneFrame].join(" ")} />
      <div className="absolute inset-[6px] rounded-xl shadow-[inset_0_0_35px_rgba(0,0,0,0.65)]" />

      {isLandscape ? (
        <div className="relative w-full h-full flex items-center gap-3 px-4">
          <div className={["p-2 rounded-xl border border-white/15 bg-black/35", labelColor].join(" ")}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className={["text-[11px] font-extrabold tracking-widest truncate", labelColor].join(" ")}>{title}</div>
            {tone === "purple" ? (
              <div className="mt-1 text-[10px] font-mono text-purple-200/60 tracking-widest">GRAVEYARD</div>
            ) : (
              <div className="mt-1 text-[10px] font-mono text-slate-200/55 tracking-widest">ZONE</div>
            )}
          </div>
          <div className={["text-[10px] font-mono tracking-widest", tone === "purple" ? "text-purple-200/60" : "text-slate-200/45"].join(" ")}>
            {tone === "purple" ? "DEAD" : "OK"}
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-3">
          <div className={["p-2 rounded-xl border border-white/15 bg-black/35", labelColor].join(" ")}>{icon}</div>
          <div className={["text-[11px] font-extrabold tracking-widest text-center", labelColor].join(" ")}>{title}</div>
        </div>
      )}
    </div>
  );
}

function EnergyOrb() {
  return (
    <motion.button
      className="relative rounded-full border border-white/15 bg-black/35 backdrop-blur shadow-[0_18px_70px_rgba(0,0,0,0.75)] hover:bg-white/5 transition"
      style={{ width: 72, height: 72 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title="Energia"
    >
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.22), transparent 60%)" }}
        animate={{ opacity: [0.55, 0.85, 0.55] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 rounded-full shadow-[inset_0_0_30px_rgba(34,211,238,0.18)]" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-none">
        <div className="text-sm font-extrabold">X</div>
        <div className="text-[11px] text-slate-200/70">⚡</div>
      </div>
    </motion.button>
  );
}

/* Mantive seus BattleSlot e DraggableCard iguais (pra não quebrar nada) */
function BattleSlot({ card, dragging, canAccept, isHover, onHover, onLeave, onDrop, onRemove }) {
  const showAccept = dragging && canAccept;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onHover();
      }}
      onDragEnter={() => onHover()}
      onDragLeave={() => onLeave()}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={[
        "relative rounded-3xl border backdrop-blur overflow-hidden transition-all",
        "shadow-[0_22px_80px_rgba(0,0,0,0.70)]",
        showAccept ? "border-emerald-300/35" : "border-white/18",
        isHover && showAccept ? "scale-[1.01]" : "",
        "bg-black/35",
      ].join(" ")}
      style={{ width: 220, height: 150 }}
      title={card ? "Clique para remover do slot" : "Arraste uma carta aqui"}
      onClick={() => card && onRemove()}
    >
      <div className="absolute inset-0 opacity-70 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_68%)]" />
      <div className="absolute inset-0 shadow-[inset_0_0_36px_rgba(0,0,0,0.42)]" />

      <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_0_35px_rgba(0,0,0,0.60)]" />
      <div className="absolute left-3 top-3 w-3 h-3 border-l-2 border-t-2 border-white/25" />
      <div className="absolute right-3 top-3 w-3 h-3 border-r-2 border-t-2 border-white/25" />
      <div className="absolute left-3 bottom-3 w-3 h-3 border-l-2 border-b-2 border-white/25" />
      <div className="absolute right-3 bottom-3 w-3 h-3 border-r-2 border-b-2 border-white/25" />

      <AnimatePresence>
        {showAccept && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-emerald-500/10">
            <div className="absolute inset-0 border-2 border-emerald-300/35 rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.20)]" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-200 font-extrabold tracking-widest">
              SUMMON
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!card ? (
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-2">
          <div className="text-slate-200/80 font-extrabold tracking-[0.35em]">SLOT</div>
          <div className="text-[10px] font-mono text-slate-200/50">solte aqui</div>
        </div>
      ) : (
        <motion.div
          className="relative w-full h-full p-2"
          initial={{ opacity: 0, scale: 0.98, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
        >
          <div className="w-full h-full rounded-2xl border border-white/15 bg-black/40 overflow-hidden flex">
            <div className="w-[42%] h-full bg-white/5 flex items-center justify-center relative">
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,rgba(255,214,10,0.18),transparent_60%)]" />
              {card.img ? (
                <img src={card.img} alt={card.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
              ) : (
                <div className="text-xs text-slate-200/70 font-mono">CARD</div>
              )}
            </div>

            <div className="flex-1 p-2 flex flex-col justify-between">
              <div>
                <div className="text-sm font-extrabold text-[#FFD60A] truncate">{card.name}</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <div className={["inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg border", typeBadge(card.type)].join(" ")}>
                    <Shield size={12} className="opacity-80" />
                    <span className="font-mono">{card.type}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-200/75">C:{card.cost ?? 0}</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-200/70">
                <span className="text-red-200">ATK:{card.attack ?? "-"}</span>
                <span className="text-cyan-200">DEF:{card.defense ?? "-"}</span>
                <span className="text-emerald-200">HP:{card.life ?? "-"}</span>
              </div>

              <div className="text-[10px] text-slate-200/55 font-mono">(clique p/ remover)</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DraggableCard({ card, onDragStart, onDragEnd }) {
  return (
    <motion.div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", String(card.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      whileHover={{ y: -12, scale: 1.05 }}
      className="relative w-full h-full rounded-2xl cursor-grab active:cursor-grabbing select-none"
      title="Arraste para um SLOT"
    >
      <div className="absolute inset-0 rounded-2xl border border-white/18 bg-black/45 backdrop-blur shadow-[0_22px_90px_rgba(0,0,0,0.80)]" />
      <div className="absolute inset-[6px] rounded-xl border border-white/12 bg-white/5 shadow-[inset_0_0_30px_rgba(0,0,0,0.55)]" />

      <motion.div
        className="absolute inset-[6px] rounded-xl opacity-25"
        style={{ background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.22) 40%, transparent 70%)" }}
        animate={{ x: [-60, 60, -60] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute left-3 top-3 z-10 w-9 h-9 rounded-full border border-cyan-300/25 bg-black/55 backdrop-blur flex items-center justify-center shadow-[0_0_24px_rgba(34,211,238,0.25)]">
        <span className="text-sm font-extrabold text-cyan-100 font-mono">{card.cost ?? 0}</span>
      </div>

      <div className="absolute right-3 top-3 z-10 w-9 h-9 rounded-xl border border-white/12 bg-white/8 backdrop-blur flex items-center justify-center">
        <span className="text-[10px] font-extrabold tracking-widest text-[#FFD60A]">SR</span>
      </div>

      <div className="absolute inset-x-[10px] top-[52px] bottom-[54px] rounded-xl overflow-hidden border border-white/10 bg-black/35">
        {card.img ? (
          <img src={card.img} alt={card.name} className="absolute inset-0 w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-200/70 font-mono">ART</div>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,214,10,0.18),transparent_55%)]" />
      </div>

      <div className="absolute inset-x-[10px] bottom-[10px] rounded-xl border border-white/12 bg-black/65 backdrop-blur px-3 py-2">
        <div className="text-[11px] font-extrabold text-[#FFD60A] truncate tracking-wide">{card.name}</div>
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-200/75">
          <span className={["px-2 py-0.5 rounded-lg border", typeBadge(card.type)].join(" ")}>{card.type}</span>
          <span className="text-slate-200/60">DRAG</span>
        </div>
      </div>
    </motion.div>
  );
}
