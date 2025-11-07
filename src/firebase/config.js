// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYt7xNt-cvQEhkmPxXLDHjtootcp3lF5s",
  authDomain: "securityzone-7fd73.firebaseapp.com",
  projectId: "securityzone-7fd73",
  storageBucket: "securityzone-7fd73.firebasestorage.app",
  messagingSenderId: "7508126513",
  appId: "1:7508126513:web:757cbca74343922d311e10",
  measurementId: "G-X3D69L5K8Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Export para usar em outros arquivos
export { app, analytics };
export default firebaseConfig;