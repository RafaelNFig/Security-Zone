/* eslint-env node */
import admin from "firebase-admin";

/**
 * -----------------------------------------------------------
 * 🔥 Firebase Admin - Estável e Blindado
 * -----------------------------------------------------------
 * - Não derruba o servidor se faltar ENV
 * - Exporta sempre um singleton
 * - verifyIdToken só funciona se inicializado
 * - (Opcional) DEV_BYPASS para testes locais
 * -----------------------------------------------------------
 */

class FirebaseAdmin {
  constructor() {
    this.initialized = false;
    this.error = null;

    // opcional: permite bypass em DEV (DESLIGADO por padrão)
    this.devBypass = String(process.env.FIREBASE_DEV_BYPASS || "false").toLowerCase() === "true";

    this.initialize();
  }

  initialize() {
    try {
      // já inicializado (hot reload / múltiplos imports)
      if (admin.apps.length > 0) {
        this.initialized = true;
        this.error = null;
        return;
      }

      const requiredEnvVars = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
      ];

      const missing = requiredEnvVars.filter((v) => !process.env[v]);
      if (missing.length > 0) {
        this.initialized = false;
        this.error = `Missing Firebase Admin env variables: ${missing.join(", ")}`;

        console.warn("⚠️ Firebase Admin NÃO inicializado (faltando ENV).");
        console.warn("Campos faltando:", missing);
        if (this.devBypass) {
          console.warn("🧪 FIREBASE_DEV_BYPASS=true (tokens podem ser aceitos no modo dev, dependendo do middleware).");
        }
        return;
      }

      // Corrigir quebras de linha da private key (Hostinger / .env comum)
      const privateKey = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, "\n");

      if (!privateKey.includes("BEGIN PRIVATE KEY")) {
        this.initialized = false;
        this.error = "Invalid FIREBASE_PRIVATE_KEY";
        console.warn("⚠️ FIREBASE_PRIVATE_KEY inválida. Firebase Admin não inicializado.");
        return;
      }

      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key: privateKey,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // databaseURL é opcional para Auth (mas não atrapalha)
        databaseURL:
          process.env.FIREBASE_DATABASE_URL ||
          `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
      });

      this.initialized = true;
      this.error = null;

      console.log("🔥 Firebase Admin inicializado com sucesso");
      console.log(`📁 Projeto: ${process.env.FIREBASE_PROJECT_ID}`);

      // teste leve (não derruba)
      void this.testConnection();
    } catch (err) {
      this.initialized = false;
      this.error = err?.message || String(err);

      console.error("❌ Erro ao inicializar Firebase Admin:", err);
      console.warn("⚠️ O servidor vai continuar rodando sem Firebase Admin.");
      if (this.devBypass) {
        console.warn("🧪 FIREBASE_DEV_BYPASS=true está ativo (mas verifyIdToken ainda depende do middleware).");
      }
    }
  }

  async testConnection() {
    if (!this.initialized) return;

    try {
      await admin.auth().listUsers(1);
      console.log("✅ Conexão Firebase OK");
    } catch (error) {
      console.warn("⚠️ Firebase Admin inicializado, porém falhou no teste de conexão.");
      console.warn(error?.errorInfo?.code || error?.message || String(error));
    }
  }

  /**
   * -----------------------------------------------------------
   * 🧪 Verificação de Token
   * -----------------------------------------------------------
   * Em PROD: sempre verifica com Firebase.
   * Em DEV: pode permitir bypass se FIREBASE_DEV_BYPASS=true
   * (mas o ideal é o middleware decidir isso — aqui só oferecemos a opção)
   */
  async verifyIdToken(idToken) {
    // Bypass opcional de DEV: útil para testar gateway sem front/fb
    if (!this.initialized) {
      if (this.devBypass && process.env.NODE_ENV === "development") {
        // formato compatível com decoded token do firebase
        return {
          uid: "dev-user",
          email: "dev@local.test",
          name: "Dev User",
          firebase: { sign_in_provider: "dev-bypass" },
        };
      }
      throw new Error("FIREBASE_ADMIN_NOT_INITIALIZED");
    }

    try {
      // true => checkRevoked
      const decoded = await admin.auth().verifyIdToken(idToken, true);
      return decoded;
    } catch (error) {
      throw new Error(error?.errorInfo?.code || "INVALID_FIREBASE_TOKEN");
    }
  }

  getAdmin() {
    return this.initialized ? admin : null;
  }

  getAuth() {
    return this.initialized ? admin.auth() : null;
  }

  isReady() {
    return this.initialized;
  }
}

// Singleton
const firebaseAdmin = new FirebaseAdmin();

export default firebaseAdmin;
// Export direto do admin (útil em alguns lugares) — mas cuidado: pode ser null
export const adminInstance = firebaseAdmin.getAdmin();
