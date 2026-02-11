// src/pages/GameHome/ProfileView/hooks/useProfile.js
import { useState, useEffect, useCallback } from "react";
import { authUtils } from "../../../../utils/auth";
import { apiRequest } from "@/services/api.js";

export const useProfile = (playerId = null) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ apiRequest já injeta Authorization automaticamente (token do authUtils)
  const makeProfileRequest = useCallback(async () => {
    try {
      console.log("📤 [useProfile] Fazendo requisição do perfil...");

      const endpoint = playerId
        ? `/player/public/${playerId}`
        : "/player/profile";

      const res = await apiRequest(endpoint, { method: "GET" });

      console.log("📥 [useProfile] Status:", res?.status);

      if (!res?.success) {
        if (res?.status === 500) {
          throw new Error("Servidor temporariamente indisponível. Tente novamente.");
        }
        if (res?.status === 401) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        if (res?.status === 404) {
          throw new Error("Perfil não encontrado.");
        }
        throw new Error(res?.error || `Erro ${res?.status ?? "?"} ao carregar perfil`);
      }

      const data = res.data;
      const profileData = data?.player || data;

      if (!profileData) {
        throw new Error("Dados do perfil não retornados corretamente.");
      }

      // Só salva no localStorage se for o perfil do usuário atual
      if (!playerId) {
        localStorage.setItem("playerData", JSON.stringify(profileData));
        console.log("✅ [useProfile] Perfil salvo no cache:", profileData.PL_NAME);
      }

      return profileData;
    } catch (requestError) {
      console.error("❌ [useProfile] Erro na requisição:", requestError);
      throw requestError;
    }
  }, [playerId]);

  // 🔥 fetchProfile que NÃO limpa o token
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🔐 [useProfile] Verificando autenticação...");
      const token = authUtils.getToken();

      // Mantém validação de auth para UX (mesmo que apiRequest injete token)
      if (!token && !playerId) {
        const errorMsg = "Usuário não autenticado. Faça login novamente.";
        console.error("❌ [useProfile]", errorMsg);
        setError(errorMsg);
        return null;
      }

      console.log("🔍 [useProfile] Auth ok, buscando perfil...");
      const freshProfile = await makeProfileRequest();
      setProfile(freshProfile);
      return freshProfile;
    } catch (err) {
      console.error("💥 [useProfile] Erro no fetch:", err);

      let errorMessage = err?.message || "Erro ao carregar perfil";
      if (String(err?.message || "").includes("Failed to fetch")) {
        errorMessage = "Erro de conexão com o servidor";
      }

      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeProfileRequest, playerId]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!mounted) return;

      console.log("🔄 [useProfile] Iniciando carregamento...");

      // Primeiro: Tentar usar cache (somente perfil do usuário logado)
      if (!playerId) {
        const cachedPlayerData = localStorage.getItem("playerData");
        if (cachedPlayerData) {
          try {
            const parsedData = JSON.parse(cachedPlayerData);
            console.log("💾 [useProfile] Usando cache:", parsedData.PL_NAME);
            setProfile(parsedData);
            setLoading(false);

            // Atualização em background
            setTimeout(async () => {
              try {
                if (!mounted) return;

                const token = authUtils.getToken();
                if (token) {
                  const freshData = await makeProfileRequest();
                  if (mounted && freshData) setProfile(freshData);
                }
              } catch (backgroundError) {
                console.warn(
                  "⚠️ [useProfile] Background update failed:",
                  backgroundError.message
                );
              }
            }, 2000);

            return;
          } catch (parseError) {
            console.warn("⚠️ [useProfile] Cache corrompido:", parseError);
            localStorage.removeItem("playerData");
          }
        }
      }

      // Segundo: Buscar fresh
      await fetchProfile();
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [fetchProfile, playerId, makeProfileRequest]);

  const updateLocalProfile = useCallback(
    (updates) => {
      setProfile((prevProfile) => {
        if (!prevProfile) return prevProfile;

        const updatedProfile = { ...prevProfile, ...updates };

        if (!playerId) {
          try {
            localStorage.setItem("playerData", JSON.stringify(updatedProfile));
          } catch (storageError) {
            console.error("❌ [useProfile] Erro ao atualizar cache:", storageError);
          }
        }

        return updatedProfile;
      });
    },
    [playerId]
  );

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setLoading(true);
    if (!playerId) {
      localStorage.removeItem("playerData");
    }
  }, [playerId]);

  const refetch = useCallback(async () => {
    console.log("🔄 [useProfile] Recarregando forçadamente...");
    return await fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetch,
    updateLocalProfile,
    clearProfile,
    isAuthenticated: !!authUtils.getToken(),
  };
};

export default useProfile;
