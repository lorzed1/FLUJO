import React, { ReactNode, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PresentationChartLineIcon, ChartBarIcon, TrendingUpIcon, BanknotesIcon, ShoppingCartIcon } from '../../../components/ui/Icons';
import { DashboardControls } from './DashboardControls';

type ViewMode = 'overview' | 'sales' | 'projections' | 'expenses' | 'purchases';

interface DashboardLayoutProps {
    children: ReactNode;
    currentView: ViewMode;
    onViewChange: (view: ViewMode) => void;
    selectedDate: Date;
    onDateChange: (date: Date) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    children,
    currentView,
    onViewChange,
    selectedDate,
    onDateChange
}) => {

    const views = [
        { id: 'overview', label: 'General', icon: PresentationChartLineIcon },
        { id: 'sales', label: 'Ventas', icon: ChartBarIcon },
        { id: 'projections', label: 'Proyecciones', icon: TrendingUpIcon },
        { id: 'expenses', label: 'Egresos', icon: BanknotesIcon },
        { id: 'purchases', label: 'Compras', icon: ShoppingCartIcon },
    ] as const;

    return (
        <div className="space-y-4 pb-20 animate-in fade-in duration-500 min-h-screen">
            {/* Header Section — Excepción Dashboard: controles inline con título */}
            <div className="flex flex-col gap-4">
                {/* Top Row: Title + Info + Date Controls — todo en una línea */}
                <div>
                    <PageHeader
                        title="Business Intelligence"
                        breadcrumbs={[
                            { label: 'Control', path: '/dashboard' },
                            { label: 'Dashboard Principal' }
                        ]}
                        icon={<PresentationChartLineIcon className="h-6 w-6" />}
                        actions={
                            <DashboardControls
                                selectedDate={selectedDate}
                                onDateChange={onDateChange}
                            />
                        }
                    />
                </div>

                {/* Bottom Row: View Switcher (Segmented Control Aliaddo) */}
                <div className="overflow-x-auto pb-1 -mt-2">
                    <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-sm overflow-hidden w-fit min-w-full md:min-w-0 h-10">
                        {views.map((view, idx) => {
                            const Icon = view.icon;
                            const isActive = currentView === view.id;
                            const isLast = idx === views.length - 1;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => onViewChange(view.id as ViewMode)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 h-full text-[13px] font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer
                                        min-h-[40px]
                                        ${!isLast ? 'border-r border-slate-200 dark:border-slate-700' : ''}
                                        ${isActive
                                            ? 'bg-purple-600 text-white shadow-inner'
                                            : 'bg-transparent text-slate-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-300'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{view.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area — con animación escalonada */}
            <div className="relative animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150">
                <div>
                    {children}
                </div>
            </div>

        </div>
    );
};
