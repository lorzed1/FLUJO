
import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { AccountingConfig, AccountingEntry, AccountMapping } from '../../../types/accounting';
import { Button } from '../../../components/ui/Button';
import { XMarkIcon, Cog6ToothIcon, ArrowDownTrayIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useUI } from '../../../context/UIContext';
import { ArqueoRecord } from '../../../types';
import { AccountingConfigModal } from './AccountingConfigModal';
import { formatDateToDisplay } from '../../../utils/dateUtils';
import { DatePicker } from '../../../components/ui/DatePicker';
import * as XLSX from 'xlsx';

interface AccountingExportWizardProps {
    isOpen: boolean;
    onClose: () => void;
    selectedArqueos: ArqueoRecord[];
}

const STORAGE_KEY = 'accounting_export_config';

export const AccountingExportWizard: React.FC<AccountingExportWizardProps> = ({ isOpen, onClose, selectedArqueos = [] }) => {
    const { setAlertModal } = useUI();
    const [step, setStep] = useState(1);
    const [config, setConfig] = useState<AccountingConfig | null>(null);
    const [showConfigModal, setShowConfigModal] = useState(false);

    // Step 2 State
    const [consecutive, setConsecutive] = useState<number>(0);
    const [docType, setDocType] = useState('FV');

    // Helper for safe check
    const hasValidConfig = config && Array.isArray(config.mappings) && config.mappings.length > 0;

    // Step 3 State
    const [previewEntries, setPreviewEntries] = useState<AccountingEntry[]>([]);
    const [balance, setBalance] = useState<{ debits: number, credits: number, diff: number }>({ debits: 0, credits: 0, diff: 0 });

    const [problematicDates, setProblematicDates] = useState<string[]>([]);

    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');

    // Load config when opening and set default dates
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            loadConfig();

            // Set default date range
            const today = new Date();
            const toLocalISO = (d: Date) => {
                const offset = d.getTimezoneOffset() * 60000;
                return new Date(d.getTime() - offset).toISOString().split('T')[0];
            };
            const currentDayStr = toLocalISO(today);

            if (selectedArqueos && selectedArqueos.length > 0) {
                const dates = selectedArqueos.map(a => a.fecha).sort();
                const minDate = dates[0].split('T')[0];
                const maxDate = dates[dates.length - 1].split('T')[0];

                // Calculate range in days
                const d1 = new Date(minDate);
                const d2 = new Date(maxDate);
                const diffTime = Math.abs(d2.getTime() - d1.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // If range is large (e.g. > 60 days), default to current month
                // This covers the case of "All History" being loaded
                if (diffDays > 60) {
                    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateStart(toLocalISO(firstDay));
                    setDateEnd(currentDayStr);
                } else {
                    // Respect the filtered range (e.g. user filtered to "last week" in the table)
                    setDateStart(minDate);
                    setDateEnd(maxDate);
                }
            } else {
                setDateStart(currentDayStr);
                setDateEnd(currentDayStr);
            }
        }
    }, [isOpen, selectedArqueos]);

    // Reload config when config modal closes
    useEffect(() => {
        if (!showConfigModal && isOpen) {
            loadConfig();
        }
    }, [showConfigModal, isOpen]);

    const loadConfig = () => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed.mappings) parsed.mappings = [];
                setConfig(parsed);
                setDocType(parsed.defaultDocumentType || 'FV');
            } catch (e) {
                setConfig(null);
            }
        } else {
            setConfig(null);
        }
    };

    const generateEntries = () => {
        if (!hasValidConfig || !selectedArqueos?.length) return;

        let currentConsecutive = consecutive;
        let totalDebits = 0;
        let totalCredits = 0;
        const problemDates: string[] = [];

        // Filter by date range
        const filteredArqueos = selectedArqueos.filter(a => {
            const date = a.fecha.split('T')[0];
            return date >= dateStart && date <= dateEnd;
        });

        if (filteredArqueos.length === 0) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Sin Registros', message: 'No hay arqueos en el rango de fechas seleccionado.' });
            return;
        }

        const entries: AccountingEntry[] = [];
        // Sort arqueos by date (ISO strings compare correctly lexicographically)
        const sortedArqueos = [...filteredArqueos].sort((a, b) => a.fecha.localeCompare(b.fecha));

        sortedArqueos.forEach(rawArqueo => {
            const arqueoDate = formatDateToDisplay(rawArqueo.fecha); // Returns DD/MM/YYYY
            let arqueoDebits = 0;
            let arqueoCredits = 0;

            // REGLA DE NEGOCIO: Rèplica exacta de la lógica de ArqueosTable.tsx
            // Descuadre = Total Recaudado - (Venta Bruta + Propina) (Nota: Covers ya incluidos en Venta Bruta)
            const totalIngresos = (rawArqueo.ventaPos || 0) + (rawArqueo.propina || 0);
            const computedDescuadre = rawArqueo.totalRecaudado - totalIngresos;

            // Usamos un objeto extendido con el descuadre recalculado
            const arqueo = { ...rawArqueo, descuadre: computedDescuadre };

            config.mappings.forEach(map => {
                let amount = 0;

                // Get value from arqueo based on sourceField
                if (map.sourceField === 'sobrante') {
                    if (arqueo.descuadre > 0) amount = arqueo.descuadre;
                } else if (map.sourceField === 'faltante') {
                    if (arqueo.descuadre < 0) amount = Math.abs(arqueo.descuadre);
                } else if (map.sourceField === 'ventaSC') {
                    amount = (arqueo.ventaPos || 0) - (arqueo.ingresoCovers || 0);
                } else if (map.sourceField === 'baseImpuesto') {
                    const ventaSC = (arqueo.ventaPos || 0) - (arqueo.ingresoCovers || 0);
                    amount = Math.round(ventaSC / 1.08);
                } else if (map.sourceField === 'impuestoConsumo') {
                    const ventaSC = (arqueo.ventaPos || 0) - (arqueo.ingresoCovers || 0);
                    const base = ventaSC / 1.08;
                    amount = Math.round(base * 0.08);
                } else {
                    // Direct property access
                    const val = (arqueo as any)[map.sourceField];
                    amount = typeof val === 'number' ? val : 0;
                }

                if (amount > 0) {
                    const debit = map.nature === 'Debit' ? amount : 0;
                    const credit = map.nature === 'Credit' ? amount : 0;

                    totalDebits += debit;
                    totalCredits += credit;

                    arqueoDebits += debit;
                    arqueoCredits += credit;

                    entries.push({
                        tipoDocumento: docType,
                        consecutivo: currentConsecutive,
                        fecha: arqueoDate,
                        fechaVencimiento: arqueoDate,
                        codigoCuenta: map.accountCode,
                        idTercero: map.thirdPartyId,
                        centroCosto: map.costCenter,
                        debito: debit,
                        credito: credit,
                        base: 0, // Base default 0
                        descripcion: `Cierre Caja ${arqueoDate}`, // General description
                        descripcionMovimiento: map.label // Specific movement description
                    });
                }
            });

            if (Math.abs(arqueoDebits - arqueoCredits) > 1) {
                problemDates.push(`${arqueoDate} (Dif: $${Math.abs(arqueoDebits - arqueoCredits).toLocaleString()})`);
            }

            currentConsecutive++;
        });

        // Round to 2 decimals to avoid floating point errors
        totalDebits = Math.round(totalDebits * 100) / 100;
        totalCredits = Math.round(totalCredits * 100) / 100;

        setPreviewEntries(entries);
        setBalance({ debits: totalDebits, credits: totalCredits, diff: totalDebits - totalCredits });
        setProblematicDates(problemDates);
        setStep(3);
    };

    const handleDownloadCSV = () => {
        if (!previewEntries.length) return;

        // Header matching standard templates (e.g. Siigo)
        const header = "Tipo de documento;Consecutivo;Fecha de elaboración;Fecha de vencimiento;Código de cuenta;Id contacto;Centro de costos;Débito;Crédito;Base;Descripción;Descripción movimiento";

        const rows = previewEntries.map(e => {
            const debitStr = e.debito > 0 ? e.debito.toString().replace('.', ',') : '';
            const creditStr = e.credito > 0 ? e.credito.toString().replace('.', ',') : '';
            const baseStr = e.base > 0 ? e.base.toString().replace('.', ',') : '';

            // Clean Third Party ID: numeric only, no scientific notation
            const cleanId = (e.idTercero || '').toString().replace(/[^\d]/g, '');

            // Ensure strict DD/MM/YYYY format
            const formatDate = (dateStr: string) => {
                if (!dateStr) return '';
                // Handle existing format or ISO
                let d: Date;
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        // Assume DD/MM/YYYY
                        return dateStr;
                    }
                    d = new Date(dateStr);
                } else {
                    d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
                }

                if (isNaN(d.getTime())) return dateStr;

                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
            };

            const fDate = formatDate(e.fecha);
            const fDue = formatDate(e.fechaVencimiento);

            return [
                e.tipoDocumento,
                e.consecutivo,
                fDate,
                fDue,
                e.codigoCuenta,
                cleanId,
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
        link.download = `asientos_contables_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();

        onClose();
        setAlertModal({ isOpen: true, type: 'success', title: 'Exportación Exitosa', message: 'El archivo CSV se ha generado correctamente.' });
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-6 text-left align-middle shadow-xl transition-all border border-gray-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-6">
                                <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 dark:text-white flex items-center gap-2">
                                    <ArrowDownTrayIcon className="h-6 w-6 text-indigo-500" />
                                    Exportar Contabilidad
                                </Dialog.Title>
                                <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            {/* STEPS */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between relative">
                                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10"></div>
                                    <div className={`flex flex-col items-center bg-white dark:bg-slate-800 px-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 1 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>1</div>
                                        <span className="text-xs font-bold mt-1">Configuración</span>
                                    </div>
                                    <div className={`flex flex-col items-center bg-white dark:bg-slate-800 px-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 2 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>2</div>
                                        <span className="text-xs font-bold mt-1">Parámetros</span>
                                    </div>
                                    <div className={`flex flex-col items-center bg-white dark:bg-slate-800 px-2 ${step >= 3 ? 'text-indigo-600' : 'text-gray-400'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= 3 ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'}`}>3</div>
                                        <span className="text-xs font-bold mt-1">Generar</span>
                                    </div>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="min-h-[200px]">
                                {step === 1 && (
                                    <div className="text-center py-8 space-y-4">
                                        {!hasValidConfig ? (
                                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200">
                                                <ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-2" />
                                                <h4 className="font-bold">Configuración Requerida</h4>
                                                <p className="text-sm">No se ha detectado una configuración de cuentas contables. Debes configurarla antes de continuar.</p>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-lg border border-green-200">
                                                <CheckCircleIcon className="h-10 w-10 mx-auto mb-2" />
                                                <h4 className="font-bold">Configuración Detectada</h4>
                                                <p className="text-sm">Se encontraron {config?.mappings?.length || 0} cuentas configuradas.</p>
                                            </div>
                                        )}

                                        <Button
                                            variant="secondary"
                                            onClick={() => setShowConfigModal(true)}
                                            className="mx-auto"
                                        >
                                            <Cog6ToothIcon className="h-4 w-4 mr-2" />
                                            {config ? 'Editar Configuración' : 'Configurar Ahora'}
                                        </Button>
                                    </div>
                                )}

                                {step === 2 && (
                                    <div className="space-y-6 max-w-sm mx-auto">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Rango de Fechas
                                            </label>
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
                                                {selectedArqueos.filter(a => {
                                                    const date = a.fecha.split('T')[0];
                                                    return date >= dateStart && date <= dateEnd;
                                                }).length} arqueos seleccionados para exportar.
                                            </p>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Tipo de Documento
                                            </label>
                                            <input
                                                type="text"
                                                value={docType}
                                                onChange={(e) => setDocType(e.target.value)}
                                                className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Consecutivo Inicial
                                            </label>
                                            <input
                                                type="number"
                                                value={consecutive}
                                                onChange={(e) => setConsecutive(Number(e.target.value))}
                                                className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700"
                                                placeholder="Ej: 100"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Este número se incrementará automáticamente para cada arqueo exportado.
                                            </p>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                                            {(() => {
                                                const filteredCount = selectedArqueos.filter(a => {
                                                    const date = a.fecha.split('T')[0];
                                                    return date >= dateStart && date <= dateEnd;
                                                }).length;
                                                return (
                                                    <>
                                                        Se van a exportar <strong>{filteredCount}</strong> arqueos.
                                                        <br />
                                                        Rango de consecutivos: {consecutive} - {consecutive + filteredCount - 1}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {step === 3 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-center">
                                            <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Total Débitos</p>
                                                <p className="text-lg font-mono font-bold text-emerald-600">${balance.debits.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                                                <p className="text-xs text-gray-500 uppercase">Total Créditos</p>
                                                <p className="text-lg font-mono font-bold text-rose-600">${balance.credits.toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {balance.diff !== 0 ? (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg border border-red-200">
                                                <div className="flex items-start gap-3">
                                                    <ExclamationTriangleIcon className="h-6 w-6 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <h4 className="font-bold">Descuadre Contable Detectado</h4>
                                                        <p className="text-sm">La suma de débitos y créditos no es igual. Diferencia: <strong>${balance.diff.toLocaleString()}</strong>.</p>
                                                    </div>
                                                </div>
                                                {problematicDates.length > 0 && (
                                                    <div className="mt-3 ml-9 border-t border-red-200/50 pt-2">
                                                        <p className="text-sm font-semibold mb-1">Días con descuadre:</p>
                                                        <ul className="list-disc list-inside text-xs space-y-1 font-mono bg-white/50 dark:bg-black/20 p-2 rounded">
                                                            {problematicDates.map((date, idx) => (
                                                                <li key={idx}>{date}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
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
                                            {/* Preview functionality - just showing first few lines */}
                                            <p className="text-gray-500 mb-2">Vista previa (Primeros 5 registros):</p>
                                            {previewEntries.slice(0, 5).map((e, i) => (
                                                <div key={i} className="grid grid-cols-12 gap-1 border-b border-gray-200 dark:border-slate-700 py-1 last:border-0">
                                                    <span className="col-span-1">{e.consecutivo}</span>
                                                    <span className="col-span-2">{e.fecha}</span>
                                                    <span className="col-span-2 truncate" title={e.codigoCuenta}>{e.codigoCuenta}</span>
                                                    <span className="col-span-3 truncate" title={e.descripcionMovimiento}>{e.descripcionMovimiento}</span>
                                                    <span className="col-span-2 text-right">{e.debito > 0 ? e.debito : ''}</span>
                                                    <span className="col-span-2 text-right">{e.credito > 0 ? e.credito : ''}</span>
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
                                        onClick={() => setStep(2)}
                                        disabled={!config || config.mappings.length === 0}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        Continuar
                                    </Button>
                                )}
                                {step === 2 && (
                                    <Button
                                        onClick={generateEntries}
                                        disabled={consecutive <= 0}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                    >
                                        Generar Vista Previa
                                    </Button>
                                )}
                                {step === 3 && (
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
                        </Dialog.Panel>
                    </div>
                </div>

                <AccountingConfigModal
                    isOpen={showConfigModal}
                    onClose={() => {
                        setShowConfigModal(false);
                        loadConfig(); // Reload config after editing
                    }}
                    onSave={() => {
                        console.log("Config saved, reloading...");
                        loadConfig();
                    }}
                />
            </Dialog>
        </Transition>
    );
};
