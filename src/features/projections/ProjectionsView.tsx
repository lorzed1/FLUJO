import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useUI } from '../../context/UIContext';
import { useProjections } from './hooks/useProjections';
import { ConfigModal } from './components/ConfigModal';
import { ProjectionsMethodologyModal } from './components/ProjectionsMethodologyModal';
import { PageHeader } from '../../components/layout/PageHeader';
import { ChartBarIcon, QuestionMarkCircleIcon, ChevronRightIcon } from '../../components/ui/Icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ProjectionsDashboardPage } from './pages/ProjectionsDashboardPage';
import { ProjectionsDatabasePage } from './pages/ProjectionsDatabasePage';
import { EquilibriumDatabasePage } from './pages/EquilibriumDatabasePage';

export const ProjectionsView: React.FC = () => {
    const {
        currentDate,
        nextMonth,
        prevMonth,
        events,
        calculatedProjections,
        projections, // Stored
        loading,
        config,
        setConfig,
        addEvent, // Note: If used in sub-pages, pass them. ProjectionsDatabasePage doesn't seem to use them in props interface shown before, but verify if needed. The interface I saw only had data props.
        deleteEvent,
        saveGoal,
        seedHolidays,
        seedPaydays,
        realSales
    } = useProjections();

    const { setAlertModal } = useUI();
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const location = useLocation();

    // Determine breadcrumb based on active route
    let breadcrumbLabel = 'Tablero';
    if (location.pathname.includes('/projections/table')) breadcrumbLabel = 'Proyeccion Estadistica';
    if (location.pathname.includes('/projections/statistics')) breadcrumbLabel = 'Proyeccion PE';

    return (
        <div className="h-full flex flex-col font-sans overflow-hidden">

            {/* Page Header */}
            <PageHeader
                title="Proyeccion de ventas"
                breadcrumbs={[
                    { label: 'Proyeccion de ventas', path: '/projections' },
                    { label: breadcrumbLabel }
                ]}
                icon={<ChartBarIcon className="h-6 w-6" />}
                actions={
                    <div className="flex flex-wrap items-center gap-3">

                        {/* Month Nav */}
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
                            <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 transition-colors">
                                <ChevronRightIcon className="h-4 w-4 rotate-180" />
                            </button>
                            <span className="text-sm font-bold w-32 text-center capitalize text-gray-700 dark:text-gray-200 select-none">
                                {format(currentDate, 'MMMM yyyy', { locale: es })}
                            </span>
                            <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-md text-gray-500 transition-colors">
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Help Button */}
                        <button
                            onClick={() => setIsHelpOpen(true)}
                            className="flex items-center justify-center p-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                            title="¿Cómo funciona?"
                        >
                            <QuestionMarkCircleIcon className="h-5 w-5 text-primary" />
                        </button>

                        {/* Config Button */}
                        <button
                            onClick={() => setIsConfigOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary dark:bg-blue-600 text-white rounded-lg text-xs font-bold shadow-md hover:bg-primary/90 transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            Configurar
                        </button>
                    </div>
                }
            />

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col h-full relative mt-4">
                <Routes>
                    <Route index element={<Navigate to="table" replace />} />

                    <Route path="table" element={
                        <ProjectionsDatabasePage
                            currentDate={currentDate}
                            events={events}
                            calculatedProjections={calculatedProjections}
                            storedProjections={projections}
                            realSales={realSales}
                            loading={loading}
                        />
                    } />

                    <Route path="statistics" element={
                        <EquilibriumDatabasePage
                            currentDate={currentDate}
                            realSales={realSales}
                        />
                    } />

                    {/* Keep dashboard route just in case or redirect */}
                    <Route path="dashboard" element={
                        <Navigate to="table" replace />
                    } />

                    <Route path="*" element={<Navigate to="table" replace />} />
                </Routes>
            </div>

            {/* Modals */}
            <ConfigModal
                isOpen={isConfigOpen}
                onClose={() => setIsConfigOpen(false)}
                config={config}
                onSave={setConfig}
                onSeedHolidays={seedHolidays}
                onSeedPaydays={seedPaydays}
            />

            <ProjectionsMethodologyModal
                isOpen={isHelpOpen}
                onClose={() => setIsHelpOpen(false)}
            />
        </div>
    );
};
