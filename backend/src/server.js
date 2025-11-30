/* eslint-env node */

/* ============================================================
   🔥 1. DOTENV — DEVE VIR ANTES DE QUALQUER OUTRO IMPORT
============================================================ */
import dotenv from "dotenv";
dotenv.config();

/* ============================================================
   🔧 2. IMPORTS GERAIS
============================================================ */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

/* ============================================================
   🔥 3. IMPORTS DO FIREBASE E ROTAS
============================================================ */
import firebaseAdmin from "./config/firebaseAdmin.js";
import playerRoutes from "./routes/playerRoutes.js";
import authRoutes from "./routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

/* ============================================================
   🛡 4. SEGURANÇA E MIDDLEWARES
============================================================ */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);

// Rate Limit
app.use(
  rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
      success: false,
      error: "Muitas requisições. Tente novamente mais tarde.",
      code: "RATE_LIMIT_EXCEEDED"
    }
  })
);

// Logs
app.use(morgan(isDevelopment ? "dev" : "combined"));

// Parsing JSON
app.use(
  express.json({
    limit: "10mb",
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch {
        res.status(400).json({
          success: false,
          error: "JSON malformado",
          code: "INVALID_JSON"
        });
        throw new Error("Invalid JSON");
      }
    }
  })
);

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Log simples de requisição
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

/* ============================================================
   ❤️ 5. HEALTH CHECKS
============================================================ */
app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "🚀 SecurityZone API está rodando!",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  })
);

app.get("/health", (req, res) =>
  res.json({
    success: true,
    status: "OK",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    services: {
      database: "Prisma / PostgreSQL",
      auth: "JWT + Firebase"
    }
  })
);

/* ============================================================
   🔥 6. ROTA DE TESTE DO FIREBASE (CORRIGIDA)
============================================================ */
app.get("/api/auth/test-firebase", async (req, res) => {
  try {
    console.log("🧪 Testando Firebase Admin...");

    if (!firebaseAdmin.isReady()) {
      return res.status(500).json({
        success: false,
        error: "Firebase Admin NÃO está inicializado.",
        projectId: process.env.FIREBASE_PROJECT_ID || null,
        envLoaded: !!process.env.FIREBASE_PROJECT_ID
      });
    }

    await firebaseAdmin.getAuth().listUsers(1);

    res.json({
      success: true,
      message: "Firebase Admin funcionando corretamente",
      projectId: process.env.FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Erro no Firebase Admin:", error);
    res.status(500).json({
      success: false,
      error: "Falha ao testar Firebase Admin",
      details: isDevelopment ? error.message : undefined
    });
  }
});

/* ============================================================
   📦 7. ROTAS PRINCIPAIS
============================================================ */
app.use("/api/player", playerRoutes);
app.use("/api/auth", authRoutes);

/* ============================================================
   ❌ 8. 404 - ROTA NÃO ENCONTRADA
============================================================ */
app.use("*", (req, res) =>
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
    code: "ROUTE_NOT_FOUND"
  })
);

/* ============================================================
   💥 9. MIDDLEWARE GLOBAL DE ERROS
============================================================ */
app.use((error, req, res, next) => {
  console.error("💥 Erro global:", error);

  res.status(error.status || 500).json({
    success: false,
    error: isProduction ? "Erro interno do servidor" : error.message,
    code: error.code || "INTERNAL_SERVER_ERROR",
    stack: isDevelopment ? error.stack : undefined
  });
});

/* ============================================================
   🛑 10. GRACEFUL SHUTDOWN
============================================================ */
const shutdown = (signal) => {
  console.log(`\n⚠️ Recebido ${signal}. Encerrando API...`);
  setTimeout(() => {
    console.log("✅ Encerrado com sucesso");
    process.exit(0);
  }, 800);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* ============================================================
   🚀 11. INICIAR SERVIDOR
============================================================ */
const server = app.listen(PORT, () => {
  console.log(`\n🚀 SecurityZone Server rodando em http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log("===========================================");
});

export default server;
