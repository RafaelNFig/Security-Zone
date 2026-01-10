import React from "react";
import { Shield, Activity } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-8 py-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <div className="flex flex-col sm:flex-row gap-6 sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-300" />
              </div>
              <div>
                <div className="font-extrabold tracking-tight">
                  SECURITY<span className="text-emerald-300">ZONE</span>
                </div>
                <div className="text-xs text-slate-300/60">
                  Aprenda defendendo. Jogue com responsabilidade.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-300/70">
              <Activity className="h-4 w-4 text-cyan-300" />
              SYSTEM STATUS: <span className="text-emerald-200">ONLINE</span>
            </div>
          </div>

          <div className="mt-6 h-px w-full bg-gradient-to-r from-emerald-400/0 via-emerald-400/30 to-emerald-400/0" />

          <div className="mt-6 text-xs text-slate-300/60 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Security Zone</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
