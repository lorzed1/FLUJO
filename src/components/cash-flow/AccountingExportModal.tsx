import React, { useState, useEffect, useMemo } from 'react';

import * as XLSX from 'xlsx';
import {
    XMarkIcon,
    TableCellsIcon,
    ArrowRightOnRectangleIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    Cog6ToothIcon
} from '../../components/ui/Icons';
import { ArqueoRecord } from '../../types';
import {
    AccountingConfig,
    AccountMapping,
    DEFAULT_CONCEPTS,
    generateAccountingRows,
    AccountingRow
} from '../../utils/accountingExporter';

interface AccountingExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ArqueoRecord[];
}

const STORAGE_KEY_CONFIG = 'accounting_export_config';
const STORAGE_KEY_MAPPING = 'accounting_export_mapping';

const AccountingExportModal: React.FC<AccountingExportModalProps> = ({ isOpen, onClose, data }) => {
    const [step, setStep] = useState(1);

    // --- State: Configuration ---
    const [config, setConfig] = useState<AccountingConfig>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
        return saved ? JSON.parse(saved) : {
            documentType: 'FV',
            startConsecutive: 1,
            defaultCostCenter: '001',
            nitTerceroDefault: '222222222',
            globalDate: ''
        };
    });

    // --- State: Mappings ---
    const [mappings, setMappings] = useState<AccountMapping[]>(() => {
        const saved = localStorage.getItem(STORAGE_KEY_MAPPING);
        // Merge saved with DEFAULT in case we added new ones in code
        if (saved) {
            const parsed = JSON.parse(saved);
            return DEFAULT_CONCEPTS.map(def => {
                const found = parsed.find((p: AccountMapping) => p.conceptId === def.conceptId);
                return found ? { ...def, ...found } : def;
            });
        }
        return DEFAULT_CONCEPTS;
    });

    // Persist on change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_MAPPING, JSON.stringify(mappings));
    }, [mappings]);

    // --- Preview Generation ---
    const previewRows = useMemo(() => {
        if (step !== 3) return [];
        return generateAccountingRows(data, config, mappings);
    }, [step, data, config, mappings]);

    const totals = useMemo(() => {
        return previewRows.reduce((acc, row) => ({
            debit: acc.debit + row.Debito,
            credit: acc.credit + row.Credito
        }), { debit: 0, credit: 0 });
    }, [previewRows]);

    const isBalanced = Math.abs(totals.debit - totals.credit) < 0.01;

    // --- Handlers ---
    const handleMappingChange = (id: string, field: keyof AccountMapping, value: any) => {
        setMappings(prev => prev.map(m =>
            m.conceptId === id ? { ...m, [field]: value } : m
        ));
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(previewRows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Contabilidad");
        XLSX.writeFile(wb, `Contabilidad_${config.documentType}_${new Date().toISOString().split('T')[0]}.xlsx`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <ArrowRightOnRectangleIcon className="h-6 w-6 text-primary" />
                            Asistente Contable
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Paso {step} de 3: {step === 1 ? 'Configuración General' : step === 2 ? 'Mapeo de Cuentas' : 'Validar y Exportar'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* STEP 1: General Config */}
                    {step === 1 && (
                        <div className="space-y-6 max-w-lg mx-auto">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-blue-700 dark:text-blue-300 text-sm">
                                <CheckCircleIcon className="h-5 w-5 shrink-0" />
                                <p>Configura los datos del encabezado que exige tu software contable (Siigo, Contai, etc.)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Tipo Documento</label>
                                    <input
                                        type="text"
                                        value={config.documentType}
                                        onChange={e => setConfig({ ...config, documentType: e.target.value.toUpperCase() })}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 font-mono uppercase"
                                        placeholder="FV"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Consecutivo Inicial</label>
                                    <input
                                        type="number"
                                        value={config.startConsecutive}
                                        onChange={e => setConfig({ ...config, startConsecutive: parseInt(e.target.value) || 0 })}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Centro Costos Defecto</label>
                                    <input
                                        type="text"
                                        value={config.defaultCostCenter}
                                        onChange={e => setConfig({ ...config, defaultCostCenter: e.target.value })}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">NIT Tercero Genérico</label>
                                    <input
                                        type="text"
                                        value={config.nitTerceroDefault}
                                        onChange={e => setConfig({ ...config, nitTerceroDefault: e.target.value })}
                                        className="w-full p-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Account Mapping */}
                    {step === 2 && (
                        <div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg flex gap-3 text-yellow-700 dark:text-yellow-300 text-sm mb-6">
                                <Cog6ToothIcon className="h-5 w-5 shrink-0" />
                                <p>Asocia cada concepto de la App con una Cuenta PUC de tu contabilidad. Estos ajustes se guardan automáticamente.</p>
                            </div>

                            <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-lg">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-gray-200 font-bold uppercase text-xs">
                                        <tr>
                                            <th className="px-4 py-3">Concepto</th>
                                            <th className="px-4 py-3">Cuenta (PUC)</th>
                                            <th className="px-4 py-3">Tercero Específico (Opcional)</th>
                                            <th className="px-4 py-3 text-center">Tasa Impuesto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {mappings.map(map => (
                                            <tr key={map.conceptId} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">
                                                    {map.label}
                                                    <span className={`block text-[10px] ${map.nature === 'debit' ? 'text-blue-500' : map.nature === 'credit' ? 'text-green-500' : 'text-purple-500'}`}>
                                                        {map.nature === 'debit' ? 'Débito' : map.nature === 'credit' ? 'Crédito' : 'Automático'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={map.accountCode}
                                                        onChange={e => handleMappingChange(map.conceptId, 'accountCode', e.target.value)}
                                                        className="w-full p-1.5 border rounded-md dark:bg-slate-900 dark:border-slate-600 text-sm font-mono"
                                                        placeholder="Ej: 4135..."
                                                    />
                                                </td>
                                                <td className="px-4 py-2">
                                                    <input
                                                        type="text"
                                                        value={map.thirdPartyId || ''}
                                                        onChange={e => handleMappingChange(map.conceptId, 'thirdPartyId', e.target.value)}
                                                        className="w-full p-1.5 border rounded-md dark:bg-slate-900 dark:border-slate-600 text-sm"
                                                        placeholder="Usar Genérico"
                                                    />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {map.type === 'income' ? (
                                                        <select
                                                            value={map.taxRate || 0}
                                                            onChange={e => handleMappingChange(map.conceptId, 'taxRate', parseFloat(e.target.value))}
                                                            className="p-1.5 border rounded-md dark:bg-slate-900 dark:border-slate-600 text-sm"
                                                        >
                                                            <option value={0}>0%</option>
                                                            <option value={0.08}>8% (INC)</option>
                                                            <option value={0.19}>19% (IVA)</option>
                                                        </select>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Preview */}
                    {step === 3 && (
                        <div>
                            <div className={`p-4 rounded-lg flex items-center justify-between mb-4 ${isBalanced ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                <div className="flex gap-3 items-center">
                                    {isBalanced ? <CheckCircleIcon className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />}
                                    <div>
                                        <p className="font-bold">{isBalanced ? 'Asiento Cuadrado' : 'Asiento Descuadrado'}</p>
                                        <p className="text-xs opacity-80">Débitos: ${totals.debit.toLocaleString()} | Créditos: ${totals.credit.toLocaleString()} | Diff: ${Math.abs(totals.debit - totals.credit).toLocaleString()}</p>
                                    </div>
                                </div>
                                {!isBalanced && <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">Revisa el mapeo</span>}
                            </div>

                            <div className="overflow-auto max-h-96 border border-gray-200 dark:border-slate-700 rounded-lg">
                                <table className="w-full text-xs text-left whitespace-nowrap">
                                    <thead className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2">Doc</th>
                                            <th className="px-3 py-2">#</th>
                                            <th className="px-3 py-2">Fecha</th>
                                            <th className="px-3 py-2">Cuenta</th>
                                            <th className="px-3 py-2">Tercero</th>
                                            <th className="px-3 py-2 text-right">Débito</th>
                                            <th className="px-3 py-2 text-right">Crédito</th>
                                            <th className="px-3 py-2 text-right">Base</th>
                                            <th className="px-3 py-2">Detalle</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                        {previewRows.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                                                <td className="px-3 py-1.5">{row.TipoDocumento}</td>
                                                <td className="px-3 py-1.5">{row.Consecutivo}</td>
                                                <td className="px-3 py-1.5">{row.Fecha}</td>
                                                <td className="px-3 py-1.5 font-mono">{row.CodigoCuenta}</td>
                                                <td className="px-3 py-1.5">{row.IdContacto}</td>
                                                <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-white">{row.Debito > 0 ? row.Debito.toLocaleString() : '-'}</td>
                                                <td className="px-3 py-1.5 text-right font-medium text-gray-900 dark:text-white">{row.Credito > 0 ? row.Credito.toLocaleString() : '-'}</td>
                                                <td className="px-3 py-1.5 text-right text-gray-500">{row.Base > 0 ? row.Base.toLocaleString() : '-'}</td>
                                                <td className="px-3 py-1.5 truncate max-w-[200px]">{row.DescripcionMovimiento}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="p-5 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl flex justify-between">
                    <button
                        onClick={step === 1 ? onClose : () => setStep(step - 1)}
                        className="px-6 py-2 text-gray-600 dark:text-gray-400 font-semibold hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        {step === 1 ? 'Cancelar' : 'Atrás'}
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            className="px-6 py-2 bg-primary text-white font-bold rounded-lg shadow-lg hover:bg-primary/90 transition-all flex items-center gap-2"
                        >
                            Siguiente <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleExport}
                            disabled={!isBalanced}
                            className={`px-8 py-2 text-white font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all ${isBalanced ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                        >
                            <TableCellsIcon className="h-5 w-5" /> Exportar Excel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountingExportModal;
