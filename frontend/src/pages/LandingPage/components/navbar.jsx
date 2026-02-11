import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Shield, Sparkles, Menu, X } from "lucide-react";

export default function Navbar({ sections = [], onOpenAuth = () => {} }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 14);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setOpen(false);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b transition",
        scrolled
          ? "bg-slate-950/70 border-white/10 backdrop-blur"
          : "bg-transparent border-transparent",
      ].join(" ")}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-2 rounded-full bg-emerald-400/15 blur-xl" />
            <div className="relative flex items-center justify-center h-9 w-9 rounded-xl bg-white/5 border border-white/10">
              <Shield className="h-5 w-5 text-emerald-300" />
            </div>
          </div>
          <div className="leading-tight">
            <div className="font-extrabold tracking-tight">
              SECURITY<span className="text-emerald-300">ZONE</span>
            </div>
            <div className="text-[11px] text-slate-300/70 uppercase tracking-widest">
              cyber card game
            </div>
          </div>
        </div>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className="text-sm text-slate-200/80 hover:text-slate-100 transition"
            >
              {s.label}
            </button>
          ))}

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onOpenAuth}
            className="relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
              bg-emerald-400/15 border border-emerald-300/30 text-emerald-100
              shadow-[0_0_40px_rgba(16,185,129,0.20)]"
          >
            <Sparkles className="h-4 w-4" />
            Jogar agora
            <span className="absolute inset-0 rounded-xl ring-1 ring-white/10" />
          </motion.button>
        </nav>

        {/* Mobile */}
        <button
          className="md:hidden h-10 w-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-8 py-4 flex flex-col gap-3">
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className="text-left text-sm text-slate-200/80 hover:text-slate-100 transition"
              >
                {s.label}
              </button>
            ))}

            <button
              onClick={() => {
                setOpen(false);
                onOpenAuth();
              }}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
                bg-emerald-400/15 border border-emerald-300/30 text-emerald-100"
            >
              <Sparkles className="h-4 w-4" />
              Jogar agora
            </button>
          </div>
        </div>
      )}

      {/* Neon underline */}
      <div className="h-px w-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/40 to-emerald-400/0" />
    </header>
  );
}
