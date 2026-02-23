import React, { useState, useEffect, useMemo } from 'react';
import { SmartDataTable } from '../../../components/ui/SmartDataTable';
import { budgetService } from '../../../services/budget';
import { RecurrenceRule } from '../../../types/budget';
import { ArrowPathIcon, TrashIcon, PencilSquareIcon, PlusIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { PageHeader } from '../../../components/layout/PageHeader';
import { RecurrenceRuleFormModal } from '../components/RecurrenceRuleFormModal';
import { useUI } from '../../../context/UIContext';
import { Button } from '@/components/ui/Button';
import { BudgetCategories } from './BudgetCategories';

const BudgetRecurringContent: React.FC<{ onSwitchToCategories: () => void }> = ({ onSwitchToCategories }) => {
    const { setAlertModal } = useUI();
    const [rules, setRules] = useState<RecurrenceRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRule, setSelectedRule] = useState<RecurrenceRule | undefined>(undefined);
    const [isDuplicating, setIsDuplicating] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const loadRules = async () => {
        setLoading(true);
        try {
            const data = await budgetService.getRecurrenceRules();
            setRules(data);
        } catch (error) {
            console.error("Error loading rules:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRules();
    }, []);

    const handleSeed = async () => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Cargar Plantilla',
            message: '¿Estás seguro de que deseas cargar la configuración predeterminada? Esto añadirá nuevas reglas.',
            showCancel: true,
            confirmText: 'Cargar',
            onConfirm: async () => {
                try {
                    await budgetService.seedRecurringExpenses();
                    await loadRules();
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Configuración cargada exitosamente.' });
                } catch (error) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al cargar la configuración.' });
                }
            }
        });
    };

    const handleDelete = async (id: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: '¿Eliminar esta regla recurrente?',
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                await budgetService.deleteRecurrenceRule(id);
                loadRules();
                setAlertModal({ isOpen: false, message: '' });
            }
        });
    };

    const handleEdit = (rule: RecurrenceRule) => {
        setSelectedRule(rule);
        setIsDuplicating(false);
        setIsModalOpen(true);
    };

    const handleDuplicate = (rule: RecurrenceRule) => {
        setSelectedRule(rule);
        setIsDuplicating(true);
        setIsModalOpen(true);
    };

    const handleCreate = () => {
        setSelectedRule(undefined);
        setIsDuplicating(false);
        setIsModalOpen(true);
    };

    const handleSaveRule = async (data: any) => {
        try {
            const { id, ...ruleData } = data;
            if (id) {
                await budgetService.updateRecurrenceRule(id, ruleData);
            } else {
                await budgetService.addRecurrenceRule(ruleData);
            }
            loadRules();
        } catch (error) {
            console.error("Error saving rule:", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al guardar la regla' });
        }
    };

    const columns = useMemo(() => [
        {
            key: 'title',
            label: 'Descripción',
            sortable: true,
            filterable: true,
            render: (value: string) => <span>{value}</span>
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            align: 'text-right' as const,
            render: (value: number) => <span className="tabular-nums">${value.toLocaleString()}</span>
        },
        {
            key: 'category',
            label: 'Categoría',
            sortable: true,
            filterable: true,
            render: (value: string) => (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-600 uppercase tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400">
                    {value}
                </span>
            )
        },
        {
            key: 'frequency',
            label: 'Frecuencia',
            sortable: true,
            render: (value: string, item: RecurrenceRule) => {
                let text = '';
                const interval = item.interval || 1;

                if (value === 'weekly') {
                    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
                    text = interval === 1 ? `Semanal (${days[item.dayToSend] || item.dayToSend})` : `Cada ${interval} semanas`;
                } else if (value === 'monthly') {
                    text = interval === 1 ? `Mensual (Día ${item.dayToSend})` : `Cada ${interval} meses (Día ${item.dayToSend})`;
                } else {
                    text = 'Anual';
                }
                return <span>{text}</span>;
            }
        },
        {
            key: 'active',
            label: 'Estado',
            align: 'text-center' as const,
            render: (value: boolean) => (
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border shadow-sm w-fit mx-auto ${value ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className={`text-[10px] font-semibold uppercase tracking-widest ${value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
                        {value ? 'Activo' : 'Inactivo'}
                    </span>
                </div>
            )
        },
        {
            key: 'actions',
            label: '',
            width: 'w-24',
            align: 'text-right' as const,
            filterable: false,
            render: (_: any, item: RecurrenceRule) => (
                <div className="flex justify-end gap-1">
                    <button
                        onClick={() => handleDuplicate(item)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Duplicar regla"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleEdit(item)}
                        className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                        title="Editar regla"
                    >
                        <PencilSquareIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-gray-400 hover:text-rose-600 transition-colors"
                        title="Eliminar regla"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            )
        }
    ], []);

    // ... loading state handled same ...
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center text-slate-400">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium">Cargando reglas...</span>
                </div>
            </div>
        );
    }

    const handleBulkDelete = async (ids: Set<string>) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message: `¿Estás seguro de eliminar ${ids.size} reglas recurrentes?`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await Promise.all(Array.from(ids).map(id => budgetService.deleteRecurrenceRule(id)));
                    loadRules();
                    setSelectedIds(new Set());
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Reglas eliminadas correctamente.' });
                } catch (error) {
                    console.error("Error deleting rules:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar las reglas seleccionadas.' });
                }
            }
        });
    };

    const handleReset = async () => {
        setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Reiniciar Módulo Recurrente',
            message: 'PELIGRO: Esto eliminará TODAS las reglas recurrentes y sus proyecciones pendientes. Solo se conservará el historial de pagos reales. ¿Deseas continuar?',
            showCancel: true,
            confirmText: 'SÍ, BORRAR TODO',
            onConfirm: async () => {
                try {
                    await budgetService.resetRecurringModule();
                    await loadRules();
                    setAlertModal({ isOpen: true, type: 'success', title: 'Reiniciado', message: 'El módulo ha sido limpiado. Ahora puedes cargar la plantilla nuevamente.' });
                } catch (error) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un problema al reiniciar.' });
                }
            }
        });
    };

    return (
        <div>
            <PageHeader
                title="Gastos Recurrentes"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Recurrentes' }
                ]}
                icon={<ArrowPathIcon className="h-6 w-6" />}
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={onSwitchToCategories}
                            className="bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                        >
                            Categorías
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreate}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Nueva Regla
                        </Button>
                    </div>
                }
            />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mt-6">
                <SmartDataTable
                    data={rules}
                    columns={columns}
                    enableSearch={true}
                    enableColumnConfig={true}
                    enableExport={true}
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    onBulkDelete={handleBulkDelete}
                    searchPlaceholder="Buscar regla..."
                    containerClassName="border-none shadow-none"
                    // Eliminar individual (Selection Actions are handled by SmartDataTable internal logic usually, or customized via props if supported)
                    renderSelectionActions={(ids) => (
                        <Button
                            size="sm"
                            onClick={() => handleBulkDelete(ids)}
                            className="h-7 px-3 gap-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 dark:bg-transparent dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30 rounded-md text-xs font-semibold shadow-sm transition-colors"
                        >
                            <TrashIcon className="h-3.5 w-3.5" /> Eliminar
                        </Button>
                    )}
                />
            </div>

            <RecurrenceRuleFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialRule={selectedRule}
                isDuplicate={isDuplicating}
                onSubmit={handleSaveRule}
            />
        </div>
    );
};

export const BudgetRecurring: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'recurrent' | 'categories'>('recurrent');

    return (
        <div className="flex flex-col">
            <div className="flex-1">
                {activeTab === 'recurrent' ? (
                    <BudgetRecurringContent onSwitchToCategories={() => setActiveTab('categories')} />
                ) : (
                    <div>
                        <BudgetCategories hideHeader={false} onSwitchToRecurrentes={() => setActiveTab('recurrent')} />
                    </div>
                )}
            </div>
        </div>
    );
};
