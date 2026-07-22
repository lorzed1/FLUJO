import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { TransactionTable } from '@/components/TransactionTable';
import { TransactionFilters, TableTransaction, TransactionSource, TransactionStatus } from '@/types';
import { Transaction as DomainTransaction } from '@/types';

export const TransactionView: React.FC = () => {
    const { transactions } = useData();

    const [filters, setFilters] = useState<TransactionFilters>({
        page: 1,
        pageSize: 50
    });

    // Mapeo de datos del dominio a la vista de tabla
    const tableData: TableTransaction[] = useMemo(() => {
        if (!transactions) return [];
        return transactions.map((t: DomainTransaction) => {
            // Inferencia de fuente basada en metadatos o tipo
            let source: TransactionSource = 'libro';
            if (t.metadata?.source) source = t.metadata.source as TransactionSource;
            else if (t.type === 'expense') source = 'banco'; // Default heuristic

            // Inferencia de estado
            let status: TransactionStatus = 'pendiente';
            if (t.status === 'completed') status = 'conciliado';

            return {
                id: t.id,
                date: t.date,
                amount: t.amount,
                description: t.description || 'Sin descripción',
                source: source,
                status: status,
                metadata: t.metadata || {},
                import_batch_id: null
            };
        });
    }, [transactions]);

    // Lógica de filtrado en cliente (ya que 'transactions' viene todo en memoria por ahora)
    const filteredData = useMemo(() => {
        return tableData.filter(item => {
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                if (!item.description?.toLowerCase().includes(searchLower) &&
                    !item.amount.toString().includes(searchLower)) {
                    return false;
                }
            }
            if (filters.dateFrom && item.date < filters.dateFrom) return false;
            if (filters.dateTo && item.date > filters.dateTo) return false;
            if (filters.minAmount && item.amount < filters.minAmount) return false;
            if (filters.maxAmount && item.amount > filters.maxAmount) return false;
            if (filters.source && filters.source.length > 0 && !filters.source.includes(item.source)) return false;
            if (filters.status && filters.status.length > 0 && !filters.status.includes(item.status)) return false;

            return true;
        });
    }, [tableData, filters]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Transacciones</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Gestión centralizada de movimientos financieros.
                    </p>
                </div>
            </div>

            <TransactionTable
                transactions={filteredData}
                filters={filters}
                onFiltersChange={setFilters}
                onEdit={(t) => console.log('Edit', t)}
                onDelete={(t) => console.log('Delete', t)}
            />
        </div>
    );
};
