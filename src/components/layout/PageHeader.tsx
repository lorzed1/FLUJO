import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../ui/Icons';

interface PageHeaderProps {
    title: string;
    breadcrumbs: { label: string; path?: string }[];
    actions?: React.ReactNode;
    icon?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, breadcrumbs, actions, icon }) => {
    return (
        <div className="mb-2 sm:mb-4">
            {/* Breadcrumbs */}
            <nav className="flex items-center text-[10px] sm:text-xs text-gray-400 mb-1 font-medium">
                <Link to="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={index}>
                        <ChevronRightIcon className="h-3 w-3 mx-1 text-gray-300" />
                        {crumb.path ? (
                            <Link to={crumb.path} className="hover:text-primary transition-colors">
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-gray-600 dark:text-gray-300 pointer-events-none">
                                {crumb.label}
                            </span>
                        )}
                    </React.Fragment>
                ))}
            </nav>

            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {icon && (
                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-primary dark:text-blue-400 border border-gray-100 dark:border-slate-700">
                            {icon}
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-primary dark:text-white tracking-tight">
                        {title}
                    </h1>
                </div>

                {actions && (
                    <div className="flex items-center gap-2 sm:self-end">
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
};
