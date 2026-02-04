import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export type UserRole = 'admin' | 'cajero';

export interface UserRoleData {
    email: string;
    role: UserRole;
    createdAt: string;
    lastLogin?: string;
}

/**
 * Obtiene el rol de un usuario desde Firestore
 */
export const getUserRole = async (userId: string): Promise<UserRole> => {
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));

        if (userDoc.exists()) {
            const data = userDoc.data() as UserRoleData;
            return data.role || 'cajero'; // Default: cajero
        }

        // Si no existe, retorna cajero por defecto
        return 'cajero';
    } catch (error) {
        console.error('Error obteniendo rol de usuario:', error);
        return 'cajero'; // En caso de error, default cajero
    }
};

/**
 * Asigna un rol a un usuario en Firestore
 */
export const setUserRole = async (
    userId: string,
    email: string,
    role: UserRole
): Promise<void> => {
    try {
        const userData: UserRoleData = {
            email,
            role,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
        };

        await setDoc(doc(db, 'users', userId), userData, { merge: true });
        console.log(`✅ Rol asignado: ${email} -> ${role}`);
    } catch (error) {
        console.error('Error asignando rol:', error);
        throw error;
    }
};

/**
 * Actualiza el último login del usuario
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
    try {
        await setDoc(
            doc(db, 'users', userId),
            { lastLogin: new Date().toISOString() },
            { merge: true }
        );
    } catch (error) {
        console.error('Error actualizando último login:', error);
    }
};

/**
 * Define los emails de administradores
 * Puedes modificar esta lista para agregar más admins
 */
const ADMIN_EMAILS = [
    'admin@flowtrack.com',
    'david@flowtrack.com',
    // Agrega aquí los emails de los administradores
];

/**
 * Determina si un email debe ser admin por defecto
 */
export const isAdminEmail = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email.toLowerCase());
};
