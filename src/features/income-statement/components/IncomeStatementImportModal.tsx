import React from 'react';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { IncomeStatementImportWizard } from './IncomeStatementImportWizard';
import { ParsedIncomeRow } from '../utils/incomeParser';

interface IncomeStatementImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBatchImport: (rows: ParsedIncomeRow[]) => void;
}

export const IncomeStatementImportModal: React.FC<IncomeStatementImportModalProps> = ({
    isOpen,
    onClose,
    onBatchImport
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-[2px] px-4" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-slate-700 max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Block */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600">
                            <ArrowUpTrayIcon className="w-5 h-5 text-primary dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                                Asistente de Importación
                            </h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Estado de Resultados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-white dark:bg-slate-700 p-1.5 rounded-lg border border-gray-100 dark:border-slate-600 shadow-sm"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <IncomeStatementImportWizard
                        onBatchImport={onBatchImport}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </div>
    );
};
