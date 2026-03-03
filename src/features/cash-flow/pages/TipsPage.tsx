import React, { useState } from 'react';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { Column } from '../../../components/ui/SmartDataTable';
import { TipRecord, tipsService } from '../../../services/tipsService';
import { TableCellsIcon, ArrowPathIcon } from '../../../components/ui/Icons';
import { TipsFormModal } from '../components/TipsFormModal';
import { calculateTipDistribution } from '../../../utils/tipCalculations';
import { fetchShiftsCountPorFecha } from '../../../services/firebaseTurnosService';
import { Button } from '../../../components/ui/Button';
import { useUI } from '../../../context/UIContext';

const EditableCell = ({
    value,
    type,
    isEditing,
    onStartEdit,
    onSave,
    onCancel,
    displayValue
}: {
    value: string | number;
    type: string;
    isEditing: boolean;
    onStartEdit: () => void;
    onSave: (val: string) => void;
    onCancel: () => void;
    displayValue?: React.ReactNode;
}) => {
    const [tempValue, setTempValue] = useState(String(value));

    if (isEditing) {
        return (
            <input
                type={type}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                onBlur={() => onSave(tempValue)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onSave(tempValue);
                    if (e.key === 'Escape') onCancel();
                }}
                className="w-16 px-2 py-1 mx-auto rounded border border-purple-500 bg-white dark:bg-slate-800 text-[13px] font-normal tabular-nums text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500 shadow-sm z-[100] text-center"
                autoFocus
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <div onDoubleClick={onStartEdit} className="cursor-text w-full h-full flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/5 rounded px-1 transition-colors">
            {displayValue || value}
        </div>
    );
};

export const TipsPage: React.FC = () => {
    const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const { setAlertModal } = useUI();

    const handleSyncDivisions = async () => {
        setIsSyncing(true);
        try {
            const tips = await tipsService.getTips();
            if (tips.length === 0) {
                setAlertModal({ isOpen: true, type: 'info', title: 'Aviso', message: 'No hay propinas registradas para sincronizar.' });
                return;
            }

            const dates = tips.map(t => t.fecha).sort();
            const minDate = dates[0];
            const maxDate = dates[dates.length - 1];

            const turnosPorFecha = await fetchShiftsCountPorFecha(minDate, maxDate);

            let updatedCount = 0;
            for (const tip of tips) {
                const divisionCorrecta = turnosPorFecha[tip.fecha] || 1;
                if (tip.division !== divisionCorrecta) {
                    const { comisionMediosElectronicos, basePropinas, totalPersona, unp } = calculateTipDistribution(Number(tip.total_propinas) || 0, divisionCorrecta);
                    await tipsService.updateTip(tip.id, {
                        division: divisionCorrecta,
                        comision_medios_electronicos: comisionMediosElectronicos,
                        base_propinas: basePropinas,
                        total_persona: totalPersona,
                        unp: unp
                    });
                    updatedCount++;
                }
            }

            if (updatedCount > 0) {
                setAlertModal({
                    isOpen: true,
                    type: 'success',
                    title: 'Sincronización Completada',
                    message: `Se actualizaron ${updatedCount} registros de propinas.`,
                    onConfirm: () => window.location.reload()
                });
            } else {
                setAlertModal({ isOpen: true, type: 'success', title: 'Al Día', message: 'Todas las divisiones ya están sincronizadas.' });
            }
        } catch (error) {
            console.error("Error sincronizando divisiones:", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al sincronizar con Turnos App.' });
        } finally {
            setIsSyncing(false);
        }
    };

    const handleUpdateDivision = async (item: TipRecord, newVal: string) => {
        setEditingCell(null);
        const div = parseInt(newVal, 10);
        if (isNaN(div) || div < 1) return;

        const {
            comisionMediosElectronicos,
            basePropinas,
            totalPersona,
            unp
        } = calculateTipDistribution(Number(item.total_propinas) || 0, div);

        try {
            await tipsService.updateTip(item.id, {
                division: div,
                comision_medios_electronicos: comisionMediosElectronicos,
                base_propinas: basePropinas,
                total_persona: totalPersona,
                unp: unp
            });
            window.location.reload();
        } catch (error) {
            console.error("Error updating division:", error);
        }
    };

    const columns: Column<TipRecord>[] = [
        {
            key: 'fecha',
            label: 'FECHA',
            type: 'date',
            sortable: true,
            filterable: true,
            width: 'w-32',
        },
        {
            key: 'total_propinas',
            label: 'TOTAL PROPINAS',
            type: 'currency',
            sortable: true,
            align: 'text-right',
        },
        {
            key: 'comision_medios_electronicos',
            label: 'COMISION MEDIOS ELECTRONICOS',
            type: 'currency',
            sortable: true,
            align: 'text-right',
            render: (value: number) => (
                <span className="tabular-nums text-rose-600 dark:text-rose-400">
                    -${Math.round(Number(value || 0)).toLocaleString('es-CO')}
                </span>
            )
        },
        {
            key: 'base_propinas',
            label: 'BASE PROPINAS',
            type: 'currency',
            sortable: true,
            align: 'text-right',
        },
        {
            key: 'division',
            label: 'DIVISION',
            type: 'number',
            sortable: true,
            align: 'text-center',
            render: (_, item: TipRecord) => (
                <EditableCell
                    value={item.division || 1}
                    type="number"
                    isEditing={editingCell?.id === item.id && editingCell?.field === 'division'}
                    onStartEdit={() => setEditingCell({ id: item.id, field: 'division' })}
                    onSave={(val) => handleUpdateDivision(item, val)}
                    onCancel={() => setEditingCell(null)}
                    displayValue={
                        <span className="tabular-nums">
                            {item.division || 0}
                        </span>
                    }
                />
            )
        },
        {
            key: 'total_persona',
            label: 'TOTAL X PERSONA',
            type: 'currency',
            sortable: true,
            align: 'text-right',
        },
        {
            key: 'unp',
            label: 'UNP',
            type: 'currency',
            sortable: true,
            align: 'text-right',
            className: 'font-result',
            render: (value: number, item: TipRecord) => {
                const commission = Number(item.comision_medios_electronicos || 0);
                const perPerson = Number(item.total_persona || 0);
                // Si el valor guardado es 0 o NaN, calculamos al vuelo para mostrarlo bonito
                const displayValue = (Number(value) > 0) ? value : (commission + perPerson);

                return (
                    <span className="tabular-nums">
                        ${Math.round(displayValue).toLocaleString('es-CO')}
                    </span>
                );
            }
        }
    ];

    return (
        <SmartDataPage<TipRecord>
            title="Registro de Propinas"
            icon={<TableCellsIcon className="h-6 w-6 text-purple-600" />}
            breadcrumbs={[
                { label: 'Caja', href: '/arqueo' },
                { label: 'Propinas' }
            ]}
            supabaseTableName="tips_records"
            fetchData={async () => {
                await tipsService.syncTips();
                return await tipsService.getTips();
            }}
            columns={columns}
            dateFieldMode="date"
            dateField="fecha"
            enableAdd={true}
            searchPlaceholder="Buscar por fecha..."
            customActions={
                <Button
                    variant="secondary"
                    className="gap-2 border-purple-500/30 text-purple-600 hover:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20"
                    onClick={handleSyncDivisions}
                    disabled={isSyncing}
                >
                    <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Turnos'}</span>
                </Button>
            }
            infoDefinitions={[
                {
                    label: 'Fecha',
                    description: 'Indica el día calendario en que se generó y registró el recaudo de propinas.',
                    origin: 'Arqueo de Caja / Registro Manual'
                },
                {
                    label: 'Total Propinas',
                    description: 'Es el monto bruto recaudado por concepto de propinas durante la jornada.',
                    origin: 'Historial de Cierres (Módulo de Caja)'
                },
                {
                    label: 'Comisión Medios Electrónicos',
                    description: 'Representa el costo financiero por el procesamiento de pagos electrónicos.',
                    calculation: '3% sobre el Total de Propinas'
                },
                {
                    label: 'Base Propinas',
                    description: 'Es el capital neto disponible para ser distribuido después de descontar los costos operativos.',
                    calculation: 'Total Propinas - Comisiones'
                },
                {
                    label: 'División',
                    description: 'Número de trabajadores operativos que tienen derecho a participar en el reparto de la bolsa de propinas.',
                    origin: 'Fuerza Laboral del Día'
                },
                {
                    label: 'Total x Persona',
                    description: 'Monto exacto que debe recibir cada trabajador individualmente.',
                    calculation: 'Base Propinas / Número de Personas'
                },
                {
                    label: 'UNP',
                    description: 'Valor total que se consolida en el fondo UNP, sumando la reserva operativa y una parte proporcional del reparto.',
                    calculation: 'Comisión Medios + Total x Persona'
                }
            ]}
            renderForm={(isOpen, onClose, onSubmit, item) => (
                <TipsFormModal
                    isOpen={isOpen}
                    onClose={onClose}
                    onSubmit={onSubmit}
                    initialData={item}
                />
            )}
            mapImportRow={(row) => {
                const total = Number(row.total_propinas || row['TOTAL PROPINAS'] || 0);
                const division = Number(row.division || row['DIVISION'] || 1);
                const calc = calculateTipDistribution(total, division);

                return {
                    fecha: row.fecha || row.FECHA,
                    total_propinas: total,
                    division: division,
                    comision_medios_electronicos: calc.comisionMediosElectronicos,
                    base_propinas: calc.basePropinas,
                    total_persona: calc.totalPersona,
                    unp: calc.unp
                };
            }}
        />
    );
};

export default TipsPage;
