import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useProjectionsKPIs } from './useProjectionsKPIs';
import { ProjectionResult } from '../../../utils/projections';
import { SalesProjection } from '../../../types';

describe('useProjectionsKPIs', () => {

    const mockDate = new Date('2026-02-15T12:00:00'); // Mid-month

    const emptyProps = {
        currentDate: mockDate,
        calculatedProjections: {},
        storedProjections: {},
        realSales: {},
        mode: 'statistical' as const
    };

    it('should return zero stats for empty data', () => {
        const { result } = renderHook(() => useProjectionsKPIs(emptyProps));

        expect(result.current.totalMeta).toBe(0);
        expect(result.current.totalReal).toBe(0);
        expect(result.current.cumplimiento).toBe(0);
        expect(result.current.countDaysWithReal).toBe(0);
    });

    it('should calculate basic compliance correctly', () => {
        // Setup: 2 days of data
        const calculated: Record<string, ProjectionResult> = {
            '2026-02-01': { final: 100 } as any,
            '2026-02-02': { final: 100 } as any
        };
        const stored: Record<string, SalesProjection> = {
            '2026-02-01': { amountAdjusted: 120 } as any
        };
        const real = {
            '2026-02-01': 100, // 83% of adjusted meta
            '2026-02-02': 50   // 50% of calculated meta
        };

        // Mode statistical: Uses amountAdjusted (120) for day 1, and final (100) for day 2. Total Meta = 220.
        // Total Real = 150.

        const { result } = renderHook(() => useProjectionsKPIs({
            ...emptyProps,
            calculatedProjections: calculated,
            storedProjections: stored,
            realSales: real
        }));

        expect(result.current.totalMeta).toBe(220);
        expect(result.current.totalReal).toBe(150);
        expect(result.current.cumplimiento).toBeCloseTo((150 / 220) * 100);
    });

    it('should enforce financial mode rules (ignore adjustments)', () => {
        // Setup: 1 day
        const calculated: Record<string, ProjectionResult> = {
            '2026-02-01': { final: 100 } as any
        };
        const stored: Record<string, SalesProjection> = {
            '2026-02-01': { amountAdjusted: 5000 } as any // Huge adjustment
        };

        // In financial mode, it MUST ignore the 5000 and use 100.
        const { result } = renderHook(() => useProjectionsKPIs({
            ...emptyProps,
            mode: 'financial',
            calculatedProjections: calculated,
            storedProjections: stored,
            realSales: {}
        }));

        expect(result.current.totalMeta).toBe(100);
    });

    it('should identify best day', () => {
        const real = {
            '2026-02-01': 100,
            '2026-02-05': 500,
            '2026-02-10': 50
        };
        // Need to provide projections keys for the loop to work
        const calculated: Record<string, ProjectionResult> = {
            '2026-02-01': { final: 10 } as any,
            '2026-02-05': { final: 10 } as any,
            '2026-02-10': { final: 10 } as any
        };

        const { result } = renderHook(() => useProjectionsKPIs({
            ...emptyProps,
            calculatedProjections: calculated,
            realSales: real
        }));

        expect(result.current.bestDay.value).toBe(500);
        expect(result.current.bestDay.date).toBe('2026-02-05');
    });

});
