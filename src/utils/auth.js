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
};