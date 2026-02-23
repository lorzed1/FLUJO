export type BudgetStatus = 'pending' | 'paid' | 'overdue';
export type RecurrenceFrequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
    id: string;
    title: string;
    amount: number;
    frequency: RecurrenceFrequency;
    interval?: number; // Every X weeks/months. Default: 1
    dayToSend: number; // Día del mes o día de la semana según frecuencia
    startDate: string; // ISO Date
    endDate?: string; // ISO Date
    category: string;
    description?: string;
    active: boolean;
    lastGeneratedDate?: string; // ISO Date of the last generated commitment
    createdAt: number;
    updatedAt: number;
}

export interface BudgetCommitment {
    id: string;
    title: string;
    amount: number;
    dueDate: string; // ISO Date
    status: BudgetStatus;
    paidDate?: string; // ISO Date
    category: string;
    description?: string;
    recurrenceRuleId?: string; // Link a la regla si es generado automáticamente
    providerName?: string;
    contactInfo?: string; // Email o teléfono para recordatorios
    createdAt: number;
    updatedAt: number;
    isProjected?: boolean;
}

export interface BudgetKPIs {
    totalDebt: number;
    overdueCount: number;
    pendingCount: number;
    averageDaysOverdue: number;
    dailyCommitments: { date: string; amount: number }[];
}

export interface WeeklyAvailability {
    id: string; // Puede ser el mismo 'yyyy-MM-dd' del Lunes para unicidad
    weekStartDate: string; // YYYY-MM-DD
    ctaCorriente: number;
    ctaAhorrosJ: number;
    ctaAhorrosN: number;
    ctaNequi: number;
    otrosIngresos: number;
    efectivo: number;
    totalAvailable: number;
    createdAt: number;
    updatedAt: number;
}

export interface BudgetExecutionLog {
    id: string;
    executionDate: string; // ISO Datetime
    weekStartDate: string; // YYYY-MM-DD
    initialState: {
        ctaCorriente: number;
        ctaAhorrosJ: number;
        ctaAhorrosN: number;
        ctaNequi: number;
        otrosIngresos: number;
        efectivo: number;
        totalAvailable: number;
    };
    totalPaid: number;
    finalBalance: number;
    itemsCount: number; // Cantidad de facturas pagadas
}

export interface Purchase {
    id: string;
    date: string; // YYYY-MM-DD
    provider: string;
    invoiceNumber?: string;
    description: string;
    category: string;
    amount: number;
    status: 'pending' | 'paid';
    createdAt: number;
    updatedAt: number;
    [key: string]: any; // Allow for dynamic columns
}

