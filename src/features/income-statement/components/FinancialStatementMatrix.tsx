import React, { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '../../../components/ui/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TableNode {
    id: string;
    code: string;
    name: string;
    amount: Record<string, number>;
    children: TableNode[];
    level: number;
}

interface MasterRow {
    id: string;
    name: string;
    type: 'data' | 'calc';
    codes?: string[];
    operation?: (rows: Record<string, Record<string, number>>, month: string) => number;
}

const MASTER_STRUCTURE: MasterRow[] = [
    { id: 'ING_OPER', name: 'INGRESOS OPERACIONALES', type: 'data', codes: ['41'] },
    { id: 'COST_OPER', name: 'COSTOS OPERACIONALES', type: 'data', codes: ['61', '62'] },
    {
        id: 'UTIL_BRUTA', name: 'UTILIDAD BRUTA', type: 'calc',
        operation: (totals, m) => (totals['ING_OPER']?.[m] || 0) - (totals['COST_OPER']?.[m] || 0)
    },
    { id: 'COST_PROD', name: 'COSTOS DE PRODUCCION', type: 'data', codes: ['7'] },
    { id: 'GAST_ADMIN', name: 'GASTOS OPERACIONALES DE ADMINISTRACION', type: 'data', codes: ['51'] },
    { id: 'GAST_VENTA', name: 'GASTOS OPERACIONALES DE VENTAS', type: 'data', codes: ['52'] },
    {
        id: 'UTIL_OPER', name: 'UTILIDAD OPERACIONAL', type: 'calc',
        operation: (totals, m) => (totals['UTIL_BRUTA']?.[m] || 0) - (totals['COST_PROD']?.[m] || 0) - (totals['GAST_ADMIN']?.[m] || 0) - (totals['GAST_VENTA']?.[m] || 0)
    },
    { id: 'ING_NO_OPER', name: 'INGRESOS NO OPERACIONALES', type: 'data', codes: ['42'] },
    { id: 'OTROS_ING', name: 'OTROS INGRESOS', type: 'data', codes: ['47'] },
    { id: 'GAST_NO_OPER', name: 'GASTOS NO OPERACIONALES', type: 'data', codes: ['53'] },
    { id: 'OTROS_GAST', name: 'OTROS GASTOS', type: 'data', codes: ['54', '59'] },
    {
        id: 'UTIL_ANTES_IMPU', name: 'UTILIDAD ANTES DE IMPUESTOS', type: 'calc',
        operation: (totals, m) => (totals['UTIL_OPER']?.[m] || 0) + (totals['ING_NO_OPER']?.[m] || 0) + (totals['OTROS_ING']?.[m] || 0) - (totals['GAST_NO_OPER']?.[m] || 0) - (totals['OTROS_GAST']?.[m] || 0)
    },
    { id: 'PROV_IMPU', name: 'PROVISION DE IMPUESTOS', type: 'data', codes: ['54'] },
    {
        id: 'UTIL_NETA', name: 'UTILIDAD O PÉRDIDA NETA DEL EJERCICIO', type: 'calc',
        operation: (totals, m) => (totals['UTIL_ANTES_IMPU']?.[m] || 0) - (totals['PROV_IMPU']?.[m] || 0)
    }
];

export const FinancialStatementMatrix: React.FC<{ data: any[] }> = ({ data }) => {
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const months = useMemo(() => {
        const unique = new Set<string>();
        data.forEach(item => {
            if (item.date) {
                // Extraer YYYY-MM directamente de la cadena para evitar desfases de zona horaria
                const datePart = typeof item.date === 'string' ? item.date.split('T')[0] : '';
                if (datePart.includes('-')) {
                    const [y, m] = datePart.split('-');
                    unique.add(`${y}-${m}`);
                }
            }
        });
        return Array.from(unique).sort();
    }, [data]);

    const getMonthLabel = (mKey: string) => {
        const [year, month] = mKey.split('-').map(Number);
        const d = new Date(year, month - 1, 15); // Usar el día 15 para evitar saltos de mes por zona horaria
        return format(d, 'MMMM', { locale: es });
    };

    const processed = useMemo(() => {
        const sectionTrees: Record<string, TableNode[]> = {};
        const sectionTotals: Record<string, Record<string, number>> = {};

        // Función para insertar una cuenta en un árbol jerárquico
        const insertIntoTree = (nodes: TableNode[], item: any, dateKey: string) => {
            const code = item.code || '';
            const amount = item.amount || 0;

            // Buscar si ya existe la cuenta o un ancestro
            let found = nodes.find(n => code.startsWith(n.code));

            if (found) {
                if (found.code === code) {
                    found.amount[dateKey] = (found.amount[dateKey] || 0) + amount;
                } else {
                    insertIntoTree(found.children, item, dateKey);
                }
            } else {
                // Si no existe, ver si este item es ancestro de alguno existente
                const children = nodes.filter(n => n.code.startsWith(code));
                const newNode: TableNode = {
                    id: item.id,
                    code: code,
                    name: item.description,
                    amount: { [dateKey]: amount },
                    children: children,
                    level: Math.floor(code.length / 2)
                };
                // Reemplazar los hijos movidos al nuevo nodo
                const remaining = nodes.filter(n => !n.code.startsWith(code));
                remaining.push(newNode);
                nodes.length = 0;
                nodes.push(...remaining);
            }
        };

        MASTER_STRUCTURE.forEach(master => {
            if (master.type === 'data') {
                const masterItems = data.filter(d => master.codes?.some(c => (d.code || '').startsWith(c)));
                const tree: TableNode[] = [];
                const totals: Record<string, number> = {};

                masterItems.forEach(item => {
                    const datePart = typeof item.date === 'string' ? item.date.split('T')[0] : '';
                    if (!datePart) return;
                    const [y, m] = datePart.split('-');
                    const dateKey = `${y}-${m}`;

                    insertIntoTree(tree, item, dateKey);

                    // IMPORTANTE: Para el total del grupo maestro, solo sumamos las cuentas de 4 dígitos
                    // para evitar duplicar valores de subcuentas.
                    if (item.code?.length === 4) {
                        totals[dateKey] = (totals[dateKey] || 0) + item.amount;
                    }
                });

                sectionTrees[master.id] = tree.sort((a, b) => a.code.localeCompare(b.code));
                sectionTotals[master.id] = totals;
            }
        });

        // Calcular utilidades
        MASTER_STRUCTURE.forEach(master => {
            if (master.type === 'calc' && master.operation) {
                sectionTotals[master.id] = {};
                months.forEach(m => {
                    sectionTotals[master.id][m] = master.operation!(sectionTotals, m);
                });
            }
        });

        return { sectionTrees, sectionTotals };
    }, [data, months]);

    const formatCurrency = (val: number) => {
        const isNegative = val < 0;
        const formatted = `$ ${Math.abs(val).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        return isNegative ? `(${formatted})` : formatted;
    };

    const renderNode = (node: TableNode, depth: number, monthKeys: string[]) => {
        const isExpanded = expandedRows[node.id];
        const hasChildren = node.children.length > 0;

        return (
            <React.Fragment key={node.id}>
                <tr className="bg-white/50 dark:bg-slate-900/10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-dashed border-slate-100 dark:border-slate-800/50">
                    <td className="px-6 py-1.5" style={{ paddingLeft: `${40 + depth * 20}px` }}>
                        <div className="flex items-center gap-2">
                            {hasChildren ? (
                                <button onClick={() => setExpandedRows(p => ({ ...p, [node.id]: !p[node.id] }))} className="text-slate-400 hover:text-primary transition-colors">
                                    {isExpanded ? <ChevronDownIcon className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
                                </button>
                            ) : <span className="w-3 h-3 inline-block" />}
                            <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{node.code}</span>
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium uppercase tracking-wide leading-none">{node.name}</span>
                        </div>
                    </td>
                    {monthKeys.map(m => {
                        const val = node.amount[m] || 0;
                        return (
                            <td key={m} className={`px-6 py-1.5 text-right font-mono text-[11px] ${val < 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                                {formatCurrency(val)}
                            </td>
                        );
                    })}
                </tr>
                {isExpanded && node.children
                    .sort((a, b) => a.code.localeCompare(b.code))
                    .map(child => renderNode(child, depth + 1, monthKeys))}
            </React.Fragment>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 rounded-[1.5rem] shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="py-2.5 px-6 text-center border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50">
                <h1 className="text-[14px] font-black text-slate-800 dark:text-white uppercase tracking-[0.2em] leading-tight">ESTADO DE RESULTADO INTEGRAL</h1>
                <div className="text-[8px] font-black text-primary/60 uppercase tracking-[0.3em]">
                    {months.length > 0
                        ? `DEL 1 DE ${getMonthLabel(months[0])} AL 30 DE ${getMonthLabel(months[months.length - 1])} DE ${months[0].split('-')[0]}`
                        : 'REPORTE DE GESTIÓN CORPORATIVA'}
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full border-separate border-spacing-0">
                    <thead className="sticky top-0 z-50 shadow-sm">
                        <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900">
                            <th className="px-10 py-2.5 text-left border-b border-slate-100">CUENTA</th>
                            {months.map(m => (
                                <th key={m} className="px-6 py-2.5 text-right border-b border-slate-100">
                                    {getMonthLabel(m)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                        {MASTER_STRUCTURE.map(master => {
                            const isExpanded = expandedRows[master.id];
                            const totals = processed.sectionTotals[master.id] || {};
                            const tree = processed.sectionTrees[master.id] || [];
                            const isCalc = master.type === 'calc';
                            const isImportant = master.id === 'UTIL_NETA' || master.id === 'UTIL_OPER';

                            return (
                                <React.Fragment key={master.id}>
                                    <tr className={`group transition-all ${isCalc ? 'bg-slate-50/80 dark:bg-slate-800/40 border-t-2 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-900'}`}>
                                        <td className="px-6 py-2.5 relative">
                                            {isImportant && <div className={`absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r`}></div>}
                                            <div className="flex items-center gap-2">
                                                {!isCalc && tree.length > 0 ? (
                                                    <button onClick={() => setExpandedRows(p => ({ ...p, [master.id]: !p[master.id] }))} className="text-slate-400 hover:text-primary transition-colors">
                                                        {isExpanded ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
                                                    </button>
                                                ) : (!isCalc ? <span className="w-3.5 h-3.5 inline-block" /> : null)}
                                                <span className={`text-[11px] uppercase tracking-wider ${isCalc ? 'text-slate-900 dark:text-white font-black' : 'text-slate-700 dark:text-slate-200 font-bold'}`}>
                                                    {master.name}
                                                </span>
                                            </div>
                                        </td>
                                        {months.map(m => {
                                            const val = totals[m] || 0;
                                            return (
                                                <td key={m} className={`px-6 py-2.5 text-right font-mono text-[12px] font-black ${isCalc ? (val < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-500') : 'text-slate-800 dark:text-slate-100'}`}>
                                                    {formatCurrency(val)}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    {!isCalc && isExpanded && tree.map(node => renderNode(node, 0, months))}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="px-8 py-2 bg-slate-50/80 border-t border-slate-100 flex justify-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest italic">Cierre Contable Certificado Aliaddo 2026</span>
            </div>
        </div>
    );
};
