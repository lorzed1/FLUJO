import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TransferRecord } from '../../types';
import { DatabaseService } from '../../services/database';
import { TrashIcon } from '../../components/ui/Icons';
import { SmartDataTable, Column } from '../../components/ui/SmartDataTable';
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
            type: 'date',
            sortable: true,
            filterable: true,
        },
        {
            key: 'type',
            label: 'Banco / Tipo',
            sortable: true,
            filterable: true,
            render: (val) => {
                const type = (val || 'unknown').toLowerCase();

                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-gray-200 bg-gray-50 text-[10px] font-semibold text-gray-600 uppercase tracking-widest dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400">
                        {type}
                    </span>
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
                    <span className="block">
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
        },
        {
            key: 'amount',
            label: 'Monto',
            type: 'currency',
            sortable: true,
            align: 'text-right',
        }
    ], []);

    return (
        <div className="flex-1 min-h-0">
            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {error}
                </div>
            )}

            {/* DATA TABLE */}
            <div className="flex-1 min-h-0">
                <SmartDataTable
                    data={transfers}
                    columns={columns}
                    loading={isLoading}
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
                    id="cash-flow-transfers"
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
