
import React, { ReactNode } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader';
import { PresentationChartLineIcon, ChartBarIcon, WalletIcon, TrendingUpIcon, BanknotesIcon } from '../../../components/ui/Icons';
import { DashboardControls } from './DashboardControls';

type ViewMode = 'overview' | 'sales' | 'budget' | 'projections' | 'expenses';

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
        { id: 'budget', label: 'Presupuesto', icon: WalletIcon },
        { id: 'projections', label: 'Proyecciones', icon: TrendingUpIcon },
        { id: 'expenses', label: 'Gastos', icon: BanknotesIcon },
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

                    {/* Date Filter Control */}
                    <div className="w-full lg:w-auto">
                        <DashboardControls
                            selectedDate={selectedDate}
                            onDateChange={onDateChange}
                        />
                    </div>
                </div>

                {/* Bottom Row: View Switcher Tabs */}
                <div className="overflow-x-auto pb-1">
                    <div className="flex bg-white dark:bg-gray-800 p-1.5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 w-fit min-w-full md:min-w-0">
                        {views.map((view) => {
                            const Icon = view.icon;
                            const isActive = currentView === view.id;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => onViewChange(view.id as ViewMode)}
                                    className={`
                                        flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap
                                        ${isActive
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                        }
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
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
        </div>
    );
};
