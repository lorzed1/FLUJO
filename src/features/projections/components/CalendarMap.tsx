import React from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, getDay, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { SalesEvent, SalesProjection } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';

interface CalendarMapProps {
    currentDate: Date;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales?: Record<string, number>;
    onDayClick: (date: Date) => void;
}

export const CalendarMap: React.FC<CalendarMapProps> = ({
    currentDate,
    events,
    calculatedProjections,
    storedProjections,
    realSales = {},
    onDayClick
}) => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // 1. Prepare Grid Data with Weekly Chunks
    const startDay = getDay(monthStart); // 0=Sun, 1=Mon
    const offset = startDay === 0 ? 6 : startDay - 1; // Days to fill before 1st of month to align with Mon start

    // Create an array representing the full grid cells (blanks + actual dates)
    const totalSlots = offset + days.length;
    // We need to complete the last week to make it a multiple of 7 for easy chunking
    const endPadding = (7 - (totalSlots % 7)) % 7;

    // Combine all cells: null (blanks) + keys (dates) + null (padding)
    const gridCells = [
        ...Array(offset).fill(null),
        ...days,
        ...Array(endPadding).fill(null)
    ];

    // Chunk into weeks
    const weeks = [];
    for (let i = 0; i < gridCells.length; i += 7) {
        weeks.push(gridCells.slice(i, i + 7));
    }

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden font-sans w-full h-full flex flex-col">
            {/* Calendar Header with Days + Total */}
            <div className="grid grid-cols-8 bg-white border-b border-gray-100 shrink-0">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                        {d}
                    </div>
                ))}
                <div className="py-2 text-center text-xs font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50">
                    Total Sem
                </div>
            </div>

            {/* Calendar Rows */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {weeks.map((week, weekIndex) => {
                    // Weekly Totals
                    let weeklyMeta = 0;
                    let weeklyReal = 0;
                    let hasWeeklyReal = false;

                    // First pass to calculate totals
                    week.forEach(day => {
                        if (day) {
                            const dateStr = format(day, 'yyyy-MM-dd');
                            const projection = calculatedProjections[dateStr];
                            const stored = storedProjections[dateStr];
                            const meta = stored?.amountAdjusted ?? projection?.final ?? 0;
                            const real = realSales[dateStr];

                            weeklyMeta += meta;
                            if (real !== undefined) {
                                weeklyReal += real;
                                hasWeeklyReal = true;
                            }
                        }
                    });

                    const weeklyCompliance = hasWeeklyReal && weeklyMeta > 0 ? (weeklyReal / weeklyMeta) : 0;
                    const isWeeklyMet = weeklyCompliance >= 1;

                    return (
                        <div key={weekIndex} className="grid grid-cols-8 border-b border-gray-100 last:border-0 min-h-[75px]">
                            {/* Days 1-7 */}
                            {week.map((day, dayIndex) => {
                                if (!day) {
                                    return <div key={`blank-${weekIndex}-${dayIndex}`} className="bg-gray-50/30 border-r border-gray-100/50" />;
                                }

                                const dateStr = format(day, 'yyyy-MM-dd');
                                const projection = calculatedProjections[dateStr];
                                const stored = storedProjections[dateStr];
                                const dayEvents = events.filter(e => e.date === dateStr);
                                const realAmount = realSales[dateStr];

                                const goalAmount = stored?.amountAdjusted ?? projection?.final ?? 0;
                                const isLocked = stored?.status === 'locked';

                                const hasRealData = realAmount !== undefined && realAmount > 0;
                                const compliance = hasRealData && goalAmount > 0 ? (realAmount / goalAmount) : 0;
                                const isGoalMet = compliance >= 1;
                                const isToday = isSameDay(day, new Date());

                                return (
                                    <div
                                        key={dateStr}
                                        onClick={() => onDayClick(day)}
                                        className={`
                                            relative group cursor-pointer p-1.5 transition-all duration-200 border-r border-gray-100/50
                                            hover:z-10 hover:shadow-xl hover:scale-[1.02] hover:bg-white
                                            ${isToday ? 'bg-indigo-50/30' : 'bg-white'}
                                        `}
                                    >
                                        {/* Header: Date & Events */}
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`
                                                text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300' : 'text-gray-500 group-hover:text-gray-900'}
                                            `}>
                                                {format(day, 'd')}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="flex -space-x-1 overflow-hidden max-w-[50%]">
                                                    {dayEvents.map(ev => (
                                                        <div
                                                            key={ev.id}
                                                            className={`
                                                                w-1.5 h-1.5 rounded-full ring-1 ring-white
                                                                ${ev.type === 'boost' ? 'bg-emerald-400' :
                                                                    ev.type === 'drag' ? 'bg-rose-400' :
                                                                        'bg-gray-400'}
                                                            `}
                                                            title={ev.name}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Numbers */}
                                        <div className="flex flex-col items-end justify-end h-[calc(100%-1.6rem)] gap-0.5">
                                            {/* META */}
                                            <div className="text-right">
                                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide leading-none mb-0.5">Meta {isLocked && '🔒'}</p>
                                                <p className={`text-xs font-extrabold truncate ${isLocked ? 'text-gray-800' : 'text-indigo-600'}`}>
                                                    ${goalAmount.toLocaleString('es-CO')}
                                                </p>
                                            </div>

                                            {/* REAL */}
                                            {hasRealData ? (
                                                <div className={`
                                                    text-right w-full pt-0.5 border-t border-dashed
                                                    ${isGoalMet ? 'border-emerald-200' : 'border-rose-200'}
                                                `}>
                                                    <p className={`text-xs font-bold leading-none ${isGoalMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                        ${realAmount.toLocaleString('es-CO')}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="h-4 w-full" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Summary Cell (Column 8) */}
                            <div className="bg-indigo-50/30 p-2 flex flex-col justify-center border-l border-indigo-100">
                                <div className="text-right mb-2">
                                    <p className="text-[9px] text-indigo-400 font-bold uppercase">Meta Sem</p>
                                    <p className="text-xs font-black text-gray-800">${weeklyMeta.toLocaleString('es-CO', { maximumFractionDigits: 0 })}</p>
                                </div>

                                {hasWeeklyReal && (
                                    <div className="text-right pt-2 border-t border-indigo-100">
                                        <p className="text-[9px] text-indigo-400 font-bold uppercase">Real Sem</p>
                                        <div className="flex items-center justify-end gap-1">
                                            <p className={`text-xs font-black ${isWeeklyMet ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                ${weeklyReal.toLocaleString('es-CO', { maximumFractionDigits: 0 })}
                                            </p>
                                        </div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full inline-block mt-1 ${isWeeklyMet ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {Math.round(weeklyCompliance * 100)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legend / Footer */}
            <div className="bg-gray-50 px-4 py-2 flex items-center justify-end gap-4 text-[10px] text-gray-500 border-t border-gray-100 shrink-0">
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Evento Positivo
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-rose-400"></div> Evento Negativo
                </div>
                <div className="flex items-center gap-1">
                    <span className="font-bold text-gray-800">105%</span> Cumplimiento Meta
                </div>
            </div>
        </div>
    );
};
