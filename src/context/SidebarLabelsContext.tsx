import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

const SIDEBAR_LABELS_KEY = 'finance_app_sidebar_labels';

/**
 * Mapa COMPLETO de navId → defaultLabel (idéntico al sidebar).
 * Esto permite buscar por defaultLabel para resolver breadcrumbs.
 */
const DEFAULT_LABELS: Record<string, string> = {
    // Padres
    'dashboard': 'Dashboard',
    'arqueo': 'Caja',
    'budget': 'Egresos',
    'projections': 'Proyección de ventas',
    'income-statement': 'Estado de Resultados',
    'accounting': 'Contabilidad',
    'users': 'Usuarios',
    // Hijos — Caja
    'arqueo-form': 'Arqueo diario',
    'arqueo-history': 'Historial de cierres',
    'arqueo-tips': 'Propinas',
    // Hijos — Egresos
    'budget-execution': 'Pagos semanal',
    'budget-calendar': 'Calendario de gastos',
    'budget-recurrent': 'Gastos recurrentes',
    'budget-list': 'BD de gastos',
    'budget-purchases': 'Compras',
    // Hijos — Proyecciones
    'projections-calendar': 'Calendario de Metas',
    'projections-table': 'Base de Datos',
    'projections-statistics': 'Análisis PE (Semanal)',
    // Hijos — Estado de Resultados
    'income-dashboard': 'BI PYG',
    'income-table': 'BD Estado de resultados',
    // Hijos — Contabilidad
    'accounting-consolidated': 'Consloidado PYG',
    'accounting-cta-natalia': 'Cta Natalia',
    'accounting-asientos-contables': 'Asientos Contables',
    // Hijos — Usuarios
    'users-list': 'Lista de Usuarios',
};

/**
 * Mapeo de alias de breadcrumbs → navId.
 * Los breadcrumbs en las páginas a veces usan nombres distintos a los del sidebar.
 * Ejemplo: sidebar dice "Pagos semanal" pero el breadcrumb dice "Pagos Semanales".
 */
const BREADCRUMB_ALIASES: Record<string, string> = {
    // Budget breadcrumb aliases → navId
    'Pagos Semanales': 'budget-execution',
    'Calendario': 'budget-calendar',
    'Tabla': 'budget-list',
    'Tablero': 'budget-execution',
    'Recurrentes': 'budget-recurrent',
    // Dashboard breadcrumb aliases
    'Control': 'dashboard',
    'Dashboard Principal': 'dashboard',
    'Business Intelligence': 'dashboard',
    // Caja aliases
    'Arqueo de Caja': 'arqueo-form',
    // Income statement aliases
    'BD Estado de resultados': 'income-table',
    // Contabilidad aliases
    'Consolidado PYG': 'accounting-consolidated',
    'Consloidado PYG': 'accounting-consolidated',
    // Proyecciones aliases
    'Calendario de Metas de Venta': 'projections-calendar',
};

interface SidebarLabelsContextType {
    customLabels: Record<string, string>;
    getLabel: (id: string, fallback: string) => string;
    resolveLabel: (defaultLabel: string) => string;
    setLabel: (id: string, label: string) => void;
    setLabels: (labels: Record<string, string>) => void;
}

const SidebarLabelsContext = createContext<SidebarLabelsContextType | null>(null);

const loadCustomLabels = (): Record<string, string> => {
    try {
        const stored = localStorage.getItem(SIDEBAR_LABELS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
};

const saveCustomLabels = (labels: Record<string, string>) => {
    localStorage.setItem(SIDEBAR_LABELS_KEY, JSON.stringify(labels));
};

export const SidebarLabelsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [customLabels, setCustomLabelsState] = useState<Record<string, string>>(loadCustomLabels);

    const getLabel = useCallback((id: string, fallback: string): string => {
        return customLabels[id] || fallback;
    }, [customLabels]);

    /**
     * Dado un label por defecto (e.g. "Caja", "Egresos"), busca si existe
     * un custom label asignado a ese nav item y lo devuelve.
     * Esto permite que los breadcrumbs hardcodeados se actualicen
     * sin modificar cada archivo de página.
     */
    const resolveLabel = useCallback((defaultLabel: string): string => {
        // 1. Búsqueda directa en DEFAULT_LABELS (by value → navId → customLabel)
        for (const [navId, defLabel] of Object.entries(DEFAULT_LABELS)) {
            if (defLabel === defaultLabel && customLabels[navId]) {
                return customLabels[navId];
            }
        }
        // 2. Búsqueda en BREADCRUMB_ALIASES (alias → navId → customLabel)
        const aliasNavId = BREADCRUMB_ALIASES[defaultLabel];
        if (aliasNavId && customLabels[aliasNavId]) {
            return customLabels[aliasNavId];
        }
        return defaultLabel;
    }, [customLabels]);

    const setLabel = useCallback((id: string, label: string) => {
        const updated = { ...customLabels, [id]: label };
        setCustomLabelsState(updated);
        saveCustomLabels(updated);
    }, [customLabels]);

    const setLabels = useCallback((labels: Record<string, string>) => {
        setCustomLabelsState(labels);
        saveCustomLabels(labels);
    }, []);

    return (
        <SidebarLabelsContext.Provider value={{ customLabels, getLabel, resolveLabel, setLabel, setLabels }}>
            {children}
        </SidebarLabelsContext.Provider>
    );
};

export const useSidebarLabels = (): SidebarLabelsContextType => {
    const ctx = useContext(SidebarLabelsContext);
    if (!ctx) throw new Error('useSidebarLabels must be used within SidebarLabelsProvider');
    return ctx;
};
