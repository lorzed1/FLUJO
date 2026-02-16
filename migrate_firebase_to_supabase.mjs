
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// ============ CONFIGURACIÓN ============

// 1. Cargar Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://csaawhhzqaedvdvqtzjs.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYWF3aGh6cWFlZHZkdnF0empzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM5ODgsImV4cCI6MjA4NjU4OTk4OH0.4xXmVA_IuBm3bdbwtHJmoizToPcDOZv_1tsSf3xpJjE';
const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Cargar Firebase (Service Account)
const serviceAccountPath = './firebase-service-account.json';

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ ERROR: No se encontró el archivo "firebase-service-account.json" en la raíz del proyecto.');
    console.error('👉 Descarga tu Service Account Key desde la consola de Firebase: Configuración del proyecto > Cuentas de servicio > Generar nueva clave privada.');
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// ============ LOGICA DE MIGRACIÓN ============

async function migrateCollection(collectionName, targetTable, mapper = (doc) => ({ id: doc.id, ...doc.data() })) {
    console.log(`\n--- Migrando colección: ${collectionName} -> ${targetTable} ---`);

    const snapshot = await db.collection(collectionName).get();
    if (snapshot.empty) {
        console.log('⚠️ Colección vacía o no existe.');
        return;
    }

    const batchSize = 100;
    const docs = snapshot.docs.map(mapper);

    console.log(`📦 Encontrados ${docs.length} documentos.`);

    for (let i = 0; i < docs.length; i += batchSize) {
        const batch = docs.slice(i, i + batchSize);
        const { error } = await supabase.from(targetTable).upsert(batch);

        if (error) {
            console.error(`❌ Error en lote ${i} - ${i + batchSize}:`, error.message);
        } else {
            console.log(`✅ Lote ${i} - ${i + batch.length} migrado.`);
        }
    }
}

// Mappers específicos para adaptar Firebase -> Supabase Schema
const transactionMapper = (doc) => {
    const data = doc.data();
    // Adaptar campos si es necesario (camelCase -> snake_case ya lo hace Supabase si coinciden, pero mejor ser explícito)
    return {
        id: doc.id,
        date: data.date,
        original_date: data.originalDate || null,
        description: data.description,
        amount: data.amount,
        type: data.type,
        expense_type: data.expenseType || null,
        category_id: data.categoryId || null,
        is_recurring: data.isRecurring || false,
        recurring_id: data.recurringId || null,
        metadata: data.metadata || {},
        status: data.status || null,
        // ... otros campos
    };
};

const categoryMapper = (doc) => ({
    id: doc.id,
    name: doc.data().name,
    type: doc.data().type,
});

const recurringMapper = (doc) => {
    const data = doc.data();
    return {
        id: doc.id,
        start_date: data.startDate,
        description: data.description,
        amount: data.amount,
        frequency: data.frequency,
        day_of_month: data.dayOfMonth || null,
        day_of_week: data.dayOfWeek ?? null,
        expense_type: data.expenseType,
        category_id: data.categoryId,
    };
};

const arqueoMapper = (doc) => {
    const data = doc.data();
    return {
        id: doc.id,
        fecha: data.fecha,
        cajero: data.cajero,
        venta_bruta: data.ventaBruta,
        venta_sc: data.venta_sc, // check casing
        propina: data.propina,
        efectivo: data.efectivo,
        datafono_david: data.datafonoDavid,
        datafono_julian: data.datafonoJulian,
        transf_bancolombia: data.transfBancolombia,
        nequi: data.nequi,
        rappi: data.rappi,
        ingreso_covers: data.ingresoCovers,
        visitas: data.visitas,
        numero_transacciones: data.numeroTransacciones,
        total_recaudado: data.totalRecaudado,
        descuadre: data.descuadre,
        base_detail: data.baseDetail || null,
        cuadre_detail: data.cuadreDetail || null,
        total_ingresos: data.totalIngresos,
        created_at: data.createdAt || new Date().toISOString(),
    };
};

// ============ EJECUCIÓN ============

async function run() {
    try {
        await migrateCollection('transactions', 'transactions', transactionMapper);
        await migrateCollection('categories', 'categories', categoryMapper);
        await migrateCollection('recurring_expenses', 'recurring_expenses', recurringMapper);
        await migrateCollection('arqueos', 'arqueos', arqueoMapper);

        // settings? transfers? (depende de cómo se llamaban en Firebase)

        console.log('\n✅ MIGRACIÓN FINALIZADA.');
    } catch (error) {
        console.error('❌ Error fatal:', error);
    }
}

run();
