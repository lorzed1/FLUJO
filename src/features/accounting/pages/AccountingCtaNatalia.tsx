import React from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { WalletIcon } from '../../../components/ui/Icons';

export interface CtaNataliaRow {
    id: string;
    fecha: string;
    descripcion: string;
    referencia: string;
    valor: number;
}

export const AccountingCtaNatalia: React.FC = () => {
    return (
        <SmartDataPage<CtaNataliaRow>
            title="Cta Natalia"
            breadcrumbs={[{ label: 'Contabilidad' }, { label: 'Cta Natalia' }]}
            icon={<WalletIcon className="h-7 w-7 text-primary" />}
            supabaseTableName="accounting_cta_natalia"
            enableMonthDelete={true}
            dateFieldMode="date"
            dateField="fecha"
            searchPlaceholder="Buscar en cuenta..."
            defaultSort={[{ key: 'fecha', ascending: false }]}
            enableAdd={true}
            infoDefinitions={[
                {
                    label: 'Fecha',
                    description: 'Día en que se realizó el movimiento bancario o el registro contable.',
                    origin: 'Extracto Bancario / Registro Manual'
                },
                {
                    label: 'Descripción',
                    description: 'Detalle del concepto del movimiento (Transferencia, Pago, Abono, etc).',
                    origin: 'Referencia Bancaria / Justificación'
                },
                {
                    label: 'Referencia',
                    description: 'Código de operación o número de guía relacionado con la transacción.',
                    origin: 'Voucher / Comprobante'
                },
                {
                    label: 'Valor',
                    description: 'Monto total de la transacción registrada.',
                    origin: 'Movimiento de Caja / Banco'
                }
            ]}
            mapImportRow={(row) => {
                // Safely extract the date
                let fecha = row['Fecha'] || row['fecha'] || row['Date'] || row['date'] || new Date().toISOString().split('T')[0];

                // If it's an excel serial date, convert it
                if (typeof fecha === 'number' || !isNaN(Number(fecha))) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const dateObj = new Date(excelEpoch.getTime() + Number(fecha) * 86400000);
                    fecha = dateObj.toISOString().split('T')[0];
                } else if (fecha instanceof Date) {
                    fecha = fecha.toISOString().split('T')[0];
                }

                let descripcion = String(row['Descripción'] || row['Descripcion'] || row['descripcion'] || row['Description'] || row['description'] || '');
                let referencia = String(row['Referencia'] || row['referencia'] || row['Ref'] || row['ref'] || '');

                let valor = Number(row['Valor'] || row['valor'] || row['Value'] || row['value']);
                if (isNaN(valor)) valor = 0;

                return {
                    fecha,
                    descripcion,
                    referencia,
                    valor
                } as Partial<CtaNataliaRow>;
            }}
            columns={[
                {
                    key: 'fecha',
                    label: 'Fecha',
                    type: 'date',
                    sortable: true,
                    filterable: true,
                    align: 'text-center'
                },
                {
                    key: 'descripcion',
                    label: 'Descripción',
                    sortable: true,
                    filterable: true,
                    align: 'text-left'
                },
                {
                    key: 'referencia',
                    label: 'Referencia',
                    sortable: true,
                    filterable: true,
                    align: 'text-left'
                },
                {
                    key: 'valor',
                    label: 'Valor',
                    type: 'currency',
                    sortable: true,
                    filterable: true,
                    align: 'text-right'
                }
            ]}
        />
    );
};
