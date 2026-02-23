import React, { Suspense, useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useUI } from '../../context/UIContext';
import PageLoader from '../ui/PageLoader';
import AlertModal from '../ui/AlertModal';

type View = 'dashboard' | 'users' | 'budget' | 'arqueo' | 'projections' | 'income-statement';

const MainLayout: React.FC = () => {
    const { userName, userRole, handleLogout } = useAuth();
    const { handleExport, handleImport } = useData();
    const { alertModal, setAlertModal } = useUI();

    const location = useLocation();
    const navigate = useNavigate();

    const currentView: View = useMemo(() => {
        const path = location.pathname;
        if (path.includes('budget')) return 'budget';
        if (path.includes('arqueo')) return 'arqueo';
        if (path.includes('projections')) return 'projections';
        if (path.includes('income-statement')) return 'income-statement';
        if (path.includes('users') || path.includes('usuarios')) return 'users';
        return 'dashboard';
    }, [location.pathname]);

    const setCurrentView = (view: View) => {
        navigate(`/${view}`);
    };

    return (
        <div className="flex h-screen bg-light-bg dark:bg-slate-950 font-sans overflow-hidden">
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

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 bg-gray-50/50 dark:bg-slate-900 scroll-smooth">
                    <div className="min-h-full flex flex-col">
                        <Suspense fallback={<PageLoader />}>
                            <Outlet />
                        </Suspense>
                    </div>
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
