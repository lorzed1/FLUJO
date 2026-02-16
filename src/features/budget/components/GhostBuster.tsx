import React, { useState, useEffect } from 'react';
import { budgetService } from '../../../services/budget';
import { BudgetCommitment } from '../../../types/budget';

export const GhostBuster: React.FC = () => {
    const [allRecords, setAllRecords] = useState<BudgetCommitment[]>([]);
    const [loading, setLoading] = useState(false);

    const loadAll = async () => {
        setLoading(true);
        try {
            const data = await budgetService.getCommitments();
            setAllRecords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const deleteRecord = async (id: string) => {
        if (!confirm('¿Eliminar este registro permanentemente?')) return;
        try {
            await budgetService.deleteCommitment(id);
            loadAll();
        } catch (e) {
            alert('Error al eliminar');
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <span className="font-bold">Total Registros Encontrados: {allRecords.length}</span>
                <button onClick={loadAll} className="px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded hover:bg-slate-300 dark:hover:bg-slate-600 text-xs transition-colors">Actualizar</button>
            </div>

            <div className="max-h-96 overflow-y-auto bg-white dark:bg-black rounded border border-slate-200 dark:border-slate-800 custom-scrollbar">
                <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 uppercase z-10">
                        <tr>
                            <th className="p-2 text-center">Fecha</th>
                            <th className="p-2 text-center">Título</th>
                            <th className="p-2 text-center">Monto</th>
                            <th className="p-2 text-center">Estado</th>
                            <th className="p-2 text-center">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="p-4 text-center">Escaneando base de datos...</td></tr>
                        ) : allRecords.length === 0 ? (
                            <tr><td colSpan={5} className="p-4 text-center text-green-600 font-bold">¡Base de datos limpia! No hay registros.</td></tr>
                        ) : (
                            allRecords.map(rec => (
                                <tr key={rec.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <td className="p-2 font-mono">{rec.dueDate}</td>
                                    <td className="p-2">{rec.title}</td>
                                    <td className="p-2 font-mono">${rec.amount.toLocaleString()}</td>
                                    <td className={`p-2 font-bold text-center ${rec.status === 'paid' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {rec.status}
                                    </td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => deleteRecord(rec.id)}
                                            className="text-rose-600 hover:underline hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1 rounded transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <hr className="my-4 border-slate-300 dark:border-slate-700" />

            <div className="flex justify-between items-center">
                <span className="font-bold flex items-center gap-2">
                    <span role="img" aria-label="shield">🛡️</span> Monitor de Reglas Recurrentes
                </span>
            </div>

            <RulesBuster />
        </div>
    );
};

const RulesBuster: React.FC = () => {
    const [rules, setRules] = useState<any[]>([]);

    const loadRules = async () => {
        try {
            const data = await budgetService.getRecurrenceRules();
            setRules(data);
        } catch (e) {
            console.error(e);
        }
    };

    const deleteRule = async (id: string, name: string) => {
        if (!confirm(`¿Eliminar la regla "${name}"? Dejará de crear gastos futuros.`)) return;
        try {
            await budgetService.deleteRecurrenceRule(id);
            loadRules();
        } catch (e) {
            alert('Error al eliminar regla');
        }
    };

    useEffect(() => { loadRules(); }, []);

    return (
        <div className="max-h-60 overflow-y-auto bg-white dark:bg-black rounded border border-slate-200 dark:border-slate-800 mt-2 custom-scrollbar">
            <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 uppercase z-10">
                    <tr>
                        <th className="p-2 text-center">Estado</th>
                        <th className="p-2 text-center">Regla (Nombre)</th>
                        <th className="p-2 text-center">Monto Base</th>
                        <th className="p-2 text-center">Frecuencia</th>
                        <th className="p-2 text-center">Acción</th>
                    </tr>
                </thead>
                <tbody>
                    {rules.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500">No hay reglas recurrentes activas.</td></tr>
                    ) : (
                        rules.map(r => {
                            const name = r.title || r.baseTitle;
                            const amount = r.amount !== undefined ? r.amount : r.baseAmount;
                            const isHealthy = name && amount !== undefined;

                            return (
                                <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                    <td className="p-2 text-center">
                                        {isHealthy ?
                                            <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-800 text-[10px]">✓ Sana</span> :
                                            <span className="text-rose-600 font-bold bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-800 text-[10px]">⚠️ Error</span>
                                        }
                                    </td>
                                    <td className="p-2 font-bold">{name || 'Sin Nombre'}</td>
                                    <td className="p-2 font-mono">${(amount || 0).toLocaleString()}</td>
                                    <td className="p-2">{r.frequency} (Día {r.dayToSend || r.dayOfMonth || '?'})</td>
                                    <td className="p-2 text-center">
                                        <button
                                            onClick={() => deleteRule(r.id, name || 'Desconocida')}
                                            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 px-2 py-1 rounded transition-colors"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
};
