import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { KlaveExportWizard } from '../../features/cash-flow/components/KlaveExportWizard';

// Mock UI Context
vi.mock('../../context/UIContext', () => ({
    useUI: () => ({
        setAlertModal: vi.fn(),
    })
}));

describe('KlaveExportWizard', () => {
    beforeEach(() => {
        localStorage.clear();
        // Set fixed timezone offset for consistent date formatting if needed
    });

    const mockArqueos = [
        {
            fecha: new Date().toISOString(),
            ventaPos: 1000000,
            ingresoCovers: 0,
            propina: 0,
            efectivo: 500000,
            datafonoDavid: 500000,
            totalRecaudado: 1000000,
            descuadre: 0
        }
    ];

    it('renders the wizard when isOpen is true', () => {
        render(<KlaveExportWizard isOpen={true} onClose={() => {}} selectedArqueos={mockArqueos as any} />);
        
        expect(screen.getByText('Exportar Klave')).toBeDefined();
        // Since no config is in localStorage, it will use defaults which are 8 mappings
        expect(screen.getByText(/Se encontraron 8 cuentas configuradas/i)).toBeDefined();
    });

    it('calculates Venta Bruta (ventaSC) without base and INC, and balances correctly', async () => {
        render(<KlaveExportWizard isOpen={true} onClose={() => {}} selectedArqueos={mockArqueos as any} />);
        
        // Step 1: Click Continuar
        const continueBtn = screen.getByText('Continuar');
        fireEvent.click(continueBtn);
        
        // Step 2: Set consecutive to 1 to enable generation, then click Generar Vista Previa
        const inputConsecutive = screen.getByPlaceholderText('Ej: 100');
        fireEvent.change(inputConsecutive, { target: { value: '1' } });
        
        const generateBtn = screen.getByText('Generar Vista Previa');
        fireEvent.click(generateBtn);
        
        // Step 3: Check Balance
        // Debits:
        // - efectivo = 500000
        // - datafonoDavid = 600000
        // Total Debits = 1100000
        
        // Credits:
        // - ventaSC = ventaPos (1000000) - ingresoCovers (200000) = 800000
        // - propina = 100000
        // - ingresoCovers = 200000
        // Total Credits = 1000000

        await waitFor(() => {
            // "Balance Correcto" should be visible if debits == credits
            expect(screen.getByText('Balance Correcto')).toBeDefined();
            
            // Check totals on screen
            const debitElements = screen.getAllByText('$1,000,000');
            expect(debitElements.length).toBeGreaterThanOrEqual(1); // Should appear at least for Debits and Credits
        });
        
        // Verify that the output doesn't contain Base or INC
        const allText = screen.getByText('Vista previa (Primeros 5 registros):').parentElement?.textContent || '';
        expect(allText.includes('VENTA BASE')).toBe(false);
        expect(allText.includes('INC (8%)')).toBe(false);
        expect(allText.includes('VENTA BRUTA (Base + INC)')).toBe(true);
    });
});
