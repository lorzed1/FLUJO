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
import { BudgetCommitment, RecurrenceRule, BudgetStatus, RecurrenceFrequency, WeeklyAvailability, BudgetExecutionLog } from '../types/budget';
import { addMonths, addWeeks, format, isAfter, isBefore, parseISO, getDay, isSameDay, setDay, setDate, addDays, startOfWeek } from 'date-fns';

const COMMITMENTS_COLLECTION = 'budget_commitments';
const RULES_COLLECTION = 'budget_recurring_rules';
const AVAILABILITY_COLLECTION = 'budget_weekly_availability';
const LOGS_COLLECTION = 'budget_execution_history';

export const budgetService = {
    // --- Commitments ---
    // ... (Mantener métodos existentes)

    // --- Execution History (Logs) ---
    async addExecutionLog(log: Omit<BudgetExecutionLog, 'id'>): Promise<string> {
        try {
            const docRef = await addDoc(collection(db, LOGS_COLLECTION), log);
            return docRef.id;
        } catch (error) {
            console.error('Error adding execution log:', error);
            throw error;
        }
    },

    async getExecutionLogs(): Promise<BudgetExecutionLog[]> {
        try {
            const q = query(
                collection(db, LOGS_COLLECTION),
                orderBy('executionDate', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BudgetExecutionLog));
        } catch (error) {
            console.error('Error fetching execution logs:', error);
            // Si falla por falta de índice, devolver vacío por ahora
            return [];
        }
    },

    // --- Weekly Availability ---
    // ... (Mantener métodos existentes)

    // --- Weekly Availability ---
    async getWeeklyAvailability(weekStartDate: string): Promise<WeeklyAvailability | null> {
        try {
            const q = query(
                collection(db, AVAILABILITY_COLLECTION),
                where('weekStartDate', '==', weekStartDate)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const docData = snapshot.docs[0].data();
            return {
                id: snapshot.docs[0].id,
                ...docData
            } as WeeklyAvailability;
        } catch (error) {
            console.error('Error fetching availability:', error);
            return null;
        }
    },

    async saveWeeklyAvailability(data: Omit<WeeklyAvailability, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
        try {
            // Check if exists
            const existing = await this.getWeeklyAvailability(data.weekStartDate);

            if (existing) {
                // Update
                const docRef = doc(db, AVAILABILITY_COLLECTION, existing.id);
                await updateDoc(docRef, {
                    ...data,
                    updatedAt: Date.now()
                });
            } else {
                // Create
                const newRef = doc(collection(db, AVAILABILITY_COLLECTION));
                await addDoc(collection(db, AVAILABILITY_COLLECTION), {
                    ...data,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            }
        } catch (error) {
            console.error('Error saving availability:', error);
            throw error;
        }
    },

    // --- Utility: Reconcile Missing Log for Today ---
    async reconcileTodayLog(): Promise<string | null> {
        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const startOfWeekStr = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

            // 1. Check existing log
            const existingLogs = await this.getExecutionLogs();
            // Check if any log was created strictly TODAY based on executionDate timestamp
            const todayLog = existingLogs.find(l => {
                const logDate = parseISO(l.executionDate);
                return isSameDay(logDate, new Date());
            });

            if (todayLog) {
                console.log("Log for today already exists.");
                return 'exists';
            }

            // 2. Find payments made TODAY
            // Simplificado: Traemos los pagados y filtramos en memoria para evitar errores de índices compuestos
            const q = query(
                collection(db, COMMITMENTS_COLLECTION),
                where('status', '==', 'paid'),
                // Opcional: limitar a fecha reciente si hay índice, sino traer todo pagado es seguro en escalas pequeñas
                // orderBy('paidDate', 'desc') 
            );
            const snapshot = await getDocs(q);

            console.log(`Found ${snapshot.size} paid commitments total.`);

            const paidItems = snapshot.docs
                .map(doc => doc.data() as BudgetCommitment)
                .filter(item => {
                    // Check if paidDate matches today
                    // Handle cases where paidDate might be ISO timestamp or just YYYY-MM-DD
                    if (!item.paidDate) return false;
                    return item.paidDate.startsWith(todayStr); // '2025-02-09' match
                });

            console.log(`Filtered to ${paidItems.length} items paid explicitly on ${todayStr}.`);

            if (paidItems.length === 0) {
                console.log("No payments made today found (after filter).");
                return 'no_payments';
            }

            const totalPaid = paidItems.reduce((sum, item) => sum + item.amount, 0);
            const itemsCount = paidItems.length;

            // 3. Get Current Accounts State (Snapshot)
            const availability = await this.getWeeklyAvailability(startOfWeekStr);

            // Default blank state if no availability found
            const currentCtaCorriente = availability?.ctaCorriente || 0;
            const currentCtaAhorrosJ = availability?.ctaAhorrosJ || 0;
            const currentCtaAhorrosN = availability?.ctaAhorrosN || 0;
            const currentEfectivo = availability?.efectivo || 0;

            // Reconstructed Logic:
            // "Final Balance" is what we have NOW (availability or sum of accounts)
            // "Initial Balance" was Final + TotalPaid
            const currentTotal = availability?.totalAvailable || (currentCtaCorriente + currentCtaAhorrosJ + currentCtaAhorrosN + currentEfectivo);
            const reconstructedInitialTotal = currentTotal + totalPaid;

            const log: Omit<BudgetExecutionLog, 'id'> = {
                executionDate: new Date().toISOString(),
                weekStartDate: startOfWeekStr,
                initialState: {
                    ctaCorriente: currentCtaCorriente, // We can't know the exact pre-split, so we use current
                    ctaAhorrosJ: currentCtaAhorrosJ,
                    ctaAhorrosN: currentCtaAhorrosN,
                    efectivo: currentEfectivo,
                    totalAvailable: reconstructedInitialTotal // This is the important reconstruction
                },
                totalPaid: totalPaid,
                finalBalance: currentTotal,
                itemsCount: itemsCount
            };

            return await this.addExecutionLog(log);

        } catch (error) {
            console.error('Error reconciling log:', error);
            throw error;
        }
    },

    // --- Recurrence Rules (Mantener el resto) --- 


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
                        // FIX: Force alignment with rule.dayToSend to prevent drift
                        const targetDay = Number(rule.dayToSend);

                        if (!isNaN(targetDay)) {
                            if (rule.frequency === 'weekly') {
                                // 0=Sun, 1=Mon...
                                const currentDay = getDay(nextDate);
                                if (currentDay !== targetDay) {
                                    // Calculate diff (e.g. Target 5 (Fri) - Current 2 (Tue) = 3)
                                    // addDays(Tue, 3) -> Fri
                                    // If Target 1 (Mon) - Current 5 (Fri) = -4. Fri-4 = Mon.
                                    const diff = targetDay - currentDay;
                                    nextDate = addDays(nextDate, diff);
                                }
                            } else if (rule.frequency === 'monthly') {
                                const currentDoM = nextDate.getDate();
                                const daysInMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
                                const actualTarget = Math.min(targetDay, daysInMonth);
                                if (currentDoM !== actualTarget) {
                                    nextDate = setDate(nextDate, actualTarget);
                                }
                            }
                        }

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
                        const thresholdDays = rule.frequency === 'weekly' ? 6 : 25; // Increase weekly tolerance to cover whole week shifts

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

                // --- AGGRESSIVE DEDUPLICATION ---
                // We have Real Commitments (from DB) and Virtual (Generated).
                // Sometimes the Smart Reconciliation logic in the loop misses a match (e.g. edge cases).
                // We perform a second pass: Remove any Virtual commitment that has a "matching" Real commitment
                // nearby (same Rule, close date) that wasn't already caught.

                const finalVirtuals = virtualCommitments.filter(vc => {
                    const vcDate = parseISO(vc.dueDate);

                    // Check if ANY real commitment covers this virtual one
                    const hasCoverage = realCommitments.some(rc => {
                        // Must match Rule ID
                        if (rc.recurrenceRuleId !== vc.recurrenceRuleId) return false;

                        // Must be close in date (e.g. +/- 3 days) to be considered the "same" event
                        const rcDate = parseISO(rc.dueDate);
                        const diffVal = Math.abs(rcDate.getTime() - vcDate.getTime()) / (1000 * 60 * 60 * 24);
                        return diffVal <= 3;
                    });

                    // If covered by real, discard virtual (return false)
                    return !hasCoverage;
                });

                // FINAL DEDUPLICATION BY ID AND SIGNATURE
                const uniqueMap = new Map<string, BudgetCommitment>();
                const signatureSet = new Set<string>();

                // 1. Process Reals FIRST (they are the source of truth)
                realCommitments.forEach(rc => {
                    uniqueMap.set(rc.id, rc);
                    if (rc.recurrenceRuleId) {
                        signatureSet.add(`${rc.recurrenceRuleId}-${rc.dueDate}`);
                    }
                });

                // 2. Add Virtuals ONLY if not colliding by Signature (RuleID + Date)
                finalVirtuals.forEach(vc => {
                    const key = `${vc.recurrenceRuleId}-${vc.dueDate}`;
                    if (!signatureSet.has(key)) {
                        uniqueMap.set(vc.id, vc);
                        // Mark as taken so we don't add duplicates
                        signatureSet.add(key);
                    }
                });

                return Array.from(uniqueMap.values()).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            }

            return realCommitments;
        } catch (error) {
            console.error('Error fetching commitments:', error);
            throw error;
        }
    },

    async getOverduePendingCommitments(beforeDate: string): Promise<BudgetCommitment[]> {
        try {
            // ESTRATEGIA HÍBRIDA ROBUSTA:
            // El usuario reporta que faltan "Proyectados Vencidos".
            // Los proyectados NO existen en DB, se generan al vuelo.
            // Por tanto, una simple query a DB no basta.

            // 1. Definir horizonte de búsqueda (ej. 3 meses atrás)
            // Ir demasiado atrás podría ser costoso, 3-6 meses es razonable para cartera operativa.
            const horizonDate = addMonths(parseISO(beforeDate), -3);
            const horizonStr = format(horizonDate, 'yyyy-MM-dd');

            // Calculamos la fecha "ayer" respecto a beforeDate (que suele ser el Lunes de la semana actual)
            // Queremos todo lo que sea estrictamente ANTERIOR a beforeDate.
            // Para getCommitments, el endDate es inclusivo, así que usamos un día antes.
            const dayBefore = addDays(parseISO(beforeDate), -1);
            const dayBeforeStr = format(dayBefore, 'yyyy-MM-dd');

            // 2. Reutilizar la lógica "Smart Reconciliation" de getCommitments
            // Esto nos traerá:
            // - Reales en ese rango (Pagados y Pendientes)
            // - Virtuales generado por reglas que NO tienen contraparte Real (es decir, impagos)
            const allHistory = await this.getCommitments(horizonStr, dayBeforeStr);

            // 3. Filtrar solo lo que sea DEUDA (Pendiente)
            const overdue = allHistory.filter(c => {
                // Si es proyectado, por definición es deuda (si se hubiera pagado, sería Real y el proyectado no existiría)
                if (c.isProjected) return true;

                // Si es real, solo si está pendiente
                return c.status === 'pending';
            });

            return overdue;

        } catch (error) {
            console.error('Error fetching comprehensive overdue commitments:', error);
            return [];
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
            // Validation: Prevent "Zombie Rules" (empty title or amount)
            if (!rule.title || rule.title.trim() === '') {
                throw new Error("Cannot create rule: Title is required.");
            }
            if (rule.amount === undefined || rule.amount === null) {
                throw new Error("Cannot create rule: Amount is required.");
            }

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
                    // For monthly, ensure day is valid (e.g. not 31st of Feb)
                    // Current logic takes care of it via JS Date overflow, but let's be cleaner?
                    // new Date(2025, 1, 31) -> Mar 3.
                    // We want to set the "Intent" correctly so the Service fixes it.
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
    },

    // --- RESET FUNCTION ---
    async resetRecurringModule(): Promise<void> {
        try {
            console.log('Starting Recurring Module Reset...');
            // 1. Delete ALL Rules
            const rulesSnapshot = await getDocs(collection(db, RULES_COLLECTION));
            const batch1 = writeBatch(db);
            rulesSnapshot.docs.forEach(doc => batch1.delete(doc.ref));
            if (!rulesSnapshot.empty) await batch1.commit();

            // 2. Delete ALL Commitments derived from Rules (History + Projections)
            const commSnapshot = await getDocs(collection(db, COMMITMENTS_COLLECTION));
            const commDeletes = commSnapshot.docs
                .filter(doc => doc.data().recurrenceRuleId || doc.data().isProjected)
                .map(doc => deleteDoc(doc.ref));
            await Promise.all(commDeletes);

            console.log(`Reset complete: Deleted ${rulesSnapshot.size} rules and ${commDeletes.length} commitments.`);
        } catch (error) {
            console.error('Error resetting module:', error);
            throw error;
        }
    }
};
