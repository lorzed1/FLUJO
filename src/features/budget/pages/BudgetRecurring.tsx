import React, { useState, useEffect, useMemo } from 'react';
import { Column } from '../../../components/ui/SmartDataTable';
import { budgetService } from '../../../services/budget';
import { RecurrenceRule, RecurrenceFrequency } from '../../../types/budget';
import { ArrowPathIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { PencilIcon, TrashIcon } from '../../../components/ui/Icons';
import { RecurrenceRuleFormModal } from '../components/RecurrenceRuleFormModal';
import { useUI } from '../../../context/UIContext';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { BudgetCategories } from './BudgetCategories';
import * as XLSX from 'xlsx';

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

    const columns: Column<RecurrenceRule>[] = useMemo(() => [
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
            type: 'currency',
            sortable: true,
            align: 'text-right' as const,
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
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-all rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        title="Duplicar regla"
                    >
                        <DocumentDuplicateIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-purple-600 transition-all rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        title="Editar regla"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-slate-300 hover:text-red-600 transition-all rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
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

    // --- Importar desde Excel ---
    const handleImportFile = async (file: File) => {
        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet);

            if (rows.length === 0) {
                setAlertModal({ isOpen: true, type: 'info', title: 'Archivo vacío', message: 'No se encontraron filas en el archivo.' });
                return;
            }

            // Helper para buscar valor con nombres flexibles
            const get = (row: Record<string, any>, ...keys: string[]) => {
                for (const k of keys) {
                    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
                }
                return undefined;
            };

            const parseFrequency = (val: any): RecurrenceFrequency => {
                const s = String(val || '').toLowerCase().trim();
                if (s.includes('seman') || s === 'weekly') return 'weekly';
                if (s.includes('anual') || s === 'yearly') return 'yearly';
                return 'monthly'; // default
            };

            let created = 0;
            let skipped = 0;

            for (const row of rows) {
                const title = String(get(row, 'title', 'titulo', 'Titulo', 'TITULO', 'Descripción', 'descripcion', 'DESCRIPCION', 'nombre', 'Nombre', 'NOMBRE') || '').trim();
                const amount = Number(get(row, 'amount', 'monto', 'Monto', 'MONTO', 'valor', 'Valor', 'VALOR') || 0);

                if (!title || amount <= 0) {
                    skipped++;
                    continue;
                }

                const category = String(get(row, 'category', 'categoria', 'Categoria', 'CATEGORIA', 'Categoría', 'categoría') || 'General').trim();
                const frequency = parseFrequency(get(row, 'frequency', 'frecuencia', 'Frecuencia', 'FRECUENCIA'));
                const dayToSend = Number(get(row, 'dayToSend', 'day_to_send', 'dia', 'Dia', 'DIA', 'Día', 'día', 'day') || 1);
                const interval = Number(get(row, 'interval', 'intervalo', 'Intervalo', 'INTERVALO') || 1);
                const description = String(get(row, 'description', 'descripcion', 'Descripcion', 'DESCRIPCION', 'notas', 'Notas') || '').trim();
                const startDate = String(get(row, 'startDate', 'start_date', 'fecha_inicio', 'Fecha Inicio', 'FECHA INICIO') || new Date().toISOString().split('T')[0]);

                await budgetService.addRecurrenceRule({
                    title,
                    amount,
                    frequency,
                    interval,
                    dayToSend,
                    startDate,
                    category,
                    description: description || undefined,
                    active: true,
                });
                created++;
            }

            await loadRules();
            setAlertModal({
                isOpen: true,
                type: 'success',
                title: 'Importación Exitosa',
                message: `Se crearon ${created} reglas recurrentes.${skipped > 0 ? ` ${skipped} filas omitidas (sin título o monto).` : ''}`
            });
        } catch (error: any) {
            console.error('Error importing rules:', error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error de Importación', message: error.message || 'No se pudo procesar el archivo.' });
        }
    };

    // --- RENDER ---
    return (
        <>
            <SmartDataPage<RecurrenceRule>
                title="Gastos Recurrentes"
                icon={<ArrowPathIcon className="h-6 w-6 text-purple-600" />}
                breadcrumbs={[
                    { label: 'Egresos', href: '/budget' },
                    { label: 'Recurrentes' }
                ]}
                supabaseTableName="budget_recurrence_rules"
                fetchData={budgetService.getRecurrenceRules}
                columns={columns}
                enableAdd={true}
                onAdd={handleCreate}
                searchPlaceholder="Buscar regla..."
                infoDefinitions={[
                    {
                        label: 'Descripción',
                        description: 'Nombre asignado a la regla para identificar el concepto del gasto recurrente.',
                        origin: 'Configuración de Regla'
                    },
                    {
                        label: 'Monto',
                        description: 'Cantidad de dinero que el sistema proyectará automáticamente en cada ciclo.',
                        origin: 'Presupuesto Estimado'
                    },
                    {
                        label: 'Categoría',
                        description: 'Grupo administrativo al que pertenece la regla para fines de reporte mensual.',
                        origin: 'Módulo de Categorías'
                    },
                    {
                        label: 'Frecuencia',
                        description: 'Define cada cuánto tiempo se repite el gasto (Semanal, Mensual o Anual) y en qué día específico.',
                        calculation: 'Lógica Cron del Sistema'
                    },
                    {
                        label: 'Estado',
                        description: 'Las reglas Activas generan proyecciones en el calendario; las Inactivas permanecen guardadas pero no crean gastos futuros.',
                        origin: 'Interruptor de Operación'
                    }
                ]}
                mapImportRow={(row) => ({
                    // Mapping logic for Excel import
                    title: String(row.title || row.TITULO || row.Descripción || ''),
                    amount: Number(row.amount || row.Monto || row.Valor || 0),
                    category: String(row.category || row.Categoría || 'General'),
                    frequency: 'monthly', // simplistic mapping
                    dayToSend: 1,
                    active: true,
                    startDate: new Date().toISOString().split('T')[0]
                })}
            />

            <RecurrenceRuleFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialRule={selectedRule}
                isDuplicate={isDuplicating}
                onSubmit={handleSaveRule}
            />
        </>
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
