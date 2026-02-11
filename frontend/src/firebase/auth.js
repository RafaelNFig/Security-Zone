// src/firebase/auth.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onIdTokenChanged,
} from "firebase/auth";
import { app } from "./config.js";
import { authUtils } from "../utils/auth.js";

// ✅ client oficial (/api relativo via Nginx)
import { apiRequest } from "../services/api.js";

// Inicializar autenticação
export const auth = getAuth(app);

// Provider Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/**
 * ✅ Guard de intenção (evita login automático ao abrir Login/Register/Profile)
 * - setado no clique do botão Google (login) ou no fluxo de link account
 * - NUNCA deve causar auto-login sozinho
 *
 * Obs: exportamos helpers pra telas como GoogleLink poderem setar intenção sem duplicar chave.
 */
export const GOOGLE_INTENT_KEY = "SZ_GOOGLE_INTENT";

export function setGoogleIntent() {
  try {
    sessionStorage.setItem(GOOGLE_INTENT_KEY, "1");
  } catch {
    /* empty */
  }
}

function consumeGoogleIntent() {
  try {
    const v = sessionStorage.getItem(GOOGLE_INTENT_KEY);
    sessionStorage.removeItem(GOOGLE_INTENT_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

/**
 * Troca Firebase ID Token por JWT do sistema (gateway)
 * => POST /api/auth/firebase-login
 */
async function gatewayFirebaseLogin(firebaseToken) {
  const res = await apiRequest("/auth/firebase-login", {
    method: "POST",
    body: JSON.stringify({ firebaseToken }),
  });

  if (!res?.success) {
    const msg = res?.error || "Falha no login do gateway";
    throw new Error(msg);
  }

  // esperado: { token: "<JWT_GATEWAY>", player: {...} }
  return res.data || {};
}

export const useAuth = () => {
  const [user, setUser] = useState(null); // player do sistema
  const [loading, setLoading] = useState(true);

  // 🔒 evita duplicidade do fluxo Firebase (popup + listener / loops)
  const exchangingRef = useRef(false);
  const lastFirebaseUidRef = useRef(null);

  // Persistência Firebase
  useEffect(() => {
    (async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (e) {
        console.warn("Falha ao setar persistência do Firebase Auth:", e);
      }
    })();
  }, []);

  /**
   * ✅ Sessão: fonte de verdade = /auth/session (gateway)
   * Se token no storage for inválido → limpa
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (cancelled) return;

        setLoading(true);

        const token = typeof authUtils.getToken === "function" ? authUtils.getToken() : null;

        if (!token) {
          setUser(null);
          return;
        }

        const res = await apiRequest("/auth/session", { method: "GET" });

        const isAuthed =
          res?.data?.isAuthenticated === true || res?.data?.authenticated === true;

        if (!cancelled && res?.success && isAuthed) {
          setUser(res.data.player || res.data.user || null);
        } else {
          authUtils.clearAuthData();
          setUser(null);
        }
      // eslint-disable-next-line no-unused-vars
      } catch (_e) {
        authUtils.clearAuthData();
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * ✅ Listener Firebase
   *
   * Regra:
   * - NÃO pode “logar sozinho” só porque o Firebase persistiu um usuário.
   * - Só troca token no gateway se:
   *   (A) houve intenção explícita (clique no Google login / fluxo de link), OU
   *   (B) já existe token do gateway (rehidratação / manter consistência)
   */
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      if (!fbUser) return;

      const uid = fbUser.uid;

      const existingToken = typeof authUtils.getToken === "function" ? authUtils.getToken() : null;

      // ✅ guard: sem intenção e sem token do gateway => NÃO faz nada
      const hasIntent = consumeGoogleIntent();
      if (!existingToken && !hasIntent) return;

      // já processado pra esse uid e já existe token do sistema → não reprocessa
      if (existingToken && lastFirebaseUidRef.current === uid) return;

      // evita concorrência (popup + listener disparando junto)
      if (exchangingRef.current) return;

      exchangingRef.current = true;

      try {
        setLoading(true);

        const firebaseToken = await fbUser.getIdToken(true);
        const { token: securityZoneToken, player } = await gatewayFirebaseLogin(firebaseToken);

        if (!securityZoneToken || !player) {
          throw new Error("Resposta inválida do gateway (token/player ausente).");
        }

        authUtils.setAuthData(securityZoneToken, player);
        lastFirebaseUidRef.current = uid;
        setUser(player);
      } catch (e) {
        console.error("Erro ao atualizar auth/token:", e);
        authUtils.clearAuthData();
        setUser(null);
        lastFirebaseUidRef.current = null;
      } finally {
        exchangingRef.current = false;
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  /**
   * ✅ Login Google
   * - seta intenção antes do popup
   * - salva token/player do gateway
   */
  const loginWithGoogle = async () => {
    try {
      setLoading(true);

      // marca intenção explícita do usuário
      setGoogleIntent();

      googleProvider.setCustomParameters({ prompt: "select_account" });

      exchangingRef.current = true;

      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const firebaseToken = await fbUser.getIdToken(true);
      const { token: securityZoneToken, player } = await gatewayFirebaseLogin(firebaseToken);

      if (!securityZoneToken || !player) {
        throw new Error("Resposta inválida do gateway (token/player ausente).");
      }

      authUtils.setAuthData(securityZoneToken, player);
      lastFirebaseUidRef.current = fbUser.uid;
      setUser(player);

      return player;
    } catch (e) {
      console.error("Erro no login Google:", e);
      authUtils.clearAuthData();
      setUser(null);
      lastFirebaseUidRef.current = null;
      throw e;
    } finally {
      exchangingRef.current = false;
      setLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);

      authUtils.clearAuthData();
      setUser(null);
      lastFirebaseUidRef.current = null;
    } catch (e) {
      console.error("Erro no logout:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return useMemo(
    () => ({
      user,
      loading,
      loginWithGoogle,
      logout,
      isAuthenticated: !!user,
    }),
    [user, loading]
  );
};
