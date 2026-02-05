import { db } from './firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDocs,
    getDoc,
    query,
    where,
    Timestamp,
    orderBy,
    writeBatch
} from 'firebase/firestore';
import { BudgetCommitment, RecurrenceRule, BudgetStatus, RecurrenceFrequency } from '../types/budget';
import { addMonths, addWeeks, format, isAfter, isBefore, parseISO, getDay, isSameDay } from 'date-fns';

const COMMITMENTS_COLLECTION = 'budget_commitments';
const RULES_COLLECTION = 'budget_recurring_rules';

export const budgetService = {
    // --- Commitments ---

    async getCommitments(startDate?: string, endDate?: string): Promise<BudgetCommitment[]> {
        try {
            // 1. Fetch REAL commitments
            let q = query(collection(db, COMMITMENTS_COLLECTION), orderBy('dueDate', 'asc'));

            if (startDate && endDate) {
                // We fetch a slightly larger range of real commitments to catch any moved ones? No, strict for now.
                q = query(
                    collection(db, COMMITMENTS_COLLECTION),
                    where('dueDate', '>=', startDate),
                    where('dueDate', '<=', endDate),
                    orderBy('dueDate', 'asc')
                );
            }

            const snapshot = await getDocs(q);
            const realCommitments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetCommitment));

            // 2. Project VIRTUAL commitments (Only if range is provided to avoid heavy all-time load)
            if (startDate && endDate) {
                const rulesSnapshot = await getDocs(collection(db, RULES_COLLECTION));
                const rules = rulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecurrenceRule));

                const start = parseISO(startDate);
                const end = parseISO(endDate);
                const virtualCommitments: BudgetCommitment[] = [];

                // Track which real commitments have been "used" to satisfy a recurrence slot
                const consumedRealIds = new Set<string>();

                for (const rule of rules) {
                    if (!rule.active) continue;

                    let nextDate = parseISO(rule.startDate);

                    // Advance to start range efficiently
                    while (isBefore(nextDate, start)) {
                        nextDate = this.getNextDate(nextDate, rule.frequency, rule.interval);
                    }

                    // Collect whilst inside the range
                    while (isBefore(nextDate, end) || isSameDay(nextDate, end)) {
                        // Respetar fecha final de la regla si existe
                        if (rule.endDate) {
                            const ruleEnd = parseISO(rule.endDate);
                            if (isAfter(nextDate, ruleEnd)) {
                                break;
                            }
                        }

                        const dateStr = format(nextDate, 'yyyy-MM-dd');

                        // SMART RECONCILIATION:
                        // Find a real commitment that satisfies this slot.
                        // We look for any real commitment for this rule that hasn't been used yet.
                        // We prioritize the CLOSEST one in date.

                        // 1. Filter candidates
                        const candidates = realCommitments.filter(rc =>
                            rc.recurrenceRuleId === rule.id && !consumedRealIds.has(rc.id)
                        );

                        // 2. Find best match (closest date)
                        let bestMatch: BudgetCommitment | null = null;
                        let minDiff = Infinity;

                        // Define threshold based on frequency (allow flexibility for early/late payments)
                        const thresholdDays = rule.frequency === 'weekly' ? 4 : 25; // 4 days for weekly, 25 for monthly

                        for (const candidate of candidates) {
                            const candidateDate = parseISO(candidate.dueDate);
                            const diff = Math.abs(candidateDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);

                            if (diff <= thresholdDays && diff < minDiff) {
                                minDiff = diff;
                                bestMatch = candidate;
                            }
                        }

                        if (bestMatch) {
                            // Found a real payment that covers this slot (even if date changed)
                            consumedRealIds.add(bestMatch.id);
                        } else {
                            // No matching real payment found, generate VIRTUAL
                            virtualCommitments.push({
                                id: `projected-${rule.id}-${dateStr}`,
                                title: `${rule.title} (Proyectado)`,
                                amount: rule.amount,
                                dueDate: dateStr,
                                status: 'pending',
                                category: rule.category,
                                recurrenceRuleId: rule.id,
                                description: rule.description || 'Proyección Recurrente',
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                                isProjected: true
                            });
                        }

                        nextDate = this.getNextDate(nextDate, rule.frequency, rule.interval);
                    }
                }

                // Merge and Sort
                const all = [...realCommitments, ...virtualCommitments];

                // FINAL DEDUPLICATION SAFEGUARD
                // Ensure no duplicate IDs exist (sanity check)
                const uniqueMap = new Map<string, BudgetCommitment>();
                all.forEach(item => uniqueMap.set(item.id, item));

                const uniqueAll = Array.from(uniqueMap.values());

                return uniqueAll.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            }

            return realCommitments;
        } catch (error) {
            console.error('Error fetching commitments:', error);
            throw error;
        }
    },

    async addCommitment(commitment: Omit<BudgetCommitment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, COMMITMENTS_COLLECTION), {
                ...commitment,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding commitment:', error);
            throw error;
        }
    },

    async updateCommitment(id: string, updates: Partial<BudgetCommitment>): Promise<void> {
        try {
            const docRef = doc(db, COMMITMENTS_COLLECTION, id);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error updating commitment:', error);
            throw error;
        }
    },

    async deleteCommitment(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, COMMITMENTS_COLLECTION, id));
        } catch (error) {
            console.error('Error deleting commitment:', error);
            throw error;
        }
    },

    // --- Recurrence Rules ---

    async getRecurrenceRules(): Promise<RecurrenceRule[]> {
        try {
            const snapshot = await getDocs(collection(db, RULES_COLLECTION));
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as RecurrenceRule));
        } catch (error) {
            console.error('Error fetching rules:', error);
            throw error;
        }
    },

    async addRecurrenceRule(rule: Omit<RecurrenceRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, RULES_COLLECTION), {
                ...rule,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            return docRef.id;
        } catch (error) {
            console.error('Error adding rule:', error);
            throw error;
        }
    },

    // Esta función debería ejecutarse periódicamente o al cargar la app para generar compromisos futuros
    async updateRecurrenceRule(id: string, updates: Partial<RecurrenceRule>): Promise<void> {
        try {
            const docRef = doc(db, RULES_COLLECTION, id);
            await updateDoc(docRef, {
                ...updates,
                updatedAt: Date.now()
            });
        } catch (error) {
            console.error('Error updating rule:', error);
            throw error;
        }
    },

    async deleteRecurrenceRule(id: string): Promise<void> {
        try {
            await deleteDoc(doc(db, RULES_COLLECTION, id));
        } catch (error) {
            console.error('Error deleting rule:', error);
            throw error;
        }
    },

    // --- Logic Helpers ---

    /**
     * Crea un compromiso y, si es recurrente, establece la regla y genera proyecciones futuras.
     * Utiliza batch writing para asegurar que todo se guarde o nada.
     */
    async createEntryWithRecurrence(data: {
        title: string;
        amount: number;
        date: string;
        category: string;
        status: BudgetStatus;
        isRecurring: boolean;
        frequency?: RecurrenceFrequency;
    }): Promise<void> {
        try {
            // Usamos un batch para asegurar consistencia
            const batch = writeBatch(db);

            // 1. Referencia para el primer compromiso
            const commitmentRef = doc(collection(db, COMMITMENTS_COLLECTION));

            // Objeto del compromiso base
            const newCommitment: any = { // Usamos Type Assertion para flexibilidad inicial
                title: data.title,
                amount: data.amount,
                dueDate: data.date,
                status: data.status,
                category: data.category,
                // recurrenceRuleId no se define aquí para evitar 'undefined'
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // 2. Si NO es recurrente, solo guardamos el compromiso
            if (!data.isRecurring || !data.frequency) {
                batch.set(commitmentRef, newCommitment);
                await batch.commit();
                return;
            }

            // 3. Crear referencia para la regla de recurrencia
            const ruleRef = doc(collection(db, RULES_COLLECTION));
            const startDate = parseISO(data.date);

            const newRule: Omit<RecurrenceRule, 'id'> = {
                title: data.title,
                amount: data.amount,
                frequency: data.frequency,
                dayToSend: data.frequency === 'weekly' ? startDate.getDay() : startDate.getDate(),
                startDate: data.date,
                category: data.category,
                active: true,
                lastGeneratedDate: data.date,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // Agregamos regla al batch
            batch.set(ruleRef, newRule);

            // Actualizamos la referencia en el primer compromiso
            newCommitment.recurrenceRuleId = ruleRef.id;
            batch.set(commitmentRef, newCommitment);

            // 4. Generar compromisos futuros INMEDIATOS (mismo batch si son pocos, o separado)
            // Para mantener el batch limpio y evitar límites (500 ops), generaremos los futuros en el mismo batch
            // asumiendo que 6 meses no superan el límite.
            const futureLimit = addMonths(new Date(), 6);
            const limitDate = futureLimit;
            let nextDate = this.getNextDate(startDate, data.frequency);
            let lastGeneratedDate = data.date;

            while (isBefore(nextDate, limitDate) || nextDate.getTime() === limitDate.getTime()) {
                const futureCommitmentRef = doc(collection(db, COMMITMENTS_COLLECTION));
                batch.set(futureCommitmentRef, {
                    title: data.title,
                    amount: data.amount,
                    dueDate: format(nextDate, 'yyyy-MM-dd'),
                    status: 'pending', // Siempre pending al nacer
                    category: data.category,
                    recurrenceRuleId: ruleRef.id,
                    description: 'Generado automáticamente por regla de recurrencia',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });

                lastGeneratedDate = format(nextDate, 'yyyy-MM-dd');
                nextDate = this.getNextDate(nextDate, data.frequency);
            }

            // Actualizamos la regla con la última fecha generada
            batch.update(ruleRef, { lastGeneratedDate });

            // Ejecutamos todo atómicamente
            await batch.commit();

        } catch (error) {
            console.error('Error creating entry with recurrence:', error);
            throw error;
        }
    },

    // Genera compromisos basados en reglas para mantenimiento posterior
    async generateFromRules(futureLimitDate: string, specificRuleId?: string): Promise<void> {
        try {
            let rules: RecurrenceRule[] = [];

            if (specificRuleId) {
                const docRef = doc(db, RULES_COLLECTION, specificRuleId);
                const snapshot = await getDoc(docRef);
                if (snapshot.exists()) {
                    rules = [{ id: snapshot.id, ...snapshot.data() } as RecurrenceRule];
                }
            } else {
                rules = await this.getRecurrenceRules();
            }

            const limitDate = parseISO(futureLimitDate);
            const batch = writeBatch(db);
            let operationsCount = 0;

            for (const rule of rules) {
                if (!rule.active) continue;

                let nextDate = rule.lastGeneratedDate
                    ? parseISO(rule.lastGeneratedDate)
                    : parseISO(rule.startDate); // Fallback

                // Avanzar al siguiente periodo
                nextDate = this.getNextDate(nextDate, rule.frequency);
                let newLastGenerated = rule.lastGeneratedDate;

                while (isBefore(nextDate, limitDate) || nextDate.getTime() === limitDate.getTime()) {
                    const newRef = doc(collection(db, COMMITMENTS_COLLECTION));
                    batch.set(newRef, {
                        title: rule.title,
                        amount: rule.amount,
                        dueDate: format(nextDate, 'yyyy-MM-dd'),
                        status: 'pending',
                        category: rule.category,
                        recurrenceRuleId: rule.id,
                        description: 'Generado automáticamente por regla de recurrencia',
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    });

                    newLastGenerated = format(nextDate, 'yyyy-MM-dd');
                    nextDate = this.getNextDate(nextDate, rule.frequency);
                    operationsCount++;
                }

                if (newLastGenerated !== rule.lastGeneratedDate) {
                    const ruleRef = doc(db, RULES_COLLECTION, rule.id);
                    batch.update(ruleRef, { lastGeneratedDate: newLastGenerated });
                    operationsCount++;
                }
            }

            if (operationsCount > 0) {
                await batch.commit();
                console.log(`Generados ${operationsCount} nuevos compromisos / actualizaciones.`);
            }

        } catch (error) {
            console.error('Error in generatedFromRules:', error);
            throw error;
        }
    },

    getNextDate(current: Date, freq: RecurrenceFrequency, interval: number = 1): Date {
        switch (freq) {
            case 'weekly': return addWeeks(current, interval);
            case 'monthly': return addMonths(current, interval);
            case 'yearly': return addMonths(current, 12 * interval);
            default: return addMonths(current, interval);
        }
    },

    /**
     * Carga la configuración inicial de gastos recurrentes basada en la tabla solicitada.
     * Solo se ejecuta si el usuario lo solicita explícitamente.
     */
    async seedRecurringExpenses(): Promise<void> {
        try {
            const batch = writeBatch(db);
            const now = Date.now();
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth();

            // Helper to create rule
            const createRule = (
                title: string,
                amount: number,
                category: string,
                freq: RecurrenceFrequency,
                day: number, // Day of month OR Day of week (0=Sun, 1=Mon...)
                interval: number = 1,
                desc: string = ''
            ) => {
                const ref = doc(collection(db, RULES_COLLECTION));

                // Calculate Start Date
                let startDate = new Date(currentYear, currentMonth, day);

                if (freq === 'weekly') {
                    // Start on next occurrence of 'day' (weekday)
                    // If day=1 (Monday)
                    // We need a helper to find next Monday
                    const today = new Date();
                    const currentDay = getDay(today);
                    const daysUntil = (day + 7 - currentDay) % 7;
                    startDate = new Date(today);
                    startDate.setDate(today.getDate() + daysUntil);
                    if (daysUntil === 0) startDate.setDate(startDate.getDate() + 7); // Next week if today
                } else if (freq === 'monthly') {
                    // Start from this month, even if day passed, so it shows up as pending/overdue
                    // startDate is already set to current month/day
                }

                const rule: any = { // Omit<RecurrenceRule, 'id'>
                    title,
                    amount,
                    frequency: freq,
                    interval,
                    dayToSend: day,
                    startDate: format(startDate, 'yyyy-MM-dd'),
                    category,
                    description: desc || title,
                    active: true,
                    // lastGeneratedDate: null, // Will be set when first generated
                    createdAt: now,
                    updatedAt: now
                };
                batch.set(ref, rule);
            };

            // --- DATA FROM IMAGE ---

            // ARRENDAMIENTO: 12 (Monthly)
            createRule('Arrendamiento', 2482000, 'Arrendamiento', 'monthly', 12);

            // GASTOS DE NOMINA
            // Nomina Cocina: 15 y 30
            createRule('Nómina Cocina (Q1)', 1019160, 'Gastos de Nómina', 'monthly', 15);
            createRule('Nómina Cocina (Q2)', 1019160, 'Gastos de Nómina', 'monthly', 30);

            // Nomina Barman: 15 y 30
            createRule('Nómina Barman (Q1)', 1019160, 'Gastos de Nómina', 'monthly', 15);
            createRule('Nómina Barman (Q2)', 1019160, 'Gastos de Nómina', 'monthly', 30);

            // Nomina Admon: 05 y 20
            createRule('Nómina Admon (Q1)', 4500000, 'Gastos de Nómina', 'monthly', 5);
            createRule('Nómina Admon (Q2)', 4500000, 'Gastos de Nómina', 'monthly', 20);

            // Nomina David: 05 y 20
            createRule('Nómina David (Q1)', 150000, 'Gastos de Nómina', 'monthly', 5);
            createRule('Nómina David (Q2)', 150000, 'Gastos de Nómina', 'monthly', 20);

            // Turnos y Propinas: Todos los lunes
            createRule('Turnos y Propinas', 1600000, 'Gastos de Nómina', 'weekly', 1); // 1 = Monday

            // Seguridad Social: 4
            createRule('Seguridad Social', 1560000, 'Gastos de Nómina', 'monthly', 4);


            // GASTOS MUSICA
            // Karaoke: Todos los lunes
            createRule('Karaoke', 420000, 'Gastos Música', 'weekly', 1); // Monday

            // Vie Musica: Todos los viernes
            createRule('Vie Musica', 350000, 'Gastos Música', 'weekly', 5); // Friday

            // Sabad Musica: Sabado cada 15 dias
            createRule('Sabad Musica', 300000, 'Gastos Música', 'weekly', 6, 2); // 6=Sat, Interval=2


            // HONORARIOS
            // Asesoria Financiera: 20
            createRule('Asesoría Financiera', 700000, 'Honorarios', 'monthly', 20);


            // IMPUESTOS
            // INC: Bimestralmente el 19
            createRule('INC', 1000000, 'Impuestos', 'monthly', 19, 2);

            // Industria y Comercio: Bimestralmente 20
            createRule('Industria y Comercio', 250000, 'Impuestos', 'monthly', 20, 2);


            // OBLIGACIONES FINANCIERAS
            createRule('Banco Agrario CR', 1150000, 'Obligaciones Financieras', 'monthly', 13);
            createRule('Banco Coop Rosa CR', 518000, 'Obligaciones Financieras', 'monthly', 25);
            createRule('Banco Coop Rosa', 250000, 'Obligaciones Financieras', 'monthly', 30);
            createRule('Banco Falabella Crédito', 2150000, 'Obligaciones Financieras', 'monthly', 5);
            createRule('Bancolombia TC David', 450000, 'Obligaciones Financieras', 'monthly', 15);
            createRule('Bancolombia TC Natalia', 250000, 'Obligaciones Financieras', 'monthly', 3);
            createRule('Interés Mamita', 200000, 'Obligaciones Financieras', 'monthly', 17);


            // SERVICIOS DIGITALES
            createRule('Canva', 22900, 'Servicios Digitales', 'monthly', 28);
            createRule('Deezer', 19500, 'Servicios Digitales', 'monthly', 3);
            createRule('Gastos Fudo', 229000, 'Servicios Digitales', 'monthly', 5);
            createRule('Qresto', 34000, 'Servicios Digitales', 'monthly', 12);


            // SERVICIOS PUBLICOS
            createRule('Servicio de Agua', 198000, 'Servicios Públicos', 'monthly', 8);
            createRule('Servicio de Gas', 450000, 'Servicios Públicos', 'monthly', 20);
            createRule('Servicio Energia', 1800000, 'Servicios Públicos', 'monthly', 3);
            createRule('Servicio Internet', 109000, 'Servicios Públicos', 'monthly', 20);


            await batch.commit();
            console.log("Database seeded with recurring expenses.");

        } catch (error) {
            console.error("Seeding error:", error);
            throw error;
        }
    }
};
