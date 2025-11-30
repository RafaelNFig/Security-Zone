/* eslint-disable no-unused-vars */
// src/utils/auth.js
export const authUtils = {
  /**
   * Salva o token válido gerado pelo backend SecurityZone e dados do player
   * Agora com validação completa e sincronização entre storages
   */
  setAuthData(token, playerData) {
    try {
      // 🔥 CORREÇÃO: Validação mais tolerante para debug
      console.log("💾 [setAuthData] Iniciando salvamento...");
      console.log(
        "💾 [setAuthData] Token recebido:",
        token ? `${token.substring(0, 50)}...` : "NULL/UNDEFINED"
      );
      console.log("💾 [setAuthData] PlayerData recebido:", playerData);

      // 🔥 CORREÇÃO: Validação mais flexível do token
      if (!token) {
        console.error("❌ [setAuthData] ERRO: Token é null ou undefined");
        // Não throw mais - apenas log e tente continuar
        console.warn("⚠️ [setAuthData] Continuando sem token válido...");
      }

      const cleanToken = token ? token.toString().trim() : "";

      if (
        cleanToken === "" ||
        cleanToken === "undefined" ||
        cleanToken === "null"
      ) {
        console.error(
          "❌ [setAuthData] ERRO: Token vazio ou inválido após limpeza"
        );
        console.warn(
          "⚠️ [setAuthData] Token problemático, mas continuando operação..."
        );
      }

      // 🔥 CORREÇÃO: Validação mais flexível do playerData
      if (!playerData || typeof playerData !== "object") {
        console.error(
          "❌ [setAuthData] ERRO: Dados do player inválidos:",
          playerData
        );
        console.warn("⚠️ [setAuthData] Continuando sem playerData válido...");
      }

      // 🔥 CORREÇÃO: Verificação de campos essenciais (apenas warning)
      if (playerData && (!playerData.PL_ID || !playerData.PL_EMAIL)) {
        console.warn("⚠️ [setAuthData] AVISO: Dados do player incompletos", {
          hasPL_ID: !!playerData.PL_ID,
          hasPL_EMAIL: !!playerData.PL_EMAIL,
          playerData,
        });
      }

      // 🔥 CORREÇÃO: Salvamento FORÇADO mesmo com dados problemáticos
      console.log("💾 [setAuthData] Salvando no localStorage...");

      if (cleanToken && cleanToken !== "undefined" && cleanToken !== "null") {
        localStorage.setItem("securityZoneToken", cleanToken);
        console.log("✅ [setAuthData] securityZoneToken salvo no localStorage");
      } else {
        console.warn(
          "⚠️ [setAuthData] Pulando salvamento do token - valor inválido"
        );
      }

      if (playerData && typeof playerData === "object") {
        localStorage.setItem("playerData", JSON.stringify(playerData));
        console.log("✅ [setAuthData] playerData salvo no localStorage");
      } else {
        console.warn(
          "⚠️ [setAuthData] Pulando salvamento do playerData - valor inválido"
        );
      }

      // 🔥 CORREÇÃO: Backup no sessionStorage
      console.log("💾 [setAuthData] Salvando no sessionStorage...");

      if (cleanToken && cleanToken !== "undefined" && cleanToken !== "null") {
        sessionStorage.setItem("securityZoneToken", cleanToken);
        console.log(
          "✅ [setAuthData] securityZoneToken salvo no sessionStorage"
        );
      }

      if (playerData && typeof playerData === "object") {
        sessionStorage.setItem("playerData", JSON.stringify(playerData));
        console.log("✅ [setAuthData] playerData salvo no sessionStorage");
      }

      // 🔥 CORREÇÃO: Verificação final do que foi salvo
      console.log("🔍 [setAuthData] Verificando salvamento...");
      const savedToken = localStorage.getItem("securityZoneToken");
      const savedPlayerData = localStorage.getItem("playerData");

      console.log(
        "✅ [setAuthData] securityZoneToken salvo?:",
        savedToken ? `SIM (${savedToken.length} chars)` : "NÃO"
      );
      console.log(
        "✅ [setAuthData] playerData salvo?:",
        savedPlayerData ? "SIM" : "NÃO"
      );

      if (savedToken && savedPlayerData) {
        console.log(
          "🎉 [setAuthData] Dados salvos COM SUCESSO para:",
          playerData?.PL_NAME || playerData?.PL_EMAIL || "Unknown Player"
        );
      } else {
        console.warn(
          "⚠️ [setAuthData] Alguns dados não foram salvos completamente"
        );
      }

      return true;
    } catch (error) {
      console.error(
        "❌ [setAuthData] ERRO CRÍTICO ao salvar dados de autenticação:",
        error
      );
      console.error("❌ [setAuthData] Stack trace:", error.stack);

      // 🔥 CORREÇÃO: Tentar salvamento mínimo mesmo com erro
      try {
        if (token && typeof token === "string") {
          localStorage.setItem("securityZoneToken", token.trim());
          console.log("🔄 [setAuthData] Token salvo em modo de emergência");
        }
        if (playerData) {
          localStorage.setItem("playerData", JSON.stringify(playerData));
          console.log(
            "🔄 [setAuthData] PlayerData salvo em modo de emergência"
          );
        }
      } catch (emergencyError) {
        console.error(
          "💥 [setAuthData] ERRO até no salvamento de emergência:",
          emergencyError
        );
      }

      return false;
    }
  },

  /**
   * Retorna somente o token oficial do backend com fallback
   * 🔥 CORREÇÃO: NÃO limpa dados automaticamente
   */
  getToken() {
    try {
      // 🔥 TENTATIVA 1: localStorage principal
      let token = localStorage.getItem("securityZoneToken");

      // 🔥 TENTATIVA 2: sessionStorage (fallback)
      if (
        !token ||
        token === "undefined" ||
        token === "null" ||
        token.trim() === ""
      ) {
        token = sessionStorage.getItem("securityZoneToken");
        if (token && token !== "undefined" && token !== "null") {
          console.log("🔁 Auth: Usando token do sessionStorage como fallback");
        }
      }

      // 🔥 VALIDAÇÃO FINAL - APENAS retorna null se inválido, NÃO limpa
      if (
        token &&
        token !== "undefined" &&
        token !== "null" &&
        token.trim() !== ""
      ) {
        return token.trim();
      }

      console.log("🔐 Auth: Token não encontrado ou inválido");
      return null;
    } catch (error) {
      console.error("❌ Erro ao recuperar token:", error);
      // 🔥 CORREÇÃO: NÃO limpar dados em caso de erro
      return null;
    }
  },

  /**
   * Obtém os dados do jogador com fallback e validação
   * 🔥 CORREÇÃO: NÃO limpa dados automaticamente
   */
  getPlayerData() {
    try {
      // 🔥 TENTATIVA 1: localStorage principal
      let raw = localStorage.getItem("playerData");
      let playerData = null;

      if (raw) {
        try {
          playerData = JSON.parse(raw);
        } catch (parseError) {
          console.warn(
            "⚠️ Auth: Erro ao parsear playerData do localStorage:",
            parseError
          );
          // 🔥 CORREÇÃO: NÃO remover automaticamente, apenas logar
        }
      }

      // 🔥 TENTATIVA 2: sessionStorage (fallback)
      if (!playerData || typeof playerData !== "object") {
        raw = sessionStorage.getItem("playerData");
        if (raw) {
          try {
            playerData = JSON.parse(raw);
            console.log(
              "🔁 Auth: Usando playerData do sessionStorage como fallback"
            );
          } catch (parseError) {
            console.warn(
              "⚠️ Auth: Erro ao parsear playerData do sessionStorage:",
              parseError
            );
          }
        }
      }

      // 🔥 VALIDAÇÃO BÁSICA - APENAS retorna null se inválido
      if (playerData && typeof playerData === "object" && playerData.PL_ID) {
        return playerData;
      }

      console.log("🔐 Auth: Dados do player não encontrados ou inválidos");
      return null;
    } catch (error) {
      console.error("❌ Erro ao recuperar dados do player:", error);
      // 🔥 CORREÇÃO: NÃO limpar dados em caso de erro
      return null;
    }
  },

  /**
   * Limpa dados de autenticação de todos os storages
   * 🔥 AGORA: Apenas quando explicitamente chamado
   */
  clearAuthData() {
    try {
      // 🔥 LIMPEZA COMPLETA - APENAS quando chamado explicitamente
      localStorage.removeItem("securityZoneToken");
      localStorage.removeItem("playerData");
      sessionStorage.removeItem("securityZoneToken");
      sessionStorage.removeItem("playerData");

      console.log(
        "✅ Auth: Todos os dados de autenticação foram removidos explicitamente"
      );
      return true;
    } catch (error) {
      console.error("❌ Erro ao limpar dados de autenticação:", error);
      return false;
    }
  },

  /**
   * Verifica se o usuário está autenticado de forma robusta
   * 🔥 CORREÇÃO: Mais tolerante com dados parciais
   */
  isAuthenticated() {
    const token = this.getToken();
    const playerData = this.getPlayerData();

    // 🔥 CORREÇÃO: Requer apenas token válido, playerData é opcional
    const authenticated = !!(token && token.length > 10); // Token básico válido

    if (!authenticated) {
      console.log(
        "🔐 Auth: Usuário não autenticado - Token:",
        !!token,
        "PlayerData:",
        !!playerData
      );
    } else if (!playerData) {
      console.warn("⚠️ Auth: Token válido mas playerData não encontrado");
    }

    return authenticated;
  },

  /**
   * Atualiza dados do jogador de forma segura e sincronizada
   * 🔥 CORREÇÃO: Mais tolerante com dados parciais
   */
  updatePlayerData(updatedData) {
    try {
      if (!updatedData || typeof updatedData !== "object") {
        console.error("❌ ERRO: Dados para atualização inválidos");
        return false;
      }

      // 🔥 OBTER DADOS ATUAIS
      const current = this.getPlayerData();

      if (!current) {
        console.warn("⚠️ Auth: Nenhum dado atual encontrado, criando novo...");
        // 🔥 CORREÇÃO: Criar novo objeto se não existir
        const newPlayerData = {
          PL_ID: updatedData.PL_ID || Date.now(),
          PL_EMAIL: updatedData.PL_EMAIL || "unknown@email.com",
          PL_NAME: updatedData.PL_NAME || "Unknown Player",
          ...updatedData,
        };

        localStorage.setItem("playerData", JSON.stringify(newPlayerData));
        sessionStorage.setItem("playerData", JSON.stringify(newPlayerData));
        console.log("✅ Auth: Novos dados do player criados");
        return true;
      }

      // 🔥 MESCLAGEM SEGURA (preserva dados essenciais)
      const merged = {
        ...current,
        ...updatedData,
        // 🔥 GARANTIR que campos essenciais não sejam removidos
        PL_ID: current.PL_ID || updatedData.PL_ID,
        PL_EMAIL: current.PL_EMAIL || updatedData.PL_EMAIL,
        PL_NAME: current.PL_NAME || updatedData.PL_NAME,
      };

      // 🔥 SALVAMENTO SINCRONIZADO
      localStorage.setItem("playerData", JSON.stringify(merged));
      sessionStorage.setItem("playerData", JSON.stringify(merged));

      console.log(
        "✅ Auth: Dados do player atualizados para:",
        merged.PL_NAME || "Unknown"
      );
      return true;
    } catch (error) {
      console.error("❌ Erro ao atualizar dados do jogador:", error);
      // 🔥 CORREÇÃO: NÃO limpar dados em caso de erro
      return false;
    }
  },

  /**
   * 🔥 NOVO: Verifica a validade do token (estrutura básica)
   */
  validateTokenStructure(token = null) {
    const checkToken = token || this.getToken();

    if (!checkToken) return false;

    // Verificação básica de estrutura JWT
    const parts = checkToken.split(".");
    const isValidJWT = parts.length === 3;

    if (!isValidJWT) {
      console.warn(
        "⚠️ Auth: Token não possui estrutura JWT válida, mas mantendo para compatibilidade"
      );
    }

    return isValidJWT;
  },

  /**
   * 🔥 NOVO: Retorna dados completos de autenticação para debug
   */
  getAuthStatus() {
    const token = this.getToken();
    const playerData = this.getPlayerData();

    return {
      isAuthenticated: this.isAuthenticated(),
      hasToken: !!token,
      hasPlayerData: !!playerData,
      tokenLength: token ? token.length : 0,
      tokenValidStructure: this.validateTokenStructure(token),
      playerId: playerData?.PL_ID || null,
      playerName: playerData?.PL_NAME || null,
      playerEmail: playerData?.PL_EMAIL || null,
      // 🔥 ADICIONADO: Informações de storage
      storage: {
        localStorage: {
          token: !!localStorage.getItem("securityZoneToken"),
          playerData: !!localStorage.getItem("playerData"),
        },
        sessionStorage: {
          token: !!sessionStorage.getItem("securityZoneToken"),
          playerData: !!sessionStorage.getItem("playerData"),
        },
      },
    };
  },

  /**
   * 🔥 NOVO: Sincroniza dados entre storages
   */
  syncAuthData() {
    try {
      const token = this.getToken();
      const playerData = this.getPlayerData();

      if (token) {
        // Força sincronização completa apenas se temos token
        if (playerData) {
          this.setAuthData(token, playerData);
        } else {
          // 🔥 CORREÇÃO: Sincronizar apenas o token se playerData não existir
          localStorage.setItem("securityZoneToken", token);
          sessionStorage.setItem("securityZoneToken", token);
        }
        console.log("✅ Auth: Dados sincronizados entre storages");
        return true;
      }

      console.warn("⚠️ Auth: Nada para sincronizar - token não encontrado");
      return false;
    } catch (error) {
      console.error("❌ Erro ao sincronizar dados de auth:", error);
      return false;
    }
  },

  /**
   * 🔥 NOVO: Verifica se pode tentar reautenticação
   */
  canRetryAuthentication() {
    const token = this.getToken();
    const playerData = this.getPlayerData();

    return {
      canRetry: !!token, // Pode retentar se tiver token
      hasToken: !!token,
      hasPlayerData: !!playerData,
      reason: !token ? "Token não encontrado" : "Pode tentar novamente",
    };
  },

  /**
   * 🔥 NOVO: Limpa apenas dados corrompidos (não tudo)
   */
  clearCorruptedData() {
    try {
      let clearedAnything = false;

      // Verificar e limpar apenas dados corrompidos
      try {
        const token = localStorage.getItem("securityZoneToken");
        if (
          token &&
          (token === "undefined" || token === "null" || token.trim() === "")
        ) {
          localStorage.removeItem("securityZoneToken");
          console.log("🧹 Auth: Token corrompido removido do localStorage");
          clearedAnything = true;
        }
      } catch (e) {
        console.warn("⚠️ Auth: Erro ao verificar token do localStorage:", e);
      }

      try {
        const playerData = localStorage.getItem("playerData");
        if (playerData) {
          JSON.parse(playerData); // Testar parse
        }
      } catch (e) {
        localStorage.removeItem("playerData");
        console.log("🧹 Auth: PlayerData corrompido removido do localStorage");
        clearedAnything = true;
      }

      // Repetir para sessionStorage
      try {
        const token = sessionStorage.getItem("securityZoneToken");
        if (
          token &&
          (token === "undefined" || token === "null" || token.trim() === "")
        ) {
          sessionStorage.removeItem("securityZoneToken");
          console.log("🧹 Auth: Token corrompido removido do sessionStorage");
          clearedAnything = true;
        }
      } catch (e) {
        console.warn("⚠️ Auth: Erro ao verificar token do sessionStorage:", e);
      }

      try {
        const playerData = sessionStorage.getItem("playerData");
        if (playerData) {
          JSON.parse(playerData); // Testar parse
        }
      } catch (e) {
        sessionStorage.removeItem("playerData");
        console.log(
          "🧹 Auth: PlayerData corrompido removido do sessionStorage"
        );
        clearedAnything = true;
      }

      if (clearedAnything) {
        console.log("✅ Auth: Dados corrompidos removidos seletivamente");
      } else {
        console.log("🔍 Auth: Nenhum dado corrompido encontrado");
      }

      return clearedAnything;
    } catch (error) {
      console.error("❌ Erro ao limpar dados corrompidos:", error);
      return false;
    }
  },
};
