import React, { useState } from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { WalletIcon } from '../../../components/ui/Icons';
import { BankDuplicateDetector } from '../components/BankDuplicateDetector';

export interface CtaAhorrosJulianRow {
    id: string;
    fecha: string;
    descripcion: string;
    referencia: string;
    valor: number;
}

export const AccountingCtaAhorrosJulian: React.FC = () => {
    const [reloadKey, setReloadKey] = useState(0);

    return (
        <SmartDataPage<CtaAhorrosJulianRow>
            key={reloadKey}
            title="Cta Ahorros Julian"
            breadcrumbs={[{ label: 'Contabilidad' }, { label: 'Cta Ahorros Julian' }]}
            icon={<WalletIcon className="h-7 w-7 text-primary" />}
            supabaseTableName="accounting_cta_ahorros_julian"
            importMatchFields={['fecha', 'valor', 'descripcion', 'referencia']}
            enableMonthDelete={true}
            dateFieldMode="date"
            dateField="fecha"
            searchPlaceholder="Buscar en cuenta..."
            defaultSort={[{ key: 'fecha', ascending: false }]}
            enableAdd={true}
            customActions={
                <BankDuplicateDetector 
                    tableName="accounting_cta_ahorros_julian" 
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
                const getField = (names: string[]) => {
                    const lcNames = names.map(n => n.toLowerCase());
                    const key = Object.keys(row).find(k => lcNames.includes(k.toLowerCase()));
                    return key ? row[key] : undefined;
                };

                let rawFecha = getField(['fecha', 'date']);

                if (!rawFecha) {
                    console.error('❌ Fila sin fecha detectada:', row);
                    return { valor: 0, descripcion: 'ERROR: SIN FECHA', fecha: '1900-01-01' } as any;
                }

                let fecha = rawFecha;

                // If it's an excel serial date, convert it
                if (typeof fecha === 'number' || (!isNaN(Number(fecha)) && String(fecha).length <= 6)) {
                    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                    const dateObj = new Date(excelEpoch.getTime() + Math.round(Number(fecha) * 86400000));
                    fecha = dateObj.toISOString().split('T')[0];
                } else if (fecha instanceof Date) {
                    fecha = fecha.toISOString().split('T')[0];
                } else if (typeof fecha === 'string') {
                    const str = fecha.trim();
                    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                    if (dmyMatch) {
                        const [_, d, m, y] = dmyMatch;
                        fecha = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    } else {
                        const d = new Date(str);
                        if (!isNaN(d.getTime())) fecha = d.toISOString().split('T')[0];
                        else fecha = str;
                    }
                }



                const parseNum = (raw: any): number => {
                    if (raw === undefined || raw === null || raw === '') return 0;
                    if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
                    let numStr = String(raw).trim();
                    if (numStr.includes(',') && numStr.includes('.')) {
                        numStr = numStr.replace(/,/g, '');
                    } else if (numStr.includes(',')) {
                        const parts = numStr.split(',');
                        if (parts[parts.length - 1].length === 3) numStr = numStr.replace(/,/g, '');
                        else numStr = numStr.replace(',', '.');
                    }
                    const n = Number(numStr.replace(/[^0-9.\-]/g, ''));
                    return isNaN(n) ? 0 : n;
                };

                let valor = parseNum(getField(['valor', 'value', 'monto', 'total']));
                
                if (valor === 0) {
                    const debito = parseNum(getField(['debito', 'débito', 'debit']));
                    const credito = parseNum(getField(['credito', 'crédito', 'credit']));
                    if (debito !== 0 || credito !== 0) {
                        valor = debito - credito;
                    }
                }

                return {
                    fecha,
                    descripcion: String(getField(['descripción', 'descripcion', 'descripción del movimiento', 'description']) ?? '').trim(),
                    referencia: String(getField(['referencia', 'ref', 'documento', 'document']) ?? '').trim(),
                    valor
                } as Partial<CtaAhorrosJulianRow>;
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
