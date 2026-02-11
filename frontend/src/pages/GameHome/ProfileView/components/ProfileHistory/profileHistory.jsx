// src/pages/ProfileView/components/ProfileHistory/profileHistory.jsx
const ProfileHistory = () => {
  return (
    <div
      className="h-full rounded-2xl border border-white/10
                 bg-white/5 backdrop-blur
                 shadow-[0_20px_80px_rgba(0,0,0,0.45)]
                 px-6 py-6 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="border-b border-white/10 pb-4">
        <div className="text-[11px] font-mono uppercase tracking-[0.35em] text-slate-300/60">
          match history
        </div>
        <h2 className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-100">
          Histórico de Partidas
        </h2>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300/70 text-sm sm:text-base mb-2">
            Funcionalidade em desenvolvimento
          </p>
          <p className="text-xs font-mono text-slate-400/60">
            &gt; em breve você poderá acompanhar suas partidas, vitórias e derrotas
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfileHistory;
