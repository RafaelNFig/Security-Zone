// src/services/api.js
const API_BASE_URL = "http://localhost:3000/api";

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro na requisição");
    }

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error.message || "Erro de conexão" 
    };
  }
}

export const playerService = {
  async register(playerData) {
    return await apiRequest("/player/register", {
      method: "POST",
      body: JSON.stringify(playerData),
    });
  },

  async login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/player/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Erro no login",
      };
    }

    return {
      success: true,
      token: data.token,   // <-- direto
      player: data.player, // <-- direto
    };
  } catch (err) {
    console.log("Erro:", err)
    return {
      success: false,
      error: "Erro de comunicação com servidor",
    };
  }
}

};