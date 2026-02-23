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
import { ProjectionsTablePage } from './pages/ProjectionsTablePage';
import { ProjectionsCalendarPage } from './pages/ProjectionsCalendarPage';
import { EquilibriumDatabasePage } from './pages/EquilibriumDatabasePage';

export const ProjectionsView: React.FC = () => {
    const {
        currentDate,
        setCurrentDate,
        nextMonth,
        prevMonth,
        events,
        calculatedProjections,
        projections, // Stored
        loading,
        config,
        setConfig,
        addEvent,
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
    if (location.pathname.includes('/projections/calendar')) breadcrumbLabel = 'Calendario de Metas';
    if (location.pathname.includes('/projections/table')) breadcrumbLabel = 'Base de Datos';
    if (location.pathname.includes('/projections/statistics')) breadcrumbLabel = 'Punto de Equilibrio (PE)';

    const headerActions = {
        currentDate,
        setCurrentDate,
        setIsHelpOpen,
        setIsConfigOpen,
        loading
    };

    return (
        <div className="flex flex-col font-sans">
            {/* Area de Contenido - Delegada a las páginas para consistencia de Layout */}
            <div className="relative">
                <Routes>
                    <Route index element={<Navigate to="calendar" replace />} />

                    <Route path="calendar" element={
                        <ProjectionsCalendarPage
                            {...headerActions}
                            events={events}
                            calculatedProjections={calculatedProjections}
                            storedProjections={projections}
                            realSales={realSales}
                            onAddEvent={addEvent}
                            onDeleteEvent={deleteEvent}
                        />
                    } />

                    <Route path="table" element={
                        <ProjectionsTablePage
                            {...headerActions}
                            events={events}
                            calculatedProjections={calculatedProjections}
                            storedProjections={projections}
                            realSales={realSales}
                        />
                    } />

                    <Route path="statistics" element={
                        <EquilibriumDatabasePage
                            {...headerActions}
                            realSales={realSales}
                        />
                    } />

                    <Route path="dashboard" element={
                        <Navigate to="calendar" replace />
                    } />

                    <Route path="*" element={<Navigate to="calendar" replace />} />
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

