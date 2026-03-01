import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  PresentationChartLineIcon,
  TableCellsIcon,
  ChartBarIcon,
  CalendarIcon,
  ArrowPathIcon,
  TagIcon,
  ClockIcon,
  PlusIcon,
  MinusIcon,
  ChevronDownIcon,
  WalletIcon
} from './ui/Icons';
import { useUI } from '../context/UIContext';
import { useSidebarLabels } from '../context/SidebarLabelsContext';

type View = 'dashboard' | 'users' | 'budget' | 'arqueo' | 'projections' | 'income-statement' | 'accounting';

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

  // --- Rename feature (uses shared context) ---
  const { getLabel, setLabel } = useSidebarLabels();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startEditing = useCallback((id: string, currentLabel: string) => {
    setEditingId(id);
    setEditValue(currentLabel);
  }, []);

  const commitRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = editValue.trim();
    if (trimmed && trimmed.length > 0) {
      setLabel(editingId, trimmed);
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, setLabel]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);
  // --- End rename feature ---

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
      label: 'Caja',
      icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
      roles: ['admin', 'cajero'],
      path: '/arqueo',
      children: [
        { id: 'arqueo-form', label: 'Arqueo diario', icon: <ClipboardDocumentListIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/form' },
        { id: 'arqueo-history', label: 'Historial de cierres', icon: <CalendarDaysIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/history' },
        { id: 'arqueo-transfers', label: 'Medios de Pago', icon: <ArrowDownTrayIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/transfers' },
        { id: 'arqueo-tips', label: 'Propinas', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin', 'cajero'], path: '/arqueo/tips' },
      ]
    },
    {
      id: 'budget',
      label: 'Egresos',
      icon: <CreditCardIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/budget',
      children: [
        { id: 'budget-execution', label: 'Pagos semanal', icon: <BanknotesIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/execution' },
        { id: 'budget-calendar', label: 'Calendario de gastos', icon: <CalendarIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/calendar' },
        { id: 'budget-recurrent', label: 'Gastos recurrentes', icon: <ArrowPathIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/recurrent' },
        { id: 'budget-list', label: 'BD de gastos', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/list' },
        { id: 'budget-purchases', label: 'Compras', icon: <TagIcon className="h-4 w-4" />, roles: ['admin'], path: '/budget/purchases' },
      ]
    },
    {
      id: 'projections',
      label: 'Proyección de ventas',
      icon: <ChartBarIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/projections',
      children: [
        { id: 'projections-calendar', label: 'Calendario de Metas', icon: <CalendarIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/calendar' },
        { id: 'projections-table', label: 'Base de Datos', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/table' },
        { id: 'projections-statistics', label: 'Análisis PE (Semanal)', icon: <PresentationChartLineIcon className="h-4 w-4" />, roles: ['admin'], path: '/projections/statistics' },
      ]
    },
    {
      id: 'income-statement',
      label: 'Estado de Resultados',
      icon: <PresentationChartLineIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/income-statement',
      children: [
        { id: 'income-dashboard', label: 'BI PYG', icon: <ChartBarIcon className="h-4 w-4" />, roles: ['admin'], path: '/income-statement' },
        { id: 'income-table', label: 'BD Estado de resultados', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/income-statement/table' },
      ]
    },
    {
      id: 'accounting',
      label: 'Contabilidad',
      icon: <TableCellsIcon className="h-5 w-5" />,
      roles: ['admin'],
      path: '/accounting',
      children: [
        { id: 'accounting-consolidated', label: 'Consloidado PYG', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/accounting/consolidated' },
        { id: 'accounting-cta-natalia', label: 'Cta Natalia', icon: <WalletIcon className="h-4 w-4" />, roles: ['admin'], path: '/accounting/cta-natalia' },
        { id: 'accounting-asientos-contables', label: 'Asientos Contables', icon: <TableCellsIcon className="h-4 w-4" />, roles: ['admin'], path: '/accounting/asientos-contables' },
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

  const isActive = (path: string, end = false) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* --- Desktop Sidebar --- */}
      <aside className={`hidden md:flex ${isCollapsed ? 'w-16' : 'w-[220px]'} min-h-screen bg-[#2e323b] border-r border-[#18191e] flex-col transition-all duration-300 relative z-40 shadow-xl sticky top-0 h-screen font-sans`}>

        {/* --- Header / Logo --- */}
        <div className={`h-14 flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} bg-[#18191e]`}>
          <div className="flex items-center gap-2">
            {!isCollapsed && (
              <div className="hidden lg:block">
                <h1 className="text-xl font-medium tracking-tight text-white leading-none ml-1">Data BI</h1>
              </div>
            )}
          </div>
        </div>

        {/* --- Toggle (Desktop Only) --- */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute -right-3 top-16 bg-[#18191e] border border-[#2e323b] text-slate-400 hover:text-white p-0.5 rounded-full shadow-sm transition-all z-50 items-center justify-center hover:scale-110"
        >
          {isCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
        </button>

        {/* --- Navigation --- */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {!isCollapsed && <p className="px-4 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest hidden lg:block">Navegación</p>}

          {navItems.map(item => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus[item.id] || false;
            const isItemActive = isActive(item.path);

            return (
              <div key={item.id}>
                <button
                  onClick={() => hasChildren ? toggleMenu(item.id) : handleNavigation(item.path, item.id)}
                  className={`flex items-center w-full px-4 py-2.5 transition-colors duration-200 relative group
                    ${(isItemActive && !hasChildren)
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }
                    ${isCollapsed ? 'justify-center px-0' : ''}
                  `}
                  title={isCollapsed ? item.label : ''}
                >
                  <div className={`flex-shrink-0 ${(isItemActive && !hasChildren) ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                    {React.cloneElement(item.icon as any, { className: "h-5 w-5" })}
                  </div>
                  {editingId === item.id ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onBlur={commitRename}
                      onClick={e => e.stopPropagation()}
                      className="ml-3 flex-1 bg-white/10 text-white text-[14px] leading-[17.5px] px-1.5 py-0.5 rounded border border-slate-500 focus:border-purple-400 focus:outline-none font-normal"
                      maxLength={30}
                    />
                  ) : (
                    <span
                      className={`${textClass} ml-3 text-[14px] leading-[17.5px] font-normal flex-1 text-left tracking-normal`}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        startEditing(item.id, getLabel(item.id, item.label));
                      }}
                    >{getLabel(item.id, item.label)}</span>
                  )}
                  {!isCollapsed && hasChildren && (
                    <div className="text-slate-500 group-hover:text-white transition-colors">
                      {isExpanded ? <MinusIcon className="h-3.5 w-3.5" strokeWidth={2.5} /> : <PlusIcon className="h-3.5 w-3.5" strokeWidth={2.5} />}
                    </div>
                  )}
                </button>

                {/* Submenus */}
                {!isCollapsed && hasChildren && isExpanded && (
                  <div className="py-1 space-y-0.5">
                    {item.children?.map(child => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <button
                          key={child.id}
                          onClick={() => editingId === child.id ? undefined : handleNavigation(child.path, child.id)}
                          className={`flex items-center w-full pl-12 pr-4 py-2 transition-colors duration-200 text-[13px] leading-[17.5px]
                            ${isChildActive
                              ? 'text-white font-medium'
                              : 'text-slate-400 hover:text-white font-normal'
                            }
                          `}
                        >
                          <span className={`mr-2.5 block text-[18px] leading-none ${isChildActive ? 'text-white' : 'text-slate-500'}`}>-</span>
                          {editingId === child.id ? (
                            <input
                              ref={editInputRef}
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
                                if (e.key === 'Escape') cancelRename();
                              }}
                              onBlur={commitRename}
                              onClick={e => e.stopPropagation()}
                              className="flex-1 bg-white/10 text-white text-[13px] leading-[17.5px] px-1.5 py-0.5 rounded border border-slate-500 focus:border-purple-400 focus:outline-none font-normal"
                              maxLength={30}
                            />
                          ) : (
                            <span
                              onDoubleClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                                startEditing(child.id, getLabel(child.id, child.label));
                              }}
                            >{getLabel(child.id, child.label)}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {userRole === 'admin' && (
            <div className="pt-6 pb-2">
              {!isCollapsed && <p className="px-4 mb-2 text-[11px] font-semibold text-slate-500 uppercase tracking-widest hidden lg:block">Sistema</p>}

              <button
                onClick={onExport}
                className={`flex items-center w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Exportar base de datos"
              >
                <ArrowUpTrayIcon className="h-5 w-5 text-slate-500 group-hover:text-white" />
                <span className={`${textClass} ml-3 text-[14px] leading-[17.5px] font-normal`}>Exportar DB</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex items-center w-full px-4 py-2 text-slate-400 hover:text-white hover:bg-white/5 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Importar base de datos"
              >
                <ArrowDownTrayIcon className="h-5 w-5 text-slate-500 group-hover:text-white" />
                <span className={`${textClass} ml-3 text-[14px] leading-[17.5px] font-normal`}>Importar DB</span>
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
                className={`flex items-center w-full px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group ${isCollapsed ? 'justify-center px-0' : ''}`}
                title="Resetear Fábrica"
              >
                <TrashIcon className="h-5 w-5 opacity-70" />
                <span className={`${textClass} ml-3 text-[14px] leading-[17.5px] font-normal`}>Reset Fábrica</span>
              </button>
            </div>
          )}
        </nav>

        {/* --- Footer / User --- */}
        <div className="p-4 border-t border-[#18191e] bg-[#18191e] mt-auto">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="h-9 w-9 rounded-full bg-[#2e323b] flex items-center justify-center text-white font-bold border border-slate-600 text-sm">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
            </div>

            {!isCollapsed && (
              <div className="hidden lg:flex flex-col overflow-hidden">
                <p className="text-sm font-medium text-slate-200 truncate max-w-[120px]">{userEmail?.split('@')[0]}</p>
                <button onClick={onLogout} className="text-xs text-slate-500 hover:text-white text-left transition-colors font-normal">Cerrar Sesión</button>
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
                <span className="text-[10px] font-medium leading-none">{getLabel(item.id, item.label)}</span>
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