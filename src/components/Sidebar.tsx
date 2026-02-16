import React, { useRef, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChartPieIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ArrowRightOnRectangleIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  PresentationChartLineIcon,
  TableCellsIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  TagIcon,
  ClockIcon
} from './ui/Icons';
import { useUI } from '../context/UIContext';

type View = 'dashboard' | 'users' | 'budget' | 'arqueo' | 'projections';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onLogout?: () => void;
  userEmail?: string;
  userRole?: 'admin' | 'cajero' | null;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  path: string;
  children?: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ setCurrentView, onExport, onImport, onLogout, userEmail, userRole }) => {
  const { setAlertModal } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // State for expanded menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    budget: true // Default expanded
  });

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMenu = (id: string) => {
    if (isCollapsed) setIsCollapsed(false);
    setExpandedMenus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  const handleNavigation = (path: string, viewId: string) => {
    navigate(path);
    // Legacy support if needed, though location check is better
    // setCurrentView(viewId as View); 
  };

  const allNavItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <ChartPieIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/dashboard'
    },
    {
      id: 'arqueo',
      label: 'Arqueo de Caja',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
      roles: ['admin', 'cajero'],
      path: '/arqueo',
      children: [
        { id: 'arqueo-form', label: 'Formulario Diarios', icon: <ClipboardDocumentListIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/form' },
        { id: 'arqueo-transfers', label: 'Transferencias', icon: <ArrowRightOnRectangleIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/transfers' },
        { id: 'arqueo-history', label: 'Historial Cierres', icon: <CalendarDaysIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/history' },
      ]
    },
    {
      id: 'budget',
      label: 'Presupuestos',
      icon: <CreditCardIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/budget',
      children: [
        { id: 'budget-dashboard', label: 'Resumen', icon: <ChartBarIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget' },
        { id: 'budget-execution', label: 'Ejecución Semanal', icon: <BanknotesIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/execution' },
        { id: 'budget-history', label: 'Historial Pagos', icon: <ClockIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/history' },
        { id: 'budget-calendar', label: 'Calendario', icon: <CalendarIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/calendar' },
        { id: 'budget-list', label: 'Tabla de Gastos', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/list' },
        { id: 'budget-recurrent', label: 'Recurrentes', icon: <ArrowPathIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/recurrent' },
        { id: 'budget-categories', label: 'Categorías', icon: <TagIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/categories' },
      ]
    },
    {
      id: 'projections',
      label: 'Proyecciones',
      icon: <ChartBarIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/projections',
      children: [
        { id: 'projections-dashboard', label: 'Dashboard', icon: <PresentationChartLineIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/dashboard' },
        { id: 'projections-equilibrium', label: 'BD Proyección Eq.', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/equilibrium' },
        { id: 'projections-database', label: 'Base de Datos', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/database' },
      ]
    },
    {
      id: 'users',
      label: 'Usuarios',
      icon: <PencilIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/users',
      children: [
        { id: 'users-list', label: 'Lista de Usuarios', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/users' },
      ]
    },
  ];

  const navItems = allNavItems.filter(item => userRole ? item.roles.includes(userRole) : false);

  const textClass = isCollapsed ? 'hidden' : 'hidden md:block';
  const sidebarWidthClass = isCollapsed ? 'w-20' : 'w-64';

  const isActive = (path: string, end = false) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* --- Desktop Sidebar --- */}
      <aside className={`hidden md:flex ${sidebarWidthClass} min-h-screen bg-[#1a1e2c] border-r border-[#2a2e3c] flex-col transition-all duration-300 relative z-40 shadow-xl sticky top-0 h-screen`}>

        {/* --- Header / Logo --- */}
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} bg-[#151824]`}>
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <BanknotesIcon className="h-6 w-6" />
            </div>
            {!isCollapsed && (
              <div className="hidden lg:block">
                <h1 className="text-lg font-bold tracking-tight text-white leading-none">FlowTrack</h1>
              </div>
            )}
          </div>
        </div>

        {/* --- Toggle (Desktop Only) --- */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-20 bg-[#2a2e3c] border border-[#3a3e4c] text-gray-400 hover:text-white p-1 rounded-full shadow-sm transition-all z-50 items-center justify-center"
        >
          {isCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
        </button>

        {/* --- Navigation --- */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && <p className="px-6 mb-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest hidden lg:block">Navegación</p>}

          {navItems.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus[item.id] || false;
            const isItemActive = isActive(item.path);

            return (
              <div key={item.id}>
                <button
                  onClick={() => hasChildren ? toggleMenu(item.id) : handleNavigation(item.path, item.id)}
                  className={`flex items-center w-full px-6 py-3 transition-colors duration-200 relative border-l-4
                    ${isItemActive && !hasChildren
                      ? 'border-primary bg-white/5 text-white'
                      : 'border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }
                    ${isCollapsed ? 'justify-center px-0 border-l-0' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`flex-shrink-0`}>{item.icon}</div>
                  <span className={`${textClass} ml-3 text-sm font-medium flex-1 text-left`}>{item.label}</span>
                  {!isCollapsed && hasChildren && (
                    <ChevronDownIcon className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Submenus */}
                {!isCollapsed && hasChildren && isExpanded && (
                  <div className="bg-[#151824]/50 py-1">
                    {item.children?.map(child => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNavigation(child.path, child.id)}
                          className={`flex items-center w-full pl-14 pr-6 py-2 transition-colors duration-200 text-sm
                            ${isChildActive
                              ? 'text-white font-medium'
                              : 'text-gray-500 hover:text-gray-300'
                            }
                          `}
                        >
                          <span className="mr-2 opacity-70">{child.icon}</span>
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {userRole === 'admin' && (
            <div className="pt-8 pb-2">
              {!isCollapsed && <p className="px-6 mb-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest hidden lg:block">Sistema</p>}

              <button
                onClick={onExport}
                className={`flex items-center w-full px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Exportar base de datos"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
                <span className={`${textClass} ml-3 text-sm font-medium`}>Exportar DB</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center w-full px-6 py-3 text-gray-400 hover:text-white hover:bg-white/5 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Importar base de datos"
              >
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span className={`${textClass} ml-3 text-sm font-medium`}>Importar DB</span>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />

              <button
                onClick={() => {
                  setAlertModal({
                    isOpen: true,
                    type: 'error',
                    title: '⚠️ ZONA DE PELIGRO',
                    message: '¿Estás seguro de resetear toda la aplicación? Se perderán todos los datos.',
                    confirmText: 'RESET TOTAL',
                    showCancel: true,
                    onConfirm: async () => {
                      setAlertModal({ isOpen: false, message: '' });
                      try {
                        const { DatabaseService } = await import('../services/database');
                        await DatabaseService.resetSystemData();
                        window.location.reload();
                      } catch (e) {
                        setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: String(e) });
                      }
                    }
                  });
                }}
                className={`flex items-center w-full px-6 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Resetear Fábrica"
              >
                <TrashIcon className="h-5 w-5" />
                <span className={`${textClass} ml-3 text-sm font-medium`}>Reset Fábrica</span>
              </button>
            </div>
          )}
        </nav>

        {/* --- Footer / User --- */}
        <div className="p-4 border-t border-[#2a2e3c] bg-[#151824] mt-auto">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30 text-sm">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>

            {!isCollapsed && (
              <div className="hidden lg:flex flex-col overflow-hidden">
                <p className="text-sm font-semibold text-gray-200 truncate max-w-[120px]">{userEmail?.split('@')[0]}</p>
                <button onClick={onLogout} className="text-xs text-gray-500 hover:text-primary text-left transition-colors font-medium">Cerrar Sesión</button>
              </div>
            )}

            {/* Tooltip Logout for Collapsed */}
            {isCollapsed && (
              <button onClick={onLogout} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Cerrar Sesión" />
            )}
          </div>
        </div>
      </aside>

      {/* --- Mobile Bottom Navigation --- */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-50 pb-safe shadow-lg">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map(item => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 transition-colors
                  ${isActive
                    ? 'text-primary dark:text-primary font-medium'
                    : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-400'
                  }
                `}
              >
                <div className={`${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {isActive && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-lg" />}
              </button>
            );
          })}

          {/* Mobile Logout Button (Small) */}
          <button
            onClick={onLogout}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 gap-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;