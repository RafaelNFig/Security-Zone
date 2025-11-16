// src/utils/auth.js
export const authUtils = {
  setAuthData(token, playerData) {
    localStorage.setItem("securityZoneToken", token);
    localStorage.setItem("playerData", JSON.stringify(playerData));
    // Também salva no formato do Firebase para compatibilidade
    localStorage.setItem("firebaseToken", token);
    localStorage.setItem("user", JSON.stringify(playerData));
  },

  getToken() {
    // Prioriza o token do SecurityZone, mas fallback para Firebase
    return localStorage.getItem("securityZoneToken") || localStorage.getItem("firebaseToken");
  },

  getPlayerData() {
    // Prioriza os dados do SecurityZone, mas fallback para Firebase
    const securityZoneData = localStorage.getItem("playerData");
    const firebaseData = localStorage.getItem("user");
    
    if (securityZoneData) {
      return JSON.parse(securityZoneData);
    }
    if (firebaseData) {
      return JSON.parse(firebaseData);
    }
    return null;
  },

  clearAuthData() {
    // Limpa ambos os sistemas
    localStorage.removeItem("securityZoneToken");
    localStorage.removeItem("playerData");
    localStorage.removeItem("firebaseToken");
    localStorage.removeItem("user");
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // 🔥 NOVA FUNÇÃO: Atualizar dados do jogador
  updatePlayerData(updatedData) {
    try {
      // Atualiza os dados do SecurityZone
      const existingSecurityZoneData = JSON.parse(localStorage.getItem("playerData") || '{}');
      const mergedSecurityZoneData = { ...existingSecurityZoneData, ...updatedData };
      localStorage.setItem("playerData", JSON.stringify(mergedSecurityZoneData));

      // Atualiza também os dados do Firebase para compatibilidade
      const existingFirebaseData = JSON.parse(localStorage.getItem("user") || '{}');
      const mergedFirebaseData = { 
        ...existingFirebaseData, 
        ...updatedData,
        // Garante compatibilidade de campos
        displayName: updatedData.PL_NAME || existingFirebaseData.displayName,
        email: updatedData.PL_EMAIL || existingFirebaseData.email,
        photoURL: updatedData.PL_AVATAR || existingFirebaseData.photoURL
      };
      localStorage.setItem("user", JSON.stringify(mergedFirebaseData));

      console.log("Dados do jogador atualizados no localStorage:", mergedSecurityZoneData);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar dados do jogador:", error);
      return false;
    }
  }
};