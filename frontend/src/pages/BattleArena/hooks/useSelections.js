// src/pages/BattleArena/hooks/useSelections.js
import { useCallback, useRef, useState } from "react";

/**
 * Estado local de interação do usuário:
 * - hoverSlot
 * - dragging + drag payload
 *
 * Mantém exatamente o comportamento atual.
 */
export default function useSelections() {
  const [hoverSlot, setHoverSlot] = useState(null);
  const [dragging, setDragging] = useState(false);
  const dragCardRef = useRef(null); // { card, fromIndex }

  const onDragStartCard = useCallback((card, fromIndex) => {
    dragCardRef.current = { card, fromIndex };
    setDragging(true);
  }, []);

  const onDragEndCard = useCallback(() => {
    setDragging(false);
    setHoverSlot(null);
    dragCardRef.current = null;
  }, []);

  const clearDrag = useCallback(() => {
    dragCardRef.current = null;
    setDragging(false);
    setHoverSlot(null);
  }, []);

  return {
    hoverSlot,
    setHoverSlot,
    dragging,
    dragCardRef,
    onDragStartCard,
    onDragEndCard,
    clearDrag,
  };
}
