import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { ExclamationTriangleIcon, ArrowDownTrayIcon, CheckCircleIcon, Cog6ToothIcon } from '../../../components/ui/Icons';
import { useUI } from '../../../context/UIContext';
import { DatePicker } from '../../../components/ui/DatePicker';
import { FormGroup } from '../../../components/ui/FormGroup';
import { InternalTransfer } from '../../../services/reconciliationBankService';
import { TransferRecord } from '../../../types';
import { AccountingConfig, AccountingEntry } from '../../../types/accounting';
import { AccountingConfigModal } from '../../cash-flow/components/AccountingConfigModal';

interface TransferAccountingExportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    selectedTransfers: (InternalTransfer | TransferRecord)[];
}

const STORAGE_KEY = 'transfer_accounting_config';

const DEFAULT_TRANSFER_MAPPINGS: any[] = [
    { sourceField: 'Cta Natalia', label: 'CTA NATALIA', accountCode: '11100103', thirdPartyId: '1087993520', costCenter: 'Principal' },
    { sourceField: 'Cta Ahorros Julian', label: 'CTA AHORROS JULIAN', accountCode: '11100102', thirdPartyId: '1087993520', costCenter: 'Principal' },
    { sourceField: 'Caja', label: 'CAJA', accountCode: '11050501', thirdPartyId: '1087993520', costCenter: 'Principal' },
    { sourceField: 'Bancolombia', label: 'BANCOLOMBIA', accountCode: '11100101', thirdPartyId: '1087993520', costCenter: 'Principal' }
];

export const TransferAccountingExportWizard: React.FC<TransferAccountingExportWizardProps> = ({ isOpen, onClose, selectedTransfers = [] }) => {
    const { setAlertModal } = useUI();
    const [step, setStep] = useState(1);
    const [showConfig, setShowConfig] = useState(false);
    const [config, setConfig] = useState<AccountingConfig | null>(null);

    // Form Estado
    const [consecutive, setConsecutive] = useState<number>(0);
    const [docType, setDocType] = useState('TR');

    // Filtros Estado
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    // Previews
    const [previewEntries, setPreviewEntries] = useState<any[]>([]);
    const [balance, setBalance] = useState<{ debits: number, credits: number, diff: number }>({ debits: 0, credits: 0, diff: 0 });

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            loadConfig();

            // Determinar min y max date
            const today = new Date();
            const toLocalISO = (d: Date) => {
                const offset = d.getTimezoneOffset() * 60000;
                return new Date(d.getTime() - offset).toISOString().split('T')[0];
            };
            const currentDayStr = toLocalISO(today);

            if (selectedTransfers && selectedTransfers.length > 0) {
                const dates = selectedTransfers.map(t => t.date.split('T')[0]).sort();
                const minDate = dates[0];
                const maxDate = dates[dates.length - 1];

                const d1 = new Date(minDate);
                const d2 = new Date(maxDate);
                const diffTime = Math.abs(d2.getTime() - d1.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays > 60) {
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateStart(toLocalISO(firstDay));
                    setDateEnd(currentDayStr);
                } else {
                    setDateStart(minDate);
                    setDateEnd(maxDate);
                }
            } else {
                setDateStart(currentDayStr);
                setDateEnd(currentDayStr);
            }
        }
    }, [isOpen, selectedTransfers]);

    const loadConfig = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setConfig(parsed);
                setDocType(parsed.defaultDocumentType || 'TR');
            } catch (e) {
                setConfig(null);
            }
        }
    };

    // Campos disponibles para el mapeo (nombres de bancos/cuentas detectados en la selección)
    const availableFields = useMemo(() => {
        const types = new Set<string>();
        selectedTransfers.forEach(t => {
            if ('sourceAccount' in t) {
                // Agregar tanto origen como destino para que el usuario pueda configurar ambos
                types.add(t.sourceAccount.label || '');
                types.add(t.targetAccount.label || '');
            } else {
                types.add(t.type || '');
            }
        });
        
        const fields = Array.from(types)
            .filter(Boolean)
            .map(type => ({
                id: type,
                label: type.toUpperCase()
            }));

        if (fields.length === 0) return [{ id: 'Transferencia', label: 'TRANSFERENCIA' }];
        return fields.sort((a,b) => a.label.localeCompare(b.label));
    }, [selectedTransfers]);

    const generateEntries = () => {
        if (!selectedTransfers?.length || !config?.mappings) return;

        let currentConsecutive = consecutive;
        let totalDebits = 0;
        let totalCredits = 0;

        const filteredTransfers = selectedTransfers.filter(t => {
            const date = t.date.split('T')[0];
            return date >= dateStart && date <= dateEnd;
        });

        if (filteredTransfers.length === 0) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Sin Registros', message: 'No hay transferencias en el rango de fechas seleccionado.' });
            return;
        }

        const entries: AccountingEntry[] = [];
        const sortedTransfers = [...filteredTransfers].sort((a, b) => a.date.localeCompare(b.date));

        sortedTransfers.forEach(t => {
            const dateParts = t.date.split('T')[0].split('-');
            const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : t.date;
            const amount = typeof t.amount === 'number' ? t.amount : 0;

            if (amount > 0) {
                const isInternal = 'sourceAccount' in t && 'targetAccount' in t;
                const sourceLabel = isInternal ? (t as InternalTransfer).sourceAccount.label : 'Caja';
                const targetLabel = isInternal ? (t as InternalTransfer).targetAccount.label : (t as TransferRecord).type;
                const description = isInternal 
                    ? `Transferencia ${sourceLabel} a ${targetLabel}` 
                    : (t as TransferRecord).description || `Transferencia ${targetLabel}`;

                // --- LÓGICA INTELIGENTE DE PARTIDA DOBLE ---
                
                // 1. Buscar Cuenta de Salida (ORIGEN) -> Siempre CRÉDITO
                const sourceMapping = config.mappings.find(m => m.sourceField.toLowerCase() === sourceLabel.toLowerCase());
                
                // 2. Buscar Cuenta de Entrada (DESTINO) -> Siempre DÉBITO
                const targetMapping = config.mappings.find(m => m.sourceField.toLowerCase() === targetLabel.toLowerCase());

                // Generar línea de SALIDA (Crédito)
                if (sourceMapping) {
                    entries.push({
                        tipoDocumento: docType,
                        consecutivo: currentConsecutive,
                        fecha: dateStr,
                        fechaVencimiento: dateStr,
                        codigoCuenta: sourceMapping.accountCode,
                        idTercero: sourceMapping.thirdPartyId,
                        centroCosto: sourceMapping.costCenter,
                        debito: 0,
                        credito: amount,
                        base: 0,
                        descripcion: description,
                        descripcionMovimiento: `Salida ${sourceLabel}`
                    });
                    totalCredits += amount;
                }

                // Generar línea de ENTRADA (Débito)
                if (targetMapping) {
                    entries.push({
                        tipoDocumento: docType,
                        consecutivo: currentConsecutive,
                        fecha: dateStr,
                        fechaVencimiento: dateStr,
                        codigoCuenta: targetMapping.accountCode,
                        idTercero: targetMapping.thirdPartyId,
                        centroCosto: targetMapping.costCenter,
                        debito: amount,
                        credito: 0,
                        base: 0,
                        descripcion: description,
                        descripcionMovimiento: `Entrada ${targetLabel}`
                    });
                    totalDebits += amount;
                }
            }

            currentConsecutive++;
        });

        setPreviewEntries(entries);
        setBalance({ debits: totalDebits, credits: totalCredits, diff: totalDebits - totalCredits });
        setStep(2);
    };

    const handleDownloadCSV = () => {
        if (!previewEntries.length) return;

        const header = "Tipo de documento;Consecutivo;Fecha de elaboración;Fecha de vencimiento;Código de cuenta;Id contacto;Centro de costos;Débito;Crédito;Base;Descripción;Descripción movimiento";

        const rows = previewEntries.map(e => {
            const debitStr = e.debito > 0 ? e.debito.toString().replace('.', ',') : '';
            const creditStr = e.credito > 0 ? e.credito.toString().replace('.', ',') : '';
            const baseStr = e.base > 0 ? e.base.toString().replace('.', ',') : '';

            return [
                e.tipoDocumento,
                e.consecutivo,
                e.fecha,
                e.fechaVencimiento,
                e.codigoCuenta,
                e.idTercero,
                e.centroCosto,
                debitStr,
                creditStr,
                baseStr,
                e.descripcion,
                e.descripcionMovimiento
            ].join(';');
        });

        const csvContent = '\uFEFF' + [header, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `asientos_transferencias_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        onClose();
        setAlertModal({ isOpen: true, type: 'success', title: 'Exportación Exitosa', message: 'El archivo CSV se ha generado correctamente.' });
    };

    const headerTitle = (
        <span className="flex items-center gap-2">
            <ArrowDownTrayIcon className="h-5 w-5 text-indigo-500" />
            <span className="text-lg font-bold">Exportar Transferencias a Contabilidad</span>
        </span>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-2xl"
        >
            <div className="p-6">
                {/* STEPS */}
                <div className="mb-8">
                    <div className="flex items-center justify-center relative w-1/2 mx-auto">
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10"></div>
                        <div className={`flex flex-col items-center bg-white dark:bg-slate-800 px-2 pl-0 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>1</div>
                            <span className="text-xs font-bold mt-1">Parámetros</span>
                        </div>
                        <div className="flex-1"></div>
                        <div className={`flex flex-col items-center bg-white dark:bg-slate-800 px-2 pr-0 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>2</div>
                            <span className="text-xs font-bold mt-1">Generar</span>
                        </div>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="min-h-[200px]">
                    {step === 1 && (
                        <div className="space-y-6 max-w-sm mx-auto">
                            <FormGroup label="Rango de Fechas">
                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <span className="text-xs text-gray-500 mb-1 block">Desde</span>
                                        <DatePicker
                                            value={dateStart}
                                            onChange={(val) => setDateStart(val)}
                                            className="w-full text-sm"
                                        />
                                    </div>
                                    <div className="w-1/2">
                                        <span className="text-xs text-gray-500 mb-1 block">Hasta</span>
                                        <DatePicker
                                            value={dateEnd}
                                            onChange={(val) => setDateEnd(val)}
                                            className="w-full text-sm"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-indigo-600 mt-2 font-medium">
                                    {selectedTransfers.filter(a => {
                                        const date = a.date.split('T')[0];
                                        return date >= dateStart && date <= dateEnd;
                                    }).length} transferencias seleccionadas.
                                </p>
                            </FormGroup>

                            <div className="flex items-center justify-between">
                                <FormGroup label="Tipo de Documento" className="w-1/2">
                                    <input
                                        type="text"
                                        value={docType}
                                        onChange={(e) => setDocType(e.target.value)}
                                        className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 bg-white text-sm"
                                    />
                                </FormGroup>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowConfig(true)}
                                    className="mt-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                    <Cog6ToothIcon className="h-4 w-4 mr-1.5" />
                                    Configurar Cuentas
                                </Button>
                            </div>
                            
                            <FormGroup label="Consecutivo Inicial" description="Se incrementará automáticamente para cada transferencia.">
                                <input
                                    type="number"
                                    value={consecutive}
                                    onChange={(e) => setConsecutive(Number(e.target.value))}
                                    className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 bg-white text-sm"
                                    placeholder="Ej: 100"
                                />
                            </FormGroup>
                            
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                {(() => {
                                    const filteredCount = selectedTransfers.filter(a => {
                                        const date = a.date.split('T')[0];
                                        return date >= dateStart && date <= dateEnd;
                                    }).length;
                                    return (
                                        <>
                                            Se van a exportar <strong>{filteredCount}</strong> transferencias.
                                            <br />
                                            {filteredCount > 0 && consecutive > 0 && `Rango de consecutivos: ${consecutive} - ${consecutive + filteredCount - 1}`}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Débitos</p>
                                    <p className="text-lg font-mono font-bold text-emerald-600">${balance.debits.toLocaleString('es-CO')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase">Total Créditos</p>
                                    <p className="text-lg font-mono font-bold text-rose-600">${balance.credits.toLocaleString('es-CO')}</p>
                                </div>
                            </div>

                            {balance.diff !== 0 ? (
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200">
                                    <div className="flex items-start gap-3">
                                        <ExclamationTriangleIcon className="h-6 w-6 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-bold">Descuadre Contable Detectado</h4>
                                            <p className="text-sm">La suma de débitos y créditos no es igual. Diferencia: <strong>${balance.diff.toLocaleString('es-CO')}</strong>.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-lg border border-emerald-200 flex items-center gap-3">
                                    <CheckCircleIcon className="h-6 w-6 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold">Balance Correcto</h4>
                                        <p className="text-sm">Los asientos están cuadrados y listos para exportar.</p>
                                    </div>
                                </div>
                            )}

                            <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded text-xs bg-gray-50 dark:bg-slate-900/50 p-2 font-mono whitespace-pre-wrap">
                                <p className="text-gray-500 mb-2">Vista previa (Primeros 6 registros):</p>
                                {previewEntries.slice(0, 6).map((e, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-1 border-b border-gray-200 dark:border-slate-700 py-1 last:border-0">
                                        <span className="col-span-1 text-center">{e.consecutivo}</span>
                                        <span className="col-span-2">{e.fecha}</span>
                                        <span className="col-span-2 truncate" title={e.codigoCuenta}>{e.codigoCuenta || 'Sin cuenta'}</span>
                                        <span className="col-span-3 truncate text-slate-500" title={e.descripcionMovimiento}>{e.descripcionMovimiento}</span>
                                        <span className="col-span-2 text-right text-emerald-600">{e.debito > 0 ? e.debito.toLocaleString() : ''}</span>
                                        <span className="col-span-2 text-right text-rose-600">{e.credito > 0 ? e.credito.toLocaleString() : ''}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER ACTIONS */}
                <div className="mt-8 flex justify-between border-t border-gray-100 dark:border-slate-700 pt-6">
                    {step > 1 ? (
                        <Button variant="secondary" onClick={() => setStep(step - 1)}>
                            Atrás
                        </Button>
                    ) : (
                        <Button variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                    )}

                    {step === 1 && (
                        <Button
                            onClick={generateEntries}
                            disabled={consecutive <= 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Generar Vista Previa
                        </Button>
                    )}
                    {step === 2 && (
                        <Button
                            onClick={handleDownloadCSV}
                            disabled={balance.diff !== 0}
                            className="bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                        >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                            Descargar CSV
                        </Button>
                    )}
                </div>
            </div>

            <AccountingConfigModal
                isOpen={showConfig}
                onClose={() => setShowConfig(false)}
                onSave={loadConfig}
                storageKey={STORAGE_KEY}
                availableFields={availableFields}
                initialMappings={DEFAULT_TRANSFER_MAPPINGS}
                hideNatureSelect={true}
                title="Configuración de Cuentas: Transferencias"
            />
        </Modal>
    );
};
