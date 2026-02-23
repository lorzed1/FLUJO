import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/Input';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Button } from '../../../components/ui/Button';
import { ShoppingBagIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PurchaseFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => Promise<void>;
}

export const PurchaseFormModal: React.FC<PurchaseFormModalProps> = ({
    isOpen,
    onClose,
    onSubmit
}) => {
    const [formData, setFormData] = useState({
        contacto: '',
        identificacion: '',
        documento: '',
        fecha: new Date().toISOString().split('T')[0],
        cuenta: '',
        centro_costo: '',
        descripcion: '',
        base: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFormData({
                contacto: '',
                identificacion: '',
                documento: '',
                fecha: new Date().toISOString().split('T')[0],
                cuenta: '',
                centro_costo: '',
                descripcion: '',
                base: ''
            });
        }
    }, [isOpen]);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSubmit({
                ...formData,
                base: Number(formData.base) || 0,
                saldo_final: Number(formData.base) || 0 // Assuming final balance is the base amount for a simple entry
            });
            onClose();
        } catch (error) {
            console.error("Error submitting purchase:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const FormLabel = ({ children }: { children: React.ReactNode }) => (
        <label className="block text-[11px] font-medium text-slate-500 tracking-wide mb-1.5 uppercase">
            {children}
        </label>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block – Aliaddo §4 style */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                            <ShoppingBagIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                                Registrar Nueva Compra
                            </h2>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.15em] mt-0.5">Módulo de Compras</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1.5 rounded-lg border border-slate-100 dark:border-slate-600 hover:bg-slate-50"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                        {/* Fila 1 */}
                        <div>
                            <FormLabel>Proveedor / Contacto <span className="text-red-500">*</span></FormLabel>
                            <Input
                                value={formData.contacto}
                                onChange={e => handleChange('contacto', e.target.value)}
                                placeholder="Nombre de la empresa o tercero"
                                className="!h-10 text-[13px] font-medium"
                                required
                            />
                        </div>
                        <div>
                            <FormLabel>NIT / Identificación</FormLabel>
                            <Input
                                value={formData.identificacion}
                                onChange={e => handleChange('identificacion', e.target.value)}
                                placeholder="Ej: 900123456-7"
                                className="!h-10 text-[13px] font-medium"
                            />
                        </div>

                        {/* Fila 2 */}
                        <div>
                            <FormLabel>N° de Factura / Documento <span className="text-red-500">*</span></FormLabel>
                            <Input
                                value={formData.documento}
                                onChange={e => handleChange('documento', e.target.value)}
                                placeholder="Ej: FV-00123"
                                className="!h-10 text-[13px] font-medium uppercase"
                                required
                            />
                        </div>
                        <div>
                            <FormLabel>Fecha <span className="text-red-500">*</span></FormLabel>
                            <Input
                                type="date"
                                value={formData.fecha}
                                onChange={e => handleChange('fecha', e.target.value)}
                                className="!h-10 text-[13px] font-medium uppercase tracking-tight"
                                required
                            />
                        </div>

                        {/* Fila 3 */}
                        <div>
                            <FormLabel>Valor / Base (Total) <span className="text-red-500">*</span></FormLabel>
                            <CurrencyInput
                                value={formData.base}
                                onChange={val => handleChange('base', val)}
                                placeholder="$ 0"
                                className="!h-10 text-[14px] font-bold text-emerald-700"
                                required
                            />
                        </div>
                        <div>
                            <FormLabel>Cuenta / Rubro</FormLabel>
                            <Input
                                value={formData.cuenta}
                                onChange={e => handleChange('cuenta', e.target.value)}
                                placeholder="Ej: Gastos de Operación"
                                className="!h-10 text-[13px] font-medium"
                            />
                        </div>
                    </div>

                    {/* Fila 4: Full width */}
                    <div>
                        <FormLabel>Descripción o Concepto</FormLabel>
                        <Input
                            value={formData.descripcion}
                            onChange={e => handleChange('descripcion', e.target.value)}
                            placeholder="Detalle sobre qué se compró"
                            className="!h-10 text-[13px] font-medium"
                        />
                    </div>

                    <div className="pt-6 flex justify-end items-center border-t border-gray-50 dark:border-slate-700 mt-4 gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="!h-10 !px-6 font-semibold text-[12px] tracking-wide"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="!h-10 !px-8 font-semibold text-[12px] tracking-wide shadow-md shadow-purple-500/10 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isLoading ? 'Guardando...' : 'Registrar Compra'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
