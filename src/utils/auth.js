// src/utils/auth.js
export const authUtils = {
    setAuthData(token, playerData) {
      localStorage.setItem("securityZoneToken", token);
      localStorage.setItem("playerData", JSON.stringify(playerData));
    },
  
    getToken() {
      return localStorage.getItem("securityZoneToken");
    },
  
    getPlayerData() {
      const data = localStorage.getItem("playerData");
      return data ? JSON.parse(data) : null;
    },
  
    clearAuthData() {
      localStorage.removeItem("securityZoneToken");
      localStorage.removeItem("playerData");
    },
  
    isAuthenticated() {
      return !!this.getToken();
    },
  };