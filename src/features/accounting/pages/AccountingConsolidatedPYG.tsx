import React from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { PresentationChartLineIcon } from '../../../components/ui/Icons';

export const AccountingConsolidatedPYG: React.FC = () => {
    return (
        <SmartDataPage
            title="Consolidado PYG"
            breadcrumbs={[{ label: 'Contabilidad' }, { label: 'Consolidado PYG' }]}
            icon={<PresentationChartLineIcon className="h-7 w-7 text-primary" />}
            supabaseTableName="accounting_consolidated_pyg"
            enableMonthDelete={true}
            dateFieldMode="year-month"
            searchPlaceholder="Buscar en consolidado..."
            infoDefinitions={[
                {
                    label: 'Año / Mes',
                    description: 'Representa el periodo contable al que pertenecen los saldos reportados.',
                    origin: 'Cierre Mensual de Operaciones'
                },
                {
                    label: 'Cuenta',
                    description: 'Código numérico estandarizado del Plan Único de Cuentas (PUC) utilizado para identificar el tipo de ingreso o gasto.',
                    origin: 'Software Contable / PUC'
                },
                {
                    label: 'Nombre de Cuenta',
                    description: 'Descripción semántica del código contable para facilitar su lectura.',
                    origin: 'Catálogo de Cuentas'
                },
                {
                    label: 'Total',
                    description: 'Saldo monetario final acumulado durante el periodo seleccionado para esa cuenta específica.',
                    origin: 'Balance de Prueba / Mayor y Balances'
                }
            ]}
            mapImportRow={(row) => {
                let year = Number(row['Año'] || row['year'] || row['YEAR'] || row['AÑO']);
                if (isNaN(year)) year = new Date().getFullYear();

                let month = String(row['Mes'] || row['month'] || row['MONTH'] || row['MES'] || '');
                let account = String(row['Cuenta'] || row['account'] || row['ACCOUNT'] || row['CUENTA'] || '');
                let accountName = String(row['Nombre de Cuenta'] || row['accountName'] || row['Nombre de cuenta'] || row['NOMBRE DE CUENTA'] || '');

                let total = Number(row['Total'] || row['total'] || row['TOTAL']);
                if (isNaN(total)) total = 0;

                return {
                    year,
                    month,
                    account,
                    account_name: accountName,
                    total
                };
            }}
            columns={[
                {
                    key: 'year',
                    label: 'Año',
                    sortable: true,
                    filterable: true,
                    align: 'text-center'
                },
                {
                    key: 'month',
                    label: 'Mes',
                    sortable: true,
                    filterable: true,
                    align: 'text-left'
                },
                {
                    key: 'account',
                    label: 'Cuenta',
                    sortable: true,
                    filterable: true,
                    align: 'text-left'
                },
                {
                    key: 'account_name', // Updated explicitly to match DB columns or map input
                    label: 'Nombre de Cuenta',
                    sortable: true,
                    filterable: true,
                    align: 'text-left'
                },
                {
                    key: 'total',
                    label: 'Total',
                    type: 'currency',
                    sortable: true,
                    filterable: false,
                    align: 'text-right',
                }
            ]}
        />
    );
};
