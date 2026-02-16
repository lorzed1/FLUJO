import { db } from './src/services/firebase.ts';
import { collection, getDocs } from 'firebase/firestore';

async function inspect() {
    console.log('--- INSPECTING RULES ---');
    const rulesSnap = await getDocs(collection(db, 'budget_recurring_rules'));
    const rules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Check for duplicate rules by Title
    const titleMap = new Map<string, any[]>();
    rules.forEach((r: any) => {
        const existing = titleMap.get(r.title) || [];
        existing.push(r);
        titleMap.set(r.title, existing);
    });

    titleMap.forEach((list, title) => {
        if (list.length > 1) {
            console.log(`DUPLICATE RULE FOUND: "${title}" (${list.length} copies)`);
            list.forEach(r => console.log(` - ID: ${r.id}, Freq: ${r.frequency}, Dest: ${r.dayToSend}`));
        }
    });

    console.log('\n--- INSPECTING COMMITMENTS (Feb 2026) ---');
    // Simple query for all commitments, we'll filter in memory for speed in script
    const commSnap = await getDocs(collection(db, 'budget_commitments'));
    const comms = commSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const febComms = comms.filter(c => c.dueDate && c.dueDate.startsWith('2026-02'));

    // Group by Title + Date
    const commMap = new Map<string, any[]>();
    febComms.forEach(c => {
        const key = `${c.title}|${c.dueDate}`;
        const existing = commMap.get(key) || [];
        existing.push(c);
        commMap.set(key, existing);
    });

    commMap.forEach((list, key) => {
        if (list.length > 1) {
            console.log(`DUPLICATE REAL COMMITMENT: ${key}`);
            list.forEach(c => console.log(` - ID: ${c.id}, Status: ${c.status}`));
        } else {
            const c = list[0];
            // Just list "Acuerdo" or "Seguridad" or "Nomina"
            if (c.title.includes('ACUERDO') || c.title.includes('SEGURIDAD') || c.title.includes('NOMINA')) {
                console.log(`Found: ${c.title} on ${c.dueDate} (ID: ${c.id})`);
            }
        }
    });
}

inspect().catch(console.error);
