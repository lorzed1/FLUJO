import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    writeBatch,
    deleteField,
    Timestamp,
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions
} from 'firebase/firestore';
import { db } from './firebase';
import {
    Transaction,
    Category,
    RecurringExpense,
    RecurringExpenseOverrides,
    TransferRecord
} from '../types';

// Nombre de las colecciones en Firestore
const COLLECTIONS = {
    TRANSACTIONS: 'transactions',
    CATEGORIES: 'categories',
    RECURRING_EXPENSES: 'recurringExpenses',
    SETTINGS: 'settings', // Para guardar overrides y recorded days
    ACCOUNT_MAPPINGS: 'accountMappings',
};

// Flag para evitar spam de mensajes de error
let hasShownOfflineWarning = false;
let hasShownPermissionWarning = false;

/**
 * Manejar errores de Firestore de forma inteligente
 * Solo muestra advertencias importantes una vez
 */
const handleFirestoreError = (operation: string, error: any, silent = false): void => {
    const errorCode = error?.code || '';
    const errorMessage = error?.message || '';

    // Errores de permisos - la causa más común cuando Firebase está configurado pero las reglas no
    if (errorCode === 'permission-denied' || errorMessage.includes('Missing or insufficient permissions')) {
        if (!hasShownPermissionWarning && !silent) {
            console.warn('⚠️ Firebase: Permisos insuficientes. Usando datos locales.');
            console.warn('📖 Configura las reglas de Firestore - lee ERROR_RESUELTO.md');
            hasShownPermissionWarning = true;
        }
        return;
    }

    // Si es un error de conexión/offline
    if (errorCode === 'unavailable' || errorMessage.includes('offline') || errorMessage.includes('Failed to get document')) {
        if (!hasShownOfflineWarning && !silent) {
            console.warn('⚠️ Firebase sin conexión. Usando datos locales.');
            hasShownOfflineWarning = true;
        }
        return;
    }

    // Otros errores sí se muestran (pero solo si no están silenciados)
    if (!silent) {
        console.error(`Error en ${operation}:`, error);
    }
};

/**
 * Servicio de Firestore para gestionar todas las operaciones de base de datos
 */
/**
 * Convertidor de Firestore para Transacciones
 * Garantiza que los datos que entran y salen cumplen con la interfaz Transaction
 */
const transactionConverter: FirestoreDataConverter<Transaction> = {
    toFirestore(transaction: Transaction) {
        return { ...transaction };
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): Transaction {
        const data = snapshot.data(options);
        return data as Transaction;
    }
};

export class FirestoreService {

    // ============ TRANSACCIONES ============

    /**
     * Guardar todas las transacciones (Migración a Colección + Converter)
     */
    static async saveTransactions(transactions: Transaction[]): Promise<void> {
        try {
            // Referencia a la colección con Tipado Estricto
            const collectionRef = collection(db, 'transactions').withConverter(transactionConverter);

            // 1. Obtener estado actual (Snapshot)
            const querySnapshot = await getDocs(collectionRef);
            const existingMap = new Map(querySnapshot.docs.map(doc => [doc.id, doc.data()]));
            const existingIds = new Set(existingMap.keys());
            const newIds = new Set(transactions.map(t => t.id));

            // 2. Identificar cambios REALES
            const toDelete = Array.from(existingIds).filter(id => !newIds.has(id));

            // Solo hacemos upsert si el documento no existe O si es diferente al existente
            const toUpsert = transactions.filter(t => {
                const existing = existingMap.get(t.id);
                if (!existing) return true; // Nuevo => Upsert

                // Comparación rápida de contenido (podríamos optimizar más, pero esto ya corta el 99% de escrituras redundantes)
                return JSON.stringify(existing) !== JSON.stringify(t);
            });

            console.log(`💾 DataGuard Sync Optimizado: ${toUpsert.length} escrituras necesarias, ${toDelete.length} eliminaciones.`);

            if (toDelete.length === 0 && toUpsert.length === 0) {
                return; // Nada que hacer, ahorramos llamadas
            }

            // 3. Ejecutar en Batches
            const BATCH_SIZE = 450;
            const operations = [
                ...toDelete.map(id => ({ type: 'delete', id: String(id), data: null })), // Force string ID
                ...toUpsert.map(t => ({ type: 'set', id: String(t.id), data: t }))
            ];

            const chunks = [];
            for (let i = 0; i < operations.length; i += BATCH_SIZE) {
                chunks.push(operations.slice(i, i + BATCH_SIZE));
            }

            for (const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(op => {
                    // Usamos el converter para garantizar que la referencia espera un Transaction
                    const docRef = doc(db, 'transactions', op.id).withConverter(transactionConverter);

                    if (op.type === 'delete') {
                        batch.delete(docRef);
                    } else {
                        // Al usar withConverter, batch.set espera Transaction, eliminando el 'any' implícito
                        batch.set(docRef, op.data as Transaction);
                    }
                });
                await batch.commit();
            }

        } catch (error) {
            handleFirestoreError('guardar transacciones (colección)', error, true);
            throw error;
        }
    }

    /**
     * Obtener todas las transacciones desde la colección usando Converter
     */
    static async getTransactions(): Promise<Transaction[]> {
        try {
            // Uso de withConverter para parseo automático y seguro
            const collectionRef = collection(db, 'transactions').withConverter(transactionConverter);
            const q = query(collectionRef, orderBy('date', 'desc'));
            const querySnapshot = await getDocs(q);

            const transactions: Transaction[] = [];
            querySnapshot.forEach((doc) => {
                transactions.push(doc.data()); // .data() ya es Transaction gracias al converter
            });

            // Auto-migración Legacy
            if (transactions.length === 0) {
                const legacyRef = doc(db, 'settings', 'transactions');
                const legacySnap = await getDoc(legacyRef);
                if (legacySnap.exists()) {
                    console.log('⚠️ Migrando datos legacy de documento único a colección...');
                    const legacyData = legacySnap.data().data || [];
                    if (Array.isArray(legacyData) && legacyData.length > 0) {
                        await this.saveTransactions(legacyData as Transaction[]);
                        return legacyData as Transaction[];
                        // Nota: La próxima vez que cargue, leerá de la colección.
                    }
                }
            }

            return transactions;
        } catch (error) {
            handleFirestoreError('obtener transacciones', error);
            throw error;
        }
    }

    // ============ CATEGORÍAS ============

    /**
     * Guardar todas las categorías
     */
    static async saveCategories(categories: Category[]): Promise<void> {
        try {
            const categoriesRef = doc(db, COLLECTIONS.SETTINGS, 'categories');
            await setDoc(categoriesRef, { data: categories, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar categorías', error, true);
            throw error;
        }
    }

    /**
     * Obtener todas las categorías
     */
    static async getCategories(): Promise<Category[]> {
        try {
            const categoriesRef = doc(db, COLLECTIONS.SETTINGS, 'categories');
            const docSnap = await getDoc(categoriesRef);

            if (docSnap.exists()) {
                return docSnap.data().data || [];
            }
            return [];
        } catch (error) {
            handleFirestoreError('obtener categorías', error);
            throw error;
        }
    }

    // ============ GASTOS RECURRENTES ============

    /**
     * Guardar todos los gastos recurrentes
     */
    static async saveRecurringExpenses(expenses: RecurringExpense[]): Promise<void> {
        try {
            const expensesRef = doc(db, COLLECTIONS.SETTINGS, 'recurringExpenses');
            await setDoc(expensesRef, { data: expenses, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar gastos recurrentes', error, true);
            throw error;
        }
    }

    /**
     * Obtener todos los gastos recurrentes
     */
    static async getRecurringExpenses(): Promise<RecurringExpense[]> {
        try {
            const expensesRef = doc(db, COLLECTIONS.SETTINGS, 'recurringExpenses');
            const docSnap = await getDoc(expensesRef);

            if (docSnap.exists()) {
                return docSnap.data().data || [];
            }
            return [];
        } catch (error) {
            handleFirestoreError('obtener gastos recurrentes', error);
            throw error;
        }
    }

    // ============ OVERRIDES DE GASTOS RECURRENTES ============

    /**
     * Guardar overrides de gastos recurrentes
     */
    static async saveRecurringOverrides(overrides: RecurringExpenseOverrides): Promise<void> {
        try {
            const overridesRef = doc(db, COLLECTIONS.SETTINGS, 'recurringOverrides');
            await setDoc(overridesRef, { data: overrides, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar overrides', error, true);
            throw error;
        }
    }

    /**
     * Obtener overrides de gastos recurrentes
     */
    static async getRecurringOverrides(): Promise<RecurringExpenseOverrides> {
        try {
            const overridesRef = doc(db, COLLECTIONS.SETTINGS, 'recurringOverrides');
            const docSnap = await getDoc(overridesRef);

            if (docSnap.exists()) {
                return docSnap.data().data || {};
            }
            return {};
        } catch (error) {
            handleFirestoreError('obtener overrides', error);
            throw error;
        }
    }

    // ============ DÍAS REGISTRADOS ============

    /**
     * Guardar días registrados
     */
    static async saveRecordedDays(days: Set<string>): Promise<void> {
        try {
            const daysRef = doc(db, COLLECTIONS.SETTINGS, 'recordedDays');
            await setDoc(daysRef, { data: Array.from(days), updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar días registrados', error, true);
            throw error;
        }
    }

    /**
     * Obtener días registrados
     */
    static async getRecordedDays(): Promise<string[]> {
        try {
            const daysRef = doc(db, COLLECTIONS.SETTINGS, 'recordedDays');
            const docSnap = await getDoc(daysRef);

            if (docSnap.exists()) {
                return docSnap.data().data || [];
            }
            return [];
        } catch (error) {
            handleFirestoreError('obtener días registrados', error);
            throw error;
        }
    }

    // ============ MAPEOS DE CUENTAS ============

    /**
     * Guardar mapeos de cuentas
     */
    static async saveAccountMappings(mappings: any[]): Promise<void> {
        try {
            const mappingsRef = doc(db, COLLECTIONS.SETTINGS, COLLECTIONS.ACCOUNT_MAPPINGS);
            await setDoc(mappingsRef, { data: mappings, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar mapeos de cuentas', error, true);
            throw error;
        }
    }

    /**
     * Obtener mapeos de cuentas
     */
    static async getAccountMappings(): Promise<any[]> {
        try {
            const mappingsRef = doc(db, COLLECTIONS.SETTINGS, COLLECTIONS.ACCOUNT_MAPPINGS);
            const docSnap = await getDoc(mappingsRef);

            if (docSnap.exists()) {
                return docSnap.data().data || [];
            }
            return [];
        } catch (error) {
            handleFirestoreError('obtener mapeos de cuentas', error);
            throw error;
        }
    }

    // ============ EXTRACTOS BANCARIOS (LADO A) ============

    /**
     * Guardar extractos bancarios (por banco)
     */
    static async saveBankTransactions(data: Record<string, Transaction[]>): Promise<void> {
        try {
            const ref = doc(db, COLLECTIONS.SETTINGS, 'bankTransactions');
            await setDoc(ref, { data, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar extractos bancarios', error, true);
            throw error;
        }
    }

    /**
     * Obtener extractos bancarios
     */
    static async getBankTransactions(): Promise<Record<string, Transaction[]>> {
        try {
            const ref = doc(db, COLLECTIONS.SETTINGS, 'bankTransactions');
            const docSnap = await getDoc(ref);
            return docSnap.exists() ? docSnap.data().data || {} : {};
        } catch (error) {
            handleFirestoreError('obtener extractos bancarios', error);
            throw error;
        }
    }

    // ============ RESULTADOS DE CONCILIACIÓN ============

    /**
     * Guardar resultados de conciliación
     */
    static async saveReconciliationResults(data: Record<string, any>): Promise<void> {
        try {
            const ref = doc(db, COLLECTIONS.SETTINGS, 'reconciliationResults');
            await setDoc(ref, { data, updatedAt: Timestamp.now() });
        } catch (error) {
            handleFirestoreError('guardar resultados conciliación', error, true);
            throw error;
        }
    }

    /**
     * Obtener resultados de conciliación
     */
    static async getReconciliationResults(): Promise<Record<string, any>> {
        try {
            const ref = doc(db, COLLECTIONS.SETTINGS, 'reconciliationResults');
            const docSnap = await getDoc(ref);
            return docSnap.exists() ? docSnap.data().data || {} : {};
        } catch (error) {
            handleFirestoreError('obtener resultados conciliación', error);
            throw error;
        }
    }

    // ============ IMPORTAR/EXPORTAR DATOS ============

    /**
     * Exportar todos los datos
     */
    static async exportAllData(): Promise<any> {
        try {
            const [transactions, categories, recurringExpenses, overrides, recordedDays, bankTransactions, reconciliationResults] = await Promise.all([
                this.getTransactions(),
                this.getCategories(),
                this.getRecurringExpenses(),
                this.getRecurringOverrides(),
                this.getRecordedDays(),
                this.getBankTransactions(),
                this.getReconciliationResults(),
            ]);

            return {
                transactions,
                categories,
                recurringExpenses,
                recurringOverrides: overrides,
                recordedDays,
                bankTransactions,
                reconciliationResults,
                exportDate: new Date().toISOString(),
            };
        } catch (error) {
            handleFirestoreError('exportar datos', error);
            throw error;
        }
    }

    /**
     * Importar todos los datos
     */
    static async importAllData(data: any): Promise<void> {
        try {
            await Promise.all([
                this.saveTransactions(data.transactions || []),
                this.saveCategories(data.categories || []),
                this.saveRecurringExpenses(data.recurringExpenses || []),
                this.saveRecurringOverrides(data.recurringOverrides || {}),
                this.saveRecordedDays(new Set(data.recordedDays || [])),
                this.saveBankTransactions(data.bankTransactions || {}),
                this.saveReconciliationResults(data.reconciliationResults || {}),
            ]);
            console.log('✅ Datos importados exitosamente a Firestore');
        } catch (error) {
            handleFirestoreError('importar datos', error);
            throw error;
        }
    }

    /**
     * Limpiar todos los datos y resetear el sistema (Hard Reset)
     */
    static async resetSystemData(): Promise<void> {
        try {
            const { DEFAULT_CATEGORIES } = await import('../data/defaultData');

            // 1. Resetear configuración global a arrays vacíos o defaults
            await Promise.all([
                this.saveTransactions([]),
                this.saveCategories(DEFAULT_CATEGORIES),
                this.saveRecurringExpenses([]),
                this.saveRecurringOverrides({}),
                this.saveRecordedDays(new Set()),
            ]);

            // 2. Eliminar todos los arqueos uno por uno
            const arqueos = await this.getArqueos();
            console.log(`Eliminando ${arqueos.length} arqueos...`);
            await Promise.all(arqueos.map(a => this.deleteArqueo(a.id)));

            console.log('✅ TODOS los datos han sido eliminados. Sistema como nuevo.');
        } catch (error) {
            handleFirestoreError('resetear sistema', error);
            throw error;
        }
    }
    // ============ ARQUEOS ============

    /**
     * Guardar nuevo arqueo
     */
    static async saveArqueo(arqueo: any): Promise<string> {
        try {
            console.log('🔥 FirestoreService.saveArqueo:', arqueo);
            const arqueosRef = collection(db, 'arqueos');
            const docRef = doc(arqueosRef);
            await setDoc(docRef, { ...arqueo, createdAt: Timestamp.now() });
            console.log('✅ Arqueo guardado con ID:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('❌ Error en saveArqueo:', error);
            handleFirestoreError('guardar arqueo', error);
            throw error;
        }
    }

    /**
     * Obtener todos los arqueos
     */
    static async getArqueos(): Promise<any[]> {
        try {
            const arqueosRef = collection(db, 'arqueos');
            const q = query(arqueosRef, orderBy('fecha', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            handleFirestoreError('obtener arqueos', error);
            return [];
        }
    }

    /**
     * Actualizar un arqueo
     */
    static async updateArqueo(id: string, updates: any): Promise<void> {
        try {
            const arqueoRef = doc(db, 'arqueos', id);
            await updateDoc(arqueoRef, updates);
        } catch (error) {
            handleFirestoreError('actualizar arqueo', error);
            throw error;
        }
    }

    /**
     * Eliminar un arqueo
     */
    static async deleteArqueo(id: string): Promise<void> {
        try {
            const arqueoRef = doc(db, 'arqueos', id);
            await deleteDoc(arqueoRef);
        } catch (error) {
            handleFirestoreError('eliminar arqueo', error);
            throw error;
        }
    }

    // ============ TRANSFERENCIAS Y NEQUIS ============

    /**
     * Guardar nueva transferencia
     */
    static async saveTransfer(transfer: TransferRecord): Promise<void> {
        try {
            if (!transfer.id || !transfer.amount || !transfer.type) {
                console.warn('⚠️ Intento de guardar transferencia inválida:', transfer);
                return;
            }
            console.log('💸 FirestoreService.saveTransfer:', transfer);
            const transfersRef = collection(db, 'transferencias');
            // Usamos el ID del objeto si viene, o dejamos que firestore genere uno si fuera necesario
            // pero mejor usar doc() con ID especifico si queremos control total
            await setDoc(doc(transfersRef, transfer.id), { ...transfer, updatedAt: Timestamp.now() });
            console.log('✅ Transferencia guardada:', transfer.id);
        } catch (error) {
            console.error('❌ Error en saveTransfer:', error);
            handleFirestoreError('guardar transferencia', error);
            throw error;
        }
    }

    /**
     * Obtener todas las transferencias
     */
    static async getTransfers(): Promise<TransferRecord[]> {
        try {
            const transfersRef = collection(db, 'transferencias');
            const q = query(transfersRef, orderBy('date', 'desc'));
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ ...doc.data() } as TransferRecord));
        } catch (error) {
            handleFirestoreError('obtener transferencias', error);
            return [];
        }
    }

    /**
     * Actualizar una transferencia
     */
    static async updateTransfer(id: string, updates: Partial<TransferRecord>): Promise<void> {
        try {
            const transferRef = doc(db, 'transferencias', id);
            await updateDoc(transferRef, {
                ...updates, updatedAt: Timestamp.now()
            });
        } catch (error) {
            handleFirestoreError('actualizar transferencia', error);
            throw error;
        }
    }

    /**
     * Eliminar una transferencia
     */
    static async deleteTransfer(id: string): Promise<void> {
        try {
            const transferRef = doc(db, 'transferencias', id);
            await deleteDoc(transferRef);
        } catch (error) {
            handleFirestoreError('eliminar transferencia', error);
            throw error;
        }
    }

    /**
     * Limpieza Automática Selectiva: Mantiene el historial pero limpia detalles pesados.
     * User Request: Purga solo los detalles de conteo de base/cuadre después de 2 días.
     */
    static async autoPurgeOldData(): Promise<number> {
        try {
            const now = new Date();
            const cutoffDate = new Date(now);
            cutoffDate.setDate(now.getDate() - 2);

            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            console.log('🧹 Limpieza de Detalles: Buscando registros anteriores a:', cutoffStr);

            let updatedCount = 0;
            const batch = writeBatch(db);
            let hasOperations = false;

            // 1. Arqueos: NO eliminamos el registro, solo limpiamos los detalles de billetes (baseDetail/cuadreDetail)
            const arqueosRef = collection(db, 'arqueos');
            const qArqueos = query(arqueosRef, where('fecha', '<', cutoffStr));
            const arqueosSnap = await getDocs(qArqueos);

            arqueosSnap.forEach(docSnap => {
                const data = docSnap.data();
                // Solo actualizamos si tiene detalles que limpiar
                if (data.baseDetail || data.cuadreDetail) {
                    batch.update(docSnap.ref, {
                        baseDetail: deleteField(),
                        cuadreDetail: deleteField()
                    });
                    updatedCount++;
                    hasOperations = true;
                }
            });

            // 2. Transferencias: Por ahora dejamos de eliminarlas por seguridad hasta nueva orden
            // ya que forman parte del historial financiero.

            if (hasOperations) {
                await batch.commit();
                console.log(`✅ Limpieza exitosa: ${updatedCount} arqueos optimizados (detalles eliminados).`);
            }

            return updatedCount;
        } catch (error) {
            console.error('❌ Error en limpieza automática:', error);
            return 0;
        }
    }
}
