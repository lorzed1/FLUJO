import React, { useEffect, useMemo, lazy, Suspense } from 'react';
import { Route, Routes, Navigate, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import Sidebar from '../components/Sidebar';
import AlertModal from '../components/ui/AlertModal';
import PageLoader from '../components/ui/PageLoader';

const DashboardView = lazy(() => import('../features/dashboard/DashboardView'));
const TransactionsView = lazy(() => import('../features/operations/TransactionsView'));
const OperationalFlowView = lazy(() => import('../features/operations/OperationalFlowView'));

const UsersManagementView = lazy(() => import('../features/auth/UsersManagementView'));
const Login = lazy(() => import('../features/auth/Login'));
const ArqueoView = lazy(() => import('../features/cash-flow/ArqueoPreview'));

// Budget Module
const BudgetLayout = lazy(() => import('../features/budget/layouts/BudgetLayout').then(m => ({ default: m.BudgetLayout })));
const BudgetDashboard = lazy(() => import('../features/budget/pages/BudgetDashboard').then(m => ({ default: m.BudgetDashboard })));
const BudgetCalendar = lazy(() => import('../features/budget/pages/BudgetCalendar').then(m => ({ default: m.BudgetCalendar })));
const BudgetTable = lazy(() => import('../features/budget/pages/BudgetTable').then(m => ({ default: m.BudgetTable })));
const BudgetRecurring = lazy(() => import('../features/budget/pages/BudgetRecurring').then(m => ({ default: m.BudgetRecurring })));
const BudgetCategories = lazy(() => import('../features/budget/pages/BudgetCategories').then(m => ({ default: m.BudgetCategories })));

type View = 'dashboard' | 'transactions' | 'calendar' | 'recurring' | 'users' | 'budget' | 'arqueo';

const AppRouter: React.FC = () => {
    // Contextos especializados
    const { isLoading: authLoading, isAuthenticated, userRole, userName, handleLogout } = useAuth();
    const { alertModal, setAlertModal } = useUI();
    const {
        isLoading: dataLoading,
        memoizedAllTransactions, transactions, categories, arqueos, recurringExpenses, recordedDays,
        bankTransactions,
        addTransaction, updateTransaction, deleteTransaction, updateTransactionDate, updateTransactionAmount,
        addRecurringExpense, updateRecurringExpense, deleteRecurringExpense, updateRecurringExpenseOverride,
        addCategory, deleteCategory, recordDay,
        handleExport, handleImport,
        setBankTransactions,
        handleSaveArqueo, handleUpdateArqueo, handleDeleteArqueo, handleMigrateArqueos
    } = useApp();

    const navigate = useNavigate();
    const location = useLocation();

    // Determine current view from URL (Optimizado: Solo afecta al Sidebar prop, no re-renderiza todo el layout)
    const currentView: View = useMemo(() => {
        const path = location.pathname;
        if (path.includes('budget')) return 'budget'; // Prioridad para evitar colisión con /budget/calendar
        if (path.includes('arqueo')) return 'arqueo';
        if (path.includes('calendar')) return 'calendar';
        if (path.includes('transactions')) return 'transactions';
        if (path.includes('recurring')) return 'recurring';

        if (path.includes('users') || path.includes('usuarios')) return 'users';
        return 'dashboard';
    }, [location.pathname]);

    // Handler to navigate based on view
    const setCurrentView = (view: View) => {
        navigate(`/${view}`);
    };

    // Auto-navigate based on user role
    useEffect(() => {
        if (isAuthenticated) {
            const path = location.pathname;
            if (path === '/' || path === '/login') {
                if (userRole === 'cajero') {
                    navigate('/dashboard');
                } else if (userRole === 'admin') {
                    navigate('/dashboard');
                }
            }
        }
    }, [isAuthenticated, userRole, navigate, location.pathname]);

    // === RENDER ===

    // Esperar a que Auth se inicialice primero
    if (authLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#1675F2]">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-white font-medium">Iniciando...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLoginSuccess={() => window.location.reload()} />;
    }

    // Esperar a que los datos se carguen
    if (dataLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-700 font-medium">Cargando datos...</p>
                </div>
            </div>
        );
    }

    // Layout para rutas administrativas con Sidebar persistente
    const MainLayout = () => (
        <>
            <Sidebar
                currentView={currentView}
                setCurrentView={setCurrentView}
                onExport={handleExport}
                onImport={handleImport}
                onLogout={handleLogout}
                userEmail={userName}
            />
            <main className="flex-1 overflow-y-auto p-6">
                <Suspense fallback={<PageLoader />}>
                    <Outlet />
                </Suspense>
            </main>
        </>
    );

    return (
        <div className="flex h-screen bg-light-bg font-sans">
            <Routes>
                {/* Ruta pública / standalone */}
                <Route path="/login" element={<Login onLoginSuccess={() => window.location.reload()} />} />



                {/* Rutas Protegidas de Admin (Usando Layout Pattern) */}
                {userRole === 'admin' && (
                    <Route element={<MainLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={
                            <DashboardView
                                projectedTransactions={memoizedAllTransactions || []}
                                realTransactions={transactions || []}
                                categories={categories || []}
                                arqueos={arqueos || []}
                            />
                        } />
                        <Route path="/transactions" element={
                            <TransactionsView
                                addTransaction={addTransaction}
                                categories={categories || []}
                            />
                        } />
                        <Route path="/arqueo" element={
                            <ArqueoView
                                onSave={handleSaveArqueo}
                                arqueos={arqueos || []}
                                onUpdateArqueo={handleUpdateArqueo}
                                onDeleteArqueo={handleDeleteArqueo}
                                onMigrateArqueos={handleMigrateArqueos}
                                userRole={userRole}
                            />
                        } />
                        <Route path="/calendar" element={
                            <OperationalFlowView
                                transactions={memoizedAllTransactions || []}
                                updateTransactionDate={updateTransactionDate}
                                updateTransactionAmount={updateTransactionAmount}
                                updateTransaction={updateTransaction}
                                updateRecurringExpenseOverride={updateRecurringExpenseOverride}
                                addTransaction={addTransaction}
                                deleteTransaction={deleteTransaction}
                                categories={categories || []}
                                recordedDays={recordedDays || new Set()}
                                recordDay={recordDay}
                                recurringExpenses={recurringExpenses || []}
                                addRecurringExpense={addRecurringExpense}
                                updateRecurringExpense={updateRecurringExpense}
                                deleteRecurringExpense={deleteRecurringExpense}
                            />
                        } />


                        <Route path="/users" element={<UsersManagementView />} />

                        {/* Budget Module Routes */}
                        <Route path="/budget" element={<BudgetLayout />}>
                            <Route index element={<BudgetDashboard />} />
                            <Route path="calendar" element={<BudgetCalendar />} />
                            <Route path="list" element={<BudgetTable />} />
                            <Route path="recurrent" element={<BudgetRecurring />} />
                            <Route path="categories" element={<BudgetCategories />} />
                        </Route>
                    </Route>
                )}

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>

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

export default AppRouter;
