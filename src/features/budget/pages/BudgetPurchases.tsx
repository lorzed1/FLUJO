import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

export const BudgetPurchases: React.FC = () => {
    return (
        <div className="space-y-6">
            <PageHeader
                title="Compras"
                breadcrumbs={[
                    { label: 'Egresos', path: '/budget' },
                    { label: 'Compras' }
                ]}
                icon={<ShoppingBagIcon className="h-6 w-6" />}
            />

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 flex items-center justify-center min-h-[400px]">
                <div className="text-center text-gray-400">
                    <ShoppingBagIcon className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Módulo de Compras</h3>
                    <p className="max-w-sm mx-auto mt-2">
                        Esta sección está en construcción. Próximamente podrás gestionar tus órdenes de compra y proveedores aquí.
                    </p>
                </div>
            </div>
        </div>
    );
};
