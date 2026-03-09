
import React, { useState, useEffect } from 'react';
import { AccountMapping, AVAILABLE_SOURCE_FIELDS } from '../../../types/accounting';
import { Button } from '../../../components/ui/Button'; // Assuming Button component exists
import { XMarkIcon, PlusIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from '../../../components/ui/Icons';
import { Modal } from '../../../components/ui/Modal';
import { useUI } from '../../../context/UIContext';
import { FormGroup } from '../../../components/ui/FormGroup';

interface AccountingConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave?: () => void;
}

const STORAGE_KEY = 'accounting_export_config';

export const AccountingConfigModal: React.FC<AccountingConfigModalProps> = ({ isOpen, onClose, onSave }) => {
    const { setAlertModal } = useUI();
    const [mappings, setMappings] = useState<AccountMapping[]>([]);
    const [defaultDocType, setDefaultDocType] = useState('FV');

    // Load from Local Storage on mount
    useEffect(() => {
        if (isOpen) {
            const savedConfig = localStorage.getItem(STORAGE_KEY);
            if (savedConfig) {
                try {
                    const parsed = JSON.parse(savedConfig);
                    setMappings(parsed.mappings || []);
                    setDefaultDocType(parsed.defaultDocumentType || 'FV');
                } catch (e) {
                    console.error("Error parsing accounting config", e);
                }
            } else {
                // Initialize with some defaults if empty?
                // For now leave empty to let user configure
            }
        }
    }, [isOpen]);

    const handleSave = () => {
        const config = {
            mappings,
            defaultDocumentType: defaultDocType
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        setAlertModal({
            isOpen: true,
            type: 'success',
            title: 'Configuración Guardada',
            message: 'La configuración contable se ha guardado correctamente en este navegador.'
        });
        if (onSave) onSave();
        onClose();
    };

    const addMapping = () => {
        setMappings([
            ...mappings,
            {
                sourceField: AVAILABLE_SOURCE_FIELDS[0].id,
                label: AVAILABLE_SOURCE_FIELDS[0].label,
                accountCode: '',
                thirdPartyId: '',
                costCenter: 'Principal',
                nature: 'Debit'
            }
        ]);
    };

    const removeMapping = (index: number) => {
        const newMappings = [...mappings];
        newMappings.splice(index, 1);
        setMappings(newMappings);
    };

    const updateMapping = (index: number, field: keyof AccountMapping, value: any) => {
        const newMappings = [...mappings];
        newMappings[index] = { ...newMappings[index], [field]: value };

        // Auto-update label if source changes
        if (field === 'sourceField') {
            const source = AVAILABLE_SOURCE_FIELDS.find(s => s.id === value);
            if (source) {
                newMappings[index].label = source.label;
            }
        }

        setMappings(newMappings);
    };

    const moveMapping = (index: number, direction: 'up' | 'down') => {
        const newMappings = [...mappings];
        if (direction === 'up' && index > 0) {
            [newMappings[index], newMappings[index - 1]] = [newMappings[index - 1], newMappings[index]];
        } else if (direction === 'down' && index < newMappings.length - 1) {
            [newMappings[index], newMappings[index + 1]] = [newMappings[index + 1], newMappings[index]];
        }
        setMappings(newMappings);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Configuración de Asientos Contables"
            maxWidth="max-w-6xl"
        >
            <div className="space-y-6 flex-1 min-h-0 overflow-y-auto p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                    <FormGroup label="Tipo de Documento (Defecto)">
                        <input
                            type="text"
                            value={defaultDocType}
                            onChange={(e) => setDefaultDocType(e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-sm"
                            placeholder="Ej: FV"
                        />
                    </FormGroup>
                    <div className="md:col-span-2 text-sm text-gray-500 dark:text-gray-400 flex items-center">
                        <p>Define cómo se mapean los conceptos del arqueo a tus cuentas contables (PUC). Esta configuración se guarda localmente en tu navegador. Usa las flechas para ordenar los asientos.</p>
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[300px] max-h-[500px]">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Concepto (Origen)</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción Asiento</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cuenta PUC</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tercero (NIT)</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">C. Costo</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Naturaleza</th>
                                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {mappings.map((map, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-3 py-2">
                                        <select
                                            value={map.sourceField}
                                            onChange={(e) => updateMapping(index, 'sourceField', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-xs py-1.5 focus:border-indigo-500 focus:ring-indigo-500"
                                        >
                                            {AVAILABLE_SOURCE_FIELDS.map(f => (
                                                <option key={f.id} value={f.id}>{f.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={map.label}
                                            onChange={(e) => updateMapping(index, 'label', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-xs py-1.5 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={map.accountCode}
                                            onChange={(e) => updateMapping(index, 'accountCode', e.target.value)}
                                            placeholder="Ej: 414095..."
                                            className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-xs py-1.5 focus:border-indigo-500 focus:ring-indigo-500 font-mono"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={map.thirdPartyId}
                                            onChange={(e) => updateMapping(index, 'thirdPartyId', e.target.value)}
                                            placeholder="NIT / CC"
                                            className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-xs py-1.5 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={map.costCenter}
                                            onChange={(e) => updateMapping(index, 'costCenter', e.target.value)}
                                            className="block w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 text-xs py-1.5 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => updateMapping(index, 'nature', 'Debit')}
                                                className={`px-2 py-1 text-xs rounded border ${map.nature === 'Debit'
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200 font-bold'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-emerald-50'}`}
                                            >
                                                Débito
                                            </button>
                                            <button
                                                onClick={() => updateMapping(index, 'nature', 'Credit')}
                                                className={`px-2 py-1 text-xs rounded border ${map.nature === 'Credit'
                                                    ? 'bg-rose-100 text-rose-700 border-rose-200 font-bold'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-rose-50'}`}
                                            >
                                                Crédito
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => moveMapping(index, 'up')}
                                                disabled={index === 0}
                                                className="text-gray-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                                                title="Mover arriba"
                                            >
                                                <ArrowUpIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => moveMapping(index, 'down')}
                                                disabled={index === mappings.length - 1}
                                                className="text-gray-400 hover:text-indigo-500 disabled:opacity-30 disabled:hover:text-gray-400 p-1"
                                                title="Mover abajo"
                                            >
                                                <ArrowDownIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => removeMapping(index)}
                                                className="text-gray-400 hover:text-red-500 transition-colors p-1 ml-1"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {mappings.length === 0 && (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg mt-4">
                            No hay cuentas configuradas. Añade una para empezar.
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    <Button onClick={addMapping} variant="secondary" className="gap-2">
                        <PlusIcon className="h-4 w-4" />
                        Agregar Cuenta
                    </Button>
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-700 pb-2">
                    <Button variant="secondary" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} className="bg-indigo-600 text-white hover:bg-indigo-700">
                        Guardar Configuración
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
