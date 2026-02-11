// src/services/api.js
// API client centralizado (compatível com Nginx: /api -> gateway-api)
// - NÃO usa http://localhost:3000
// - usa base relativa "/api" (funciona em security-zone.local, localhost, etc.)
// - injeta Authorization automaticamente se existir token salvo
// - padroniza retorno: { success, data?, error?, status? }

import { authUtils } from "../utils/auth.js";

const API_BASE_URL = import.meta?.env?.VITE_API_BASE_URL || "/api";

/**
 * ✅ Token oficial do sistema:
 * - prioridade: authUtils.getToken() (securityZoneToken)
 * - fallback: chaves antigas pra compat
 */
function getStoredToken() {
  if (typeof authUtils?.getToken === "function") {
    const t = authUtils.getToken();
    if (t) return t;
  }

  return (
    localStorage.getItem("securityZoneToken") ||
    sessionStorage.getItem("securityZoneToken") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("auth_token") ||
    ""
  );
}

/** evita double slash e aceita URL absoluta */
function buildUrl(endpoint = "") {
  const ep = String(endpoint || "");
  if (/^https?:\/\//i.test(ep)) return ep;

  const base = String(API_BASE_URL || "").replace(/\/+$/, "");
  const path = ep.startsWith("/") ? ep : `/${ep}`;
  return `${base}${path}`;
}

/**
 * Faz request e retorna um objeto padronizado:
 * - success: true  -> { success:true, data, status }
 * - success: false -> { success:false, error, status, data? }
 *
 * options extras:
 * - skipAuthClear: boolean  -> não limpa token automaticamente em 401/403
 */
async function apiRequest(endpoint, options = {}) {
  const url = buildUrl(endpoint);

  const token = getStoredToken();
  const skipAuthClear = options?.skipAuthClear === true;

  const headers = {
    ...(options.headers || {}),
  };

  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // 204 / vazio
    if (response.status === 204) {
      return { success: true, data: null, status: response.status };
    }

    const contentType = response.headers.get("content-type") || "";
    const hasJson = contentType.includes("application/json");

    let data = null;
    if (hasJson) {
      data = await response.json().catch(() => null);
    } else {
      const text = await response.text().catch(() => "");
      data = text ? { message: text } : null;
    }

    if (!response.ok) {
      const msg =
        (data && (data.error || data.message)) ||
        `Erro na requisição (${response.status})`;

      if (!skipAuthClear && (response.status === 401 || response.status === 403)) {
        if (typeof authUtils?.clearAuthData === "function") {
          authUtils.clearAuthData();
        }
      }

      return { success: false, error: msg, status: response.status, data };
    }

    return { success: true, data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error?.message || "Erro de conexão",
      status: 0,
    };
  }
}

export const playerService = {
  async register(playerData) {
    return await apiRequest("/player/register", {
      method: "POST",
      body: JSON.stringify(playerData),
      skipAuthClear: true,
    });
  },

  async login(credentials) {
    const res = await apiRequest("/player/login", {
      method: "POST",
      body: JSON.stringify(credentials),
      skipAuthClear: true,
    });

    if (!res.success) return res;

    return {
      success: true,
      token: res.data?.token,
      player: res.data?.player,
      data: res.data,
      status: res.status,
    };
  },

  // opcional (útil pra landing/inventário)
  async getMyCards(playerId) {
    return await apiRequest(`/player/${encodeURIComponent(playerId)}/cards`, {
      method: "GET",
    });
  },
};

export const deckService = {
  async listMyDecks() {
    return await apiRequest("/decks", { method: "GET" });
  },

  async activateDeck(deckId) {
    return await apiRequest(`/decks/${encodeURIComponent(deckId)}/activate`, {
      method: "POST",
    });
  },
};

export const matchService = {
  async createMatch(payload = {}) {
    return await apiRequest("/matches", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getMatch(matchId) {
    return await apiRequest(`/matches/${encodeURIComponent(matchId)}`, {
      method: "GET",
    });
  },

  async sendAction(matchId, action, clientActionId) {
    return await apiRequest(`/matches/${encodeURIComponent(matchId)}/actions`, {
      method: "POST",
      body: JSON.stringify({ action, clientActionId }),
    });
  },
};

// Se você quiser usar esse client direto em outros lugares:
export { apiRequest };
export default {
  apiRequest,
  playerService,
  deckService,
  matchService,
};
