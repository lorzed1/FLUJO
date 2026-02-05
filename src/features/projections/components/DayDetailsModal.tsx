import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesEvent, SalesProjection, SalesEventType } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';

interface DayDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    date: Date | null;
    projectionResult: ProjectionResult | undefined;
    storedProjection: SalesProjection | undefined;
    events: SalesEvent[];
    config: { growthPercentage: number }; // Added config to props
    onAddEvent: (event: Omit<SalesEvent, 'id'>) => Promise<void>;
    onDeleteEvent: (id: string, date: string) => Promise<void>;
    onSaveGoal: (date: string, amount: number) => Promise<void>;
}

export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({
    isOpen, onClose, date,
    projectionResult, storedProjection, events, config,
    onAddEvent, onDeleteEvent, onSaveGoal
}) => {
    const [activeTab, setActiveTab] = useState<'details' | 'events'>('details');
    const [overrideAmount, setOverrideAmount] = useState<string>('');

    // New Event State
    const [newEventName, setNewEventName] = useState('');
    const [newEventType, setNewEventType] = useState<SalesEventType>('boost');
    const [newEventFactor, setNewEventFactor] = useState(1.2);

    useEffect(() => {
        if (storedProjection) {
            setOverrideAmount(storedProjection.amountAdjusted.toString());
        } else if (projectionResult) {
            setOverrideAmount(Math.round(projectionResult.final).toString());
        } else {
            setOverrideAmount('');
        }
    }, [projectionResult, storedProjection, isOpen]);

    if (!isOpen || !date) return null;

    const dateStr = format(date, 'yyyy-MM-dd');

    const handleSaveOverride = () => {
        const val = parseFloat(overrideAmount);
        if (!isNaN(val)) {
            onSaveGoal(dateStr, val);
            onClose();
        }
    };

    const handleAddEvent = async () => {
        if (!newEventName) return;
        await onAddEvent({
            date: dateStr,
            name: newEventName,
            type: newEventType,
            impactFactor: newEventType === 'neutral' ? 1 : newEventFactor,
            isRecurring: false
        });
        setNewEventName(''); // Reset
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                </div>

                {/* Modal panel */}
                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900 capitalize" id="modal-title">
                                    {format(date, 'EEEE d MMMM, yyyy', { locale: es })}
                                </h3>

                                {/* Tabs */}
                                <div className="mt-4 border-b border-gray-200">
                                    <nav className="-mb-px flex space-x-8">
                                        <button
                                            onClick={() => setActiveTab('details')}
                                            className={`${activeTab === 'details' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                                        >
                                            Proyección
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('events')}
                                            className={`${activeTab === 'events' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                                        >
                                            Eventos ({events.length})
                                        </button>
                                    </nav>
                                </div>

                                <div className="mt-4">
                                    {activeTab === 'details' && (
                                        <div className="space-y-4">
                                            {/* Summary Stats */}
                                            <div className="bg-indigo-50 p-4 rounded-md">
                                                <p className="text-sm text-indigo-700 font-medium">Cálculo del Sistema</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-gray-600">Promedio Histórico ({projectionResult?.usedHistory.length} semanas)</span>
                                                    <span className="font-semibold">${Math.round(projectionResult?.rawAverage || 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-sm bg-white/50 p-1 rounded">
                                                    <span className="text-gray-600">x Crecimiento</span>
                                                    <span className="font-mono text-xs">{(projectionResult?.factors.growth || 1).toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center mt-1 text-sm bg-white/50 p-1 rounded">
                                                    <span className="text-gray-600">x Impacto Eventos</span>
                                                    <span className="font-mono text-xs">{(projectionResult?.factors.eventModifier || 1).toFixed(2)}</span>
                                                </div>
                                                <div className="border-t border-indigo-200 mt-2 pt-2 flex justify-between items-center">
                                                    <span className="font-bold text-indigo-900">Total Sugerido</span>
                                                    <span className="font-bold text-lg text-indigo-900">${Math.round(projectionResult?.final || 0).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Traffic & Delta Real (New) */}
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                                    <span className="text-xs font-semibold text-blue-900 uppercase">Visitas Esperadas</span>
                                                    <div className="mt-1 flex items-baseline gap-2">
                                                        <span className="text-xl font-bold text-blue-700">
                                                            {Math.round(projectionResult?.finalTickets || 0)}
                                                        </span>
                                                        <span className="text-xs text-blue-600"> ventas/visitas</span>
                                                    </div>
                                                    <p className="text-[10px] text-blue-500 mt-1">
                                                        Crecimiento Real: +{config.growthPercentage}%
                                                    </p>
                                                </div>

                                                <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                                                    <span className="text-xs font-semibold text-purple-900 uppercase">Rango Seguro (80%)</span>
                                                    <div className="mt-1">
                                                        <div className="flex justify-between text-xs text-purple-800 mb-1">
                                                            <span>Min: ${(projectionResult?.range?.lower || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-purple-800">
                                                            <span>Max: ${(projectionResult?.range?.upper || 0).toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Meta Final (Ajuste Manual)</label>
                                                <div className="mt-1 relative rounded-md shadow-sm">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <span className="text-gray-500 sm:text-sm">$</span>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        value={overrideAmount}
                                                        onChange={(e) => setOverrideAmount(e.target.value)}
                                                        className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md py-2"
                                                        placeholder="0.00"
                                                    />
                                                </div>
                                                <p className="mt-1 text-xs text-gray-500">Si modificas este valor, el cálculo del sistema será ignorado.</p>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'events' && (
                                        <div className="space-y-4">
                                            {/* List */}
                                            {events.length > 0 ? (
                                                <ul className="divide-y divide-gray-200">
                                                    {events.map(ev => (
                                                        <li key={ev.id} className="py-3 flex justify-between items-center">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-900">{ev.name}</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {ev.type === 'boost' ? 'Sube venta' : ev.type === 'drag' ? 'Baja venta' : 'Neutro'}
                                                                    {ev.type !== 'neutral' && ` (x${ev.impactFactor})`}
                                                                </p>
                                                            </div>
                                                            <button
                                                                onClick={() => onDeleteEvent(ev.id, ev.date)}
                                                                className="text-red-600 hover:text-red-900 text-xs font-medium"
                                                            >
                                                                Eliminar
                                                            </button>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-sm text-gray-500 italic text-center py-4">No hay eventos registrados para este día.</p>
                                            )}

                                            {/* Add New */}
                                            <div className="bg-gray-50 p-3 rounded-md mt-4 border border-gray-200">
                                                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Nuevo Evento</h4>

                                                {/* Shortcuts */}
                                                <div className="flex gap-2 mb-2">
                                                    <button
                                                        onClick={async () => {
                                                            await onAddEvent({
                                                                date: dateStr,
                                                                name: 'Cierre Operativo',
                                                                type: 'drag',
                                                                impactFactor: 0,
                                                                isRecurring: false
                                                            });
                                                        }}
                                                        className="flex-1 py-1 px-2 border border-red-300 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 transition-colors"
                                                    >
                                                        ⛔ Marcar Cerrado
                                                    </button>
                                                </div>

                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre del evento (ej: Partido Colombia)"
                                                        className="block w-full text-sm border-gray-300 rounded-md shadow-sm"
                                                        value={newEventName}
                                                        onChange={e => setNewEventName(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="block w-1/2 text-sm border-gray-300 rounded-md shadow-sm"
                                                            value={newEventType}
                                                            onChange={e => setNewEventType(e.target.value as SalesEventType)}
                                                        >
                                                            <option value="boost">Boost (Sube)</option>
                                                            <option value="drag">Drag (Baja)</option>
                                                            <option value="neutral">Neutro</option>
                                                        </select>
                                                        {newEventType !== 'neutral' && (
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                className="block w-1/2 text-sm border-gray-300 rounded-md shadow-sm"
                                                                value={newEventFactor}
                                                                onChange={e => setNewEventFactor(parseFloat(e.target.value))}
                                                            />
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={handleAddEvent}
                                                        disabled={!newEventName}
                                                        className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                                    >
                                                        Agregar Evento
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button
                                type="button"
                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={handleSaveOverride}
                            >
                                Guardar Cambios
                            </button>
                            <button
                                type="button"
                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                onClick={onClose}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
