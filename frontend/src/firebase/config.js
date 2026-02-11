// src/firebase/config.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// ⚠️ Analytics só em ambiente browser
let analytics = null;

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAYt7xNt-cvQEhkmPxXLDHjtootcp3lF5s",
  authDomain: "securityzone-7fd73.firebaseapp.com",
  projectId: "securityzone-7fd73",
  storageBucket: "securityzone-7fd73.firebasestorage.app",
  messagingSenderId: "7508126513",
  appId: "1:7508126513:web:757cbca74343922d311e10",
  measurementId: "G-X3D69L5K8Q",
};

// Inicializa app
export const app = initializeApp(firebaseConfig);

// Auth (fonte única)
export const auth = getAuth(app);

// Analytics só se existir window
if (typeof window !== "undefined") {
  import("firebase/analytics")
    .then(({ getAnalytics }) => {
      analytics = getAnalytics(app);
    })
    .catch(() => {});
}

export { analytics };
export default firebaseConfig;
