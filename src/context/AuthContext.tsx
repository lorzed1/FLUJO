import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentSession, logoutLocal, UserRole } from '../services/auth';

interface AuthContextType {
    isLoading: boolean;
    isAuthenticated: boolean;
    userRole: UserRole | null;
    userName: string;
    handleLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [userName, setUserName] = useState<string>('');

    // Auth Check
    useEffect(() => {
        const session = getCurrentSession();
        if (session) {
            setIsAuthenticated(true);
            setUserRole(session.role);
            setUserName(session.displayName);
        } else {
            setIsAuthenticated(false);
            setUserRole(null);
            setUserName('');
        }
        setIsLoading(false);
    }, []);

    const handleLogout = () => {
        logoutLocal();
        setIsAuthenticated(false);
        setUserRole(null);
        setUserName('');
    };

    return (
        <AuthContext.Provider value={{
            isLoading,
            isAuthenticated,
            userRole,
            userName,
            handleLogout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};
