
import React, { useState } from 'react';
import { DatabaseService } from '../services/database';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const RescueData: React.FC = () => {
    const [status, setStatus] = useState<string>('idle'); // idle, processing, success, error
    const [logs, setLogs] = useState<string[]>([]);
    const [forceOverwrite, setForceOverwrite] = useState(false);
    const navigate = useNavigate();

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setStatus('processing');
        setLogs([]);
        addLog(`📂 Leyendo archivo: ${file.name}...`);
        if (forceOverwrite) addLog('⚠️ MODO FORZADO ACTIVADO: Se sobrescribirán los datos existentes.');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);

                addLog('✅ JSON parseado correctamente.');
                addLog(`📊 Estructura detectada: ${Object.keys(data).join(', ')}`);

                // IMPORTAR TRANSACCIONES
                if (data.transactions && Array.isArray(data.transactions)) {
                    addLog(`🔄 Procesando ${data.transactions.length} transacciones...`);

                    if (forceOverwrite) {
                        // Inserción directa / upsert forzado sin verificar borrados
                        const batchSize = 500;
                        for (let i = 0; i < data.transactions.length; i += batchSize) {
                            const batch = data.transactions.slice(i, i + batchSize);
                            const rows = batch.map((t: any) => ({
                                id: t.id,
                                date: t.date,
                                original_date: t.originalDate || null,
                                description: t.description,
                                amount: t.amount,
                                type: t.type || null,
                                expense_type: t.expenseType || null,
                                category_id: t.categoryId || null,
                                is_recurring: t.isRecurring || false,
                                recurring_id: t.recurringId || null,
                                metadata: t.metadata || {},
                                status: t.status || null,
                            }));

                            const { error } = await supabase.from('transactions').upsert(rows, { onConflict: 'id' });
                            if (error) throw error;
                            addLog(`📦 Lote ${i / batchSize + 1} guardado (Forzado).`);
                        }
                    } else {
                        // Método estándar (cuidado: puede borrar si detecta faltantes)
                        await DatabaseService.saveTransactions(data.transactions);
                    }
                    addLog('✅ Transacciones sincronizadas.');
                }

                // IMPORTAR CATEGORIAS
                if (data.categories && Array.isArray(data.categories)) {
                    addLog(`🔄 Importando ${data.categories.length} categorías...`);
                    await DatabaseService.saveCategories(data.categories);
                    addLog('✅ Categorías guardadas.');
                }

                // IMPORTAR RECURRENTES
                const recurrentes = data.recurringExpenses || data.recurring;
                if (recurrentes && Array.isArray(recurrentes)) {
                    addLog(`🔄 Importando ${recurrentes.length} gastos recurrentes...`);
                    // Upsert directo para evitar borrado total si falla algo
                    if (recurrentes.length > 0) {
                        const rows = recurrentes.map((e: any) => ({
                            id: e.id,
                            start_date: e.startDate,
                            description: e.description,
                            amount: e.amount,
                            frequency: e.frequency,
                            day_of_month: e.dayOfMonth || null,
                            day_of_week: e.dayOfWeek ?? null,
                            expense_type: e.expenseType,
                            category_id: e.categoryId,
                        }));
                        const { error } = await supabase.from('recurring_expenses').upsert(rows, { onConflict: 'id' });
                        if (error) throw error;
                    }
                    addLog('✅ Gastos recurrentes guardados.');
                }

                // IMPORTAR ARQUEOS
                if (data.arqueos && Array.isArray(data.arqueos)) {
                    addLog(`🔄 Importando ${data.arqueos.length} arqueos...`);
                    for (const arqueo of data.arqueos) {
                        try {
                            // Mapeo manual para asegurar upsert
                            const row = {
                                id: arqueo.id, // Importante: usar ID del JSON
                                fecha: arqueo.fecha,
                                cajero: arqueo.cajero || '',
                                venta_pos: arqueo.ventaPos || 0,
                                venta_sc: arqueo.venta_sc ?? null,
                                propina: arqueo.propina || 0,
                                efectivo: arqueo.efectivo || 0,
                                datafono_david: arqueo.datafonoDavid || 0,
                                datafono_julian: arqueo.datafonoJulian || 0,
                                transf_bancolombia: arqueo.transfBancolombia || 0,
                                nequi: arqueo.nequi || 0,
                                rappi: arqueo.rappi || 0,
                                ingreso_covers: arqueo.ingresoCovers || 0,
                                visitas: arqueo.visitas || 0,
                                numero_transacciones: arqueo.numeroTransacciones ?? null,
                                total_recaudado: arqueo.totalRecaudado || 0,
                                descuadre: arqueo.descuadre || 0,
                                base_detail: arqueo.baseDetail || null,
                                cuadre_detail: arqueo.cuadreDetail || null,
                                total_ingresos: arqueo.totalIngresos ?? null,
                                created_at: arqueo.createdAt || new Date().toISOString()
                            };

                            const { error } = await supabase.from('arqueos').upsert(row, { onConflict: 'id' });
                            if (error) throw error;

                        } catch (err) {
                            console.error(err);
                        }
                    }
                    addLog(`✅ Arqueos procesados.`);
                }

                // RESTO DE CONFIGURACIONES
                if (data.recordedDays) {
                    await DatabaseService.saveRecordedDays(new Set(data.recordedDays));
                    addLog(`✅ Días registrados importados.`);
                }

                if (data.recurringOverrides) {
                    await DatabaseService.saveRecurringOverrides(data.recurringOverrides);
                    addLog(`✅ Overrides importados.`);
                }

                setStatus('success');
                addLog('🎉 ¡RESCATE COMPLETADO CON ÉXITO!');
                setTimeout(() => alert('Datos recuperados correctamente en Supabase'), 100);

            } catch (error) {
                console.error(error);
                setStatus('error');
                addLog(`❌ Error Crítico: ${(error as Error).message}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto bg-white min-h-screen text-gray-800">
            <h1 className="text-3xl font-bold mb-6 text-blue-600">🚑 Centro de Rescate de Datos (Avanzado)</h1>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <p className="font-bold">Instrucciones:</p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li>Selecciona tu archivo de respaldo <code>.json</code>.</li>
                    <li>Si la importación falla por duplicados, activa la opción <b>"Sobrescribir datos existentes"</b> abajo.</li>
                </ul>
            </div>

            <div className="mb-6 flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <input
                    type="checkbox"
                    id="forceMode"
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    checked={forceOverwrite}
                    onChange={(e) => setForceOverwrite(e.target.checked)}
                />
                <label htmlFor="forceMode" className="ml-3 text-red-800 font-medium cursor-pointer">
                    Sobrescribir datos existentes (Ignorar duplicados)
                    <p className="text-xs text-red-600 font-normal mt-1">Úsalo solo si estás seguro de que el archivo JSON contiene la versión más actual de tus datos.</p>
                </label>
            </div>

            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center hover:bg-gray-50 transition-colors">
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    disabled={status === 'processing'}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {status === 'processing' && <p className="mt-2 text-blue-600 font-semibold animate-pulse">⏳ Procesando archivo, por favor espera...</p>}
            </div>

            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto shadow-inner">
                {logs.length === 0 ? (
                    <span className="text-gray-500 opacity-50">Esperando archivo...</span>
                ) : (
                    logs.map((log, i) => <div key={i}>{log}</div>)
                )}
            </div>

            {status === 'success' && (
                <button
                    onClick={() => navigate('/')}
                    className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-transform transform active:scale-95"
                >
                    Volver al Inicio (Supabase sincronizado) 🏠
                </button>
            )}

            <div className="mt-12 pt-8 border-t border-gray-200">
                <h2 className="text-xl font-bold text-gray-700 mb-4">🛠️ Herramientas de Reparación</h2>
                <p className="text-sm text-gray-500 mb-4">Si ves tus transacciones en la lista pero el Dashboard de Presupuestos sigue vacío, usa este botón para sincronizar.</p>

                <button
                    onClick={async () => {
                        if (!confirm('¿Seguro que quieres generar el historial de presupuesto a partir de tus transacciones? Esto llenará el Dashboard.')) return;
                        setStatus('processing');
                        setLogs([]);
                        addLog('🚀 Iniciando reparación de Presupuesto...');

                        try {
                            // 1. Fetch transactions
                            addLog('📥 Leyendo transacciones existentes...');
                            const { data: txns, error: txError } = await supabase.from('transactions').select('*');
                            if (txError) throw txError;

                            addLog(`✅ Leídas ${txns.length} transacciones.`);

                            // 2. Transform to Budget Commitments
                            const commitments = txns.map((t: any) => ({
                                title: t.description || 'Transacción sin título',
                                amount: Number(t.amount),
                                due_date: t.date,
                                status: t.status === 'paid' ? 'paid' : 'paid', // Asumimos paid para históricos
                                paid_date: t.date,
                                category: t.category_id,
                                description: 'Migrado de Transacciones',
                                is_projected: false,
                                created_at: Date.now(),
                                updated_at: Date.now()
                            }));

                            // 3. Upsert
                            addLog('📤 Escribiendo en Tabla de Presupuestos (budget_commitments)...');
                            // Upsert one by one or batch if ID is missing?
                            // Transacciones tienen ID txn-..., commitments tienen ID uuid default.
                            // Mejor dejar que Supabase genere nuevos IDs o usar txn-id como referencia externa?
                            // Usemos insert. Para evitar duplicados, primero borramos todo? NO, peligroso.
                            // Vamos a insertar solo si no existe duplicado por (fecha + amount + title).
                            // Simplificación: Insertar todo batch (puede duplicar si le das 2 veces).
                            // MEJOR: Borrar budget_commitments y repoblar. Es lo más limpio para una reparación "desde cero".

                            const confirmNuke = confirm('⚠️ Para evitar duplicados, esto BORRARÁ la tabla actual de Presupuestos y la regenerará desde Transacciones. ¿Continuar?');
                            if (!confirmNuke) {
                                addLog('❌ Operación cancelada usuario.');
                                setStatus('idle');
                                return;
                            }

                            await supabase.from('budget_commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
                            addLog('🗑️ Tabla de Presupuestos limpiada.');

                            const batchSize = 100;
                            for (let i = 0; i < commitments.length; i += batchSize) {
                                const batch = commitments.slice(i, i + batchSize);
                                const { error: insError } = await supabase.from('budget_commitments').insert(batch);
                                if (insError) throw insError;
                                addLog(`✅ Lote ${i / batchSize + 1} migrado.`);
                            }

                            addLog('🎉 ¡REPARACIÓN COMPLETADA! Ahora ve al Dashboard.');
                            setStatus('success');

                        } catch (err: any) {
                            console.error(err);
                            addLog(`❌ Error: ${err.message}`);
                            setStatus('error');
                        }
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded transition-colors"
                >
                    🔄 Sincronizar Transacciones → Presupuesto
                </button>
            </div>
        </div>
    );
};

export default RescueData;
