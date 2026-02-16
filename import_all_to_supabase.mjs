/**
 * IMPORTADOR COMPLETO: Firebase JSON → Supabase
 * Importa TODAS las colecciones faltantes del backup de Firebase
 */
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// --- Config ---
const SUPABASE_URL = 'https://csaawhhzqaedvdvqtzjs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYWF3aGh6cWFlZHZkdnF0empzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMTM5ODgsImV4cCI6MjA4NjU4OTk4OH0.4xXmVA_IuBm3bdbwtHJmoizToPcDOZv_1tsSf3xpJjE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const backup = JSON.parse(readFileSync('Ejemplos/finance_backup_2026-02-15.json', 'utf8'));

// Helper: Convertir Firestore timestamps
function convertTimestamp(val) {
    if (val && typeof val === 'object' && val.type === 'firestore/timestamp/1.0') {
        return new Date(val.seconds * 1000).toISOString();
    }
    if (typeof val === 'number' && val > 1000000000000) {
        return new Date(val).toISOString();
    }
    return val;
}

async function batchInsert(table, rows, batchSize = 50) {
    let inserted = 0;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' });
        if (error) {
            console.error('  ERROR en ' + table + ':', error.message);
            // Intentar uno por uno
            for (const row of batch) {
                const { error: singleErr } = await supabase.from(table).upsert(row, { onConflict: 'id' });
                if (singleErr) {
                    console.error('    SKIP fila ' + (row.id || 'sin-id') + ': ' + singleErr.message);
                } else {
                    inserted++;
                }
            }
        } else {
            inserted += batch.length;
        }
    }
    return inserted;
}

async function main() {
    console.log('🚀 IMPORTACIÓN COMPLETA — Firebase → Supabase');
    console.log('================================================\n');

    // ===================================================================
    // 1. TRANSACTIONS (las 1202 completas, upsert para completar las 202 faltantes)
    // ===================================================================
    console.log('📦 1/7 TRANSACTIONS...');
    const txnRows = (backup.transactions || []).map(t => ({
        id: t.id,
        date: t.date,
        original_date: t.originalDate || t.date,
        description: t.description || '',
        amount: Number(t.amount),
        type: t.type || 'expense',
        expense_type: t.expenseType || 'variable',
        category_id: t.categoryId || null,
        is_recurring: t.isRecurring || false,
        recurring_id: t.recurringId || null,
        metadata: t.metadata || null,
        status: t.status || null,
    }));
    const txnCount = await batchInsert('transactions', txnRows);
    console.log('  ✅ ' + txnCount + '/' + txnRows.length + ' transacciones\n');

    // ===================================================================
    // 2. ARQUEOS (391 registros — EL MÁS IMPORTANTE para el Dashboard)
    // ===================================================================
    console.log('📦 2/7 ARQUEOS...');
    const arqueoRows = (backup.arqueos || []).map(a => ({
        id: a.id,
        fecha: a.fecha || a.date,
        cajero: a.cajero || 'Admin',
        venta_bruta: Number(a.ventaBruta || 0),
        venta_sc: a.ventaSC != null ? Number(a.ventaSC) : null,
        propina: Number(a.propina || 0),
        efectivo: Number(a.efectivo || 0),
        datafono_david: Number(a.datafonoDavid || 0),
        datafono_julian: Number(a.datafonoJulian || 0),
        transf_bancolombia: Number(a.transfBancolombia || 0),
        nequi: Number(a.nequi || 0),
        rappi: Number(a.rappi || 0),
        ingreso_covers: Number(a.ingresoCovers || 0),
        visitas: Number(a.visitas || 0),
        numero_transacciones: a.numeroTransacciones != null ? Number(a.numeroTransacciones) : null,
        total_recaudado: Number(a.totalRecaudado || 0),
        descuadre: Number(a.descuadre || 0),
        base_detail: a.baseDetail || {},
        cuadre_detail: a.cuadreDetail || {},
        total_ingresos: Number(a.totalIngresos || 0),
        created_at: convertTimestamp(a.createdAt),
    }));
    const arqueoCount = await batchInsert('arqueos', arqueoRows);
    console.log('  ✅ ' + arqueoCount + '/' + arqueoRows.length + ' arqueos\n');

    // ===================================================================
    // 3. TRANSFERS (104 registros)
    // ===================================================================
    console.log('📦 3/7 TRANSFERS...');
    const transferRows = (backup.transfers || []).map(t => ({
        id: t.id,
        date: t.date,
        amount: Number(t.amount || 0),
        type: t.type || '',
        description: t.description || '',
        reference: t.reference || '',
        arqueo_id: t.arqueoId || null,
        created_at: convertTimestamp(t.createdAt),
    }));
    const transferCount = await batchInsert('transfers', transferRows);
    console.log('  ✅ ' + transferCount + '/' + transferRows.length + ' transfers\n');

    // ===================================================================
    // 4. BUDGET COMMITMENTS (14 registros)
    // ===================================================================
    console.log('📦 4/7 BUDGET COMMITMENTS...');
    const commitmentRows = (backup.budget?.commitments || []).map(c => ({
        id: c.id,
        title: c.title || '',
        amount: Number(c.amount || 0),
        due_date: c.dueDate,
        status: c.status || 'pending',
        paid_date: c.paidDate || null,
        category: c.category || null,
        description: c.description || null,
        recurrence_rule_id: c.recurrenceRuleId || null,
        provider_name: c.providerName || null,
        contact_info: c.contactInfo || null,
        is_projected: c.isProjected || false,
        created_at: typeof c.createdAt === 'number' ? c.createdAt : Date.now(),
        updated_at: typeof c.updatedAt === 'number' ? c.updatedAt : Date.now(),
    }));
    const commitCount = await batchInsert('budget_commitments', commitmentRows);
    console.log('  ✅ ' + commitCount + '/' + commitmentRows.length + ' commitments\n');

    // ===================================================================
    // 5. BUDGET RECURRING RULES (20 registros)
    // ===================================================================
    console.log('📦 5/7 BUDGET RECURRING RULES...');
    const ruleRows = (backup.budget?.rules || []).map(r => ({
        id: r.id,
        title: r.title || '',
        amount: Number(r.amount || 0),
        frequency: r.frequency || 'monthly',
        interval_count: Number(r.interval || 1),
        start_date: r.startDate,
        end_date: r.endDate || null,
        day_to_send: r.dayToSend != null ? String(r.dayToSend) : null,
        category: r.category || null,
        description: r.description || null,
        active: r.active !== false,
        created_at: typeof r.createdAt === 'number' ? r.createdAt : Date.now(),
        updated_at: typeof r.updatedAt === 'number' ? r.updatedAt : Date.now(),
    }));
    const ruleCount = await batchInsert('budget_recurring_rules', ruleRows);
    console.log('  ✅ ' + ruleCount + '/' + ruleRows.length + ' rules\n');

    // ===================================================================
    // 6. SALES EVENTS / PROJECTIONS (45 eventos)
    // ===================================================================
    console.log('📦 6/7 SALES EVENTS...');
    const eventRows = (backup.projections?.events || []).map(e => ({
        id: e.id,
        name: e.name || '',
        type: e.type || 'boost',
        impact_factor: Number(e.impactFactor || 1),
        date: e.date,
        is_recurring: e.isRecurring || false,
        created_at: convertTimestamp(e.createdAt),
    }));
    const eventCount = await batchInsert('sales_events', eventRows);
    console.log('  ✅ ' + eventCount + '/' + eventRows.length + ' events\n');

    // ===================================================================
    // 7. CATEGORIES (re-upsert para asegurar)
    // ===================================================================
    console.log('📦 7/7 CATEGORIES...');
    const catRows = (backup.categories || []).map(c => ({
        id: c.id,
        name: c.name || '',
        type: c.type || 'expense',
    }));
    const catCount = await batchInsert('categories', catRows);
    console.log('  ✅ ' + catCount + '/' + catRows.length + ' categories\n');

    // ===================================================================
    // RESUMEN FINAL
    // ===================================================================
    console.log('================================================');
    console.log('🎉 IMPORTACIÓN COMPLETA');
    console.log('  Transacciones: ' + txnCount);
    console.log('  Arqueos:       ' + arqueoCount);
    console.log('  Transfers:     ' + transferCount);
    console.log('  Commitments:   ' + commitCount);
    console.log('  Rules:         ' + ruleCount);
    console.log('  Events:        ' + eventCount);
    console.log('  Categories:    ' + catCount);
    console.log('================================================');
}

main().catch(err => console.error('FATAL:', err));
