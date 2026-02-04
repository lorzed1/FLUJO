import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBboDarj5rUkjs4rjaIZUvANOwpzMAEtmo",
    authDomain: "flujo-caja-d0fcf.firebaseapp.com",
    projectId: "flujo-caja-d0fcf",
    storageBucket: "flujo-caja-d0fcf.firebasestorage.app",
    messagingSenderId: "1034214638289",
    appId: "1:1034214638289:web:8e4d506ff08a4d9afafbf0"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios (sin persistencia por ahora para evitar errores)
export const db = getFirestore(app);
export const auth = getAuth(app);

console.log('🔥 Firebase inicializado correctamente');

export default app;
