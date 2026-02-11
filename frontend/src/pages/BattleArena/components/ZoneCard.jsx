// src/pages/BattleArena/components/ZoneCard.jsx
import React from "react";

export default function ZoneCard({
  // modo antigo (placeholder)
  title,
  icon,

  // ✅ modo novo (card real)
  card = null,
  img = null,
  subtitle = null,

  // drag (opcional)
  draggable = false,
  onDragStart,
  onDragEnd,

  layout = "portrait",
  tone = "cyan",
  showBack = false,
}) {
  const isLandscape = layout === "landscape";

  // ✅ menores (pra dar mais destaque pro campo)
  const sizeStyle = isLandscape ? { width: 200, height: 72 } : { width: 104, height: 148 };

  const toneMap = {
    cyan: "border-cyan-300/22 bg-cyan-500/10 text-cyan-100/90",
    purple: "border-purple-300/22 bg-purple-500/10 text-purple-100/90",
    gold: "border-yellow-300/22 bg-yellow-500/8 text-yellow-100/90",
  };

  const resolvedImg =
    img ??
    card?.img ??
    card?.CD_IMAGE ??
    card?.image ??
    card?.imgUrl ??
    null;

  const resolvedTitle =
    title ??
    card?.name ??
    card?.CD_NAME ??
    card?.title ??
    "Carta";

  const resolvedSubtitle =
    subtitle ??
    (card?.cost != null ? `Custo ${card.cost}` : null);

  const handleDragStart = (e) => {
    if (!draggable) return;

    // deixa o caller definir o payload (mais seguro)
    if (typeof onDragStart === "function") onDragStart(e);

    // fallback: tenta colocar um payload básico
    if (!e.dataTransfer.getData("application/x-sz-card")) {
      const payload = {
        cardId: card?.cardId ?? card?.id ?? card?.CD_ID ?? null,
      };
      e.dataTransfer.setData("application/x-sz-card", JSON.stringify(payload));
    }

    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className={`relative rounded-2xl border backdrop-blur overflow-hidden bg-black/40 ${toneMap[tone]}`}
      style={sizeStyle}
      draggable={Boolean(draggable)}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="absolute inset-[6px] rounded-xl border border-white/12 shadow-[inset_0_0_35px_rgba(0,0,0,0.65)]" />

      {showBack ? (
        <img
          src="/img/cards/verso.png"
          alt="verso"
          className="absolute inset-0 w-full h-full object-cover opacity-90"
        />
      ) : resolvedImg ? (
        <>
          <img
            src={resolvedImg}
            alt={resolvedTitle}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              // fallback visual: se quebrar, remove img e deixa placeholder aparecer por cima
              e.currentTarget.style.display = "none";
            }}
          />

          {/* overlay leve pra texto não sumir */}
          <div className="absolute inset-x-0 bottom-0 p-2 bg-[linear-gradient(to_top,rgba(0,0,0,0.75),transparent)]">
            <div className="text-[10px] font-extrabold tracking-wide leading-tight">
              {resolvedTitle}
            </div>
            {resolvedSubtitle && (
              <div className="text-[9px] text-slate-200/80">{resolvedSubtitle}</div>
            )}
          </div>
        </>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center gap-2 px-3">
          <div className="p-2 rounded-xl border border-white/15 bg-black/35">{icon}</div>
          <div className="text-[11px] font-extrabold tracking-widest text-center">{resolvedTitle}</div>
        </div>
      )}
    </div>
  );
}
