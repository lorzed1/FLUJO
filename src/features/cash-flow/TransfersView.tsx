import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TransferRecord } from '../../types';
import { DatabaseService } from '../../services/database';
import { ArrowPathIcon, BanknotesIcon, TrashIcon } from '../../components/ui/Icons';
import { SmartDataTable, Column } from '../../components/ui/SmartDataTable';
import { formatCOP } from '../../components/ui/Input';
import { useUI } from '../../context/UIContext';
import { Button } from '@/components/ui/Button';

const TransfersView: React.FC = () => {
    const { setAlertModal } = useUI();
    const [transfers, setTransfers] = useState<TransferRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isLoadedRef = useRef(false);

    const loadTransfers = useCallback(async (force = false) => {
        // Evitar recargas si ya se cargó (excepto si se fuerza)
        if (isLoadedRef.current && !force) return;

        setIsLoading(true);
        try {
            const data = await DatabaseService.getTransfers();

            const validData = (data || []).filter(t => {
                if (!t || typeof t !== 'object') return false;
                return (t as any).id;
            });

            const sorted = validData.sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                return dateB - dateA;
            });

            setTransfers(sorted);
            setError(null);
            isLoadedRef.current = true;
        } catch (err: any) {
            console.error('❌ Error en loadTransfers:', err);
            setError(`Error al cargar las transferencias: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTransfers();
    }, [loadTransfers]);

    const handleDelete = async (id: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: '¿Estás seguro de eliminar este registro? Si pertenece a un arqueo, podría regenerarse al guardar de nuevo.',
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await DatabaseService.deleteTransfer(id);
                    setTransfers(prev => prev.filter(t => t.id !== id));
                    setAlertModal({ isOpen: false, message: '' });
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar' });
                }
            }
        });
    };

    const handleBulkDelete = async (ids: Set<string>, customMessage?: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message: customMessage || `¿Eliminar ${ids.size} registros?`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await Promise.all(Array.from(ids).map(id => DatabaseService.deleteTransfer(id)));
                    setTransfers(prev => prev.filter(t => !ids.has(t.id)));
                    setSelectedIds(new Set()); // Clear selection
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registros eliminados.' });
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar masivamente' });
                }
            }
        });
    };

    const columns: Column<TransferRecord>[] = useMemo(() => [
        {
            key: 'date',
            label: 'Fecha',
            sortable: true,
            filterable: true,
            render: (val) => <span className="font-semibold text-[13px] text-gray-700 dark:text-gray-300">{val || ''}</span>
        },
        {
            key: 'type',
            label: 'Banco / Tipo',
            sortable: true,
            filterable: true,
            render: (val) => {
                const type = (val || 'unknown').toLowerCase();

                // Color dot indicator instead of full badge background
                const dotColor =
                    type === 'nequi' ? 'bg-pink-500' :
                        type === 'bancolombia' ? 'bg-yellow-400' :
                            type === 'davivienda' ? 'bg-red-500' :
                                'bg-gray-400';

                return (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-gray-200 bg-white dark:bg-slate-700 dark:border-slate-600 shadow-sm">
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        <span className="text-[11px] font-medium uppercase text-gray-700 dark:text-gray-200 tracking-wide">
                            {type}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'reference',
            label: 'Referencia / Origen',
            sortable: true,
            filterable: true,
            render: (val, item) => (
                <div className="flex flex-col">
                    <span className="font-medium text-[13px] text-gray-800 dark:text-gray-200">
                        {val || 'Sin referencia'}
                    </span>
                    {item?.arqueoId && (
                        <span className="text-[10px] text-gray-400 font-mono mt-0.5">
                            ID: {item.arqueoId.slice(0, 8)}...
                        </span>
                    )}
                </div>
            )
        },
        {
            key: 'description',
            label: 'Descripción',
            sortable: true,
            filterable: true,
            render: (val) => <span className="text-[13px] text-gray-600 dark:text-gray-400">{val || ''}</span>
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            render: (val) => (
                <span className="font-medium text-gray-900 dark:text-white font-mono text-[13px]">
                    {val ? formatCOP(Number(val)) : '$ 0'}
                </span>
            )
        }
    ], []);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden p-4 sm:p-6">
            {/* ERROR ALERT */}
            {error && (
                <div className="mx-5 mt-5 p-3 bg-red-50 text-red-700 rounded-md text-xs font-medium border border-red-100 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            {/* DATA TABLE */}
            <div className="flex-1 min-h-0">
                <SmartDataTable
                    data={transfers}
                    columns={columns}
                    enableSearch={true}
                    searchPlaceholder="Buscar transferencias..."
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    enableExport={true}
                    enableColumnConfig={true}
                    onBulkDelete={handleBulkDelete}
                    exportDateField="date"
                    containerClassName="border-none shadow-none"
                    // Botones extra en la barra de herramientas
                    renderExtraFilters={() => (
                        <>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={async () => {
                                    const corrupt = transfers.filter(t => !t.type || !t.amount);
                                    if (corrupt.length === 0) {
                                        setAlertModal({ isOpen: true, type: 'info', title: 'Información', message: 'No se encontraron registros corruptos.' });
                                        return;
                                    }
                                    await handleBulkDelete(new Set(corrupt.map(t => t.id)), 'Esto eliminará TODOS los registros de transferencia que no tengan tipo o monto válido. ¿Continuar?');
                                }}
                                className="h-8 gap-2 bg-white dark:bg-slate-800 text-xs font-medium border border-slate-200 dark:border-slate-700 text-gray-500 hover:text-red-600 hover:border-red-200"
                                title="Limpiar registros corruptos"
                            >
                                <TrashIcon className="h-3.5 w-3.5" />
                                Limpiar Basura
                            </Button>

                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => loadTransfers(true)}
                                className="h-8 w-8 p-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-500 hover:text-purple-600"
                                title="Recargar datos"
                            >
                                <ArrowPathIcon className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                            </Button>
                        </>
                    )}
                    // Eliminar individual
                    renderSelectionActions={(ids) => (
                        <Button
                            size="sm"
                            onClick={() => handleBulkDelete(ids)}
                            className="h-7 gap-1.5 bg-red-600 hover:bg-red-700 text-white border-none"
                        >
                            <TrashIcon className="h-3 w-3" /> Eliminar ({ids.size})
                        </Button>
                    )}
                />
            </div>
        </div>
    );
};

export default TransfersView;
