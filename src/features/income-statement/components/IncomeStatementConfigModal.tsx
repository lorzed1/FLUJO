import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import {
    XMarkIcon,
    Bars3Icon,
    ArrowUpIcon,
    ArrowDownIcon,
    MagnifyingGlassIcon,
    CalculatorIcon,
    ArrowsPointingOutIcon,
    ArrowsPointingInIcon,
    ArrowPathIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useUI } from '../../../context/UIContext';
import { RowFormula } from '../../../services/financialStatement';

interface IncomeStatementConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableCategories: { id: string, name: string }[];
    currentOrder: string[];
    onSaveOrder: (newOrder: string[]) => void;
    formulas: RowFormula[];
    onSaveFormulas: (formulas: RowFormula[]) => void;
    onReset: () => void;
}

export const IncomeStatementConfigModal: React.FC<IncomeStatementConfigModalProps> = ({
    isOpen,
    onClose,
    availableCategories,
    currentOrder,
    onSaveOrder,
    formulas,
    onSaveFormulas,
    onReset
}) => {
    const { setAlertModal } = useUI();
    const [orderedCategories, setOrderedCategories] = useState<{ id: string, name: string }[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded');

    useEffect(() => {
        if (isOpen) {
            const orderedIds = new Set(currentOrder);
            const sorted = currentOrder
                .map(id => availableCategories.find(c => c.id === id))
                .filter((c): c is { id: string, name: string } => !!c);

            const newItems = availableCategories.filter(c => !orderedIds.has(c.id));
            setOrderedCategories([...sorted, ...newItems]);
        }
    }, [isOpen, availableCategories, currentOrder]);

    const filteredCategories = useMemo(() => {
        return orderedCategories.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orderedCategories, searchTerm]);

    const moveItem = (index: number, direction: 'up' | 'down') => {
        const item = filteredCategories[index];
        const actualIndex = orderedCategories.findIndex(c => c.id === item.id);
        if (actualIndex === -1) return;

        const targetIndex = direction === 'up' ? actualIndex - 1 : actualIndex + 1;
        if (targetIndex < 0 || targetIndex >= orderedCategories.length) return;

        const newOrder = [...orderedCategories];
        [newOrder[actualIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[actualIndex]];
        setOrderedCategories(newOrder);
    };

    const handleSave = () => {
        onSaveOrder(orderedCategories.map(c => c.id));
        setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Configuración Guardada',
            message: 'La jerarquía y el orden del P&G han sido actualizados.'
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden border border-white/10 ring-1 ring-black/10">

                {/* Header Deluxe */}
                <div className="px-10 py-8 bg-slate-50 dark:bg-slate-800/40 border-b border-gray-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-primary rounded-[1.5rem] shadow-xl shadow-primary/20">
                            <CalculatorIcon className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                                Estructura Financiera
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase rounded-md tracking-wider">Modo Avanzado</span>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest px-2 border-l border-slate-300 dark:border-slate-700">Configuración de Totales y Orden</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar cuenta o código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 pr-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm w-80 focus:ring-4 focus:ring-primary/10 outline-none transition-all shadow-sm"
                            />
                        </div>
                        <button
                            onClick={() => setViewMode(viewMode === 'compact' ? 'expanded' : 'compact')}
                            className="p-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm"
                            title="Alternar Vista"
                        >
                            {viewMode === 'compact' ? <ArrowsPointingOutIcon className="h-6 w-6" /> : <ArrowsPointingInIcon className="h-6 w-6" />}
                        </button>
                        <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all">
                            <XMarkIcon className="h-7 w-7 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Sub-header Information */}
                <div className="px-10 py-4 bg-blue-600 dark:bg-blue-500/10 flex items-center justify-between text-white dark:text-blue-400">
                    <div className="flex items-center gap-3">
                        <InformationCircleIcon className="h-5 w-5 shrink-0 animate-pulse" />
                        <p className="text-xs font-bold uppercase tracking-widest">
                            IMPORTANTE: El sistema agrupa automáticamente los códigos (e.g. 5105 suma todos los 5105XX). Las filas sin código son consideradas totales matemáticos.
                        </p>
                    </div>
                    <span className="text-[10px] font-black opacity-60">ID: CNF-PG-V2</span>
                </div>

                {/* Account List Grid */}
                <div className="flex-1 overflow-y-auto p-10 custom-scrollbar scroll-smooth">
                    <div className={`grid gap-4 ${viewMode === 'compact' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                        {filteredCategories.map((cat, index) => {
                            const isTotal = !cat.id.match(/^\d+$/) || cat.name.toUpperCase().includes('UTILIDAD');
                            const isDetail = cat.id.length > 4;

                            return (
                                <div
                                    key={cat.id}
                                    className={`
                                        flex items-center justify-between group transition-all duration-300
                                        ${viewMode === 'compact' ? 'p-4' : 'p-6'}
                                        rounded-[1.5rem] border
                                        ${isTotal ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/5' : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-700/50'}
                                        hover:shadow-2xl hover:shadow-primary/10 hover:border-primary/40 hover:-translate-y-1
                                    `}
                                >
                                    <div className="flex items-center gap-5 flex-1 min-w-0">
                                        <div className="flex flex-col items-center">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-1">
                                                <Bars3Icon className="h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase">#{index + 1}</span>
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {cat.id && <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md uppercase">{cat.id}</span>}
                                                {isTotal && <span className="text-[8px] font-black text-white bg-emerald-500 px-1.5 py-0.5 rounded uppercase tracking-tighter">Campo Calculado</span>}
                                            </div>
                                            <span className={`font-black tracking-tight ${isTotal ? 'text-slate-900 dark:text-white text-sm' : 'text-slate-600 dark:text-slate-400 text-xs'} truncate uppercase`}>
                                                {cat.name}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                        <button
                                            onClick={() => moveItem(index, 'up')}
                                            disabled={index === 0}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl disabled:opacity-10 transition-all shadow-md active:scale-95"
                                        >
                                            <ArrowUpIcon className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, 'down')}
                                            disabled={index === filteredCategories.length - 1}
                                            className="p-2.5 bg-slate-50 dark:bg-slate-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-xl disabled:opacity-10 transition-all shadow-md active:scale-95"
                                        >
                                            <ArrowDownIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Luxury */}
                <div className="px-10 py-8 bg-slate-50 dark:bg-slate-800/40 border-t border-gray-100 dark:border-slate-700/50 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (window.confirm('¿Deseas restablecer el orden original del Excel?')) {
                                onReset();
                            }
                        }}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-[0.2em]"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                        Restablecer Plan de Cuentas
                    </button>

                    <div className="flex gap-6">
                        <button onClick={onClose} className="px-8 py-3 text-sm font-black text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-[1rem] transition-all uppercase tracking-widest">
                            Cerrar
                        </button>
                        <Button
                            onClick={handleSave}
                            variant="primary"
                            className="!px-14 !py-4 shadow-[0_20px_50px_rgba(37,99,235,0.3)] !rounded-[1.2rem] text-xs font-black uppercase tracking-[0.2em]"
                        >
                            Guardar Estructura P&G
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
