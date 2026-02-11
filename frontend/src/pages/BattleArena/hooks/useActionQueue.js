// frontend/src/pages/BattleArena/hooks/useActionQueue.js
import { useCallback, useRef, useState } from "react";
import { apiRequest } from "@/services/api.js";
import { buildAction, makeClientActionId } from "../utils/actionBuilders.js";

/**
 * useActionQueue
 * - Envia ações com idempotência (clientActionId) e evita spam.
 * - Sempre retorna patch compatível: { state, events, rejected, raw }
 * - Não altera regra do backend.
 */
export default function useActionQueue({ matchId, onApply, timeoutMs = 8000 } = {}) {
  const [isSending, setIsSending] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const inFlightRef = useRef(false);

  // ✅ cache de idempotência por "assinatura" da ação (type+payload)
  const idemRef = useRef(new Map()); // key -> clientActionId
  const idemOrderRef = useRef([]);   // limita crescimento
  const MAX_IDEM = 80;

  function stableKey(flatAction) {
    const t = String(flatAction?.type ?? "");
    let p = "";
    try {
      p = JSON.stringify(flatAction?.payload ?? {});
    } catch {
      p = String(flatAction?.payload ?? "");
    }
    return `${t}::${p}`;
  }

  function rememberIdem(key, id) {
    if (!key || !id) return;
    if (!idemRef.current.has(key)) idemOrderRef.current.push(key);
    idemRef.current.set(key, id);

    while (idemOrderRef.current.length > MAX_IDEM) {
      const oldest = idemOrderRef.current.shift();
      if (oldest) idemRef.current.delete(oldest);
    }
  }

  async function withTimeout(promise, ms) {
    if (!ms || ms <= 0) return promise;

    let to = null;
    const timeoutPromise = new Promise((_, reject) => {
      to = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (to) clearTimeout(to);
    }
  }

  const post = useCallback(
    async (flatAction, { forceNewId = false } = {}) => {
      if (!matchId) throw new Error("MATCH_ID ausente");
      if (!flatAction?.type) throw new Error("ACTION_TYPE ausente");

      // bloqueia concorrência (evita estado “duplo”)
      if (inFlightRef.current) {
        return { ok: false, blocked: true, reason: "IN_FLIGHT" };
      }

      inFlightRef.current = true;
      setIsSending(true);
      setLastError(null);

      const key = stableKey(flatAction);

      try {
        // ✅ idempotência: mesmo action+payload => mesmo clientActionId
        let clientActionId = null;

        if (!forceNewId) clientActionId = idemRef.current.get(key) || null;
        if (!clientActionId) clientActionId = makeClientActionId();

        rememberIdem(key, clientActionId);

        const action = buildAction(flatAction.type, flatAction.payload);

        const req = apiRequest(`/matches/${encodeURIComponent(matchId)}/actions`, {
          method: "POST",
          body: JSON.stringify({ action, clientActionId }),
        });

        const res = await withTimeout(req, timeoutMs);

        if (!res?.success) throw new Error(res?.error || "Falha ao enviar ação");

        const data = res.data;

        const patch = {
          state: data?.state ?? null,
          events: data?.events ?? null,
          rejected: data?.rejected ?? null,
          raw: data,
          clientActionId,
        };

        // sempre aplica patch (mesmo rejected pode trazer events/hint/state)
        if (typeof onApply === "function") onApply(patch);

        setLastResult({ ok: !data?.rejected, patch });

        if (data?.rejected) {
          return { ok: false, data, patch };
        }

        return { ok: true, data, patch };
      } catch (e) {
        const msg = e?.message || "Erro desconhecido";

        // se TIMEOUT, você pode tentar retry manual mantendo o mesmo clientActionId
        setLastError(msg);
        setLastResult({ ok: false, error: msg });

        return { ok: false, error: msg };
      } finally {
        inFlightRef.current = false;
        setIsSending(false);
      }
    },
    [matchId, onApply, timeoutMs]
  );

  return { post, isSending, lastError, lastResult };
}
