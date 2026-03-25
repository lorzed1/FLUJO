import React, { useState } from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { DocumentTextIcon } from '../../../components/ui/Icons';
import { useUI } from '../../../context/UIContext';
import { AccountingDuplicateDetector } from '../components/AccountingDuplicateDetector';

export interface AsientoContableRow {
    id: string;
    cuenta: string;
    contacto: string;
    identificacion: string;
    centro_costo: string;
    documento: string;
    fecha: string;
    descripcion: string;
    descripcion_movimiento: string;
    base: number;
    saldo_inicial: number;
    debito: number;
    credito: number;
    saldo_final: number;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export const AccountingAsientosContables: React.FC = () => {
    const [reloadTrigger, setReloadTrigger] = useState(0);

    return (
        <SmartDataPage<AsientoContableRow>
            key={reloadTrigger}
            title="Asientos Contables"
            supabaseTableName="accounting_asientos_contables"
            icon={<DocumentTextIcon className="w-6 h-6 text-purple-600" />}
            breadcrumbs={[
                { label: 'Inicio', href: '/' },
                { label: 'Contabilidad', href: '/accounting/consolidated' },
                { label: 'Asientos Contables' }
            ]}
            importMatchFields={['documento', 'cuenta', 'fecha', 'identificacion']}
            columns={[
                { key: 'cuenta', label: 'Cuenta', type: 'text', sortable: true },
                { key: 'contacto', label: 'Contacto', type: 'text', sortable: true },
                { key: 'identificacion', label: 'Identificación', type: 'text', sortable: true },
                { key: 'centro_costo', label: 'Centro de Costo', type: 'text', sortable: true },
                { key: 'documento', label: 'Documento', type: 'text', sortable: true },
                { key: 'fecha', label: 'Fecha', type: 'date', sortable: true },
                { key: 'descripcion', label: 'Descripción', type: 'text', sortable: true },
                { key: 'descripcion_movimiento', label: 'Descripción del movimiento', type: 'text', sortable: true },
                { key: 'base', label: 'Base', type: 'currency', align: 'text-right', sortable: true },
                { key: 'saldo_inicial', label: 'Saldo Inicial', type: 'currency', align: 'text-right', sortable: true },
                { key: 'debito', label: 'Debito', type: 'currency', align: 'text-right', sortable: true },
                { key: 'credito', label: 'Credito', type: 'currency', align: 'text-right', sortable: true },
                { key: 'saldo_final', label: 'Saldo Final', type: 'currency', align: 'text-right', sortable: true }
            ]}
            enableSelection={true}
            enableAdd={true}
            dateField="fecha"
            searchPlaceholder="Buscar en asientos contables..."
            defaultSort={[{ key: 'fecha', ascending: false }]}
            customActions={
                <AccountingDuplicateDetector 
                    tableName="accounting_asientos_contables" 
                    onDuplicatedDeleted={() => setReloadTrigger(t => t + 1)} 
                />
            }
            infoDefinitions={[
                {
                    label: 'Cuenta',
                    description: 'Código contable donde se imputa el movimiento según el PUC.',
                    origin: 'Registro Contable'
                },
                {
                    label: 'Contacto / Identificación',
                    description: 'Tercero (proveedor o cliente) asociado al movimiento y su identificación tributaria.',
                    origin: 'Maestro de Terceros'
                },
                {
                    label: 'Centro de Costo',
                    description: 'Área operativa específica que absorbe el movimiento contable.',
                    origin: 'Estructura Operativa'
                },
                {
                    label: 'Base / Saldo Inicial',
                    description: 'Monto imponible de la transacción y el estado de la cuenta previo al registro.',
                    origin: 'Saldo Anterior'
                },
                {
                    label: 'Débito / Crédito',
                    description: 'Representa la partida doble del movimiento contable.',
                    calculation: 'Dinámica Contable (Aumentos/Disminuciones)'
                },
                {
                    label: 'Saldo Final',
                    description: 'Resultado neto de la cuenta tras aplicar el movimiento.',
                    calculation: 'Saldo Inicial + Débito - Crédito'
                }
            ]}
            mapImportRow={(row) => {
                const getVal = (keys: string[]) => {
                    const foundKey = Object.keys(row).find(k => {
                        const normalizedK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, '_');
                        return keys.includes(normalizedK) || keys.includes(k);
                    });
                    return foundKey ? row[foundKey] : undefined;
                };

                // Helper: convierte valores de Excel a texto limpio.
                const textVal = (raw: any): string => {
                    if (raw === undefined || raw === null || raw === '') return '';
                    if (raw === 0 || raw === '0') return ''; // Excel empty cell in numeric column
                    return String(raw).trim();
                };
                
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

                let fechaRaw = getVal(['fecha', 'date', 'fecha_movimiento']);
                let fDate: Date | null = null;
                if (fechaRaw !== undefined && fechaRaw !== null && fechaRaw !== '') {
                    const numFecha = Number(fechaRaw);
                    if (!isNaN(numFecha) && numFecha > 10000 && numFecha < 100000) {
                        fDate = new Date(Math.round((numFecha - 25569) * 86400 * 1000));
                    } else {
                        fDate = new Date(fechaRaw);
                        if (isNaN(fDate.getTime()) && typeof fechaRaw === 'string') {
                            const dmyMatch = fechaRaw.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
                            if (dmyMatch) fDate = new Date(`${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`);
                        }
                    }
                }

                const formatISO = (d: Date | null): string => {
                    if (!d || isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                // Normalizar identificaciones para que '00123' -> '123'
                const normId = (val: string): string => {
                    if (/^\d+$/.test(val)) return val.replace(/^0+/, '') || '0';
                    return val;
                };
                
                return {
                    cuenta: String(getVal(['cuenta', 'codigo_cuenta']) ?? '').trim(),
                    contacto: textVal(getVal(['contacto', 'tercero'])),
                    identificacion: normId(textVal(getVal(['identificacion', 'nit', 'cc', 'rut']))),
                    centro_costo: textVal(getVal(['centro_de_costo', 'centro_costo'])),
                    documento: String(getVal(['documento', 'comprobante']) ?? '').trim(),
                    fecha: formatISO(fDate),
                    descripcion: textVal(getVal(['descripcion', 'detalle'])),
                    descripcion_movimiento: textVal(getVal(['descripcion_del_movimiento', 'descripcion_movimiento'])),
                    base: parseNum(getVal(['base'])),
                    saldo_inicial: parseNum(getVal(['saldo_inicial'])),
                    debito: parseNum(getVal(['debito', 'debitos'])),
                    credito: parseNum(getVal(['credito', 'creditos'])),
                    saldo_final: parseNum(getVal(['saldo_final'])),
                };
            }}
        />
    );
};
