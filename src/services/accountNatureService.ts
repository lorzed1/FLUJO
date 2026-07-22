import { AccountNature, AccountNatureRule, AccountMapping, TransactionType } from '../types';


export class AccountNatureService {

    // Reglas predefinidas basadas en el Plan Único de Cuentas (PUC) Colombiano
    private static readonly PUC_RULES: AccountNatureRule[] = [
        { id: 'puc-1', pattern: '^1', nature: 'DEBIT', description: 'Activos', priority: 100 },
        { id: 'puc-2', pattern: '^2', nature: 'CREDIT', description: 'Pasivos', priority: 100 },
        { id: 'puc-3', pattern: '^3', nature: 'CREDIT', description: 'Patrimonio', priority: 100 },
        { id: 'puc-4', pattern: '^4', nature: 'CREDIT', description: 'Ingresos', priority: 100 },
        { id: 'puc-5', pattern: '^5', nature: 'DEBIT', description: 'Gastos', priority: 100 },
        { id: 'puc-6', pattern: '^6', nature: 'DEBIT', description: 'Costos', priority: 100 },
        { id: 'puc-7', pattern: '^7', nature: 'DEBIT', description: 'Costos de Producción', priority: 100 },
        { id: 'puc-8', pattern: '^8', nature: 'CREDIT', description: 'Cuentas de Orden Deudoras', priority: 90 },
        { id: 'puc-9', pattern: '^9', nature: 'DEBIT', description: 'Cuentas de Orden Acreedoras', priority: 90 },
    ];

    // Palabras clave para detección por nombre
    private static readonly KEYWORD_RULES: { keywords: string[], nature: AccountNature, description: string }[] = [
        { keywords: ['venta', 'ingreso', 'servicio', 'honorario', 'comision', 'interes a favor'], nature: 'CREDIT', description: 'Ingresos por palabras clave' },
        { keywords: ['gasto', 'costo', 'nomina', 'salario', 'arriendo', 'servicio publico', 'impuesto'], nature: 'DEBIT', description: 'Gastos por palabras clave' },
        { keywords: ['banco', 'caja', 'efectivo', 'inventario', 'cliente', 'deudor', 'activo'], nature: 'DEBIT', description: 'Activos por palabras clave' },
        { keywords: ['proveedor', 'prestamo', 'obligacion', 'pasivo', 'acreedor'], nature: 'CREDIT', description: 'Pasivos por palabras clave' },
        { keywords: ['capital', 'patrimonio', 'reserva', 'utilidad'], nature: 'CREDIT', description: 'Patrimonio por palabras clave' },
    ];

    /**
     * Detecta la naturaleza de una cuenta por su código PUC
     */
    public static detectNatureByCode(accountCode: string): { nature: AccountNature, rule: string } | null {
        if (!accountCode || accountCode.trim() === '') return null;

        const cleanCode = accountCode.trim();

        for (const rule of this.PUC_RULES) {
            const regex = new RegExp(rule.pattern);
            if (regex.test(cleanCode)) {
                return {
                    nature: rule.nature,
                    rule: `${rule.description} (${rule.pattern})`
                };
            }
        }

        return null;
    }

    /**
     * Detecta la naturaleza de una cuenta por su nombre usando palabras clave
     */
    public static detectNatureByName(accountName: string): { nature: AccountNature, rule: string } | null {
        if (!accountName || accountName.trim() === '') return null;

        const cleanName = accountName.toLowerCase().trim();

        for (const rule of this.KEYWORD_RULES) {
            for (const keyword of rule.keywords) {
                if (cleanName.includes(keyword.toLowerCase())) {
                    return {
                        nature: rule.nature,
                        rule: `${rule.description} (palabra: "${keyword}")`
                    };
                }
            }
        }

        return null;
    }

    /**
     * Detecta la naturaleza usando mapeos manuales primero, luego código, luego nombre
     */
    public static detectNature(accountCode: string, accountName: string, mappings: AccountMapping[] = []): { nature: AccountNature, rule: string } | null {
        // 0. Intentar por mapeos manuales (prioridad máxima)
        if (mappings.length > 0) {
            const mapping = mappings.find(m =>
                (accountCode && m.accountCode === accountCode) ||
                (accountName && m.accountName.toLowerCase() === accountName.toLowerCase())
            );
            if (mapping) {
                return {
                    nature: mapping.nature,
                    rule: `Manual (${mapping.isManualOverride ? 'Usuario' : 'Auto'})`
                };
            }
        }

        // Primero intentar por código (más confiable)
        const byCode = this.detectNatureByCode(accountCode);
        if (byCode) return byCode;

        // Si no funciona, intentar por nombre
        const byName = this.detectNatureByName(accountName);
        if (byName) return byName;

        return null;
    }

    /**
     * Calcula el tipo real de transacción basándose en:
     * - Si es débito o crédito
     * - La naturaleza de la cuenta
     * 
     * Reglas contables:
     * - Cuentas DEBIT (Activos, Gastos): Débito = Egreso, Crédito = Ingreso
     * - Cuentas CREDIT (Pasivos, Ingresos): Crédito = Ingreso, Débito = Egreso
     */
    public static calculateTransactionType(
        isDebit: boolean,
        accountNature: AccountNature
    ): TransactionType {
        if (accountNature === 'CREDIT') {
            // Cuentas de naturaleza CRÉDITO (Ingresos, Pasivos, Patrimonio)
            // Crédito aumenta = Ingreso
            // Débito disminuye = Egreso
            return isDebit ? TransactionType.EXPENSE : TransactionType.INCOME;
        } else {
            // Cuentas de naturaleza DÉBITO (Activos, Gastos, Costos)
            // Débito aumenta = Egreso (para gastos) o movimiento (para activos)
            // Crédito disminuye = Ingreso (devolución)

            // Para simplificar: en cuentas de gastos/costos, débito = egreso
            // En cuentas de activos (bancos), débito = ingreso (entrada de dinero)
            // Necesitamos más contexto, por ahora usamos lógica simple
            return isDebit ? TransactionType.EXPENSE : TransactionType.INCOME;
        }
    }

    /**
     * Calcula el tipo de transacción considerando el tipo de cuenta específico
     * Esta es una versión mejorada que considera si es cuenta de resultado o balance
     */
    public static calculateTransactionTypeAdvanced(
        isDebit: boolean,
        accountCode: string,
        accountNature: AccountNature
    ): TransactionType {
        const firstDigit = accountCode.charAt(0);

        // Cuentas de Ingresos (4xxx)
        if (firstDigit === '4') {
            return isDebit ? TransactionType.EXPENSE : TransactionType.INCOME; // Crédito = Ingreso
        }

        // Cuentas de Gastos/Costos (5xxx, 6xxx, 7xxx)
        if (['5', '6', '7'].includes(firstDigit)) {
            return isDebit ? TransactionType.EXPENSE : TransactionType.INCOME; // Débito = Egreso
        }

        // Cuentas de Activos (1xxx) - Bancos, Caja
        if (firstDigit === '1') {
            // Para bancos/caja: Débito = entrada (ingreso), Crédito = salida (egreso)
            return isDebit ? TransactionType.INCOME : TransactionType.EXPENSE;
        }

        // Cuentas de Pasivos (2xxx)
        if (firstDigit === '2') {
            // Crédito = aumento de deuda (ingreso de recursos)
            return isDebit ? TransactionType.EXPENSE : TransactionType.INCOME;
        }

        // Fallback a lógica simple
        return this.calculateTransactionType(isDebit, accountNature);
    }

    /**
     * Formatea la naturaleza para mostrar al usuario
     */
    public static formatNature(nature: AccountNature): string {
        return nature === 'DEBIT' ? 'Deudora' : 'Acreedora';
    }

    /**
     * Obtiene un emoji representativo de la naturaleza
     */
    public static getNatureEmoji(nature: AccountNature): string {
        return nature === 'DEBIT' ? '📤' : '📥';
    }
}
