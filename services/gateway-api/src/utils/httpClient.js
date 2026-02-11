// gateway-api/src/utils/httpClient.js
// Wrapper HTTP para o Gateway chamar outros serviços (match-service, etc.)
// - axios instance com baseURL, timeout e validateStatus (não throw automático)
// - buildServiceHeaders (x-request-id + contexto interno)
// - normalização de erros (upstream vs rede/timeout)
// - helper de resposta padronizada

import axios from "axios";
import crypto from "crypto";

function newRequestId() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createHttpClient({
  baseURL,
  timeoutMs = 12_000,
  defaultHeaders = {},
} = {}) {
  if (!baseURL) throw new Error("createHttpClient: baseURL é obrigatório");

  const normalizedBase = String(baseURL).replace(/\/$/, "");

  return axios.create({
    baseURL: normalizedBase,
    timeout: Number(timeoutMs),
    headers: {
      "Content-Type": "application/json",
      ...defaultHeaders,
    },
    // Permite controller decidir como tratar 4xx/5xx sem axios lançar exceção
    validateStatus: () => true,
  });
}

/**
 * Monta headers internos usados entre serviços (confiança interna).
 * - gera x-request-id se não existir
 * - inclui x-player-id e x-firebase-uid se disponíveis
 *
 * NÃO repassa Authorization do client (evita vazar token internamente).
 */
export function buildServiceHeaders(req, extraHeaders = {}) {
  const playerId =
    req?.player?.PL_ID ??
    req?.player?.id ??
    req?.user?.playerId ??
    req?.user?.PL_ID ??
    req?.user?.id ??
    req?.playerId ??
    null;

  const firebaseUid =
    req?.user?.firebaseUid ??
    req?.user?.uid ??
    req?.player?.PL_FIREBASE_UID ??
    null;

  const incomingRid = req?.headers?.["x-request-id"];
  const requestId = String(incomingRid || newRequestId());

  const headers = {
    "x-request-id": requestId,
    ...(playerId != null ? { "x-player-id": String(playerId) } : {}),
    ...(firebaseUid != null ? { "x-firebase-uid": String(firebaseUid) } : {}),
    ...extraHeaders,
  };

  // remove undefined
  for (const k of Object.keys(headers)) {
    if (headers[k] === undefined) delete headers[k];
  }

  return headers;
}

/**
 * Opcional: repassar alguns headers do client (whitelist).
 * Útil se você precisar de algo como "accept-language" ou "x-trace-id".
 */
export function pickForwardHeaders(req, allowlist = []) {
  const out = {};
  const h = req?.headers || {};
  for (const key of allowlist) {
    const v = h[key.toLowerCase()];
    if (v != null) out[key] = String(v);
  }
  return out;
}

/**
 * Normaliza erro/resultado do axios para logging/resposta.
 * Observação: como o client usa validateStatus:() => true,
 * 4xx/5xx virão como "upstreamResponse" (sem exception).
 */
export function normalizeAxiosError(err) {
  if (!err) {
    return { kind: "unknown", status: 500, code: "UNKNOWN", message: "Erro desconhecido" };
  }

  // Exceção lançada (rede/timeout/etc) — normalmente cai aqui
  if (err.isAxiosError && !err.response) {
    const code = err.code || "NETWORK_ERROR";
    const status = code === "ECONNABORTED" ? 504 : 502;

    return {
      kind: "network",
      status,
      code,
      message: err.message || "Falha de rede ao chamar serviço",
      meta: {
        url: err.config?.url,
        method: err.config?.method,
        baseURL: err.config?.baseURL,
      },
    };
  }

  // Exceção com response (caso validateStatus não esteja ativo em algum lugar)
  if (err.response) {
    const status = err.response.status || 502;
    return {
      kind: "upstream",
      status,
      code: "UPSTREAM_ERROR",
      message: "Erro retornado pelo serviço upstream",
      upstream: {
        status,
        data: err.response.data,
        headers: err.response.headers,
      },
      meta: {
        url: err.config?.url,
        method: err.config?.method,
        baseURL: err.config?.baseURL,
      },
    };
  }

  // fallback
  return {
    kind: "unknown",
    status: 500,
    code: err.code || "UNKNOWN",
    message: err.message || String(err),
  };
}

/**
 * Quando você usa axios com validateStatus:() => true,
 * o "erro" de HTTP 4xx/5xx NÃO vira exception.
 *
 * Então este helper trata dois cenários:
 * 1) Você passou um "response" do axios (r) com status >= 400
 * 2) Você passou uma exception (err) de rede/timeout
 */
export function replyWithHttpError(
  res,
  errOrResponse,
  {
    publicError = "SERVICE_ERROR",
    includeUpstreamBody = true,
    includeUpstreamHeaders = false,
  } = {}
) {
  // Caso 1: recebeu um response do axios (não-exception)
  if (errOrResponse && typeof errOrResponse === "object" && "status" in errOrResponse && "data" in errOrResponse) {
    const status = Number(errOrResponse.status || 502);

    return res.status(status).json({
      error: publicError,
      upstream: includeUpstreamBody ? errOrResponse.data : undefined,
      upstreamHeaders: includeUpstreamHeaders ? errOrResponse.headers : undefined,
    });
  }

  // Caso 2: exception
  const e = normalizeAxiosError(errOrResponse);

  if (e.kind === "upstream") {
    return res.status(e.status).json({
      error: publicError,
      upstream: includeUpstreamBody ? e.upstream?.data : undefined,
      upstreamHeaders: includeUpstreamHeaders ? e.upstream?.headers : undefined,
    });
  }

  return res.status(e.status).json({
    error: publicError,
    code: e.code,
    message: e.message,
  });
}
