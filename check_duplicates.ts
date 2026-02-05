
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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

async function cleanDuplicates() {
    console.log("Fetching rules...");
    const snapshot = await getDocs(collection(db, 'budget_recurring_rules'));
    const rules = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    console.log(`Total rules found: ${rules.length}`);

    const groups: { [key: string]: any[] } = {};

    rules.forEach((r: any) => {
        // Create a unique key for the rule logic
        // Title + Frequency + Amount + Day
        const key = `${r.title}-${r.frequency}-${r.amount}-${r.dayToSend}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
    });

    let deleteCount = 0;

    for (const key in groups) {
        if (groups[key].length > 1) {
            console.log(`Found duplicate group: ${key}. Count: ${groups[key].length}`);

            // Sort by creation time if available, otherwise just pick one to keep
            // Keeping the first one
            const [keep, ...remove] = groups[key];

            console.log(`Keeping ID: ${keep.id}`);

            for (const r of remove) {
                console.log(`Deleting Duplicate ID: ${r.id}`);
                await deleteDoc(doc(db, 'budget_recurring_rules', r.id));
                deleteCount++;
            }
        }
    }

    console.log(`Finished. Deleted ${deleteCount} duplicate rules.`);
    process.exit(0);
}

cleanDuplicates().catch(console.error);
