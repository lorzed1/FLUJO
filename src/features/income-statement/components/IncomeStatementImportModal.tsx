import React from 'react';
import { ArrowUpTrayIcon } from '../../../components/ui/Icons';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
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

    const headerTitle = (
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white dark:bg-slate-700 rounded-lg shadow-sm border border-gray-100 dark:border-slate-600">
                <ArrowUpTrayIcon className="w-5 h-5 text-primary dark:text-blue-400" />
            </div>
            <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    Asistente de Importación
                </h2>
                <p className="text-xs2 text-gray-400 font-bold uppercase tracking-widest mt-0.5">Estado de Resultados</p>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={headerTitle}
            maxWidth="max-w-4xl"
            className="p-0 overflow-hidden"
        >
            <div className="flex flex-col h-full max-h-[90vh]">
                {/* Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    <IncomeStatementImportWizard
                        onBatchImport={onBatchImport}
                        onCancel={onClose}
                    />
                </div>
            </div>
        </Modal>
    );
};
