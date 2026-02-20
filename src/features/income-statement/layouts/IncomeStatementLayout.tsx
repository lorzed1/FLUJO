import React from 'react';
import { Outlet } from 'react-router-dom';

export const IncomeStatementLayout: React.FC = () => {
    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex-1 min-h-0">
                <Outlet />
            </div>
        </div>
    );
};
