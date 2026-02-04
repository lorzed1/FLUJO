import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Sistema de autenticación local con gestión dinámica de usuarios
 * Los usuarios se persisten en localStorage
 */

export type UserRole = 'admin' | 'cajero';

export interface LocalUser {
    username: string;
    password: string;
    role: UserRole;
    displayName: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface AuthSession {
    username: string;
    role: UserRole;
    displayName: string;
    loginTime: string;
}

// ============================================
// USUARIOS POR DEFECTO (Primera vez)
// ============================================
const DEFAULT_USERS: LocalUser[] = [
    {
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        displayName: 'Administrador',
        createdAt: new Date().toISOString(),
    },
    {
        username: 'cajero',
        password: 'cajero123',
        role: 'cajero',
        displayName: 'Cajero',
        createdAt: new Date().toISOString(),
    },
];

// ============================================
// CONSTANTES
// ============================================
const SESSION_KEY = 'flowtrack_session';
const USERS_KEY = 'flowtrack_users';

// Helper: Convert username to email for Firebase
const getEmail = (username: string) => `${username.toLowerCase().replace(/\s+/g, '')}@flowtrack.app`;

// ============================================
// GESTIÓN DE USUARIOS EN LOCALSTORAGE
// ============================================

/**
 * Inicializa usuarios si no existen
 */
const initializeUsers = (): void => {
    const existingUsers = localStorage.getItem(USERS_KEY);
    if (!existingUsers) {
        localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
        console.log('✅ Usuarios inicializados con valores por defecto');
    }
};

/**
 * Obtiene todos los usuarios desde localStorage
 */
export const getAllUsers = (): LocalUser[] => {
    initializeUsers();
    try {
        const usersData = localStorage.getItem(USERS_KEY);
        if (!usersData) return DEFAULT_USERS;
        return JSON.parse(usersData) as LocalUser[];
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        return DEFAULT_USERS;
    }
};

/**
 * Guarda usuarios en localStorage
 */
const saveUsers = (users: LocalUser[]): void => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (error) {
        console.error('Error guardando usuarios:', error);
        throw new Error('No se pudieron guardar los usuarios');
    }
};

/**
 * Crea un nuevo usuario
 */
export const createUser = (user: Omit<LocalUser, 'createdAt' | 'updatedAt'>): { success: boolean; error?: string } => {
    try {
        const users = getAllUsers();

        // Verificar si el username ya existe
        if (users.some(u => u.username.toLowerCase() === user.username.toLowerCase())) {
            return { success: false, error: 'El nombre de usuario ya existe' };
        }

        const newUser: LocalUser = {
            ...user,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        users.push(newUser);
        saveUsers(users);

        console.log('✅ Usuario creado:', user.username);
        return { success: true };
    } catch (error) {
        console.error('Error creando usuario:', error);
        return { success: false, error: 'Error al crear el usuario' };
    }
};

/**
 * Actualiza un usuario existente
 */
export const updateUser = (
    username: string,
    updates: Partial<Omit<LocalUser, 'username' | 'createdAt'>>
): { success: boolean; error?: string } => {
    try {
        const users = getAllUsers();
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex === -1) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            username: users[userIndex].username, // No se puede cambiar el username
            updatedAt: new Date().toISOString(),
        };

        saveUsers(users);

        console.log('✅ Usuario actualizado:', username);
        return { success: true };
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        return { success: false, error: 'Error al actualizar el usuario' };
    }
};

/**
 * Elimina un usuario
 */
export const deleteUser = (username: string): { success: boolean; error?: string } => {
    try {
        const users = getAllUsers();

        // No permitir eliminar el último admin
        if (users.filter(u => u.role === 'admin').length === 1) {
            const user = users.find(u => u.username === username);
            if (user && user.role === 'admin') {
                return { success: false, error: 'No se puede eliminar el último administrador' };
            }
        }

        const filteredUsers = users.filter(u => u.username !== username);

        if (filteredUsers.length === users.length) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        saveUsers(filteredUsers);

        console.log('✅ Usuario eliminado:', username);
        return { success: true };
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        return { success: false, error: 'Error al eliminar el usuario' };
    }
};

/**
 * Cambia la contraseña de un usuario
 */
export const changePassword = (
    username: string,
    newPassword: string
): { success: boolean; error?: string } => {
    return updateUser(username, { password: newPassword });
};

// ============================================
// AUTENTICACIÓN
// ============================================

/**
 * Valida credenciales de usuario
 */
export const validateCredentials = (username: string, password: string): LocalUser | null => {
    const users = getAllUsers();
    const user = users.find(
        u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    return user || null;
};

/**
 * Inicia sesión con Firebase Y localmente
 * Esto permite usar reglas de seguridad "privadas" (request.auth != null)
 */
export const loginLocal = async (username: string, password: string): Promise<AuthSession | null> => {
    // 1. Validar contra base de datos local (roles, existencia)
    const user = validateCredentials(username, password);

    if (!user) {
        console.warn('❌ Credenciales locales inválidas');
        return null;
    }

    try {
        const email = getEmail(username);
        console.log(`🔐 Autenticando en Firebase como ${email}...`);

        // 2. Intentar login en Firebase
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Firebase Login: Éxito');

    } catch (error: any) {
        const errorCode = error.code;
        const email = getEmail(username);

        // Si el usuario no existe en Firebase, lo creamos automáticamente
        if (errorCode === 'auth/user-not-found' || errorCode === 'auth/invalid-credential' || errorCode === 'auth/invalid-login-credentials') {
            console.log('⚠️ Usuario no encontrado en Firebase. Intentando registrar...');
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                console.log('✅ Usuario registrado y logueado en Firebase');
            } catch (createError: any) {
                console.error('❌ Error creando usuario en Firebase:', createError);
                // Si falla la creación (ej. contraseña débil com admin123 para firebase, aunque admin123 suele pasar si es >6 chars)
                // Nota: Firebase pide min 6 caracteres.
                if (createError.code === 'auth/weak-password') {
                    alert('La contraseña es muy débil para Firebase (mínimo 6 caracteres). Por favor cámbiala localmente.');
                }
                throw createError;
            }
        }
        else if (errorCode === 'auth/wrong-password') {
            console.error('❌ Contraseña incorrecta en Firebase');
            return null;
        }
        else {
            console.error('❌ Error desconocido en Firebase Auth:', error);
            // Si el error es "auth/operation-not-allowed", el usuario debe habilitar Email/Password en consola
            if (errorCode === 'auth/operation-not-allowed') {
                alert('⚠️ IMPORTANTE: Debes habilitar "Correo electrónico/Contraseña" en la pestaña Authentication de Firebase Console.');
            }
            throw error;
        }
    }

    // 3. Crear sesión local
    const session: AuthSession = {
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        loginTime: new Date().toISOString()
    };

    // Guardar sesión en localStorage
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
};

/**
 * Obtiene la sesión actual
 */
export const getCurrentSession = (): AuthSession | null => {
    try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        if (!sessionData) return null;

        return JSON.parse(sessionData) as AuthSession;
    } catch (error) {
        console.error('Error obteniendo sesión:', error);
        return null;
    }
};

/**
 * Verifica si hay una sesión activa
 */
export const isAuthenticated = (): boolean => {
    return getCurrentSession() !== null;
};

/**
 * Cierra la sesión actual (Firebase y Local)
 */
export const logoutLocal = async (): Promise<void> => {
    try {
        await signOut(auth);
    } catch (e) {
        console.warn('Error al cerrar sesión de Firebase', e);
    }
    localStorage.removeItem(SESSION_KEY);
    console.log('👋 Sesión cerrada');
};

/**
 * Obtiene el rol del usuario actual
 */
export const getCurrentRole = (): UserRole | null => {
    const session = getCurrentSession();
    return session?.role || null;
};

/**
 * Verifica si el usuario actual es admin
 */
export const isAdmin = (): boolean => {
    return getCurrentRole() === 'admin';
};

/**
 * Verifica si el usuario actual es cajero
 */
export const isCajero = (): boolean => {
    return getCurrentRole() === 'cajero';
};

/**
 * Obtiene todos los usuarios (sin contraseñas)
 * Solo para uso en UI de administración
 */
export const getUsersForDisplay = (): Array<Omit<LocalUser, 'password'>> => {
    const users = getAllUsers();
    return users.map(({ password, ...user }) => user);
};

/**
 * Resetea usuarios a valores por defecto
 * Solo usar en caso de emergencia
 */
export const resetUsersToDefault = (): void => {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
    console.log('⚠️ Usuarios reseteados a valores por defecto');
};
