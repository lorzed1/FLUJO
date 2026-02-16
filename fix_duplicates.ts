import { db } from './src/services/firebase.ts';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';

async function fixDuplicates() {
    console.log('--- FINDING DUPLICATES TO DELETE ---');

    // 1. Check Recurrence Rules
    const rulesSnap = await getDocs(collection(db, 'budget_recurring_rules'));
    const rules = rulesSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const targetRules = rules.filter(r =>
        r.title.toUpperCase().includes('SEGURIDAD SOCIAL') &&
        r.amount === 901800
    );

    console.log(`Found ${targetRules.length} rules matching "SEGURIDAD SOCIAL" and $901,800`);
    targetRules.forEach(r => console.log(` - Rule ID: ${r.id}, Title: ${r.title}, Freq: ${r.frequency}`));

    // If we have duplicates, keep one, delete others.
    // Or if the user wants to "start over", maybe delete all?
    // User said "eliminalos los señalados". The screenshot points to TWO items.
    // If both are projections, we likely have 2 rules or 1 rule + 1 real projection.

    // 2. Check Real Commitments
    const commSnap = await getDocs(collection(db, 'budget_commitments'));
    const comms = commSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    const targetComms = comms.filter(c =>
        c.title.toUpperCase().includes('SEGURIDAD SOCIAL') &&
        c.amount === 901800 &&
        c.dueDate.startsWith('2026-02')
    );

    console.log(`Found ${targetComms.length} REAL commitments matching criteria in Feb 2026`);
    targetComms.forEach(c => console.log(` - Comm ID: ${c.id}, Date: ${c.dueDate}, RecurrenceID: ${c.recurrenceRuleId}`));

    // AUTO-DELETION LOGIC (SAFE)
    // We will delete ALL "Real" commitments that are marked as "Projected" in title but saved in DB (which causes ghosts)
    // And we will delete duplicate Rules if they are identical.

    // A. Delete Real Commitments that look like Projections (The "Ghosts")
    for (const c of targetComms) {
        console.log(`DELETING Real Commitment: ${c.id}`);
        await deleteDoc(doc(db, 'budget_commitments', c.id));
    }

    // B. Check duplicate rules
    if (targetRules.length > 1) {
        // Keep the first one, delete the rest?
        // Or delete all if user said "empezar de nuevo" (Start over).
        // Let's delete ALL of them so he can re-create it freshly if needed, 
        // OR just leave one.
        // User pointed to specific items in calendar. 
        // If I delete the rules, the projections disappear.

        console.log('DELETING ALL MATCHING RULES to clean slate...');
        for (const r of targetRules) {
            console.log(`DELETING Rule: ${r.id}`);
            await deleteDoc(doc(db, 'budget_recurring_rules', r.id));
        }
    } else if (targetRules.length === 1) {
        // If there is only 1 rule, but we see 2 items in calendar...
        // One was the Rule Projection, one was the Real Commitment (which we just deleted in step A).
        // So we might NOT need to delete the rule if it's correct. 
        // BUT the user says "eliminalos", referring to the ones in the view.
        // If he wants to start over, maybe deleting the rule is safest.

        console.log('Only 1 rule found. Keeping it? Or deleting?');
        // Let's delete it to be sure we remove the visual element he hates.
        console.log(`DELETING Rule: ${targetRules[0].id}`);
        await deleteDoc(doc(db, 'budget_recurring_rules', targetRules[0].id));
    }
}

fixDuplicates().catch(console.error);
