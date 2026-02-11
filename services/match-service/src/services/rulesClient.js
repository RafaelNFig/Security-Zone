// match-service/src/services/rulesClient.js
// Cliente HTTP para o rules-service (/resolve)
// Contrato interno retornado SEMPRE:
//   { newState?: object, events: array, rejected?: { code, message } }
// Só lança erro em casos de rede/timeout/5xx/formato impossível.

// ✅ Dentro do Docker, "localhost" = container atual.
// Se RULES_URL não estiver setado, o default precisa ser o nome do service do compose.
const RULES_URL = process.env.RULES_URL || "http://rules-service:3002";
const RULES_TIMEOUT_MS = Number(process.env.RULES_TIMEOUT_MS || 4000);

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function normalizeAction(actionMaybe) {
  // aceita { action: {...} } ou {...} direto
  if (!actionMaybe) return null;
  if (isObject(actionMaybe.action)) return actionMaybe.action;
  return actionMaybe;
}

async function safeReadJson(res) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function makeUpstreamError(message, status, details) {
  const err = new Error(message);
  err.code = "RULES_UPSTREAM_ERROR";
  err.status = status;
  err.details = details;
  return err;
}

/**
 * resolveAction
 * - Rejeição de regra (success:false ou rejected): retorna { rejected, events }
 * - Sucesso: retorna { newState, events }
 * - Só lança erro: timeout/rede/5xx/formato inválido
 */
export async function resolveAction({ state, action, reqHeaders = {} }) {
  if (!isObject(state)) {
    throw new Error("resolveAction: 'state' deve ser um objeto.");
  }

  const normalizedAction = normalizeAction(action);
  if (!isObject(normalizedAction)) {
    throw new Error("resolveAction: 'action' deve ser um objeto.");
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), RULES_TIMEOUT_MS);

  let res;
  try {
    const headers = { "Content-Type": "application/json" };

    // ✅ rastreabilidade (nginx/gateway/match/rules)
    const rid =
      reqHeaders?.["x-request-id"] ||
      reqHeaders?.["X-Request-Id"] ||
      reqHeaders?.["x-requestid"] ||
      null;
    if (rid) headers["x-request-id"] = String(rid);

    res = await fetch(`${RULES_URL}/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({ state, action: normalizedAction }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error(`Rules service timeout após ${RULES_TIMEOUT_MS}ms`);
      err.code = "RULES_TIMEOUT";
      err.details = { rulesUrl: RULES_URL, timeoutMs: RULES_TIMEOUT_MS };
      throw err;
    }

    const err = new Error(`Falha ao chamar rules-service: ${e?.message ?? String(e)}`);
    err.code = "RULES_NETWORK_ERROR";
    err.details = { rulesUrl: RULES_URL };
    throw err;
  } finally {
    clearTimeout(t);
  }

  const data = await safeReadJson(res);

  // 5xx = erro real do serviço
  if (res.status >= 500) {
    const msg =
      data?.rejected?.message ||
      data?.message ||
      data?.error ||
      `Rules service error (${res.status})`;
    throw makeUpstreamError(msg, res.status, { ...data, rulesUrl: RULES_URL });
  }

  const events = Array.isArray(data?.events) ? data.events : [];

  // Rejeição no novo contrato: success:false + rejected
  if (data?.success === false) {
    const r = data?.rejected ?? {};
    return {
      rejected: {
        code: String(r.code ?? "REJECTED"),
        message: String(r.message ?? "Ação rejeitada."),
      },
      events,
    };
  }

  // Compat: se algum motivo voltar no formato antigo {rejected,...}
  if (data?.rejected && !data?.newState) {
    return {
      rejected: {
        code: String(data.rejected.code ?? "REJECTED"),
        message: String(data.rejected.message ?? "Ação rejeitada."),
      },
      events,
    };
  }

  // Sucesso esperado
  if (data?.success === true && data?.newState && isObject(data.newState)) {
    return { newState: data.newState, events };
  }

  // Compat: se voltar 200 sem success mas com newState
  if (data?.newState && isObject(data.newState)) {
    return { newState: data.newState, events };
  }

  // 405 / 404 etc vindos do rulesRoutes/server
  if (res.status === 404) {
    throw makeUpstreamError("Rules service rota não encontrada (404).", res.status, {
      ...data,
      rulesUrl: RULES_URL,
    });
  }
  if (res.status === 405) {
    throw makeUpstreamError("Rules service método não permitido (405).", res.status, {
      ...data,
      rulesUrl: RULES_URL,
    });
  }

  // Caso estranho: 2xx/4xx sem contrato reconhecível
  throw makeUpstreamError(
    "Rules service respondeu em formato inválido (sem newState/rejected).",
    res.status,
    { ...data, rulesUrl: RULES_URL }
  );
}

export default { resolveAction };
