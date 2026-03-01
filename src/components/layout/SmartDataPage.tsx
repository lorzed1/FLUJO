import React, { useState, useEffect } from 'react';
import { PageHeader } from './PageHeader';
import { SmartDataTable, Column } from '../ui/SmartDataTable';
import { DataImportWizard, ParsedRow } from '../ui/DataImportWizard';
import { SmartDataFormModal } from '../ui/SmartDataFormModal';
import { Button } from '../ui/Button';
import { CalendarDaysIcon, TrashIcon } from '../ui/Icons';
import { useUI } from '../../context/UIContext';
import { supabase } from '../../services/supabaseClient';
import { InfoModal } from '../ui/InfoModal';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

export interface SmartDataPageProps<T extends Record<string, any>> {
    title: string;
    icon: React.ReactNode;
    breadcrumbs: { label: string; href?: string }[];
    supabaseTableName: string;
    columns: Column<T>[];
    mapImportRow?: (row: Record<string, any>) => Partial<T>;
    enableMonthDelete?: boolean;
    dateFieldMode?: 'year-month' | 'date' | 'none'; // Defines how to handle bulk deletes
    yearField?: string; // e.g. 'year'
    monthField?: string; // e.g. 'month'
    dateField?: string; // e.g. 'date'
    defaultSort?: { key: string; ascending: boolean }[];
    searchPlaceholder?: string;
    enableSelection?: boolean;
    enableAdd?: boolean;
    fetchData?: () => Promise<T[]>;
    onAdd?: () => void;
    onEdit?: (item: T) => void;
    renderForm?: (isOpen: boolean, onClose: () => void, onSubmit: (data: Partial<T>) => Promise<void>, item?: T) => React.ReactNode;
    infoDefinitions?: { label: string; description: string; origin?: string; calculation?: string; }[];
}

export function SmartDataPage<T extends Record<string, any>>({
    title,
    icon,
    breadcrumbs,
    supabaseTableName,
    columns,
    mapImportRow,
    enableMonthDelete = false,
    dateFieldMode = 'none',
    yearField = 'year',
    monthField = 'month',
    dateField = 'date',
    defaultSort,
    searchPlaceholder = "Buscar en los datos...",
    enableSelection = true,
    enableAdd = false,
    onAdd,
    onEdit,
    fetchData,
    renderForm,
    infoDefinitions
}: SmartDataPageProps<T>) {
    const [data, setData] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isImportOpen, setImportOpen] = useState(false);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | undefined>(undefined);

    // For bulk actions in header
    const [showDeleteMenu, setShowDeleteMenu] = useState(false);
    const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
    const { alertModal, setAlertModal } = useUI();

    const loadData = async () => {
        setIsLoading(true);
        try {
            let records: any = [];

            if (fetchData) {
                records = await fetchData();
            } else {
                let query = supabase.from(supabaseTableName).select('*');

                // Apply default sorting if provided
                if (defaultSort && defaultSort.length > 0) {
                    defaultSort.forEach(sort => {
                        query = query.order(sort.key, { ascending: sort.ascending });
                    });
                } else if (dateFieldMode === 'year-month') {
                    query = query.order(yearField, { ascending: false }).order(monthField, { ascending: false });
                } else if (dateFieldMode === 'date') {
                    query = query.order(dateField, { ascending: false });
                }

                const { data: qData, error } = await query;
                if (error) {
                    console.error(`Error fetching data from ${supabaseTableName}:`, error);
                    throw error;
                }
                records = qData || [];
            }

            setData(records as T[]);

            // Setup periods for the delete menu
            if (dateFieldMode === 'year-month' && records) {
                const periods = new Set<string>();
                records.forEach((item: any) => {
                    if (item[yearField] && item[monthField]) {
                        periods.add(`${item[yearField]}-${String(item[monthField]).padStart(2, '0')}`);
                    }
                });
                setAvailablePeriods(Array.from(periods).sort((a, b) => b.localeCompare(a)));
            }
            if (dateFieldMode === 'date' && records) {
                const periods = new Set<string>();
                records.forEach((item: any) => {
                    if (item[dateField]) {
                        // Extract YYYY-MM
                        const d = new Date(item[dateField]);
                        if (!isNaN(d.getTime())) {
                            periods.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
                        } else if (typeof item[dateField] === 'string' && item[dateField].length >= 7) {
                            periods.add(item[dateField].substring(0, 7)); // Assume YYYY-MM format prefix
                        }
                    }
                });
                setAvailablePeriods(Array.from(periods).sort((a, b) => b.localeCompare(a)));
            }

        } catch (error: any) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: `No se pudieron cargar los datos de la tabla.` });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [supabaseTableName]);

    const handleImportData = async (importedData: ParsedRow[]) => {
        setIsLoading(true);
        try {
            const recordsToInsert = importedData.map(row => {
                const mappedBase = mapImportRow ? mapImportRow(row) : row;
                return {
                    ...mappedBase,
                    import_id: `imp-${Date.now()}`
                };
            });

            const { error } = await supabase
                .from(supabaseTableName)
                .insert(recordsToInsert);

            if (error) throw error;

            await loadData();
            setImportOpen(false);
            setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: `Se importaron ${importedData.length} registros exitosamente.` });
        } catch (error: any) {
            console.error("Error al importar a base de datos: ", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al guardar los registros en base de datos.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddData = async (newData: Partial<T>) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from(supabaseTableName)
                .insert([newData]);

            if (error) throw error;

            await loadData();
            setIsAddOpen(false);
            setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registro creado exitosamente.' });
        } catch (error: any) {
            console.error("Error al guardar en base de datos: ", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al guardar el registro en base de datos.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateData = async (updatedData: Partial<T>) => {
        if (!editingItem?.id) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from(supabaseTableName)
                .update(updatedData)
                .eq('id', editingItem.id);

            if (error) throw error;

            await loadData();
            setEditingItem(undefined);
            setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registro actualizado exitosamente.' });
        } catch (error: any) {
            console.error("Error al actualizar en base de datos: ", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al actualizar el registro.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeletePeriod = async (period: string) => {
        setAlertModal({
            isOpen: true,
            type: 'error',
            title: `Borrar Registros`,
            message: `¿Estás seguro que deseas borrar todos los registros del periodo ${period}?`,
            showCancel: true,
            confirmText: 'Borrar',
            onConfirm: async () => {
                setIsLoading(true);
                setAlertModal({ isOpen: false, message: '' });
                try {
                    let query = supabase.from(supabaseTableName).delete();

                    if (dateFieldMode === 'year-month') {
                        const [year, month] = period.split('-');
                        query = query.eq(yearField, Number(year)).eq(monthField, month);
                    } else if (dateFieldMode === 'date') {
                        query = query.like(dateField, `${period}%`);
                    }

                    const { error } = await query;
                    if (error) throw error;

                    await loadData();
                } catch (error) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo borrar el periodo.' });
                } finally {
                    setShowDeleteMenu(false);
                }
            }
        });
    };

    const handleClearAll = async () => {
        setAlertModal({
            isOpen: true,
            type: 'error',
            title: `Borrar TODOS los registros`,
            message: `¿Estás seguro que deseas vaciar completa y permanentemente esta base de datos?`,
            showCancel: true,
            confirmText: 'Borrar TODO',
            onConfirm: async () => {
                setIsLoading(true);
                setAlertModal({ isOpen: false, message: '' });
                try {
                    const { error } = await supabase
                        .from(supabaseTableName)
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all trick

                    if (error) throw error;
                    await loadData();
                } catch (error) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo limpiar la tabla.' });
                } finally {
                    setShowDeleteMenu(false);
                }
            }
        });
    };

    // Calculate generic Header actions
    let headerActions = null;
    if (onAdd || enableAdd) {
        headerActions = (
            <div className="flex items-center gap-3">
                {(onAdd || enableAdd) && (
                    <Button variant="primary" className="gap-2" onClick={onAdd ? onAdd : () => setIsAddOpen(true)}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">Nuevo Registro</span>
                    </Button>
                )}
            </div>
        );
    }

    // Generic delete single row via the prop `onDelete` for the SmartDataTable
    const handleDeleteRow = async (item: T) => {
        setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Eliminar Registro',
            message: '¿Estás seguro de eliminar este registro?',
            showCancel: true,
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setIsLoading(true);
                try {
                    const { error } = await supabase.from(supabaseTableName).delete().eq('id', item.id);
                    if (error) throw error;
                    await loadData();
                } catch (err: any) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudo eliminar el registro.' });
                } finally {
                    setIsLoading(false);
                }
            }
        })
    };

    const handleEditRow = (item: T) => {
        if (onEdit) {
            onEdit(item);
        } else {
            setEditingItem(item);
        }
    };

    const handleBulkDelete = async (ids: Set<string>) => {
        setAlertModal({
            isOpen: true,
            type: 'error',
            title: 'Eliminar Registros Múltiples',
            message: `¿Estás seguro de eliminar los ${ids.size} registros seleccionados? Esta acción no se puede deshacer.`,
            showCancel: true,
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setIsLoading(true);
                try {
                    const { error } = await supabase.from(supabaseTableName).delete().in('id', Array.from(ids));
                    if (error) throw error;
                    await loadData();
                } catch (err: any) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'No se pudieron eliminar los registros.' });
                } finally {
                    setIsLoading(false);
                }
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/20 overflow-hidden">
            <div className="px-6 pt-4 shrink-0 mb-4">
                <PageHeader
                    title={title}
                    breadcrumbs={breadcrumbs}
                    icon={icon}
                    actions={headerActions}
                />
            </div>

            <main className="flex-1 px-4 pb-4 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 flex flex-col font-sans bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <SmartDataTable<T>
                        data={data}
                        columns={columns}
                        loading={isLoading}
                        enableSearch={true}
                        searchPlaceholder={searchPlaceholder}
                        enableExport={true}
                        enableColumnConfig={true}
                        enableSelection={enableSelection}
                        onImport={mapImportRow ? () => setImportOpen(true) : undefined}
                        onDelete={handleDeleteRow}
                        onEdit={handleEditRow}
                        onBulkDelete={handleBulkDelete}
                        onInfoClick={infoDefinitions ? () => setIsInfoOpen(true) : undefined}
                        id={supabaseTableName}
                        containerClassName="h-full flex flex-col border-none"
                    />
                </div>
            </main>

            {renderForm ? (
                renderForm(
                    isAddOpen || !!editingItem,
                    () => { setIsAddOpen(false); setEditingItem(undefined); },
                    editingItem ? handleUpdateData : handleAddData,
                    editingItem
                )
            ) : (
                <>
                    {enableAdd && (
                        <SmartDataFormModal
                            isOpen={isAddOpen}
                            onClose={() => setIsAddOpen(false)}
                            onSubmit={handleAddData}
                            columns={columns}
                            title={`Nuevo Registro en ${title}`}
                        />
                    )}

                    {editingItem && (
                        <SmartDataFormModal
                            isOpen={true}
                            onClose={() => setEditingItem(undefined)}
                            onSubmit={handleUpdateData}
                            columns={columns}
                            title={`Editar Registro en ${title}`}
                            initialData={editingItem}
                        />
                    )}
                </>
            )}

            {mapImportRow && (
                <DataImportWizard
                    isOpen={isImportOpen}
                    onClose={() => setImportOpen(false)}
                    onImport={handleImportData}
                    title={`Importar a ${title}`}
                />
            )}

            {infoDefinitions && (
                <InfoModal
                    isOpen={isInfoOpen}
                    onClose={() => setIsInfoOpen(false)}
                    title={title}
                    definitions={infoDefinitions}
                />
            )}
        </div>
    );
}
