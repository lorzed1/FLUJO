import React, { useState, useEffect, useMemo } from 'react';
import { TransferRecord } from '../../types';
import { FirestoreService } from '../../services/firestore';
import { ArrowPathIcon, BanknotesIcon } from '../../components/ui/Icons';
import { SmartDataTable, Column } from '../../components/ui/SmartDataTable';
import { formatCOP } from '../../components/ui/Input';
import { useUI } from '../../context/UIContext';

const TransfersView: React.FC = () => {
    const { setAlertModal } = useUI();
    const [transfers, setTransfers] = useState<TransferRecord[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadTransfers = async () => {
        setIsLoading(true);
        try {
            const data = await FirestoreService.getTransfers();
            console.log('📊 TransfersView: Datos brutos de Firestore:', data);

            // User Request: Sanitizar registros
            const validData = (data || []).filter(t => {
                if (!t || typeof t !== 'object') return false;
                // Al menos debe tener un ID para ser procesable por la tabla
                return (t as any).id;
            });

            console.log('✅ TransfersView: Datos válidos procesados:', validData);

            // Ordenar por fecha descendente
            const sorted = validData.sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime();
                const dateB = new Date(b.date || 0).getTime();
                return dateB - dateA;
            });

            setTransfers(sorted);
            setError(null);
        } catch (err: any) {
            console.error('❌ Error en loadTransfers:', err);
            setError(`Error al cargar las transferencias: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTransfers();
    }, []);

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
                    await FirestoreService.deleteTransfer(id);
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
                    await Promise.all(Array.from(ids).map(id => FirestoreService.deleteTransfer(id)));
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
            render: (val) => <span className="font-medium text-gray-700 dark:text-gray-300">{val || ''}</span>
        },
        {
            key: 'type',
            label: 'Banco / Tipo',
            sortable: true,
            filterable: true,
            render: (val) => {
                const type = (val || 'unknown').toLowerCase();
                const styles =
                    type === 'nequi' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                        type === 'bancolombia' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                            type === 'davivienda' ? 'bg-red-100 text-red-700 border-red-200' :
                                'bg-gray-100 text-gray-700 border-gray-200';

                return (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${styles} shadow-sm`}>
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
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                        {val || 'Sin referencia'}
                    </span>
                    {item?.arqueoId && (
                        <span className="text-[10px] text-gray-400 font-mono">
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
            render: (val) => <span className="text-sm text-gray-600 dark:text-gray-400">{val || ''}</span>
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            render: (val) => (
                <span className="font-bold text-gray-900 dark:text-white font-mono text-sm">
                    {val ? formatCOP(Number(val)) : '$ 0'}
                </span>
            )
        }
    ], []);

    return (
        <div className="h-full flex flex-col bg-white dark:bg-slate-900/50 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
            {/* Header / Stats */}
            <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50 rounded-t-2xl">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <BanknotesIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">Historial de Transferencias</h3>
                        <p className="text-xs text-gray-500">Registro automático desde Arqueos de Caja</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            const corrupt = transfers.filter(t => !t.type || !t.amount);
                            if (corrupt.length === 0) {
                                setAlertModal({ isOpen: true, type: 'info', title: 'Información', message: 'No se encontraron registros corruptos.' });
                                return;
                            }
                            await handleBulkDelete(new Set(corrupt.map(t => t.id)), 'Esto eliminará TODOS los registros de transferencia que no tengan tipo o monto válido. ¿Continuar?');
                        }}
                        className="p-2 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-widest"
                        title="Limpiar registros corruptos"
                    >
                        Limpiar Basura
                    </button>
                    <button
                        onClick={loadTransfers}
                        className="p-2 text-gray-400 hover:text-primary transition-colors"
                        title="Recargar datos"
                    >
                        <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ERROR ALERT */}
            {error && (
                <div className="mx-4 mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm border border-red-200">
                    {error}
                </div>
            )}

            {/* DATA TABLE */}
            <div className="flex-1 p-0 overflow-hidden">
                <SmartDataTable
                    data={transfers}
                    columns={columns}
                    enableSearch={true}
                    searchPlaceholder="Buscar por referencia, monto..."
                    enableSelection={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    enableExport={true}
                    enableColumnConfig={true}
                    onBulkDelete={handleBulkDelete}
                    containerClassName="h-full border-none shadow-none"
                    // Eliminar individual
                    renderSelectionActions={(ids) => (
                        <button
                            onClick={() => handleBulkDelete(ids)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border border-red-100"
                        >
                            Eliminar ({ids.size})
                        </button>
                    )}
                />
            </div>
        </div>
    );
};

export default TransfersView;
