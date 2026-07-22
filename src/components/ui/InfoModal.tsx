import React from 'react';
import { InformationCircleIcon, CircleStackIcon, CalculatorIcon } from '@/components/ui/Icons';
import { Button } from './Button';
import { Modal } from './Modal';

export interface DataDefinition {
    label: string;
    description: string;
    origin?: string;
    calculation?: string;
}

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    definitions: DataDefinition[];
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, definitions }) => {
    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <InformationCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span>Origen y Cálculo de Datos</span>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            description={title}
            maxWidth="max-w-2xl"
            className="max-h-[85vh]"
        >
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 mb-4">
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed italic">
                        Esta guía explica la procedencia de cada columna y la lógica matemática aplicada para garantizar la transparencia en los datos presentados.
                    </p>
                </div>

                <div className="grid gap-4">
                    {definitions.map((def, idx) => (
                        <div key={idx} className="group bg-slate-50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800/60 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all duration-200 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-900/30">
                            <h3 className="text-sm font-bold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 group-hover:scale-125 transition-transform" />
                                {def.label}
                            </h3>
                            <p className="text-sm- text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                {def.description}
                            </p>

                            <div className="flex flex-wrap gap-3 mt-1">
                                {def.origin && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                                        <CircleStackIcon className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Origen:</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{def.origin}</span>
                                    </div>
                                )}
                                {def.calculation && (
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 rounded-md border border-indigo-100 dark:border-indigo-800/30">
                                        <CalculatorIcon className="w-3 h-3 text-indigo-400" />
                                        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-tight">Cálculo:</span>
                                        <span className="text-xs font-medium text-indigo-700 dark:text-indigo-200">{def.calculation}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-end mt-auto shrink-0">
                <Button variant="secondary" onClick={onClose} className="px-8 font-bold text-xs uppercase cursor-pointer">
                    Entendido
                </Button>
            </div>
        </Modal>
    );
};
