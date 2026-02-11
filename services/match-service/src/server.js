// match-service/src/server.js
// Match Service (stateful/orchestrator) — ESM puro

import "dotenv/config";
import express from "express";
import cors from "cors";

import matchRoutes from "./routes/matchRoutes.js";

const app = express();

const PORT = Number(process.env.PORT || 3001);
const SERVICE_NAME = process.env.SERVICE_NAME || "match-service";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

app.use(cors());
app.use(express.json({ limit: "2mb" }));

/**
 * JSON inválido
 */
app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: "INVALID_JSON",
      message: "JSON inválido no body da requisição.",
    });
  }
  return next(err);
});

// Rotas do match-service
app.use("/", matchRoutes);

// 404
app.use((req, res) => {
  return res.status(404).json({ error: "NOT_FOUND" });
});

// Erro final
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  return res.status(500).json({
    error: "MATCH_INTERNAL_ERROR",
    message: "Falha interna no match-service.",
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🎮 ${SERVICE_NAME} v${SERVICE_VERSION} rodando`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`✅ Health:  GET  /health`);
});
