// backend/src/firebase/admin.js
/* eslint-env node */
import admin from 'firebase-admin';

// Verificar se as variáveis de ambiente estão presentes
const requiredEnvVars = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL', 
  'FIREBASE_PRIVATE_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn('⚠️ Variáveis de ambiente do Firebase faltando:', missingVars);
  console.warn('⚠️ A autenticação com Firebase não funcionará corretamente.');
}

// Inicializar o Firebase Admin apenas se todas as variáveis estiverem presentes
if (!admin.apps.length && missingVars.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✅ Firebase Admin inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
    throw error;
  }
} else if (admin.apps.length) {
  console.log('✅ Firebase Admin já está inicializado');
} else {
  console.log('❌ Firebase Admin não inicializado - variáveis de ambiente faltando');
}

export default admin;