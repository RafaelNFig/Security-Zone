// frontend/src/pages/BattleArena/components/EnergyOrb.jsx
import React, { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * EnergyOrb
 * - Fixa no canto inferior esquerdo
 * - Mostra energia atual / máxima
 * - Dá feedback visual quando energia muda (gasto/ganho)
 */
export default function EnergyOrb({ energy = 0, energyMax = 0 }) {
  const pct = energyMax > 0 ? Math.max(0, Math.min(1, energy / energyMax)) : 0;

  const prevRef = useRef(energy);
  const [pulse, setPulse] = useState(null); // "up" | "down" | null

  useEffect(() => {
    const prev = prevRef.current;
    if (energy > prev) setPulse("up");
    else if (energy < prev) setPulse("down");
    prevRef.current = energy;

    if (energy !== prev) {
      const t = setTimeout(() => setPulse(null), 450);
      return () => clearTimeout(t);
    }
  }, [energy]);

  const ringColor =
    pulse === "down"
      ? "rgba(239,68,68,0.35)" // red
      : "rgba(16,185,129,0.35)"; // emerald

  return (
    <motion.div
      className="fixed z-[80] left-4 bottom-4 select-none"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <motion.div
        className="relative rounded-full border border-white/15 bg-black/40 backdrop-blur shadow-[0_18px_70px_rgba(0,0,0,0.75)]"
        style={{ width: 86, height: 86 }}
        title="Energia"
        animate={pulse ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.35 }}
      >
        {/* glow */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle at 30% 30%, rgba(34,211,238,0.22), transparent 60%)",
          }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />

        {/* ring base */}
        <div className="absolute inset-[10px] rounded-full border border-white/10" />

        {/* progress ring */}
        <div
          className="absolute inset-[10px] rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${pct * 360}deg, rgba(255,255,255,0.06) 0deg)`,
          }}
        />

        {/* value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <div className="text-lg font-extrabold font-mono text-slate-100">
            {energy}/{energyMax}
          </div>

          <AnimatePresence>
            {pulse && (
              <motion.div
                key={pulse}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                className={[
                  "mt-1 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-lg border",
                  pulse === "up"
                    ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100/80"
                    : "border-red-300/20 bg-red-500/10 text-red-100/80",
                ].join(" ")}
              >
                {pulse === "up" ? "GAIN" : "SPENT"}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* icon */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border border-white/15 bg-black/60 flex items-center justify-center shadow-md">
          <Zap size={14} className="text-emerald-300" />
        </div>
      </motion.div>
    </motion.div>
  );
}
