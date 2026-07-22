import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { DatePicker } from '../../../components/ui/DatePicker';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { DocumentTextIcon, CalculatorIcon } from '../../../components/ui/Icons';
import { Modal } from '../../../components/ui/Modal';
import { TipRecord } from '../../../services/tipsService';
import { calculateTipDistribution } from '../../../utils/tipCalculations';
import { FormGroup } from '../../../components/ui/FormGroup';

interface TipsFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: Partial<TipRecord>) => Promise<void>;
    initialData?: Partial<TipRecord>;
}

export const TipsFormModal: React.FC<TipsFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    initialData
}) => {
    const [formData, setFormData] = useState<Partial<TipRecord>>({
        fecha: new Date().toISOString().split('T')[0],
        total_propinas: 0,
        comision_medios_electronicos: 0,
        base_propinas: 0,
        division: 1,
        total_persona: 0,
        unp: 0
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({ ...formData, ...initialData });
            } else {
                setFormData({
                    fecha: new Date().toISOString().split('T')[0],
                    total_propinas: 0,
                    comision_medios_electronicos: 0,
                    base_propinas: 0,
                    division: 1,
                    total_persona: 0,
                    unp: 0
                });
            }
        }
    }, [isOpen, initialData]);

    // Calcular automáticamente los campos derivados
    useEffect(() => {
        const total = Number(formData.total_propinas || 0);
        const div = Number(formData.division || 1);

        const {
            comisionMediosElectronicos: comision,
            basePropinas: base,
            totalPersona: xPersona,
            unp: calculatedUnp
        } = calculateTipDistribution(total, div);

        if (
            comision !== formData.comision_medios_electronicos ||
            base !== formData.base_propinas ||
            xPersona !== formData.total_persona ||
            calculatedUnp !== formData.unp
        ) {
            setFormData(prev => ({
                ...prev,
                comision_medios_electronicos: comision,
                base_propinas: base,
                total_persona: xPersona,
                unp: calculatedUnp
            }));
        }
    }, [formData.total_propinas, formData.division]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit(formData);
            onClose();
        } catch (error) {
            console.error("Error saving tip:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    {initialData?.id ? 'Editar Registro' : 'Nueva Propina'}
                </h2>
                <p className="text-xs2 text-slate-400 font-semibold uppercase tracking-caps mt-0.5">Control de Propinas</p>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-lg"
            className="p-0 overflow-hidden"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    <FormGroup label="Fecha" className="col-span-2">
                        <DatePicker
                            value={formData.fecha || ''}
                            onChange={val => setFormData({ ...formData, fecha: val })}
                            required
                            className="font-bold tracking-tight"
                        />
                    </FormGroup>

                    <FormGroup label="Total Propinas">
                        <CurrencyInput
                            value={formData.total_propinas}
                            onChange={v => setFormData({ ...formData, total_propinas: Number(v) })}
                            className="text-emerald-600 font-black text-lg"
                        />
                    </FormGroup>

                    <FormGroup label="Comisión Electrónica">
                        <CurrencyInput
                            value={formData.comision_medios_electronicos}
                            onChange={v => setFormData({ ...formData, comision_medios_electronicos: Number(v) })}
                            disabled
                            className="text-rose-500 font-bold opacity-70 bg-slate-50 cursor-not-allowed"
                        />
                    </FormGroup>

                    <div className="col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <CalculatorIcon className="w-4 h-4" /> Resumen de Base
                            </span>
                            <span className="text-lg font-black text-slate-800 dark:text-white">
                                ${Number(formData.base_propinas).toLocaleString()}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <FormGroup label="División (Personas)">
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.division}
                                    onChange={e => setFormData({ ...formData, division: Number(e.target.value) })}
                                    className="font-bold text-blue-600"
                                />
                            </FormGroup>
                            <div className="flex flex-col justify-end items-end">
                                <span className="text-xs2 font-bold text-slate-400 uppercase mb-1">Total x Persona</span>
                                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                                    ${Number(formData.total_persona).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <FormGroup label="UNP (Calculado)" className="col-span-2">
                        <CurrencyInput
                            value={formData.unp}
                            onChange={v => setFormData({ ...formData, unp: Number(v) })}
                            disabled
                            className="font-black text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 cursor-not-allowed"
                        />
                    </FormGroup>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-50 dark:border-slate-700 mt-auto shrink-0">
                    <Button type="button" variant="secondary" onClick={onClose} className="px-6 font-bold text-xs uppercase">Cancelar</Button>
                    <Button type="submit" disabled={isLoading} className="px-10 font-bold text-xs uppercase shadow-lg shadow-indigo-500/20 bg-indigo-600 text-white hover:bg-indigo-700">
                        {isLoading ? 'Guardando...' : 'Guardar Registro'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};
