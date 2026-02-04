import React, { useState } from 'react';
import { XMarkIcon, CalendarIcon, TableCellsIcon } from '../../components/ui/Icons';

interface ExportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (config: ExportConfig) => void;
    availableColumns: { key: string; label: string }[];
}

export interface ExportConfig {
    startDate: string;
    endDate: string;
    selectedColumns: string[];
    format: 'excel' | 'csv' | 'pdf';
}

const ExportConfigModal: React.FC<ExportConfigModalProps> = ({ isOpen, onClose, onExport, availableColumns }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState(today);
    const [selectedColumns, setSelectedColumns] = useState<string[]>(availableColumns.map(c => c.key));
    const [format, setFormat] = useState<'excel' | 'csv' | 'pdf'>('excel');

    if (!isOpen) return null;

    const handleToggleColumn = (key: string) => {
        setSelectedColumns(prev =>
            prev.includes(key)
                ? prev.filter(c => c !== key)
                : [...prev, key]
        );
    };

    const handleSelectAll = () => setSelectedColumns(availableColumns.map(c => c.key));
    const handleDeselectAll = () => setSelectedColumns([]);

    const handleConfirm = () => {
        onExport({ startDate, endDate, selectedColumns, format });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <TableCellsIcon className="h-6 w-6 text-primary" />
                        Configurar Exportación
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-6">

                    {/* Format Selection */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Formato</label>
                        <div className="flex gap-4">
                            {(['excel', 'csv', 'pdf'] as const).map(fmt => (
                                <button
                                    key={fmt}
                                    onClick={() => setFormat(fmt)}
                                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-semibold capitalize transition-all ${format === fmt
                                            ? 'bg-primary/10 border-primary text-primary dark:bg-blue-500/20 dark:border-blue-400 dark:text-blue-400'
                                            : 'border-gray-200 dark:border-slate-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
                                        }`}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Date Range */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" /> Rango de Fechas (Opcional)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Desde</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Hasta</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Column Selection */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Columnas a incluir</label>
                            <div className="flex gap-2 text-xs">
                                <button onClick={handleSelectAll} className="text-primary hover:underline">Todas</button>
                                <button onClick={handleDeselectAll} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">Ninguna</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/50">
                            {availableColumns.map(col => (
                                <label key={col.key} className="flex items-center gap-2 p-1 hover:bg-white dark:hover:bg-slate-800 rounded cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedColumns.includes(col.key)}
                                        onChange={() => handleToggleColumn(col.key)}
                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-gray-300 truncate" title={col.label}>{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 rounded-b-2xl flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white font-semibold text-sm">
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={selectedColumns.length === 0}
                        className="px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md"
                    >
                        Exportar Datos
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ExportConfigModal;
