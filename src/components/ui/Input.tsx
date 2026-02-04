
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Input: React.FC<InputProps> = ({ className, ...props }) => {
  return (
    <input
      className={`block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white transition-colors duration-200 ${className}`}
      {...props}
    />
  );
};

/**
 * Formatea un número o string numérico al estilo COP: 1234567.89 -> "1.234.567,89"
 * Usa Intl.NumberFormat para máxima compatibilidad local.
 */
export const formatCOP = (val: number | string): string => {
  if (val === '' || val === undefined || val === null) return '0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

export const formatCurrency = formatCOP;

/**
 * Limpia un string formateado para obtener el número: "$ 1.234.567,89" -> 1234567.89
 * Maneja tanto formato con puntos de miles (Latam) como comas de miles (US) con heurística simple.
 */
export const parseCOP = (val: string | number): number => {
  if (val === undefined || val === null || val === '') return 0;
  const strVal = String(val);
  // Simplified logic for COP (no decimals used in UI):
  // Remove everything that is NOT a digit or a minus sign.
  const clean = strVal.replace(/[^0-9-]/g, '');

  const num = parseInt(clean, 10);
  return isNaN(num) ? 0 : num;
};
