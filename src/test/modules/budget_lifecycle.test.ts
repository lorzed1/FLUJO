import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCommitments, addCommitment } from '../../services/budget/commitments';
import { supabase } from '../../services/supabaseClient';
import { mapCommitmentFromRow, mapRuleFromRow } from '../../services/budget/mappers';

// Mock mappers
vi.mock('./mappers', () => ({
    mapCommitmentFromRow: (row: any) => ({
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        amount: row.amount,
        status: row.status,
        category: row.category,
        recurrenceRuleId: row.recurrence_rule_id,
        isProjected: row.is_projected
    }),
    mapRuleFromRow: (row: any) => ({
        id: row.id,
        title: row.title,
        amount: row.amount,
        frequency: row.frequency,
        startDate: row.start_date,
        dayToSend: row.day_to_send,
        category: row.category,
        active: row.active,
        interval: row.interval_count || 1
    }),
    getNextDate: vi.fn((date, freq) => {
        const d = new Date(date);
        d.setMonth(d.getMonth() + 1);
        return d;
    })
}));

describe('Budget Lifecycle & Deduplication', () => {
    const mockRuleId = 'rule-123';
    const targetDate = '2026-05-01';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should hide virtual projection when a real coverage exist for the same rule and date', async () => {
        // 1. Mock Recurrence Rules
        const mockRules = [{
            id: mockRuleId,
            title: 'Arriendo',
            amount: 1000,
            frequency: 'monthly',
            start_date: '2026-01-01',
            day_to_send: 1,
            category: 'Gastos',
            active: true
        }];

        // 2. Mock Real Commitments (Already materialized)
        const mockRealCommitments = [{
            id: 'real-uuid-1',
            title: 'Arriendo Pagado',
            due_date: targetDate, // Same date as projection
            amount: 1000,
            status: 'paid',
            category: 'Gastos',
            recurrence_rule_id: mockRuleId, // VÍNCULO CRÍTICO
            is_projected: false
        }];

        // Mock Supabase calls
        const fromMock = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lte: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            then: (resolve: any) => {
                // Determine which table is being queried based on mock flow
                // This is simplified for the unit test
                resolve({ data: mockRealCommitments, error: null });
            }
        });

        // Mock specific behavior for the projection loop
        vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
            if (table === 'budget_recurring_rules') {
                return { select: () => Promise.resolve({ data: mockRules, error: null }) } as any;
            }
            if (table === 'budget_commitments') {
                return { 
                    select: () => ({
                        order: () => Promise.resolve({ data: mockRealCommitments, error: null }),
                        then: (cb: any) => cb({ data: mockRealCommitments, error: null })
                    })
                } as any;
            }
            return { select: () => Promise.resolve({ data: [], error: null }) } as any;
        });

        const results = await getCommitments('2026-04-01', '2026-06-01');
        
        // Find if there are duplicates for the target date
        const resultsOnTargetDate = results.filter(r => r.dueDate === targetDate);
        
        // EXPECTATION: Only 1 record (the real one), virtual should be hidden
        expect(resultsOnTargetDate.length).toBe(1);
        expect(resultsOnTargetDate[0].id).toBe('real-uuid-1');
        expect(resultsOnTargetDate[0].id).not.toContain('projected-');
    });
});
