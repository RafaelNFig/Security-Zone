// frontend/src/pages/BattleArena/hooks/useMatchSession.js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/services/api.js";
import {
  getViewerSide,
  pickEnergy,
  pickHandFromState,
  pickPhase,
  pickTurnNumber,
  pickTurnOwner,
} from "../utils/stateSelectors.js";

const POLL_MS_MY_TURN = 2500;     // seu turno: pode ser mais leve
const POLL_MS_ENEMY_TURN = 1200;  // turno do bot: mais rápido pra parecer responsivo
const POLL_MS_ERROR = 3000;
const MAX_EVENTS = 80;

export default function useMatchSession(matchId) {
  const viewerSide = useMemo(() => getViewerSide(), []);
  const enemySide = viewerSide === "P1" ? "P2" : "P1";

  const [isLoading, setIsLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [matchMeta, setMatchMeta] = useState(null);
  const [state, setState] = useState(null);
  const [events, setEvents] = useState([]);

  const [hint, setHint] = useState("Carregando partida...");

  // refs para evitar stale closures no polling
  const stateRef = useRef(null);
  const isLoadingRef = useRef(true);
  const errRef = useRef(null);
  const stopPollingRef = useRef(false);
  const lastVersionRef = useRef(null);
  const lastPollAtRef = useRef(0);

  useEffect(() => {
    stateRef.current = state;
    lastVersionRef.current = state?.version ?? lastVersionRef.current;
  }, [state]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    errRef.current = err;
  }, [err]);

  const pushEvents = useCallback((newEvents) => {
    if (!newEvents) return;
    const arr = Array.isArray(newEvents) ? newEvents : [];
    if (arr.length === 0) return;

    setEvents((prev) => {
      const merged = [...prev, ...arr];
      // ✅ corta pra não explodir memória
      if (merged.length <= MAX_EVENTS) return merged;
      return merged.slice(merged.length - MAX_EVENTS);
    });
  }, []);

  const applyServerPayload = useCallback(
    (data, { resetEvents = false } = {}) => {
      // meta
      setMatchMeta((prev) => ({
        ...(prev || {}),
        matchId: data?.matchId || matchId,
        mode: data?.mode ?? prev?.mode,
        difficulty: data?.difficulty ?? prev?.difficulty,
        createdAt: data?.createdAt ?? prev?.createdAt,
      }));

      // events do servidor (se vier)
      if (resetEvents) setEvents([]);
      if (Array.isArray(data?.events) && data.events.length) pushEvents(data.events);

      // state só se mudar (versão)
      const incoming = data?.state ?? null;
      if (!incoming) return;

      const incomingV = Number(incoming.version ?? 0);
      const curV = Number(lastVersionRef.current ?? -1);

      if (Number.isFinite(incomingV) && Number.isFinite(curV)) {
        if (incomingV > curV || !stateRef.current) {
          lastVersionRef.current = incomingV;
          setState(incoming);
        }
      } else {
        // fallback: aplica mesmo assim
        setState(incoming);
      }
    },
    [matchId, pushEvents]
  );

  const fetchMatch = useCallback(
    async ({ silent = false, resetEvents = false } = {}) => {
      if (!matchId) {
        setIsLoading(false);
        setErr("MATCH_ID ausente. Abra a arena via rota /battle/:matchId.");
        setHint("Erro: matchId ausente.");
        return { ok: false };
      }

      // anti-spam (se alguém chamar várias vezes)
      const now = Date.now();
      if (now - lastPollAtRef.current < 300) return { ok: false, skipped: true };
      lastPollAtRef.current = now;

      if (!silent) {
        setIsLoading(true);
        setErr(null);
      }

      try {
        const res = await apiRequest(`/matches/${encodeURIComponent(matchId)}`, {
          method: "GET",
        });

        if (!res?.success) throw new Error(res?.error || "Erro ao carregar match");

        applyServerPayload(res.data, { resetEvents });

        if (!silent) {
          setHint("Arraste UNIT para um SLOT (embaixo). Clique em SPELL para conjurar.");
        }

        return { ok: true, data: res.data };
      } catch (e) {
        if (!silent) {
          setErr(e?.message || "Erro ao carregar match");
          setHint("Erro ao carregar partida.");
        }
        return { ok: false, error: e };
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [applyServerPayload, matchId]
  );

  const load = useCallback(async () => {
    stopPollingRef.current = false;
    return fetchMatch({ silent: false, resetEvents: true });
  }, [fetchMatch]);

  useEffect(() => {
    load();
    return () => {
      stopPollingRef.current = true;
    };
  }, [load]);

  // derived
  const turnOwnerSide = useMemo(() => pickTurnOwner(state), [state]);
  const turnCount = useMemo(() => pickTurnNumber(state), [state]);
  const phase = useMemo(() => pickPhase(state), [state]);
  const isMyTurn = turnOwnerSide === viewerSide && phase !== "ENDED";

  const energyInfo = useMemo(() => pickEnergy(state, viewerSide), [state, viewerSide]);
  const hand = useMemo(() => {
    const h = pickHandFromState(state, viewerSide);
    return Array.isArray(h) ? h : [];
  }, [state, viewerSide]);

  // ✅ polling automático (principal pra bot)
  useEffect(() => {
    if (!matchId) return;

    let timer = null;

    const tick = async () => {
      if (stopPollingRef.current) return;

      // pausa se aba não está visível
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;

      const cur = stateRef.current;
      const curPhase = pickPhase(cur);
      if (String(curPhase || "").toUpperCase() === "ENDED") return;

      // se ainda não carregou, não poll
      if (!cur) return;

      const myTurnNow = pickTurnOwner(cur) === viewerSide;

      // em erro, espera mais
      const hasErr = Boolean(errRef.current);

      const delay = hasErr ? POLL_MS_ERROR : myTurnNow ? POLL_MS_MY_TURN : POLL_MS_ENEMY_TURN;

      // agenda próximo
      timer = setTimeout(async () => {
        // silent pra não piscar loading
        const r = await fetchMatch({ silent: true, resetEvents: false });
        if (!r.ok && !r.skipped) {
          // erro silencioso: não trava UI, só mantém err/hint se já existir
          // (se você quiser mostrar, dá pra setErr aqui)
        }
        tick();
      }, delay);
    };

    tick();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [fetchMatch, matchId, viewerSide]);

  return {
    // ids/sides
    matchId,
    viewerSide,
    enemySide,

    // state
    isLoading,
    err,
    matchMeta,
    state,
    setState,

    // derived
    turnOwnerSide,
    turnCount,
    phase,
    isMyTurn,
    energyInfo,
    hand,

    // events
    events,
    setEvents,
    pushEvents,

    // hint
    hint,
    setHint,

    // actions
    reload: load,
    setErr,
  };
}
