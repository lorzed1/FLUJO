import { supabase } from '../supabaseClient';
import { Purchase } from '../../types/budget';

/**
 * Servicio para gestionar Compras en la tabla específica budget_purchases
 */
export const purchaseService = {
    /**
     * Obtener compras en un rango
     */
    async getPurchases(startDate: string, endDate: string): Promise<Purchase[]> {
        const { data, error } = await supabase
            .from('budget_purchases')
            .select('*')
            .gte('fecha', startDate)
            .lte('fecha', endDate)
            .order('fecha', { ascending: false });

        if (error) throw error;

        // Mapeamos los campos específicos de vuelta al formato general de Purchase en UI
        return (data || []).map(row => ({
            ...row,          // Incluye cuenta, nombre_cuenta, identificacion, etc.
            ...row.metadata, // Restaura cualquier columna extra no contemplada
            id: row.id,
            date: row.fecha, // el array principal de compras usa 'date' en UI
            description: row.descripcion, // general map
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: new Date(row.updated_at || row.created_at).getTime(),
        }));
    },

    async savePurchase(purchase: any): Promise<void> {
        // En caso de que se use para agregar 1 a la vez
        await this.batchImport([purchase]);
    },

    /**
     * Importación masiva
     */
    async batchImport(purchases: any[]): Promise<void> {
        // Función auxiliar para buscar el valor sin importar mayúsculas, minúsculas o espacios
        const findValue = (obj: any, possibleKeys: string[]) => {
            const objKeys = Object.keys(obj);
            for (const pKey of possibleKeys) {
                const normalizedPKey = pKey.toLowerCase().replace(/[\s_]/g, '');
                for (const oKey of objKeys) {
                    const normalizedOKey = oKey.toLowerCase().replace(/[\s_]/g, '');
                    // Permite coincidencia exacta despues de normalizar
                    if (normalizedOKey === normalizedPKey) {
                        return obj[oKey];
                    }
                    // O si empieza con (ej: 'descripción' matchea 'descripcion')
                    // Limpiando tildes también para asegurar
                    const cleanOKey = normalizedOKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    const cleanPKey = normalizedPKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                    if (cleanOKey === cleanPKey) {
                        return obj[oKey];
                    }
                }
            }
            return undefined;
        };

        const rows = purchases.map(p => {
            const { id, date, createdAt, updatedAt, ...rest } = p;

            return {
                id,
                cuenta: String(findValue(rest, ['cuenta']) || ''),
                nombre_cuenta: String(findValue(rest, ['nombre_cuenta', 'nombre de cuenta']) || ''),
                contacto: String(findValue(rest, ['contacto', 'proveedor']) || ''),
                identificacion: String(findValue(rest, ['identificacion', 'identificación']) || ''),
                centro_costo: String(findValue(rest, ['centro_costo', 'centro de costo']) || ''),
                documento: String(findValue(rest, ['documento', 'factura']) || ''),
                fecha: date || findValue(rest, ['fecha']) || new Date().toISOString().split('T')[0],
                descripcion: String(findValue(rest, ['descripcion', 'descripción', 'description']) || ''),
                descripcion_movimiento: String(findValue(rest, ['descripcion_movimiento', 'descripción del movimiento']) || ''),
                base: Number(findValue(rest, ['base'])) || 0,
                saldo_inicial: Number(findValue(rest, ['saldo_inicial', 'saldo inicial'])) || 0,
                debito: Number(findValue(rest, ['debito', 'débito'])) || 0,
                credito: Number(findValue(rest, ['credito', 'crédito'])) || 0,
                saldo_final: Number(findValue(rest, ['saldo_final', 'saldo final'])) || 0,
                metadata: rest // Guardamos el resto de columnas dinámicas que tenga el excel por si acaso
            };
        });

        const { error } = await supabase
            .from('budget_purchases')
            .upsert(rows, { onConflict: 'id' });

        if (error) throw error;
    },

    /**
     * Eliminar una compra (Hard delete por ahora si no hay deleted_at en la nueva tabla)
     */
    async deletePurchase(id: string): Promise<void> {
        const { error } = await supabase
            .from('budget_purchases')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
