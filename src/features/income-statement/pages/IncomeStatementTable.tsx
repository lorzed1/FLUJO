import React, { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import {
    PresentationChartBarIcon,
    ArrowUpTrayIcon,
    TrashIcon,
    CalendarDaysIcon,
    AdjustmentsHorizontalIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Button } from '../../../components/ui/Button';
import { IncomeStatementImportModal } from '../components/IncomeStatementImportModal';
import { IncomeStatementConfigModal } from '../components/IncomeStatementConfigModal';
import { ParsedIncomeRow } from '../utils/incomeParser';
import { useUI } from '../../../context/UIContext';
import { FinancialStatementMatrix } from '../components/FinancialStatementMatrix';
import { FinancialStatementService, FinancialStatementEntry, RowFormula } from '../../../services/financialStatement';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const IncomeStatementTable: React.FC = () => {
    const [data, setData] = useState<FinancialStatementEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [rowOrder, setRowOrder] = useState<string[]>([]);
    const [formulas, setFormulas] = useState<RowFormula[]>([]);
    const { setAlertModal } = useUI();
    const [showDeleteMonth, setShowDeleteMonth] = useState(false);
    const [selectedMonthsFilter, setSelectedMonthsFilter] = useState<string[]>([]);

    useEffect(() => {
        const loadInitial = async () => {
            try {
                setIsLoading(true);
                const [entries, savedOrder, savedFormulas] = await Promise.all([
                    FinancialStatementService.getAll(),
                    FinancialStatementService.getRowOrder(),
                    FinancialStatementService.getFormulas()
                ]);
                setData(entries);
                setRowOrder(savedOrder);
                setFormulas(savedFormulas);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadInitial();
    }, []);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        data.forEach(item => {
            if (item.date) {
                const d = new Date(item.date);
                if (!isNaN(d.getTime())) months.add(format(d, 'yyyy-MM'));
            }
        });
        return Array.from(months).sort();
    }, [data]);

    const filteredData = useMemo(() => {
        if (selectedMonthsFilter.length === 0) return data;
        return data.filter(item => {
            const m = item.date.substring(0, 7);
            return selectedMonthsFilter.includes(m);
        });
    }, [data, selectedMonthsFilter]);

    const availableCategories = useMemo(() => {
        const map = new Map<string, string>();
        data.forEach(item => {
            const code = (item.code || '').trim();
            const name = item.description || '';
            const id = code || name;
            // Solo incluimos cuentas principales (2 o 4 dígitos) o encabezados
            if (!code || code.length <= 4) {
                if (!map.has(id)) map.set(id, name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [data]);

    const handleBatchImport = async (rows: ParsedIncomeRow[]) => {
        try {
            setIsLoading(true);
            const batchId = `imp-${Date.now()}`;
            const newEntries: FinancialStatementEntry[] = rows.map((row, idx) => {
                const code = (row.data.code || '').trim();
                const description = (row.data.description || '').trim();
                const month = row.data.date.substring(0, 7); // YYYY-MM

                // ID Estable: Código + Mes (Para permitir múltiples meses del mismo código)
                // Si no hay código, usar descripción normalizada + Mes
                const idBase = code !== '' ? code : `H-${description.toUpperCase().replace(/\s+/g, '_')}`;
                const id = `${idBase}-${month}`;

                return {
                    id,
                    date: row.data.date,
                    code: code,
                    description: description,
                    category: row.data.category,
                    type: row.data.type,
                    amount: row.data.amount,
                    status: 'completed',
                    rowNumber: row.rowNumber
                };
            });

            await FinancialStatementService.saveBulk(newEntries);
            const updated = await FinancialStatementService.getAll();
            setData(updated);
            setIsImportModalOpen(false);
            setAlertModal({ isOpen: true, type: 'success', title: 'P&G Cargado', message: 'Los datos se han sincronizado con la matriz.' });
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo guardar la importación.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveOrder = async (newOrder: string[]) => {
        setRowOrder(newOrder);
        await FinancialStatementService.saveRowOrder(newOrder);
    };

    const handleSaveFormulas = async (newFormulas: RowFormula[]) => {
        setFormulas(newFormulas);
        await FinancialStatementService.saveFormulas(newFormulas);
    };

    const handleDeleteMonth = async (m: string) => {
        if (window.confirm(`¿Borrar datos de ${m}?`)) {
            try {
                setIsLoading(true);
                await FinancialStatementService.deleteMonth(m);
                const updated = await FinancialStatementService.getAll();
                setData(updated);
                setShowDeleteMonth(false);
            } catch (err) {
                setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo borrar el mes.' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('¿Estás seguro de que deseas borrar ABSOLUTAMENTE TODO el reporte? Esta acción no se puede deshacer.')) {
            try {
                setIsLoading(true);
                await FinancialStatementService.clearAll();
                setData([]);
                setRowOrder([]);
                setFormulas([]);
                setShowDeleteMonth(false);
                setAlertModal({ isOpen: true, type: 'success', title: 'Datos Borrados', message: 'Se han eliminado todos los registros y configuraciones.' });
            } catch (err) {
                setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo limpiar el reporte.' });
            } finally {
                setIsLoading(false);
            }
        }
    };

    if (isLoading && data.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <PresentationChartBarIcon className="absolute inset-0 m-auto h-6 w-6 text-primary animate-pulse" />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Cargando Entorno Financiero</span>
                </div>
            </div>
        );
    }

    const handleResetOrder = async () => {
        try {
            setIsLoading(true);
            await FinancialStatementService.saveRowOrder([]);
            setRowOrder([]);
            setIsConfigModalOpen(false);
            setAlertModal({ isOpen: true, type: 'success', title: 'Orden Restablecido', message: 'Se ha vuelto al orden original del Excel.' });
        } catch (err) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo restablecer el orden.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/20 overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
                <PageHeader
                    title="BD Estado de resultados"
                    breadcrumbs={[{ label: 'Estado de Resultados' }, { label: 'BD Estado de resultados' }]}
                    icon={<PresentationChartBarIcon className="h-7 w-7 text-primary" />}
                    actions={
                        <div className="flex items-center gap-3">
                            {data.length > 0 && (
                                <>
                                    <Button variant="secondary" onClick={() => setIsConfigModalOpen(true)}>
                                        <AdjustmentsHorizontalIcon className="w-5 h-5 mr-2" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Configuración</span>
                                    </Button>

                                    <div className="relative">
                                        <Button
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteMonth(!showDeleteMonth);
                                            }}
                                            className="text-rose-500 hover:bg-rose-50 transition-all font-black uppercase tracking-widest text-[10px]"
                                        >
                                            <CalendarDaysIcon className="w-5 h-5 mr-2" />
                                            Borrar Mes
                                        </Button>
                                        {showDeleteMonth && (
                                            <div
                                                className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-[1.2rem] shadow-2xl border border-gray-100 dark:border-slate-700 z-[100] overflow-hidden p-2 animate-in slide-in-from-top-2 duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {availableMonths.map(m => {
                                                    const [year, month] = m.split('-').map(Number);
                                                    const d = new Date(year, month - 1, 15);
                                                    const label = format(d, 'MMMM yyyy', { locale: es });

                                                    return (
                                                        <button
                                                            key={m}
                                                            onClick={() => handleDeleteMonth(m)}
                                                            className="w-full text-left px-4 py-2 text-[10px] font-black text-slate-700 dark:text-slate-200 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 rounded-lg transition-all flex justify-between items-center group uppercase tracking-widest"
                                                        >
                                                            {label}
                                                            <TrashIcon className="w-4 h-4 opacity-0 group-hover:opacity-100" />
                                                        </button>
                                                    );
                                                })}
                                                <div className="border-t border-gray-50 dark:border-slate-700 mt-1 pt-1">
                                                    <button
                                                        onClick={handleClearAll}
                                                        className="w-full text-left px-4 py-2 text-[10px] font-black text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-all flex justify-between items-center group uppercase tracking-widest"
                                                    >
                                                        Borrar Todo
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                            <Button variant="primary" onClick={() => setIsImportModalOpen(true)}>
                                <ArrowUpTrayIcon className="w-5 h-5 mr-2" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Cargar P&G Excel</span>
                            </Button>
                        </div>
                    }
                />

                {availableMonths.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar no-scrollbar scroll-smooth">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 whitespace-nowrap">Filtrar Períodos:</span>
                        <button
                            onClick={() => setSelectedMonthsFilter([])}
                            className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${selectedMonthsFilter.length === 0 ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-purple-400/50'}`}
                        >
                            Todos
                        </button>
                        {availableMonths.map(m => {
                            const [year, month] = m.split('-').map(Number);
                            const label = format(new Date(year, month - 1, 15), 'MMM yyyy', { locale: es });
                            const isActive = selectedMonthsFilter.includes(m);
                            return (
                                <button
                                    key={m}
                                    onClick={() => {
                                        if (isActive) setSelectedMonthsFilter(prev => prev.filter(x => x !== m));
                                        else setSelectedMonthsFilter(prev => [...prev, m]);
                                    }}
                                    className={`px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${isActive ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 scale-105' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-purple-400/50'}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col">
                {data.length > 0 ? (
                    <div className="flex-1 flex flex-col min-h-0" onClick={() => setShowDeleteMonth(false)}>
                        <FinancialStatementMatrix data={filteredData} />
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700 m-4">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <PresentationChartBarIcon className="w-10 h-10 text-primary" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 dark:text-white mb-2 uppercase tracking-widest">No hay datos procesados</h3>
                        <p className="text-slate-400 text-[11px] max-w-sm text-center font-medium mb-8 uppercase tracking-wider">Importa tu reporte de ingresos y egresos para ver la estructura contable comparativa.</p>
                        <Button onClick={() => setIsImportModalOpen(true)} variant="primary">Comenzar ahora</Button>
                    </div>
                )}
            </main>

            <IncomeStatementImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onBatchImport={handleBatchImport} />
            <IncomeStatementConfigModal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                availableCategories={availableCategories}
                currentOrder={rowOrder}
                onSaveOrder={handleSaveOrder}
                formulas={formulas}
                onSaveFormulas={handleSaveFormulas}
                onReset={handleResetOrder}
            />
        </div>
    );
};
