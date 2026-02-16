import React, { Suspense, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { useUI } from '../../context/UIContext';
import PageLoader from '../ui/PageLoader';
import AlertModal from '../ui/AlertModal';

type View = 'dashboard' | 'users' | 'budget' | 'arqueo' | 'projections';

const MainLayout: React.FC = () => {
    const { userName, userRole, handleLogout } = useAuth();
    const { handleExport, handleImport } = useApp();
    const { alertModal, setAlertModal } = useUI();

    const location = useLocation();
    const navigate = useNavigate();

    const currentView: View = useMemo(() => {
        const path = location.pathname;
        if (path.includes('budget')) return 'budget';
        if (path.includes('arqueo')) return 'arqueo';
        if (path.includes('projections')) return 'projections';
        if (path.includes('users') || path.includes('usuarios')) return 'users';
        return 'dashboard';
    }, [location.pathname]);

    const setCurrentView = (view: View) => {
        navigate(`/${view}`);
    };

    return (
        <div className="flex h-screen bg-light-bg font-sans overflow-hidden">
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                onExport={handleExport}
                onImport={handleImport}
                onLogout={handleLogout}
                userEmail={userName}
                userRole={userRole}
            />

            <div className="flex-1 flex flex-col h-full w-full min-w-0 transition-all duration-300">
                <TopBar />

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-gray-50/50 scroll-smooth">
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>

            <AlertModal
                isOpen={alertModal.isOpen}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
                message={alertModal.message}
                title={alertModal.title}
                type={alertModal.type}
                onConfirm={alertModal.onConfirm}
                showCancel={alertModal.showCancel}
                confirmText={alertModal.confirmText}
                cancelText={alertModal.cancelText}
            />
        </div>
    );
};

export default MainLayout;
