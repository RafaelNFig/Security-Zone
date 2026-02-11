// match-service/src/services/gatewayClient.js
import axios from "axios";

const GATEWAY_URL = process.env.GATEWAY_URL || "http://localhost:3000";

export async function fetchActiveDeck(playerId, reqHeaders = {}) {
  const url = `${GATEWAY_URL}/internal/players/${playerId}/active-deck`;

  const { data } = await axios.get(url, {
    timeout: 5000,
    headers: {
      "x-request-id": reqHeaders["x-request-id"] || "match-service",
    },
  });

  return data; // { success, cards, count, ... }
}
