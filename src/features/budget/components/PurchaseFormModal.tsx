import React, { useState, useEffect } from 'react';
import { Input } from '../../../components/ui/Input';
import { DatePicker } from '../../../components/ui/DatePicker';
import { CurrencyInput } from '../../../components/ui/CurrencyInput';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { FormGroup } from '../../../components/ui/FormGroup';
import { ShoppingBagIcon, XMarkIcon } from '../../../components/ui/Icons';

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

    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-slate-700 rounded-lg">
                <ShoppingBagIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-white leading-tight">
                    Registrar Nueva Compra
                </h2>
                <p className="text-xs2 text-slate-400 font-semibold uppercase tracking-caps mt-0.5">Módulo de Compras</p>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-2xl"
            className="p-0 overflow-hidden"
        >
            <div className="flex flex-col flex-1 min-h-0">
                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-2 gap-5">
                        {/* Fila 1 */}
                        <FormGroup label="Proveedor / Contacto" required>
                            <Input
                                value={formData.contacto}
                                onChange={e => handleChange('contacto', e.target.value)}
                                placeholder="Nombre de la empresa o tercero"
                                className="text-sm- font-medium"
                                required
                            />
                        </FormGroup>
                        <FormGroup label="NIT / Identificación">
                            <Input
                                value={formData.identificacion}
                                onChange={e => handleChange('identificacion', e.target.value)}
                                placeholder="Ej: 900123456-7"
                                className="text-sm- font-medium"
                            />
                        </FormGroup>

                        {/* Fila 2 */}
                        <FormGroup label="N° de Factura / Documento" required>
                            <Input
                                value={formData.documento}
                                onChange={e => handleChange('documento', e.target.value)}
                                placeholder="Ej: FV-00123"
                                className="text-sm- font-medium uppercase"
                                required
                            />
                        </FormGroup>
                        <FormGroup label="Fecha" required>
                            <DatePicker
                                value={formData.fecha}
                                onChange={val => handleChange('fecha', val)}
                                className="text-sm- font-medium"
                                required
                            />
                        </FormGroup>

                        {/* Fila 3 */}
                        <FormGroup label="Valor / Base (Total)" required>
                            <CurrencyInput
                                value={formData.base}
                                onChange={val => handleChange('base', val)}
                                placeholder="$ 0"
                                className="text-sm font-bold text-emerald-700"
                                required
                            />
                        </FormGroup>
                        <FormGroup label="Cuenta / Rubro">
                            <Input
                                value={formData.cuenta}
                                onChange={e => handleChange('cuenta', e.target.value)}
                                placeholder="Ej: Gastos de Operación"
                                className="text-sm- font-medium"
                            />
                        </FormGroup>
                    </div>

                    {/* Fila 4: Full width */}
                    <FormGroup label="Descripción o Concepto">
                        <Input
                            value={formData.descripcion}
                            onChange={e => handleChange('descripcion', e.target.value)}
                            placeholder="Detalle sobre qué se compró"
                            className="text-sm- font-medium"
                        />
                    </FormGroup>

                    <div className="pt-6 flex justify-end items-center border-t border-gray-50 dark:border-slate-700 mt-4 gap-3 shrink-0 bg-white dark:bg-slate-800">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={onClose}
                            className="!px-6 font-semibold text-xs tracking-wide"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="!px-8 font-semibold text-xs tracking-wide shadow-md shadow-purple-500/10 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isLoading ? 'Guardando...' : 'Registrar Compra'}
                        </Button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};
