
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, limit, query, orderBy } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: "AIzaSyBboDarj5rUkjs4rjaIZUvANOwpzMAEtmo",
    authDomain: "flujo-caja-d0fcf.firebaseapp.com",
    projectId: "flujo-caja-d0fcf",
    storageBucket: "flujo-caja-d0fcf.firebasestorage.app",
    messagingSenderId: "1034214638289",
    appId: "1:1034214638289:web:8e4d506ff08a4d9afafbf0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkData() {
    console.log("--- TRANSFERENCIAS (Las últimas 5) ---");
    const tRef = collection(db, 'transferencias');
    const tSnap = await getDocs(query(tRef, limit(5)));
    tSnap.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
    });

    console.log("\n--- ARQUEOS (Ultimo) ---");
    const aRef = collection(db, 'arqueos');
    const aSnap = await getDocs(query(aRef, limit(1)));
    aSnap.forEach(doc => {
        console.log(`ID: ${doc.id}`);
        // console.log(JSON.stringify(doc.data(), null, 2));
    });
}

checkData().catch(console.error);
