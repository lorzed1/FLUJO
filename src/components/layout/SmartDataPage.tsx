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
import { InformationCircleIcon } from '@/components/ui/Icons';
import { ReconciliationBankService } from '../../services/reconciliationBankService';

export interface SmartDataPageProps<T extends Record<string, any>> {
    title: string;
    icon: React.ReactNode;
    breadcrumbs: { label: string; href?: string }[];
    supabaseTableName: string;
    columns: Column<T>[];
    mapImportRow?: (row: Record<string, any>) => Partial<T>;
    importMatchFields?: string[]; // Arrays of keys to build unique hash against existing DB
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
    onDelete?: (item: T) => Promise<void>;
    onBulkDelete?: (ids: Set<string>) => Promise<void>;
    renderForm?: (isOpen: boolean, onClose: () => void, onSubmit: (data: Partial<T>) => Promise<void>, item?: T) => React.ReactNode;
    infoDefinitions?: { label: string; description: string; origin?: string; calculation?: string; }[];
    customActions?: React.ReactNode;
}

export function SmartDataPage<T extends Record<string, any>>({
    title,
    icon,
    breadcrumbs,
    supabaseTableName,
    columns,
    mapImportRow,
    importMatchFields,
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
    onDelete,
    onBulkDelete,
    fetchData,
    renderForm,
    infoDefinitions,
    customActions
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
                let allData: any[] = [];
                let from = 0;
                const step = 1000;
                let fetchMore = true;

                while (fetchMore) {
                    let query = supabase.from(supabaseTableName).select('*').range(from, from + step - 1);

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
                    
                    if (qData && qData.length > 0) {
                        allData = [...allData, ...qData];
                        if (qData.length < step) {
                            fetchMore = false; // Got less than requested, no more data
                        } else {
                            from += step;
                        }
                    } else {
                        fetchMore = false;
                    }
                }
                records = allData;
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
            const recordsToUpsert = importedData.map(row => {
                const mappedBase = mapImportRow ? mapImportRow(row) : row;
                const finalRow: any = {
                    ...mappedBase
                };

                // Si la fila viene con un ID real (transferido desde la detección de duplicados)
                if (row.id && !String(row.id).startsWith('imported-') && !String(row.id).startsWith('uni-')) {
                    finalRow.id = row.id;
                } else {
                    // Si es nueva, debemos proveerle un UUID válido a Supabase
                    finalRow.id = crypto.randomUUID();
                }

                return finalRow;
            });

            const { error } = await supabase
                .from(supabaseTableName)
                .upsert(recordsToUpsert, { onConflict: 'id' });

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
                    let selQuery = supabase.from(supabaseTableName).select('id');
                    if (dateFieldMode === 'year-month') {
                        const [year, month] = period.split('-');
                        selQuery = selQuery.eq(yearField, Number(year)).eq(monthField, month);
                    } else if (dateFieldMode === 'date') {
                        selQuery = selQuery.like(dateField, `${period}%`);
                    }
                    const { data: recordsToDel } = await selQuery;
                    if (recordsToDel && recordsToDel.length > 0) {
                        const ids = recordsToDel.map((r: any) => r.id);
                        await ReconciliationBankService.cleanOrphanedReconciliationsByRecords(ids);
                    }

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
                    await supabase.from('reconciliation_history').delete().eq('source_table', supabaseTableName);

                    const { error } = await supabase
                        .from(supabaseTableName)
                        .delete()
                        .neq('id', '00000000-0000-0000-0000-000000000000'); 

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

    let headerActions = null;
    if (onAdd || enableAdd || customActions) {
        headerActions = (
            <div className="flex items-center gap-3">
                {customActions}
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
                    await ReconciliationBankService.cleanOrphanedReconciliationsByRecords([item.id]);
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

    const handleBulkDeleteInternal = async (ids: Set<string>) => {
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
                    const idsArr = Array.from(ids);
                    if (idsArr.length > 0) {
                        await ReconciliationBankService.cleanOrphanedReconciliationsByRecords(idsArr);
                    }

                    const { error } = await supabase.from(supabaseTableName).delete().in('id', idsArr);
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
        <div className="flex flex-col h-full bg-transparent dark:bg-slate-900/20 overflow-hidden">
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
                        onDelete={onDelete || handleDeleteRow}
                        onEdit={handleEditRow}
                        onBulkDelete={onBulkDelete || handleBulkDeleteInternal}
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
                    onCheckDuplicate={
                        (importMatchFields && mapImportRow && data)
                            ? (() => {
                                 // --- MOTOR DE NORMALIZACIÓN ---
                                 const norm = (v: any) => String(v ?? '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, ' ');
                                 const parseN = (v: any) => {
                                     const n = Number(String(v || '0').replace(/[^0-9.\-]/g, ''));
                                     return isNaN(n) ? 0 : Math.round(n * 100) / 100;
                                 };
                                 
                                 const normInt = (v: any) => {
                                     const s = norm(v);
                                     if (/^\d+$/.test(s)) return s.replace(/^0+/, '') || '0';
                                     return s;
                                 };

                                 // Determinar estrategia (Asientos vs Otros)
                                 const isAccounting = supabaseTableName.toLowerCase().includes('asientos') || 
                                                     (data.length > 0 && ('debito' in (data[0] as any) || 'credito' in (data[0] as any)));

                                 return (row: Record<string, any>) => {
                                     const mapped = mapImportRow!(row);
                                     const hash = importMatchFields!.map(f => {
                                         const v = mapped[f];
                                         if (f === 'identificacion' || f === 'cuenta' || f === 'documento') return normInt(v);
                                         return norm(v);
                                     }).join('|');
                                     
                                     // 1. BUSQUEDA EXACTA (Identidad Total por hash)
                                     const identical = data.find(dbRow => {
                                         const dbItem = dbRow as any;
                                         return importMatchFields!.every(field => {
                                             const v1 = dbItem[field];
                                             const v2 = mapped[field];
                                             if (field === 'identificacion' || field === 'cuenta' || field === 'documento') return normInt(v1) === normInt(v2);
                                             return norm(v1) === norm(v2);
                                         });
                                     });

                                     if (identical) {
                                         return { isDuplicate: true, existingId: (identical as any).id, existingRecord: identical, mappedRecord: mapped, hash };
                                     }

                                     // 2. BUSQUEDA INTELIGENTE (Candidatos por campos clave)
                                     let candidate: any = null;

                                     if (isAccounting) {
                                         // ESTRATEGIA CONTABLE: Doc + Cuenta + Montos + (Fecha || ID)
                                         candidate = data.find(dbRow => {
                                             const item = dbRow as any;
                                             
                                             // Criterios estructurales obligatorios
                                             const docMatch = normInt(item.documento) === normInt(mapped.documento);
                                             const accMatch = normInt(item.cuenta) === normInt(mapped.cuenta);
                                             const debMatch = parseN(item.debito) === parseN(mapped.debito);
                                             const creMatch = parseN(item.credito) === parseN(mapped.credito);
                                             
                                             const dateMatch = norm(item.fecha) === norm(mapped.fecha);
                                             const idMatch = normInt(item.identificacion) === normInt(mapped.identificacion);

                                             return (docMatch && accMatch && debMatch && creMatch) && (dateMatch || idMatch);
                                         });
                                     } else {
                                         // ESTRATEGIA BANCARIA: Fecha + Valor + Fuzzy Desc
                                         const rowValue = parseN(mapped.valor || mapped.debito || mapped.credito || 0);
                                         if (rowValue !== 0) {
                                             const candidates = data.filter(dbRow => {
                                                 const dbItem = dbRow as any;
                                                 const dbValue = parseN(dbItem.valor || dbItem.debito || dbItem.credito || 0);
                                                 return norm(dbItem.fecha) === norm(mapped.fecha) && dbValue === rowValue;
                                             });

                                             if (candidates.length === 1) {
                                                 const dbRow = candidates[0] as any;
                                                 const dbDesc = norm(dbRow.descripcion || dbRow.descripcion_movimiento);
                                                 const rowDesc = norm(mapped.descripcion || mapped.descripcion_movimiento);
                                                 
                                                 const isSimilar = dbDesc.includes(rowDesc) || rowDesc.includes(dbDesc) || 
                                                                  (dbDesc.substring(0, 12) === rowDesc.substring(0, 12));
                                                 
                                                 if (isSimilar) candidate = dbRow;
                                             }
                                         }
                                     }

                                     if (candidate) {
                                         return { isDuplicate: true, existingId: candidate.id, existingRecord: candidate, mappedRecord: mapped, hash };
                                     }

                                     return { isDuplicate: false, hash };
                                 };
                             })()
                            : undefined
                    }
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
