import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    toCents,
    fromCents,
    mapDenominationsToRestofy,
    mapPaymentMethodsToRestofy,
    loadRestofyConfig,
    persistRestofyConfig,
    restofyService,
} from '../../services/restofyService';
import type { RestofyDenomination, RestofyPaymentMapping } from '../../types/restofy';
import { supabase } from '../../services/supabaseClient';
import { DatabaseService } from '../../services/database';

vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        functions: {
            invoke: vi.fn(),
        },
    },
}));

vi.mock('../../services/database', () => ({
    DatabaseService: {
        getRestofyConfig: vi.fn(),
        saveRestofyConfig: vi.fn(),
    },
}));

const MOCK_CATALOG: RestofyDenomination[] = [
    { currencyDenominationId: 1, countryCode: 'CO', kind: 'bill', name: '$ 100.000', valueCents: 10000000, sortOrder: 1, isSystem: 1 },
    { currencyDenominationId: 2, countryCode: 'CO', kind: 'bill', name: '$ 50.000', valueCents: 5000000, sortOrder: 2, isSystem: 1 },
    { currencyDenominationId: 7, countryCode: 'CO', kind: 'bill', name: '$ 1.000', valueCents: 100000, sortOrder: 7, isSystem: 1 },
    { currencyDenominationId: 8, countryCode: 'CO', kind: 'coin', name: '$ 1.000', valueCents: 100000, sortOrder: 1, isSystem: 1 },
    { currencyDenominationId: 9, countryCode: 'CO', kind: 'coin', name: '$ 500', valueCents: 50000, sortOrder: 2, isSystem: 1 },
    { currencyDenominationId: 13, countryCode: null, kind: 'aux', name: 'Auxiliar 1', valueCents: null, sortOrder: 1, isSystem: 0 },
];

describe('restofyService - transformación y flujo de cierre', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('convierte pesos COP a centavos y viceversa correctamente', () => {
        expect(toCents(100000)).toBe(10000000);
        expect(toCents(0)).toBe(0);
        expect(toCents(-500)).toBe(0);
        expect(fromCents(5000000)).toBe(50000);
    });

    it('mapea $1.000 COP exclusivamente a moneda (kind: coin)', () => {
        const result = mapDenominationsToRestofy(
            { '100000': 2, '1000': 5, '500': 4 },
            MOCK_CATALOG
        );

        expect(result).toEqual([
            { currencyDenominationId: 9, quantity: 4, amountCents: 200000 },
            { currencyDenominationId: 8, quantity: 5, amountCents: 500000 },
            { currencyDenominationId: 1, quantity: 2, amountCents: 20000000 },
        ]);
        expect(result.find((d) => d.currencyDenominationId === 7)).toBeUndefined();
    });

    it('incluye gastos de caja como efectivo en denominación auxiliar cuando son mayores a 0', () => {
        const result = mapDenominationsToRestofy(
            { '100000': 1 },
            MOCK_CATALOG,
            35000
        );

        expect(result).toEqual([
            { currencyDenominationId: 1, quantity: 1, amountCents: 10000000 },
            { currencyDenominationId: 13, amountCents: 3500000 },
        ]);
    });

    it('agrupa y suma medios de pago cuando comparten paymentMethodId', () => {
        const mapping: RestofyPaymentMapping = {
            datafonoDavid: 10,
            datafonoJulian: 10,
            transfBancolombia: 11,
            nequi: 12,
            rappi: null,
        };

        const result = mapPaymentMethodsToRestofy(
            {
                datafonoDavid: 150000,
                datafonoJulian: 50000,
                transfBancolombia: 80000,
                nequi: 0,
                rappi: 30000,
            },
            mapping
        );

        expect(result).toEqual([
            { paymentMethodId: 10, amountCents: 20000000 },
            { paymentMethodId: 11, amountCents: 8000000 },
            { paymentMethodId: 12, amountCents: 0 },
        ]);
    });

    it('ejecuta conteo, base de retorno y cierre completo en secuencia', async () => {
        const invokeMock = vi.mocked(supabase.functions.invoke);
        invokeMock
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        cashRegisterSessionId: 4,
                        denominations: MOCK_CATALOG,
                        paymentMethods: [],
                    },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: true, data: { cashRegisterSessionId: 4, cashDeclarationStatus: 'confirmed' } },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: true, data: { cashRegisterSessionId: 4, baseReturnCents: 20000000 } },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: true, data: { cashRegisterSessionId: 4 } },
                error: null,
            } as any);

        const res = await restofyService.executeCountAndClose({
            cashRegisterSessionId: 4,
            cuadreDetail: { '100000': 3, '1000': 2 },
            paymentAmounts: { datafonoDavid: 50000 },
            paymentMapping: {
                datafonoDavid: 10,
                datafonoJulian: null,
                transfBancolombia: null,
                nequi: null,
                rappi: null,
            },
            baseReturnPesos: 200000,
            notes: 'Cierre prueba',
        });

        expect(res).toEqual({
            success: true,
            cashRegisterSessionId: 4,
            declarationConfirmed: true,
            baseReturnSet: true,
            closed: true,
            message: 'Conteo y cierre de caja completados en Restofy.',
        });
        expect(invokeMock).toHaveBeenCalledTimes(4);
    });

    it('reporta fallo parcial si el cierre falla tras confirmar conteo y base', async () => {
        const invokeMock = vi.mocked(supabase.functions.invoke);
        invokeMock
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: { cashRegisterSessionId: 4, denominations: MOCK_CATALOG, paymentMethods: [] },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: true, data: { cashRegisterSessionId: 4 } },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: true, data: { cashRegisterSessionId: 4, baseReturnCents: 0 } },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: { success: false, message: 'Hay pedidos abiertos sin cobrar.' },
                error: null,
            } as any);

        const res = await restofyService.executeCountAndClose({
            cashRegisterSessionId: 4,
            cuadreDetail: { '1000': 10 },
            paymentAmounts: {},
            paymentMapping: {
                datafonoDavid: null,
                datafonoJulian: null,
                transfBancolombia: null,
                nequi: null,
                rappi: null,
            },
            baseReturnPesos: 0,
        });

        expect(res).toEqual({
            success: false,
            cashRegisterSessionId: 4,
            declarationConfirmed: true,
            baseReturnSet: true,
            closed: false,
            stepFailed: 'close',
            message: 'Hay pedidos abiertos sin cobrar.',
        });
    });

    it('extrae Venta POS, Propinas, Base Inicial y Comensales desde la sesión activa', async () => {
        const invokeMock = vi.mocked(supabase.functions.invoke);
        invokeMock
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        cashRegisters: [
                            { cashRegisterId: 1, name: 'Caja Principal', activeSessionId: 12 },
                        ],
                    },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        summary: { baseCents: 20000000, tipsCents: '4500000' },
                    },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        kpis: { totalSalesCents: 96050000, totalIncomeCents: 95600000 },
                        salesData: { incomeCents: 96050000, discountCents: 450000 },
                    },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        orders: [
                            { id: 1, orderUuid: 'u1', orderCode: 'A1', guestCount: 2 },
                            { id: 2, orderUuid: 'u2', orderCode: 'A2', guestCount: null },
                            { id: 3, orderUuid: 'u3', orderCode: 'A3', guestCount: 3 },
                        ],
                        pagination: { page: 1, limit: 100, total: 3, totalPages: 1, hasNext: false, hasPrev: false },
                    },
                },
                error: null,
            } as any)
            .mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        orders: [{ id: 4, orderUuid: 'u4', orderCode: 'C1', guestCount: 1 }],
                        pagination: { page: 1, limit: 100, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
                    },
                },
                error: null,
            } as any);

        const imported = await restofyService.fetchSessionSalesAndTips(1);

        expect(imported).toEqual({
            cashRegisterSessionId: 12,
            registerName: 'Caja Principal',
            ventaPos: 956000,
            propina: 45000,
            baseInicial: 200000,
            visitas: 6,
        });
    });

    it('persiste y carga la configuración de Restofy desde Supabase', async () => {
        const sampleConfig = {
            enabled: true,
            cashRegisterId: 1,
            paymentMethodMapping: {
                datafonoDavid: 14,
                datafonoJulian: 14,
                transfBancolombia: 11,
                nequi: 11,
                rappi: null,
            },
        };

        vi.mocked(DatabaseService.saveRestofyConfig).mockResolvedValueOnce();
        await persistRestofyConfig(sampleConfig);
        expect(DatabaseService.saveRestofyConfig).toHaveBeenCalledWith(sampleConfig);

        vi.mocked(DatabaseService.getRestofyConfig).mockResolvedValueOnce(sampleConfig);
        const loaded = await loadRestofyConfig();
        expect(loaded).toEqual(sampleConfig);
    });
});
