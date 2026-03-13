import React, { useMemo } from 'react';
import { TransferRecord } from '../../types';
import { DatabaseService } from '../../services/database';
import { ArrowDownTrayIcon, TrashIcon } from '../../components/ui/Icons';
import { Column } from '../../components/ui/SmartDataTable';
import { SmartDataPage } from '../../components/layout/SmartDataPage';
import { CategoryBadge } from '../../components/ui/CategoryBadge';
import { useUI } from '../../context/UIContext';
import { Button } from '@/components/ui/Button';

const TransfersView: React.FC = () => {
    const { setAlertModal } = useUI();

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
                return <CategoryBadge>{type}</CategoryBadge>;
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
                        <span className="text-xs2 text-gray-400 font-mono mt-0.5">
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

    const fetchData = async () => {
        const data = await DatabaseService.getTransfers();
        const validData = (data || []).filter(t => {
            if (!t || typeof t !== 'object') return false;
            return (t as any).id;
        });

        return validData.sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
        });
    };

    const handleDelete = async (item: TransferRecord) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación',
            message: '¿Estás seguro de eliminar este registro? Si pertenece a un arqueo, podría regenerarse al guardar de nuevo.',
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await DatabaseService.deleteTransfer(item.id);
                    setAlertModal({ isOpen: false, message: '' });
                    // recargar la pagina
                    window.location.reload();
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar' });
                }
            }
        });
    };

    const handleBulkDelete = async (ids: Set<string>) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message: `¿Eliminar ${ids.size} registros?`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                try {
                    await Promise.all(Array.from(ids).map(id => DatabaseService.deleteTransfer(id)));
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registros eliminados.', onConfirm: () => window.location.reload() });
                } catch (err) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Error al eliminar masivamente' });
                }
            }
        });
    };

    return (
        <SmartDataPage<TransferRecord>
            title="Medios de Pago"
            icon={<ArrowDownTrayIcon className="h-6 w-6 text-purple-600" />}
            breadcrumbs={[
                { label: 'Caja', href: '/arqueo' },
                { label: 'Medios de Pago' }
            ]}
            supabaseTableName="transfers"
            fetchData={fetchData}
            columns={columns}
            dateFieldMode="date"
            dateField="date"
            searchPlaceholder="Buscar transferencias..."
            onDelete={handleDelete}
            onBulkDelete={handleBulkDelete}
            enableAdd={false}
            enableSelection={true}
        />
    );
};

export default TransfersView;
