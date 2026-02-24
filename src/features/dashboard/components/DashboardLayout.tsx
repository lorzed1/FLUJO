import React, { ReactNode, useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PresentationChartLineIcon, ChartBarIcon, WalletIcon, TrendingUpIcon, BanknotesIcon, ShoppingCartIcon, InformationCircleIcon } from '../../../components/ui/Icons';
import { DashboardControls } from './DashboardControls';
import { DashboardInfoModal } from './DashboardInfoModal';

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
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const views = [
        { id: 'overview', label: 'General', icon: PresentationChartLineIcon },
        { id: 'sales', label: 'Ventas', icon: ChartBarIcon },
        { id: 'projections', label: 'Proyecciones', icon: TrendingUpIcon },
        { id: 'expenses', label: 'Egresos', icon: BanknotesIcon },
        { id: 'purchases', label: 'Compras', icon: ShoppingCartIcon },
    ] as const;

    return (
        <div className="space-y-4 pb-20 animate-in fade-in duration-500 min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col gap-6">
                {/* Top Row: Title & Date Controls */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <PageHeader
                        title="Business Intelligence"
                        breadcrumbs={[
                            { label: 'Control', path: '/dashboard' },
                            { label: 'Dashboard Principal' }
                        ]}
                        icon={<PresentationChartLineIcon className="h-6 w-6" />}
                    />

                    {/* Date Filter Control & Info */}
                    <div className="w-full lg:w-auto flex items-center justify-end gap-2">
                        <button
                            onClick={() => setIsInfoModalOpen(true)}
                            className="p-1.5 lg:p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md border border-indigo-200 transition-colors"
                            title="Información y Fórmulas"
                        >
                            <InformationCircleIcon className="w-4 h-4 lg:w-5 lg:h-5" />
                        </button>
                        <DashboardControls
                            selectedDate={selectedDate}
                            onDateChange={onDateChange}
                        />
                    </div>
                </div>

                {/* Bottom Row: View Switcher (Segmented Control Aliaddo) */}
                <div className="overflow-x-auto pb-1">
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
                                        flex-1 flex items-center justify-center gap-2 px-4 h-full text-[13px] font-semibold transition-colors whitespace-nowrap
                                        ${!isLast ? 'border-r border-slate-200 dark:border-slate-700' : ''}
                                        ${isActive
                                            ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                            : 'bg-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300'
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

            {/* Main Content Area */}
            <div className="relative">
                {/* Removed decorative blobs to adhere to professional 'clean and airy' standard */}
                <div>
                    {children}
                </div>
            </div>

            <DashboardInfoModal
                isOpen={isInfoModalOpen}
                onClose={() => setIsInfoModalOpen(false)}
            />
        </div>
    );
};
