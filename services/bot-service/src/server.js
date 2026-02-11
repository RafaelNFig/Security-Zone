// bot-service/src/server.js
// Bot Service (stateless)
// - Recebe { state, difficulty } e retorna uma ação (compatível com match/rules)
//
// Rotas:
// - GET  /health
// - POST /move

import "dotenv/config";
import express from "express";
import cors from "cors";
import botRoutes from "./routes/botRoutes.js";

const app = express();

const PORT = Number(process.env.PORT || 3003);
const SERVICE_NAME = process.env.SERVICE_NAME || "bot-service";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

function nowIso() {
  return new Date().toISOString();
}

// Middlewares base
app.use(cors());

// JSON parser + captura de JSON inválido
app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      // guarda rawBody para debug (opcional)
      req.rawBody = buf?.toString?.("utf8") ?? "";
    },
  })
);

app.use((err, req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({
      success: false,
      error: "INVALID_JSON",
      message: "JSON inválido no body da requisição.",
      time: nowIso(),
    });
  }
  return next(err);
});

// Rotas
app.use("/", botRoutes);

// 404
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    error: "NOT_FOUND",
    message: "Rota não encontrada.",
    path: req.originalUrl,
    time: nowIso(),
  });
});

// Erro final
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  return res.status(500).json({
    success: false,
    error: "BOT_INTERNAL_ERROR",
    message: "Falha interna no bot-service.",
    details: { message: err?.message },
    time: nowIso(),
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🤖 ${SERVICE_NAME} v${SERVICE_VERSION} rodando`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🕒 ${nowIso()}`);
  console.log(`✅ Health: GET  /health`);
  console.log(`🎯 Move:  POST /move`);
});
