import React from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

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

export const AccountingAsientosContables: React.FC = () => {
    return (
        <SmartDataPage<AsientoContableRow>
            title="Asientos Contables"
            supabaseTableName="accounting_asientos_contables"
            icon={<DocumentTextIcon className="w-6 h-6 text-purple-600" />}
            breadcrumbs={[
                { label: 'Inicio', href: '/' },
                { label: 'Contabilidad', href: '/accounting/consolidated' },
                { label: 'Asientos Contables' }
            ]}
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
                let fecha = row['Fecha'] || row['fecha'] || row['Date'] || row['date'] || new Date().toISOString().split('T')[0];
                return {
                    cuenta: row['Cuenta'] || row['cuenta'] || '',
                    contacto: row['Contacto'] || row['contacto'] || '',
                    identificacion: row['Identificación'] || row['Identificacion'] || row['identificacion'] || '',
                    centro_costo: row['Centro de Costo'] || row['Centro de costo'] || row['centro_costo'] || '',
                    documento: row['Documento'] || row['documento'] || '',
                    fecha: new Date(fecha).toISOString().split('T')[0],
                    descripcion: row['Descripción'] || row['Descripcion'] || row['descripcion'] || '',
                    descripcion_movimiento: row['Descripción del movimiento'] || row['Descripción del Movimiento'] || row['descripcion_movimiento'] || '',
                    base: parseFloat(row['Base'] || row['base'] || '0') || 0,
                    saldo_inicial: parseFloat(row['Saldo Inicial'] || row['saldo_inicial'] || '0') || 0,
                    debito: parseFloat(row['Debito'] || row['debito'] || '0') || 0,
                    credito: parseFloat(row['Credito'] || row['credito'] || '0') || 0,
                    saldo_final: parseFloat(row['Saldo Final'] || row['saldo_final'] || '0') || 0,
                };
            }}
        />
    );
};
