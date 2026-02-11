// rules-service/src/server.js
// Rules Service (stateless) — Motor do jogo
// NÃO acessa banco
// Recebe { state, action } e retorna:
//   sucesso:  { success:true, newState, events }
//   rejeição: { success:false, rejected:{code,message,...}, events }

import express from "express";
import cors from "cors";
import rulesRoutes from "./routes/rulesRoutes.js";

const app = express();

const PORT = Number(process.env.PORT || 3002);
const SERVICE_NAME = process.env.SERVICE_NAME || "rules-service";
const SERVICE_VERSION = process.env.SERVICE_VERSION || "1.0.0";

function nowIso() {
  return new Date().toISOString();
}

// CORS (simples e suficiente pra dev/demo)
app.use(cors());

// JSON parser + tratamento de JSON inválido
app.use(
  express.json({
    limit: "2mb",
    verify: (req, res, buf) => {
      // marca body bruto (debug opcional)
      req.rawBody = buf?.toString?.("utf8");
    },
  })
);

/**
 * JSON inválido (body malformado)
 */
app.use((err, req, res, next) => {
  // Express lança SyntaxError com type "entity.parse.failed" em alguns casos
  if (err && (err.type === "entity.parse.failed" || err instanceof SyntaxError)) {
    return res.status(400).json({
      success: false,
      newState: null,
      events: [],
      rejected: {
        code: "INVALID_JSON",
        message: "JSON inválido no body da requisição.",
      },
    });
  }
  return next(err);
});

// Rotas (health + resolve)
app.use("/", rulesRoutes);

// 404
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    newState: null,
    events: [],
    rejected: { code: "NOT_FOUND", message: "Rota não encontrada." },
  });
});

// Erro final
app.use((err, req, res, next) => {
  console.error(`[${SERVICE_NAME}] Unhandled error:`, err);
  return res.status(500).json({
    success: false,
    newState: null,
    events: [],
    rejected: {
      code: "RULES_INTERNAL_ERROR",
      message: "Falha interna no rules-service.",
      details: { message: err?.message },
    },
  });
});

// Start
app.listen(PORT, () => {
  console.log(`🧠 ${SERVICE_NAME} v${SERVICE_VERSION} rodando`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🕒 ${nowIso()}`);
  console.log(`✅ Health:  GET  /health`);
  console.log(`🎮 Resolve: POST /resolve`);
});
