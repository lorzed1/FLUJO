export type FlujoPaymentField =
    | 'datafonoDavid'
    | 'datafonoJulian'
    | 'transfBancolombia'
    | 'nequi'
    | 'rappi';

export type RestofyPaymentMapping = Record<FlujoPaymentField, number | null>;

export interface RestofyConfig {
    enabled: boolean;
    cashRegisterId: number | null;
    paymentMethodMapping: RestofyPaymentMapping;
}

export interface RestofyCashRegister {
    cashRegisterId: number;
    cashRegisterUuid: string;
    name: string;
    location: string | null;
    suggestedBaseCents: number | null;
    activeSessionId: number | null;
    isActive: number;
    isAvailable: number;
}

export interface RestofyActiveSession {
    cashRegisterSessionId: number;
    cashRegisterId: number;
    openingAmountCents: number;
    openedAt: string;
    notes: string | null;
    cashRegisterName: string;
    openedByActorName: string;
}

export interface RestofyDenomination {
    currencyDenominationId: number;
    countryCode: string | null;
    kind: 'bill' | 'coin' | 'aux';
    name: string;
    valueCents: number | null;
    sortOrder: number;
    isSystem: number;
}

export interface RestofyPaymentMethod {
    paymentMethodId: number;
    code: string | null;
    name: string;
    iconFontAwesome?: string;
    color?: string;
    sortOrder?: number;
}

export interface RestofyDeclarationContext {
    cashRegisterSessionId: number;
    countryCode: string;
    cashDeclarationStatus: 'pending' | 'confirmed';
    methodsDeclarationStatus: 'pending' | 'confirmed';
    denominations: RestofyDenomination[];
    paymentMethods: RestofyPaymentMethod[];
}

export interface RestofyCloseStep {
    id: string;
    required: boolean;
    completed: boolean;
    actionLabel?: string;
}

export interface RestofyCloseSummary {
    session: {
        cashRegisterSessionId: number;
        cashRegisterName: string;
        baseReturnCents: number;
        cashDeclarationStatus: 'pending' | 'confirmed';
    };
    summary: {
        baseCents: number;
        expensesCents: string | number;
        expenseCount: number;
        tipsCents: string | number;
        deliveriesCents: string | number;
        deliveryCount: string | number;
    };
    handover: {
        mode: string;
        countedCashCents: number;
        baseCents: number;
    };
    steps: RestofyCloseStep[];
    blockers: Array<string | { message?: string; code?: string }>;
    warnings: Array<string | { message?: string; code?: string }>;
}

export interface RestofyDeclarationDenominationInput {
    currencyDenominationId: number;
    quantity?: number;
    amountCents: number;
}

export interface RestofyDeclarationPaymentMethodInput {
    paymentMethodId: number;
    amountCents: number;
}

export interface RestofyZReport {
    mode: string;
    kpis: {
        totalIncomeCents: number;
        totalGrossCents: number;
        taxesCents: number;
        totalSalesCents: number;
        compsCents: number;
    };
    salesData?: {
        incomeCents: number;
        discountCents: number;
    };
}

export interface RestofySessionOrder {
    id: number;
    orderUuid: string;
    orderCode: string;
    guestCount: number | null;
}

export interface RestofyPaginatedOrders {
    orders: RestofySessionOrder[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export interface RestofySessionImportData {
    cashRegisterSessionId: number;
    registerName: string;
    ventaPos: number;
    propina: number;
    baseInicial: number;
    visitas: number;
}

export interface RestofyCloseExecutionResult {
    success: boolean;
    cashRegisterSessionId: number;
    declarationConfirmed: boolean;
    baseReturnSet: boolean;
    closed: boolean;
    stepFailed?: 'context' | 'declaration' | 'base_return' | 'close';
    message: string;
}
