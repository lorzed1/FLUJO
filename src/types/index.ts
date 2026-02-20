
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum ExpenseType {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

export enum Frequency {
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  originalDate?: string; // Fecha original antes de cualquier movimiento (para recurrentes)
  description: string;
  amount: number;
  type?: TransactionType;
  expenseType?: ExpenseType;
  categoryId?: string;
  isRecurring?: boolean;
  recurringId?: string;
  metadata?: Record<string, any>;
  status?: 'projected' | 'completed';
}

export interface RecurringExpense {
  id: string;
  startDate: string; // YYYY-MM-DD
  description: string;
  amount: number;
  frequency: Frequency;
  dayOfMonth?: number; // 1-31 (para mensuales)
  dayOfWeek?: number;  // 0-6 (para semanales, 0=Domingo, 1=Lunes...)
  expenseType: ExpenseType;
  categoryId: string;
}

export type RecurringExpenseOverride = {
  date?: string; // "YYYY-MM-DD"
  amount?: number;
};

export type RecurringExpenseOverrides = {
  [recurringId: string]: {
    [date: string]: RecurringExpenseOverride; // date is "YYYY-MM-DD"
  }
};

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
  netFlow: number;
}

export interface ProjectionPoint {
  month: string;
  balance: number;
}

export type ReconciliationStatus = 'pending' | 'matched_auto' | 'matched_manual' | 'suggested' | 'locked';

export interface ReconciliationMatch {
  id: string;
  internalIds: string[]; // IDs from Official Book
  externalIds: string[]; // IDs from Bank Statement
  totalAmount: number;
  date: string;
  difference: number;
  status: ReconciliationStatus;
  ruleInfo?: string; // e.g. "Exact Match", "Date Window", "Many-to-One"
  confidence?: number; // 0-100
  locked?: boolean; // Para evitar modificaciones accidentales
  createdAt?: string; // Timestamp de creación
}

export interface ReconciliationResult {
  matches: ReconciliationMatch[];
  unmatchedInternal: Transaction[];
  unmatchedExternal: Transaction[];
}

// Tipos para el modo de conciliación interactiva
export interface ReconciliationCandidate {
  transaction: Transaction;
  score: number; // 0-100, qué tan probable es que sea un match
  reason: string; // "Monto exacto", "Fecha cercana", etc.
}

export interface ReconciliationSession {
  selectedExternal: Transaction; // Transacción del Lado A seleccionada
  candidates: ReconciliationCandidate[]; // Posibles matches del Lado B
  mode: 'single' | 'batch'; // Modo de conciliación
}

// Tipos para el sistema de naturaleza de cuentas contables
export type AccountNature = 'DEBIT' | 'CREDIT';

export interface AccountNatureRule {
  id: string;
  pattern: string; // Código o regex para detectar
  nature: AccountNature;
  description: string;
  priority: number; // Para resolver conflictos (mayor = más prioritario)
}

export interface AccountMapping {
  accountCode: string;
  accountName: string;
  nature: AccountNature;
  isManualOverride: boolean; // Si el usuario lo configuró manualmente
  createdAt?: string;
  userId?: string;
}

export type TransferType = 'nequi' | 'bancolombia' | 'davivienda' | 'otros';

export interface TransferRecord {
  id: string;
  date: string;
  amount: number;
  type: TransferType;
  description: string;
  reference?: string; // Comprobante #
  createdAt: string;
  arqueoId?: string; // ID del arqueo origen (para integridad referencial)
}

export interface ArqueoRecord {
  id: string;
  fecha: string;
  cajero: string;
  ventaBruta: number;
  /** @deprecated Ya no se usa. Usar ventaBruta. */
  venta_sc?: number; // Venta sin cover (ventaBruta - ingresoCovers) - calculado en runtime
  propina: number;
  efectivo: number;
  datafonoDavid: number;
  datafonoJulian: number;
  transfBancolombia: number;
  nequi: number;
  rappi: number;
  ingresoCovers: number;
  visitas: number;
  numeroTransacciones?: number; // Added for traffic analysis
  totalRecaudado: number;
  descuadre: number;
  baseDetail?: Record<string, number>; // Nuevo campo para persistir detalle de billetes
  cuadreDetail?: Record<string, number>; // Nuevo campo para persistir detalle de cuadre de venta
  totalIngresos?: number; // Campo calculado en runtime
  ventaBrutaCalc?: number; // Venta POS - Covers
  ventaBase?: number; // Venta Bruta / 1.108
  inc?: number; // INC calculado (Venta Bruta - Venta Base)
  createdAt?: any;
}

// ==========================================
// Módulo de Proyecciones y Eventos
// ==========================================

export type SalesEventType = 'boost' | 'drag' | 'neutral';

export interface SalesEvent {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  name: string;
  type: SalesEventType;
  impactFactor: number; // Multiplier (e.g., 1.5, 0.8)
  isRecurring: boolean;
  notes?: string;
  createdAt?: any;
}

export type ProjectionStatus = 'draft' | 'locked';

export interface SalesProjection {
  date: string; // Document ID and content: YYYY-MM-DD
  amountSystem: number;
  amountAdjusted: number;
  status: ProjectionStatus;
  notes?: string;
  lastUpdated?: any;
}
export type TransactionSource = 'libro' | 'banco' | 'datafono' | 'efectivo'
export type TransactionStatus = 'pendiente' | 'conciliado' | 'duda'

export interface TableTransaction {
  id: string
  date: string // ISO date string (YYYY-MM-DD)
  amount: number // En centavos
  description: string | null
  source: TransactionSource
  status: TransactionStatus
  metadata: Record<string, any>
  import_batch_id: string | null
  // Agrega otros campos si los necesitas
}

export interface TransactionFilters {
  dateFrom?: string
  dateTo?: string
  source?: TransactionSource[]
  status?: TransactionStatus[]
  search?: string
  minAmount?: number
  maxAmount?: number
  page?: number
  pageSize?: number
}
