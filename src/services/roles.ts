import { supabase } from './supabaseClient';

export type UserRole = 'admin' | 'cajero';

export const DEFAULT_ADMIN_EMAILS = ['admin@flujocaja.com'];

interface UserRoleData {
    email: string;
    role: UserRole;
    createdAt?: string;
    lastLogin?: string;
}

/**
 * Obtener el rol de un usuario por su ID.
 */
export const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();
        if (error) throw error;
        return (data?.role as UserRole) || 'cajero';
    } catch (error) {
        console.error('Error getting user role:', error);
        return 'cajero';
    }
};

/**
 * Establecer el rol de un usuario.
 */
export const setUserRole = async (userId: string, email: string, role: UserRole): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_roles')
            .upsert({
                id: userId,
                email,
                role,
                created_at: new Date().toISOString(),
            }, { onConflict: 'id' });
        if (error) throw error;
    } catch (error) {
        console.error('Error setting user role:', error);
        throw error;
    }
};

/**
 * Actualizar la fecha de último login.
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('user_roles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId);
        if (error) throw error;
    } catch (error) {
        console.error('Error updating last login:', error);
    }
};

/**
 * Verificar si un email es admin por defecto.
 */
export const isDefaultAdmin = (email: string): boolean => {
    return DEFAULT_ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Obtener el rol de un usuario por email.
 */
export const getUserRoleByEmail = async (email: string): Promise<UserRole> => {
    try {
        if (isDefaultAdmin(email)) return 'admin';
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('email', email)
            .maybeSingle();
        if (error) throw error;
        return (data?.role as UserRole) || 'cajero';
    } catch (error) {
        console.error('Error getting role by email:', error);
        return 'cajero';
    }
};
