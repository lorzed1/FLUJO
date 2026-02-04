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
