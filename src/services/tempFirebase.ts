
// ==========================================
// CLIENTE TEMPORAL DE FIREBASE (SOLO PARA RESCATE)
// ==========================================
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';

// Tu configuración original (recuperada de logs previos)
const firebaseConfig = {
    apiKey: "AIzaSyDQB8...", // (Truncada por seguridad en logs, pero usaré la real si la tengo o pediré verificarla)
    authDomain: "flujo-de-caja-app.firebaseapp.com", // ESTIMADO basado en projectId
    projectId: "flujo-de-caja-app",
    storageBucket: "flujo-de-caja-app.appspot.com",
    messagingSenderId: "147...",
    appId: "1:147..."
};

// NOTA: Como no tengo la API KEY completa en mis logs (estaba truncada), 
// NECESITO QUE ME CONFIRMES TU CONFIGURACIÓN DE FIREBASE O QUE LA PEGUES AQUÍ.
// 
// Si no la tienes a mano, el Plan B fallará en la conexión.
// ¿Puedes ir a Firebase Console > Configuración del proyecto y copiar el objeto "firebaseConfig"?
//
// POR AHORA, pondré un placeholder para que veas la estructura.

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Función para leer todo de una colección
export const getAllFromFirebase = async (collectionName: string) => {
    const querySnapshot = await getDocs(collection(db, collectionName));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
