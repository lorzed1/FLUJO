import { ArqueoRecord } from '../types';

export interface AuditIssue {
    recordId: string;
    date: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    message: string;
    field?: string;
}

export class DataAuditorService {

    /**
     * Audita una lista completa de arqueos y retorna hallazgos.
     */
    static auditArqueos(data: ArqueoRecord[]): AuditIssue[] {
        const issues: AuditIssue[] = [];
        const dateMap = new Set<string>();

        data.forEach(record => {
            // 1. Integridad Temporal (Duplicados)
            if (dateMap.has(record.fecha)) {
                issues.push({
                    recordId: record.id,
                    date: record.fecha,
                    severity: 'CRITICAL',
                    message: 'Fecha duplicada detectada. Existe otro arqueo con esta fecha.',
                    field: 'fecha'
                });
            }
            dateMap.add(record.fecha);

            // 2. Principio de Suma de Medios (Integridad Matemática)
            // Nota: Ajustar campos según el modelo real de ArqueoRecord
            const calculatedTotal = (record.efectivo || 0) +
                (record.nequi || 0) +
                (record.transfBancolombia || 0) +
                (record.datafonoDavid || 0) +
                (record.datafonoJulian || 0) +
                (record.rappi || 0);

            // Tolerancia de 1 unidad por redondeos decimales si aplica
            if (Math.abs(calculatedTotal - record.totalRecaudado) > 50) { // > $50 pesos de diferencia
                issues.push({
                    recordId: record.id,
                    date: record.fecha,
                    severity: 'CRITICAL',
                    message: `Inconsistencia suma medios. Suma: ${calculatedTotal} vs TotalRegistrado: ${record.totalRecaudado}`,
                    field: 'totalRecaudado'
                });
            }

            // 3. Principio de Descuadre
            const expectedIncome = (record.ventaPos || 0) + (record.propina || 0);
            const calculatedDescuadre = record.totalRecaudado - expectedIncome;

            if (Math.abs(calculatedDescuadre - record.descuadre) > 50) {
                issues.push({
                    recordId: record.id,
                    date: record.fecha,
                    severity: 'WARNING',
                    message: `Cálculo de descuadre incorrecto. Sistema dice: ${record.descuadre}, Realidad: ${calculatedDescuadre}`,
                    field: 'descuadre'
                });
            }

            // 4. Anomalías
            if (calculatedDescuadre < -100000) {
                issues.push({
                    recordId: record.id,
                    date: record.fecha,
                    severity: 'WARNING',
                    message: 'Descuadre negativo crítico (pérdida > $100k)',
                    field: 'descuadre'
                });
            }
        });

        return issues;
    }
}
