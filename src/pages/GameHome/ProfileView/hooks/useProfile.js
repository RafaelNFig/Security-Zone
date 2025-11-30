// src/pages/GameHome/ProfileView/hooks/useProfile.js
import { useState, useEffect, useCallback } from 'react';
import { authUtils } from '../../../../utils/auth';

export const useProfile = (playerId = null) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const makeProfileRequest = useCallback(async (token) => {
    try {
      console.log('📤 [useProfile] Fazendo requisição do perfil...');
      
      const url = playerId 
        ? `http://localhost:3000/api/player/public/${playerId}`
        : 'http://localhost:3000/api/player/profile';

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      console.log('📥 [useProfile] Status:', response.status);

      // 🔥 CORREÇÃO: Tratamento específico de erro 500
      if (response.status === 500) {
        throw new Error("Servidor temporariamente indisponível. Tente novamente.");
      }

      if (response.status === 401) {
        throw new Error("Sessão expirada. Faça login novamente.");
      }

      if (response.status === 404) {
        throw new Error("Perfil não encontrado.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro ${response.status} ao carregar perfil`);
      }

      const data = await response.json();
      const profileData = data.player || data;

      if (!profileData) {
        throw new Error("Dados do perfil não retornados corretamente.");
      }

      // Só salva no localStorage se for o perfil do usuário atual
      if (!playerId) {
        localStorage.setItem('playerData', JSON.stringify(profileData));
        console.log("✅ [useProfile] Perfil salvo no cache:", profileData.PL_NAME);
      }

      return profileData;

    } catch (requestError) {
      console.error("❌ [useProfile] Erro na requisição:", requestError);
      throw requestError;
    }
  }, [playerId]);

  // 🔥 CORREÇÃO: fetchProfile que NÃO limpa o token
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔐 [useProfile] Verificando autenticação...');
      const token = authUtils.getToken();
      
      if (!token) {
        const errorMsg = "Usuário não autenticado. Faça login novamente.";
        console.error("❌ [useProfile]", errorMsg);
        setError(errorMsg);
        return null;
      }

      console.log('🔍 [useProfile] Token válido encontrado');

      const freshProfile = await makeProfileRequest(token);
      setProfile(freshProfile);
      return freshProfile;

    } catch (err) {
      console.error("💥 [useProfile] Erro no fetch:", err);
      
      // 🔥 CORREÇÃO CRÍTICA: NÃO limpar token automaticamente
      let errorMessage = err.message;
      if (err.message.includes('Failed to fetch')) {
        errorMessage = "Erro de conexão com o servidor";
      }
      // 🔥 REMOVIDO: Limpeza automática do token
      
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [makeProfileRequest]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      if (!mounted) return;

      console.log('🔄 [useProfile] Iniciando carregamento...');

      // Primeiro: Tentar usar cache
      if (!playerId) {
        const cachedPlayerData = localStorage.getItem('playerData');
        if (cachedPlayerData) {
          try {
            const parsedData = JSON.parse(cachedPlayerData);
            console.log('💾 [useProfile] Usando cache:', parsedData.PL_NAME);
            setProfile(parsedData);
            setLoading(false);
            
            // Atualização em background
            setTimeout(async () => {
              try {
                const token = authUtils.getToken();
                if (token && mounted) {
                  const freshData = await makeProfileRequest(token);
                  if (mounted && freshData) {
                    setProfile(freshData);
                  }
                }
              } catch (backgroundError) {
                console.warn("⚠️ [useProfile] Background update failed:", backgroundError.message);
              }
            }, 2000);
            
            return;
          } catch (parseError) {
            console.warn("⚠️ [useProfile] Cache corrompido:", parseError);
            localStorage.removeItem('playerData');
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

  const updateLocalProfile = useCallback((updates) => {
    setProfile(prevProfile => {
      if (!prevProfile) return prevProfile;
      
      const updatedProfile = { ...prevProfile, ...updates };
      
      if (!playerId) {
        try {
          localStorage.setItem('playerData', JSON.stringify(updatedProfile));
        } catch (storageError) {
          console.error("❌ [useProfile] Erro ao atualizar cache:", storageError);
        }
      }
      
      return updatedProfile;
    });
  }, [playerId]);

  const clearProfile = useCallback(() => {
    setProfile(null);
    setError(null);
    setLoading(true);
    if (!playerId) {
      localStorage.removeItem('playerData');
    }
  }, [playerId]);

  const refetch = useCallback(async () => {
    console.log('🔄 [useProfile] Recarregando forçadamente...');
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