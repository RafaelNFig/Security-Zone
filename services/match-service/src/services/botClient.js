// match-service/src/services/botClient.js
// Cliente HTTP para bot-service (/move) — ESM puro.

const BOT_URL = process.env.BOT_URL || "http://localhost:3003";
const BOT_TIMEOUT_MS = Number(process.env.BOT_TIMEOUT_MS || 3500);

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function safeUpper(v, fallback = "") {
  return String(v ?? fallback).trim().toUpperCase();
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
  err.code = "BOT_UPSTREAM_ERROR";
  err.status = status;
  err.details = details;
  return err;
}

function normalizeAction(data) {
  // bot pode responder { action: {...} } ou a action direto
  const action = isObject(data?.action) ? data.action : data;
  return isObject(action) ? action : null;
}

function validateBotAction(action) {
  const type = safeUpper(action?.type, "");
  if (!type) return { ok: false, message: "action.type ausente" };

  const payload = isObject(action.payload) ? action.payload : {};

  // validações mínimas (rules-service vai validar de verdade)
  if (type === "PLAY_CARD") {
    if (payload.cardId == null || String(payload.cardId).trim() === "") {
      return { ok: false, message: "PLAY_CARD requer payload.cardId" };
    }
    const slot = payload.slot;
    if (!Number.isInteger(slot) || slot < 0 || slot > 2) {
      return { ok: false, message: "PLAY_CARD requer payload.slot inteiro 0..2" };
    }
  }

  if (type === "ATTACK") {
    const attackerSlot = payload.attackerSlot;
    if (!Number.isInteger(attackerSlot) || attackerSlot < 0 || attackerSlot > 2) {
      return { ok: false, message: "ATTACK requer payload.attackerSlot inteiro 0..2" };
    }
  }

  // END_TURN não precisa payload
  return { ok: true };
}

/**
 * getMove
 * Retorna sempre uma action:
 * { type, payload }
 *
 * Só lança erro se:
 * - bot-service caiu / timeout / http não ok
 * - resposta não contém uma action válida minimamente
 */
export async function getMove({ state, difficulty = "easy" }) {
  if (!isObject(state)) {
    throw new Error("getMove: 'state' deve ser um objeto.");
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), BOT_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${BOT_URL}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, difficulty }),
      signal: controller.signal,
    });
  } catch (e) {
    if (e?.name === "AbortError") {
      const err = new Error(`Bot service timeout após ${BOT_TIMEOUT_MS}ms`);
      err.code = "BOT_TIMEOUT";
      err.details = { botUrl: BOT_URL, timeoutMs: BOT_TIMEOUT_MS };
      throw err;
    }

    const err = new Error(`Falha ao chamar bot-service: ${e?.message ?? String(e)}`);
    err.code = "BOT_NETWORK_ERROR";
    err.details = { botUrl: BOT_URL };
    throw err;
  } finally {
    clearTimeout(t);
  }

  const data = await safeReadJson(res);

  if (!res.ok) {
    const msg =
      data?.message ||
      data?.error ||
      data?.rejected?.message ||
      `Bot service error (${res.status})`;
    throw makeUpstreamError(msg, res.status, data);
  }

  const action = normalizeAction(data);
  if (!action) {
    throw makeUpstreamError("Bot service respondeu sem action válida.", res.status, data);
  }

  // normaliza payload
  if (!isObject(action.payload)) action.payload = {};

  const v = validateBotAction(action);
  if (!v.ok) {
    const err = new Error(`Bot action inválida: ${v.message}`);
    err.code = "BOT_INVALID_ACTION";
    err.details = { action };
    throw err;
  }

  return action;
}

export default { getMove };
