/* eslint-env node */
import dotenv from "dotenv";
dotenv.config();

import admin from 'firebase-admin';

/**
 * -----------------------------------------------------------
 * 🔥 Firebase Admin - Versão Estável e Blindada
 * -----------------------------------------------------------
 * - Nunca quebra o servidor (nem rotas, nem controllers)
 * - Se faltar ENV → modo seguro, sem travar
 * - Exporta sempre uma instância válida
 * - Mantém logging legível
 * - Token verification funcionando apenas quando inicializado
 * -----------------------------------------------------------
 */

class FirebaseAdmin {
  constructor() {
    this.initialized = false;
    this.error = null;
    this.initialize();
  }

  /**
   * -----------------------------------------------------------
   * 🏁 Inicialização do Firebase Admin
   * -----------------------------------------------------------
   */
  initialize() {
    try {
      // Já inicializado anteriormente
      if (admin.apps.length > 0) {
        this.initialized = true;
        return;
      }

      const requiredEnvVars = [
        'FIREBASE_PROJECT_ID',
        'FIREBASE_CLIENT_EMAIL',
        'FIREBASE_PRIVATE_KEY'
      ];

      const missing = requiredEnvVars.filter(v => !process.env[v]);
      if (missing.length > 0) {
        this.initialized = false;
        this.error = `Missing Firebase Admin env variables: ${missing.join(', ')}`;

        console.warn('⚠️ Firebase Admin NÃO inicializado (faltando ENV).');
        console.warn('Campos faltando:', missing);
        return;
      }

      // Corrigir quebras de linha da private key
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      if (!privateKey.includes('BEGIN PRIVATE KEY')) {
        this.initialized = false;
        this.error = 'Invalid FIREBASE_PRIVATE_KEY';
        console.warn('⚠️ FIREBASE_PRIVATE_KEY inválida. Firebase Admin não inicializado.');
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
        databaseURL:
          process.env.FIREBASE_DATABASE_URL ||
          `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
      });

      this.initialized = true;
      this.error = null;

      console.log('🔥 Firebase Admin inicializado com sucesso');
      console.log(`📁 Projeto: ${process.env.FIREBASE_PROJECT_ID}`);

      this.testConnection();

    } catch (err) {
      this.initialized = false;
      this.error = err.message;

      console.error('❌ Erro ao inicializar Firebase Admin:', err);
      console.warn('⚠️ O servidor vai continuar rodando sem Firebase Admin.');
    }
  }

  /**
   * -----------------------------------------------------------
   * 🔌 Teste leve de conexão
   * -----------------------------------------------------------
   */
  async testConnection() {
    if (!this.initialized) return;

    try {
      await admin.auth().listUsers(1);
      console.log('✅ Conexão Firebase OK');
    } catch (error) {
      console.warn('⚠️ Firebase Admin inicializado, porém falhou no teste de conexão.');
      console.warn(error.errorInfo?.code || error.message);
    }
  }

  /**
   * -----------------------------------------------------------
   * 🧪 Verificação de Token Firebase
   * -----------------------------------------------------------
   */
  async verifyIdToken(idToken) {
    if (!this.initialized) {
      throw new Error('FIREBASE_ADMIN_NOT_INITIALIZED');
    }

    try {
      const decoded = await admin.auth().verifyIdToken(idToken, true);
      return decoded;
    } catch (error) {
      throw new Error(error.errorInfo?.code || 'INVALID_FIREBASE_TOKEN');
    }
  }

  /**
   * -----------------------------------------------------------
   * 📦 Métodos extras de compatibilidade
   * -----------------------------------------------------------
   */
  getAdmin() {
    if (!this.initialized) return null;
    return admin;
  }

  getAuth() {
    if (!this.initialized) return null;
    return admin.auth();
  }

  isReady() {
    return this.initialized;
  }
}

// Singleton
const firebaseAdmin = new FirebaseAdmin();

export default firebaseAdmin;
export const adminInstance = firebaseAdmin.getAdmin();
