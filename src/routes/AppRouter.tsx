import React, { useEffect, lazy, Suspense } from 'react';
import { Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useArqueos } from '../context/ArqueoContext';
import MainLayout from '../components/layout/MainLayout';
import PageLoader from '../components/ui/PageLoader';

const DashboardView = lazy(() => import('../features/dashboard/DashboardView'));
const UsersManagementView = lazy(() => import('../features/auth/UsersManagementView'));
const Login = lazy(() => import('../features/auth/Login'));
const ArqueoView = lazy(() => import('../features/cash-flow/ArqueoPreview'));
const TipsPage = lazy(() => import('../features/cash-flow/pages/TipsPage'));

const RescueData = lazy(() => import('../pages/RescueData'));
const ButtonDesignPlayground = lazy(() => import('../pages/ButtonDesignPlayground'));

// Budget Module
const BudgetLayout = lazy(() => import('../features/budget/layouts/BudgetLayout').then(m => ({ default: m.BudgetLayout })));
const BudgetDashboard = lazy(() => import('../features/budget/pages/BudgetDashboard').then(m => ({ default: m.BudgetDashboard })));
const BudgetCalendar = lazy(() => import('../features/budget/pages/BudgetCalendar').then(m => ({ default: m.BudgetCalendar })));
const BudgetTable = lazy(() => import('../features/budget/pages/BudgetTable').then(m => ({ default: m.BudgetTable })));
const BudgetRecurring = lazy(() => import('../features/budget/pages/BudgetRecurring').then(m => ({ default: m.BudgetRecurring })));
const BudgetCategories = lazy(() => import('../features/budget/pages/BudgetCategories').then(m => ({ default: m.BudgetCategories })));
const BudgetExecution = lazy(() => import('../features/budget/pages/BudgetExecution').then(m => ({ default: m.BudgetExecution })));
const BudgetHistory = lazy(() => import('../features/budget/pages/BudgetHistory').then(m => ({ default: m.BudgetHistory })));
const BudgetPurchases = lazy(() => import('../features/budget/pages/BudgetPurchases').then(m => ({ default: m.BudgetPurchases })));


// Projections
const ProjectionsView = lazy(() => import('../features/projections/ProjectionsView').then(m => ({ default: m.ProjectionsView })));

// Income Statement
const IncomeStatementLayout = lazy(() => import('../features/income-statement/layouts/IncomeStatementLayout').then(m => ({ default: m.IncomeStatementLayout })));
const IncomeStatementDashboard = lazy(() => import('../features/income-statement/pages/IncomeStatementDashboard').then(m => ({ default: m.IncomeStatementDashboard })));
const IncomeStatementTable = lazy(() => import('../features/income-statement/pages/IncomeStatementTable').then(m => ({ default: m.IncomeStatementTable })));

// Accounting Module
const AccountingLayout = lazy(() => import('../features/accounting/layouts/AccountingLayout').then(m => ({ default: m.AccountingLayout })));
const AccountingConsolidatedPYG = lazy(() => import('../features/accounting/pages/AccountingConsolidatedPYG').then(m => ({ default: m.AccountingConsolidatedPYG })));
const AccountingCtaNatalia = lazy(() => import('../features/accounting/pages/AccountingCtaNatalia').then(m => ({ default: m.AccountingCtaNatalia })));
const AccountingAsientosContables = lazy(() => import('../features/accounting/pages/AccountingAsientosContables').then(m => ({ default: m.AccountingAsientosContables })));

const AppRouter: React.FC = () => {
    // Contextos especializados
    const { isLoading: authLoading, isAuthenticated, userRole } = useAuth();
    const { isLoading: dataLoading } = useData();
    const { isArqueosLoading: arqueoLoading } = useArqueos();

    const navigate = useNavigate();
    const location = useLocation();

    // Auto-navigate functionality
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const path = location.pathname;
            // Si está en raíz o login, redirigir según rol
            if (path === '/' || path === '/login') {
                if (userRole === 'cajero') {
                    navigate('/arqueo', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            }
            // Si es cajero e intenta acceder a rutas prohibidas
            if (userRole === 'cajero' && !path.includes('arqueo') && path !== '/' && path !== '/login') {
                navigate('/arqueo', { replace: true });
            }
        }
    }, [isAuthenticated, userRole, navigate, location.pathname, authLoading]);

    // === RENDER ===

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
        return (
            <Routes>
                <Route path="*" element={<Login onLoginSuccess={() => window.location.reload()} />} />
            </Routes>
        );
    }

    // Esperar a que los datos se carguen solo si está autenticado
    if (dataLoading || arqueoLoading) {
        return (
            <PageLoader />
        );
    }

    return (
        <Routes>
            {/* Layout Principal */}
            <Route element={<MainLayout />}>
                {/* Arqueo: Accesible para Admin y Cajero */}
                <Route path="/arqueo/tips" element={
                    <TipsPage />
                } />
                <Route path="/arqueo/*" element={
                    <ArqueoView />
                } />

                {/* Rutas exclusivas Admin */}
                <Route path="/dashboard" element={
                    userRole === 'admin' ? (
                        <DashboardView />
                    ) : <Navigate to="/arqueo" replace />
                } />

                <Route path="/users/*" element={
                    userRole === 'admin' ? <UsersManagementView /> : <Navigate to="/arqueo" replace />
                } />

                <Route path="/projections/*" element={
                    userRole === 'admin' ? <ProjectionsView /> : <Navigate to="/arqueo" replace />
                } />

                {/* Budget Module */}
                <Route path="/budget" element={userRole === 'admin' ? <BudgetLayout /> : <Navigate to="/arqueo" replace />}>
                    <Route index element={<BudgetDashboard />} />
                    <Route path="calendar" element={<BudgetCalendar />} />
                    <Route path="list" element={<BudgetTable />} />
                    <Route path="recurrent" element={<BudgetRecurring />} />
                    <Route path="categories" element={<BudgetCategories />} />
                    <Route path="execution" element={<BudgetExecution />} />
                    <Route path="history" element={<BudgetHistory />} />
                    <Route path="purchases" element={<BudgetPurchases />} />
                </Route>



                {/* Income Statement Module */}
                <Route path="/income-statement" element={userRole === 'admin' ? <IncomeStatementLayout /> : <Navigate to="/arqueo" replace />}>
                    <Route index element={<IncomeStatementDashboard />} />
                    <Route path="table" element={<IncomeStatementTable />} />
                </Route>

                {/* Accounting Module */}
                <Route path="/accounting" element={userRole === 'admin' ? <AccountingLayout /> : <Navigate to="/arqueo" replace />}>
                    <Route path="consolidated" element={<AccountingConsolidatedPYG />} />
                    <Route path="cta-natalia" element={<AccountingCtaNatalia />} />
                    <Route path="asientos-contables" element={<AccountingAsientosContables />} />
                </Route>

                <Route path="/rescate" element={<RescueData />} />
                <Route path="/design-playground" element={userRole === 'admin' ? <ButtonDesignPlayground /> : <Navigate to="/arqueo" replace />} />

                {/* Default Route */}
                <Route path="/" element={<Navigate to={userRole === 'cajero' ? "/arqueo" : "/dashboard"} replace />} />
            </Route>

            {/* Catch-all para cualquier otra ruta no definida */}
            <Route path="*" element={<Navigate to={userRole === 'cajero' ? "/arqueo" : "/dashboard"} replace />} />
        </Routes>
    );
};

export default AppRouter;
