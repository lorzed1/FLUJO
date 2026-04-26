import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cancelProjectedCommitment, getCommitments } from '../../services/budget/commitments';
import { supabase } from '../../services/supabaseClient';

// Mock Supabase
vi.mock('../../services/supabaseClient', () => ({
    supabase: {
        from: vi.fn()
    }
}));

describe('Budget Commitments Service - Individual Deletion', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a cancelled record when "cancelling" a projected commitment', async () => {
        const mockRule = {
            id: 'rule-123',
            title: 'Test Rule',
            amount: 50000,
            category: 'Testing',
            active: true,
            start_date: '2024-01-01',
            frequency: 'monthly',
            day_to_send: 1
        };

        const mockInsert = vi.fn().mockReturnValue({
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        });
        
        (supabase.from as any).mockImplementation((table: string) => {
            if (table === 'budget_recurring_rules') {
                return {
                    select: vi.fn().mockReturnThis(),
                    eq: vi.fn().mockReturnThis(),
                    single: vi.fn().mockResolvedValue({ data: mockRule, error: null })
                };
            }
            if (table === 'budget_commitments') {
                return {
                    insert: mockInsert
                };
            }
            return {};
        });

        await cancelProjectedCommitment('rule-123', '2024-05-01');

        expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
            status: 'cancelled',
            recurrence_rule_id: 'rule-123',
            due_date: '2024-05-01'
        }));
    });

    it('should filter out cancelled commitments in getCommitments', async () => {
        const mockRows = [
            { id: '1', title: 'Paid', status: 'paid', due_date: '2024-01-01' },
            { id: '2', title: 'Cancelled', status: 'cancelled', due_date: '2024-01-02' }
        ];

        (supabase.from as any).mockImplementation((table: string) => {
            return {
                select: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({ data: table === 'budget_commitments' ? mockRows : [], error: null })
            };
        });

        const result = await getCommitments();
        
        expect(result).toHaveLength(1);
        expect(result[0].status).toBe('paid');
    });
});
