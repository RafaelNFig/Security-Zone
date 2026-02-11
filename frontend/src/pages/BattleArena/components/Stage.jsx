// src/pages/BattleArena/components/Stage.jsx
import React from "react";
import { motion } from "framer-motion";

export default function Stage() {
  return (
    <>
      <ArenaAtmosphere />
      <div className="absolute inset-0 z-[5]"><ArenaFloor /></div>
      <div className="absolute inset-0 z-[6]"><ArenaLanes /></div>
      <div className="absolute inset-0 z-[12]"><ArenaZonesOverlay /></div>

      {/* frame maior */}
      <div className="absolute inset-[6px] rounded-3xl border border-cyan-300/15" />

      <CenterArenaRing />
    </>
  );
}

function ArenaAtmosphere() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-cyan-400/15 blur-3xl rounded-full" />
      <div className="absolute -bottom-40 -right-32 w-[640px] h-[640px] bg-purple-500/12 blur-3xl rounded-full" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:84px_84px]" />
      <div className="absolute inset-0 bg-[radial-gradient(1100px_700px_at_50%_120%,rgba(0,0,0,0.95),transparent_60%)]" />
    </div>
  );
}

function ArenaFloor() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2"
        style={{
          // 🔥 MUITO MAIOR
          width: 1700,
          height: 1200,
          transform: "translateX(-50%) translateY(-6%) perspective(1400px) rotateX(60deg)",
        }}
      >
        <div className="absolute inset-0 rounded-[70px] bg-black/35 border border-white/10 shadow-[0_80px_200px_rgba(0,0,0,0.9)]" />
        <div className="absolute inset-0 rounded-[70px] opacity-40 [background-image:linear-gradient(to_right,rgba(34,211,238,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(34,211,238,0.20)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute inset-0 rounded-[70px] shadow-[inset_0_0_140px_rgba(0,0,0,0.8)]" />
      </div>
    </div>
  );
}

function ArenaLanes() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {/* 🔥 Lanes bem maiores */}
      <div className="absolute left-1/2 top-[140px] -translate-x-1/2 w-[1380px] h-[320px] rounded-[60px] border border-purple-300/12 bg-purple-500/6" />
      <div className="absolute left-1/2 bottom-[140px] -translate-x-1/2 w-[1380px] h-[320px] rounded-[60px] border border-cyan-300/12 bg-cyan-500/6" />
    </div>
  );
}

function ArenaZonesOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <ZoneLabel text="ENEMY FIELD" tone="purple" style={{ top: 200 }} />
      <ZoneLabel text="YOUR FIELD" tone="cyan" style={{ bottom: 200 }} />
      <ZoneLabel text="DUEL CORE" tone="gold" style={{ top: "50%" }} center />
    </div>
  );
}

function ZoneLabel({ text, tone, style, center }) {
  const toneCls =
    tone === "purple"
      ? "text-purple-200/80 border-purple-300/20 bg-purple-500/8"
      : tone === "gold"
      ? "text-yellow-200/85 border-yellow-300/20 bg-yellow-500/8"
      : "text-cyan-200/80 border-cyan-300/20 bg-cyan-500/8";

  return (
    <div
      className={`absolute left-1/2 ${center ? "-translate-y-1/2" : ""} -translate-x-1/2 inline-flex px-4 py-2 rounded-xl border backdrop-blur ${toneCls}`}
      style={style}
    >
      <span className="text-[11px] font-extrabold tracking-[0.32em] uppercase">{text}</span>
    </div>
  );
}

function CenterArenaRing() {
  return (
    <div className="absolute z-[10] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
      <motion.div
        className="rounded-full"
        style={{
          // 🔥 maior ainda
          width: 860,
          height: 860,
          background:
            "radial-gradient(circle at center, rgba(34,211,238,0.22), transparent 70%)",
        }}
        animate={{ opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3.5, repeat: Infinity }}
      />
    </div>
  );
}
