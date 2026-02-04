
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Leer firebase config del archivo si existe o usar env
// Pero como estou en el sistema, buscaré el archivo firebase.ts
const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
    console.log("--- TRANSFERENCIAS ---");
    const tRef = collection(db, 'transferencias');
    const tSnap = await getDocs(query(tRef, limit(5)));
    tSnap.forEach(doc => {
        console.log(`ID: ${doc.id}`, doc.data());
    });

    console.log("\n--- ARQUEOS ---");
    const aRef = collection(db, 'arqueos');
    const aSnap = await getDocs(query(aRef, limit(2)));
    aSnap.forEach(doc => {
        console.log(`ID: ${doc.id}`, doc.data());
    });
}

checkData().catch(console.error);
