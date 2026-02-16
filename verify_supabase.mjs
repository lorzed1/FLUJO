
import { createClient } from '@supabase/supabase-js';

const url = 'https://csaawhhzqaedvdvqtzjs.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYWF3aGh6cWFlZHZkdnF0empzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM5ODgsImV4cCI6MjA4NjU4OTk4OH0.4xXmVA_IuBm3bdbwtHJmoizToPcDOZv_1tsSf3xpJjE';

const supabase = createClient(url, key);

async function checkData() {
    console.log('\n🔍 --- DIAGNÓSTICO SUPABASE ---');

    const tables = ['transactions', 'categories', 'recurring_expenses', 'transfers', 'arqueos'];

    for (const table of tables) {
        // Check count
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`❌ Error leyendo tabla '${table}':`, error.message);
            if (error.code === '42501') console.error('   👉 PISTA: Es un error de PERMISOS (RLS policy denied).');
        } else {
            console.log(`✅ Tabla '${table}': ${count} registros.`);

            if (count > 0) {
                // Muestreo de datos
                const { data } = await supabase.from(table).select('*').limit(1);
                console.log(`   📝 Ejemplo:`, JSON.stringify(data[0]).substring(0, 100) + '...');
            }
        }
    }
}

checkData();
