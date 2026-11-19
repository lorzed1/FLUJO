import { supabase } from './supabaseClient';
import { DatabaseService } from './database';
import type {
    FlujoPaymentField,
    RestofyActiveSession,
    RestofyCashRegister,
    RestofyCloseExecutionResult,
    RestofyCloseSummary,
    RestofyConfig,
    RestofyDeclarationContext,
    RestofyDeclarationDenominationInput,
    RestofyDeclarationPaymentMethodInput,
    RestofyDenomination,
    RestofyPaginatedOrders,
    RestofyPaymentMapping,
    RestofySessionImportData,
    RestofyZReport,
} from '../types/restofy';

const CONFIG_STORAGE_KEY = 'flujo_restofy_config_v1';

export const DEFAULT_PAYMENT_MAPPING: RestofyPaymentMapping = {
    datafonoDavid: null,
    datafonoJulian: null,
    transfBancolombia: null,
    nequi: null,
    rappi: null,
};

export const DEFAULT_RESTOFY_CONFIG: RestofyConfig = {
    enabled: false,
    cashRegisterId: null,
    paymentMethodMapping: { ...DEFAULT_PAYMENT_MAPPING },
};

export const FLUJO_PAYMENT_FIELD_LABELS: Record<FlujoPaymentField, string> = {
    datafonoDavid: 'Datáfono Bold',
    datafonoJulian: 'Datáfono Credibanco',
    transfBancolombia: 'Transferencia Bancolombia',
    nequi: 'Nequi',
    rappi: 'Rappi',
};

export function toCents(pesos: number): number {
    const safe = Number(pesos) || 0;
    return Math.max(0, Math.round(safe * 100));
}

export function fromCents(cents: number): number {
    return Math.round((Number(cents) || 0) / 100);
}

export function normalizeRestofyConfig(raw: unknown): RestofyConfig {
    const parsed = (raw && typeof raw === 'object' ? raw : {}) as Partial<RestofyConfig>;
    return {
        enabled: Boolean(parsed.enabled),
        cashRegisterId: typeof parsed.cashRegisterId === 'number' ? parsed.cashRegisterId : null,
        paymentMethodMapping: {
            ...DEFAULT_PAYMENT_MAPPING,
            ...(parsed.paymentMethodMapping || {}),
        },
    };
}

export function getRestofyConfig(): RestofyConfig {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof localStorage.getItem !== 'function') {
        return { ...DEFAULT_RESTOFY_CONFIG };
    }
    try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_RESTOFY_CONFIG };
        return normalizeRestofyConfig(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_RESTOFY_CONFIG };
    }
}

export function saveRestofyConfig(config: RestofyConfig): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof localStorage.setItem !== 'function') {
        return;
    }
    try {
        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
    } catch {
        // Ignorar errores de cuota o acceso a localStorage
    }
}

/**
 * Carga la configuración persistente desde Supabase (`settings.restofyConfig`)
 * y sincroniza el caché local. Si falla Supabase, usa `localStorage` como respaldo.
 */
export async function loadRestofyConfig(): Promise<RestofyConfig> {
    try {
        const remote = await DatabaseService.getRestofyConfig<RestofyConfig>();
        if (remote) {
            const normalized = normalizeRestofyConfig(remote);
            saveRestofyConfig(normalized);
            return normalized;
        }
    } catch (error) {
        console.warn('No se pudo cargar restofyConfig desde Supabase, usando caché local:', error);
    }
    return getRestofyConfig();
}

/**
 * Persiste la configuración en Supabase (`settings.restofyConfig`) y en caché local.
 */
export async function persistRestofyConfig(config: RestofyConfig): Promise<void> {
    const normalized = normalizeRestofyConfig(config);
    saveRestofyConfig(normalized);
    await DatabaseService.saveRestofyConfig(normalized);
}

/**
 * Mapea el conteo de denominaciones de FLUJO al catálogo de Restofy.
 * Regla de negocio: para $1.000 COP se utiliza exclusivamente la denominación en moneda ('coin').
 * Si existen gastos de caja (extraCashPesos > 0), se registran como efectivo usando la denominación auxiliar ('aux').
 */
export function mapDenominationsToRestofy(
    cuadreDetail: Record<string, number>,
    catalog: RestofyDenomination[],
    extraCashPesos = 0
): RestofyDeclarationDenominationInput[] {
    const result: RestofyDeclarationDenominationInput[] = [];

    for (const [denomStr, rawQty] of Object.entries(cuadreDetail || {})) {
        const denomPesos = parseInt(denomStr, 10);
        if (!Number.isFinite(denomPesos) || denomPesos <= 0) continue;

        const targetCents = toCents(denomPesos);
        const preferredKind = denomPesos <= 1000 ? 'coin' : 'bill';

        const match =
            catalog.find((d) => d.valueCents === targetCents && d.kind === preferredKind) ||
            (denomPesos === 1000 ? undefined : catalog.find((d) => d.valueCents === targetCents && d.kind !== 'aux'));

        if (!match) continue;

        const quantity = Math.max(0, Math.floor(Number(rawQty) || 0));
        result.push({
            currencyDenominationId: match.currencyDenominationId,
            quantity,
            amountCents: quantity * targetCents,
        });
    }

    const extraCents = toCents(extraCashPesos);
    if (extraCents > 0) {
        const auxDenom = catalog.find((d) => d.kind === 'aux');
        if (auxDenom) {
            result.push({
                currencyDenominationId: auxDenom.currencyDenominationId,
                amountCents: extraCents,
            } as RestofyDeclarationDenominationInput);
        }
    }

    return result;
}

/**
 * Agrupa y suma los montos de los medios de pago de FLUJO según el paymentMethodId configurado en Restofy.
 */
export function mapPaymentMethodsToRestofy(
    amounts: Partial<Record<FlujoPaymentField, number>>,
    mapping: RestofyPaymentMapping
): RestofyDeclarationPaymentMethodInput[] {
    const grouped = new Map<number, number>();

    for (const field of Object.keys(FLUJO_PAYMENT_FIELD_LABELS) as FlujoPaymentField[]) {
        const paymentMethodId = mapping[field];
        if (!paymentMethodId) continue;

        const amountCents = toCents(Number(amounts[field]) || 0);
        grouped.set(paymentMethodId, (grouped.get(paymentMethodId) || 0) + amountCents);
    }

    return Array.from(grouped.entries()).map(([paymentMethodId, amountCents]) => ({
        paymentMethodId,
        amountCents,
    }));
}

async function invokeRestofyProxy<T>(
    module: string,
    action: string,
    payload: Record<string, unknown> = {}
): Promise<T> {
    const { data, error } = await supabase.functions.invoke('quick-function', {
        body: { module, action, payload },
    });

    if (error) {
        let detailedMessage = error.message;
        try {
            const ctx = (error as { context?: Response }).context;
            if (ctx && typeof ctx.json === 'function') {
                const body = await ctx.json();
                if (body?.message) detailedMessage = body.message;
            }
        } catch {
            // Mantener mensaje original si el cuerpo no es JSON
        }
        throw new Error(detailedMessage || `Error invocando quick-function (${module}/${action})`);
    }

    if (!data || data.success === false) {
        throw new Error(data?.message || `Restofy rechazó ${module}/${action}`);
    }

    return data.data as T;
}

export const restofyService = {
    async listCashRegisters(): Promise<RestofyCashRegister[]> {
        const data = await invokeRestofyProxy<{ cashRegisters: RestofyCashRegister[] }>(
            'cash-registers',
            'list-cash-registers',
            { limit: 100 }
        );
        return data?.cashRegisters || [];
    },

    async openSession(
        cashRegisterId: number,
        openingAmountPesos: number,
        notes?: string
    ): Promise<RestofyActiveSession> {
        const data = await invokeRestofyProxy<{ activeSession: RestofyActiveSession }>(
            'cashier',
            'open-session',
            {
                cashRegisterId,
                openingAmountCents: toCents(openingAmountPesos),
                ...(notes ? { notes: notes.slice(0, 500) } : {}),
            }
        );
        return data.activeSession;
    },

    async getCashDeclarationContext(cashRegisterSessionId: number): Promise<RestofyDeclarationContext> {
        return invokeRestofyProxy<RestofyDeclarationContext>(
            'cash-closures',
            'get-cash-declaration-context',
            { cashRegisterSessionId }
        );
    },

    async getCloseSummary(cashRegisterSessionId: number): Promise<RestofyCloseSummary> {
        return invokeRestofyProxy<RestofyCloseSummary>(
            'cash-closures',
            'get-close-summary',
            { cashRegisterSessionId }
        );
    },

    async getZReport(cashRegisterSessionId: number): Promise<RestofyZReport> {
        return invokeRestofyProxy<RestofyZReport>(
            'cash-closures',
            'get-zreport',
            { cashRegisterSessionId }
        );
    },

    async sumGuestsFromEndpoint(
        action: 'list-paid-orders' | 'list-comp-orders',
        cashRegisterSessionId: number
    ): Promise<number> {
        let page = 1;
        let totalGuests = 0;
        let hasNext = true;

        while (hasNext) {
            const res = await invokeRestofyProxy<RestofyPaginatedOrders>('cash-closures', action, {
                cashRegisterSessionId,
                page,
                limit: 100,
            });
            for (const order of res?.orders || []) {
                totalGuests += Math.max(0, Math.floor(Number(order.guestCount) || 0));
            }
            hasNext = Boolean(res?.pagination?.hasNext);
            page += 1;
        }

        return totalGuests;
    },

    async fetchSessionGuestsCount(cashRegisterSessionId: number): Promise<number> {
        const [paidGuests, compGuests] = await Promise.all([
            this.sumGuestsFromEndpoint('list-paid-orders', cashRegisterSessionId),
            this.sumGuestsFromEndpoint('list-comp-orders', cashRegisterSessionId).catch(() => 0),
        ]);
        return paidGuests + compGuests;
    },

    /**
     * Extrae Venta POS, Propinas, Base Inicial y Comensales (visitas) de la sesión abierta en Restofy.
     */
    async fetchSessionSalesAndTips(cashRegisterId: number): Promise<RestofySessionImportData> {
        const registers = await this.listCashRegisters();
        const target = registers.find((r) => r.cashRegisterId === cashRegisterId);

        if (!target) {
            throw new Error('La caja seleccionada no existe en Restofy.');
        }
        if (!target.activeSessionId) {
            throw new Error(`La caja "${target.name}" no tiene una sesión abierta en Restofy.`);
        }

        const [closeSummary, zReport, visitas] = await Promise.all([
            this.getCloseSummary(target.activeSessionId),
            this.getZReport(target.activeSessionId),
            this.fetchSessionGuestsCount(target.activeSessionId).catch(() => 0),
        ]);

        const totalSalesCents =
            zReport?.kpis?.totalSalesCents ??
            zReport?.kpis?.totalIncomeCents ??
            0;

        return {
            cashRegisterSessionId: target.activeSessionId,
            registerName: target.name,
            ventaPos: fromCents(Number(totalSalesCents) || 0),
            propina: fromCents(Number(closeSummary?.summary?.tipsCents) || 0),
            baseInicial: fromCents(Number(closeSummary?.summary?.baseCents) || 0),
            visitas,
        };
    },

    async confirmCashDeclaration(
        cashRegisterSessionId: number,
        denominations: RestofyDeclarationDenominationInput[],
        paymentMethods: RestofyDeclarationPaymentMethodInput[]
    ): Promise<{ cashRegisterSessionId: number; cashDeclarationStatus: string; methodsDeclarationStatus: string }> {
        return invokeRestofyProxy('cash-closures', 'confirm-cash-declaration', {
            cashRegisterSessionId,
            denominations,
            paymentMethods,
        });
    },

    async setBaseReturn(
        cashRegisterSessionId: number,
        baseReturnPesos: number
    ): Promise<{ cashRegisterSessionId: number; baseReturnCents: number }> {
        return invokeRestofyProxy('cash-closures', 'set-base-return', {
            cashRegisterSessionId,
            baseReturnCents: toCents(baseReturnPesos),
        });
    },

    async confirmClose(
        cashRegisterSessionId: number,
        notes?: string
    ): Promise<{ cashRegisterSessionId: number }> {
        return invokeRestofyProxy('cash-closures', 'confirm-close', {
            cashRegisterSessionId,
            ...(notes ? { notes: notes.slice(0, 500) } : {}),
        });
    },

    /**
     * Ejecuta el flujo completo de conteo, definición de base y cierre definitivo en Restofy.
     */
    async executeCountAndClose(params: {
        cashRegisterSessionId: number;
        cuadreDetail: Record<string, number>;
        cashExpensesPesos?: number;
        paymentAmounts: Partial<Record<FlujoPaymentField, number>>;
        paymentMapping: RestofyPaymentMapping;
        baseReturnPesos?: number;
        notes?: string;
    }): Promise<RestofyCloseExecutionResult> {
        const {
            cashRegisterSessionId,
            cuadreDetail,
            cashExpensesPesos = 0,
            paymentAmounts,
            paymentMapping,
            baseReturnPesos = 0,
            notes,
        } = params;

        let declarationConfirmed = false;
        let baseReturnSet = false;

        try {
            const context = await this.getCashDeclarationContext(cashRegisterSessionId);
            const denominations = mapDenominationsToRestofy(cuadreDetail, context.denominations, cashExpensesPesos);
            const paymentMethods = mapPaymentMethodsToRestofy(paymentAmounts, paymentMapping);

            if (denominations.length === 0 && paymentMethods.length === 0) {
                return {
                    success: false,
                    cashRegisterSessionId,
                    declarationConfirmed: false,
                    baseReturnSet: false,
                    closed: false,
                    stepFailed: 'context',
                    message: 'No hay denominaciones ni medios de pago mapeados para declarar en Restofy.',
                };
            }

            try {
                await this.confirmCashDeclaration(cashRegisterSessionId, denominations, paymentMethods);
                declarationConfirmed = true;
            } catch (err: unknown) {
                return {
                    success: false,
                    cashRegisterSessionId,
                    declarationConfirmed: false,
                    baseReturnSet: false,
                    closed: false,
                    stepFailed: 'declaration',
                    message: err instanceof Error ? err.message : 'Error al confirmar el conteo en Restofy.',
                };
            }

            try {
                await this.setBaseReturn(cashRegisterSessionId, baseReturnPesos);
                baseReturnSet = true;
            } catch (err: unknown) {
                return {
                    success: false,
                    cashRegisterSessionId,
                    declarationConfirmed,
                    baseReturnSet: false,
                    closed: false,
                    stepFailed: 'base_return',
                    message: err instanceof Error ? err.message : 'Error al definir la base que vuelve al fondo.',
                };
            }

            try {
                await this.confirmClose(cashRegisterSessionId, notes);
                return {
                    success: true,
                    cashRegisterSessionId,
                    declarationConfirmed: true,
                    baseReturnSet: true,
                    closed: true,
                    message: 'Conteo y cierre de caja completados en Restofy.',
                };
            } catch (err: unknown) {
                return {
                    success: false,
                    cashRegisterSessionId,
                    declarationConfirmed: true,
                    baseReturnSet: true,
                    closed: false,
                    stepFailed: 'close',
                    message: err instanceof Error ? err.message : 'Error al confirmar el cierre en Restofy.',
                };
            }
        } catch (err: unknown) {
            return {
                success: false,
                cashRegisterSessionId,
                declarationConfirmed,
                baseReturnSet,
                closed: false,
                stepFailed: 'context',
                message: err instanceof Error ? err.message : 'Error al consultar contexto de Restofy.',
            };
        }
    },
};
