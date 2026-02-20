import React, { useState } from 'react';
import { ProjectionsDatabasePage } from './ProjectionsDatabasePage';
import { EquilibriumDatabasePage } from './EquilibriumDatabasePage';

import { SalesProjection, SalesEvent } from '../../../types';
import { ProjectionResult } from '../../../utils/projections';

interface ProjectionsTablePageProps {
    currentDate: Date;
    events: SalesEvent[];
    calculatedProjections: Record<string, ProjectionResult>;
    storedProjections: Record<string, SalesProjection>;
    realSales: Record<string, number>;
    loading: boolean;
    activeTab: 'equilibrium' | 'stats';
}

export const ProjectionsTablePage: React.FC<ProjectionsTablePageProps> = ({
    currentDate,
    events,
    calculatedProjections,
    storedProjections,
    realSales,
    loading,
    activeTab
}) => {
    return (
        <div className="flex-1 overflow-auto">
            {activeTab === 'equilibrium' ? (
                <EquilibriumDatabasePage
                    currentDate={currentDate}
                    realSales={realSales}
                />
            ) : (
                <ProjectionsDatabasePage
                    currentDate={currentDate}
                    events={events}
                    calculatedProjections={calculatedProjections}
                    storedProjections={storedProjections}
                    realSales={realSales}
                    loading={loading}
                />
            )}
        </div>
    );
};
