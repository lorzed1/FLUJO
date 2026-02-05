
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function inspectDB() {
    console.log("--- RULES ---");
    const rulesSnap = await getDocs(collection(db, 'budget_recurring_rules'));
    rulesSnap.docs.forEach(d => {
        const r = d.data();
        console.log(`[${d.id}] ${r.title} | ${r.frequency} | $${r.amount} | Day: ${r.dayToSend}`);
    });

    console.log("\n--- COMMITMENTS (Feb 2026) ---");
    // Simple fetch all and filter client side for quickness
    const commSnap = await getDocs(collection(db, 'budget_commitments'));
    const comms = commSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.dueDate && c.dueDate.startsWith('2026-02'));

    comms.sort((a: any, b: any) => a.dueDate.localeCompare(b.dueDate));

    comms.forEach((c: any) => {
        console.log(`[${c.id}] ${c.dueDate} | ${c.title} | ${c.recurrenceRuleId || 'NO_RULE'} | $${c.amount}`);
    });

    process.exit(0);
}

inspectDB().catch(console.error);
