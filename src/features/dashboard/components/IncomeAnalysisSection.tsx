import React from 'react';
import { Card } from '../../../components/ui/Card';
import { PaymentMixPieChart } from '../components/NewCharts';

interface IncomeAnalysisSectionProps {
    paymentMixData: any;
}

export const IncomeAnalysisSection: React.FC<IncomeAnalysisSectionProps> = ({ paymentMixData }) => {
    return (
        <div>
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">💰 Análisis de Ingresos</h2>
            <Card className="p-6">
                <div className="mb-6">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white">Distribución por Medio de Pago</h3>
                    <p className="text-xs text-slate-400 mt-1">Porcentaje de ingresos según método de pago</p>
                </div>
                <PaymentMixPieChart data={paymentMixData} />
            </Card>
        </div>
    );
};
