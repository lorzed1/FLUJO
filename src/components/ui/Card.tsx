import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({ className = '', children, noPadding = false, ...props }) => {
    return (
        <div className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm ${noPadding ? '' : 'p-6'} ${className}`} {...props}>
            {children}
        </div>
    );
};
