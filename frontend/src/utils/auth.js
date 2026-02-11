// src/utils/auth.js
/* eslint-disable no-unused-vars */

/**
 * ✅ NOVO PADRÃO (Security-Zone):
 * - token = JWT DO GATEWAY (securityZoneToken)
 * - user = player do seu banco (Prisma)
 */

const LS = {
  securityZoneToken: "securityZoneToken",
  playerData: "playerData",
  playerId: "playerId", // ✅ NOVO: id normalizado
  firebaseUser: "firebaseUser",
};

function safeJsonParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim() !== "" && v !== "undefined" && v !== "null";
}

function preferStorageGet(key) {
  const a = localStorage.getItem(key);
  if (isNonEmptyString(a)) return a;

  const b = sessionStorage.getItem(key);
  if (isNonEmptyString(b)) return b;

  return null;
}

function preferStorageSet(key, value) {
  localStorage.setItem(key, value);
  sessionStorage.setItem(key, value);
}

function preferStorageRemove(key) {
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
}

function extractPlayerId(player) {
  const id =
    player?.PL_ID ??
    player?.id ??
    player?.playerId ??
    player?.player?.PL_ID ??
    player?.player?.id ??
    null;

  const n = Number(id);
  return Number.isFinite(n) ? n : null;
}

export const authUtils = {
  /**
   * ✅ PRINCIPAL:
   * Salva token do gateway + player do banco
   * e salva playerId normalizado pra navegação.
   */
  setAuthData(token, playerData) {
    try {
      const cleanToken = isNonEmptyString(token) ? token.trim() : null;

      if (cleanToken) preferStorageSet(LS.securityZoneToken, cleanToken);
      else preferStorageRemove(LS.securityZoneToken);

      if (playerData && typeof playerData === "object") {
        preferStorageSet(LS.playerData, JSON.stringify(playerData));

        const pid = extractPlayerId(playerData);
        if (pid) preferStorageSet(LS.playerId, String(pid));
        else preferStorageRemove(LS.playerId);
      } else {
        preferStorageRemove(LS.playerData);
        preferStorageRemove(LS.playerId);
      }

      return true;
    } catch (e) {
      console.error("❌ setAuthData error:", e);
      return false;
    }
  },

  /**
   * ✅ COMPAT (telas antigas / fluxo de link do Google):
   * Alguns pontos do sistema chamam authUtils.syncAuthData(...)
   * Esse método normaliza e redireciona pro padrão atual (setAuthData).
   *
   * Aceita:
   * - syncAuthData(token, playerData)
   * - syncAuthData({ token, player, playerData, firebaseUser })
   */
  syncAuthData(a, b) {
    try {
      // forma antiga: (token, playerData)
      if (isNonEmptyString(a) || a === null) {
        return this.setAuthData(a, b);
      }

      // forma nova: ({ token, playerData/player, firebaseUser })
      if (a && typeof a === "object") {
        const token = a.token ?? a.jwt ?? a.accessToken ?? null;
        const playerData = a.playerData ?? a.player ?? a.user ?? null;

        // opcional: salva firebaseUser se vier
        if (a.firebaseUser && typeof a.firebaseUser === "object") {
          this.setFirebaseUser(a.firebaseUser);
        }

        return this.setAuthData(token, playerData);
      }

      // fallback: limpa se vier lixo
      return this.setAuthData(null, null);
    } catch (e) {
      console.error("❌ syncAuthData error:", e);
      return false;
    }
  },

  setFirebaseUser(firebaseUser) {
    try {
      if (firebaseUser && typeof firebaseUser === "object") {
        preferStorageSet(LS.firebaseUser, JSON.stringify(firebaseUser));
        return true;
      }
      preferStorageRemove(LS.firebaseUser);
      return true;
    } catch (e) {
      console.error("❌ setFirebaseUser error:", e);
      return false;
    }
  },

  getToken() {
    const t = preferStorageGet(LS.securityZoneToken);
    if (isNonEmptyString(t)) return t.trim();
    return null;
  },

  getPlayerData() {
    const raw = preferStorageGet(LS.playerData);
    const p = safeJsonParse(raw);
    return p && typeof p === "object" ? p : null;
  },

  // ✅ NOVO: id normalizado (preferencial)
  getPlayerId() {
    const raw = preferStorageGet(LS.playerId);
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;

    // fallback: tenta extrair do playerData antigo
    const pd = this.getPlayerData();
    return extractPlayerId(pd);
  },

  getFirebaseUser() {
    const raw = preferStorageGet(LS.firebaseUser);
    const u = safeJsonParse(raw);
    return u && typeof u === "object" ? u : null;
  },

  isAuthenticated() {
    const token = this.getToken();
    return !!(token && token.length > 10);
  },

  getAuthHeader() {
    const token = this.getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  },

  clearAuthData() {
    try {
      preferStorageRemove(LS.securityZoneToken);
      preferStorageRemove(LS.playerData);
      preferStorageRemove(LS.playerId);
      preferStorageRemove(LS.firebaseUser);
      return true;
    } catch (e) {
      console.error("❌ clearAuthData error:", e);
      return false;
    }
  },

  getAuthStatus() {
    const token = this.getToken();
    const fu = this.getFirebaseUser();
    const pd = this.getPlayerData();

    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      firebaseUser: fu ? { uid: fu.uid, email: fu.email, displayName: fu.displayName } : null,
      hasPlayerData: !!pd,
      playerId: this.getPlayerId(),
      storage: {
        local: {
          securityZoneToken: !!localStorage.getItem(LS.securityZoneToken),
          playerData: !!localStorage.getItem(LS.playerData),
          playerId: !!localStorage.getItem(LS.playerId),
          firebaseUser: !!localStorage.getItem(LS.firebaseUser),
        },
        session: {
          securityZoneToken: !!sessionStorage.getItem(LS.securityZoneToken),
          playerData: !!sessionStorage.getItem(LS.playerData),
          playerId: !!sessionStorage.getItem(LS.playerId),
          firebaseUser: !!sessionStorage.getItem(LS.firebaseUser),
        },
      },
    };
  },
};
