import React, { useState } from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { WalletIcon } from '../../../components/ui/Icons';
import { BankDuplicateDetector } from '../components/BankDuplicateDetector';
import { normalizeDate } from '../../../utils/dateUtils';

export interface CtaNataliaRow {
    id: string;
    fecha: string;
    descripcion: string;
    referencia: string;
    valor: number;
}

export const AccountingCtaNatalia: React.FC = () => {
    const [reloadKey, setReloadKey] = useState(0);

    return (
        <SmartDataPage<CtaNataliaRow>
            key={reloadKey}
            title="Cta Natalia"
            breadcrumbs={[{ label: 'Contabilidad' }, { label: 'Cta Natalia' }]}
            icon={<WalletIcon className="h-7 w-7 text-primary" />}
            supabaseTableName="accounting_cta_natalia"
            importMatchFields={['fecha', 'valor', 'descripcion', 'referencia']}
            enableMonthDelete={true}
            dateFieldMode="date"
            dateField="fecha"
            searchPlaceholder="Buscar en cuenta..."
            defaultSort={[{ key: 'fecha', ascending: false }]}
            enableAdd={true}
            customActions={
                <BankDuplicateDetector 
                    tableName="accounting_cta_natalia" 
                    onDuplicatedDeleted={() => setReloadKey(k => k + 1)} 
                />
            }
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
                let rawFecha = row['Fecha'] || row['fecha'] || row['Date'] || row['date'];
                
                if (!rawFecha) {
                    console.error('❌ Fila sin fecha detectada:', row);
                    return { valor: 0, descripcion: 'ERROR: SIN FECHA', fecha: '1900-01-01' } as any;
                }

                const fecha = normalizeDate(rawFecha, '1900-01-01');

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
