import React, { useRef, useState } from 'react';
import { ChartPieIcon, BanknotesIcon, CalendarDaysIcon, PencilIcon, CheckCircleIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowRightOnRectangleIcon, TrashIcon, ChevronLeftIcon, ChevronRightIcon, CreditCardIcon, ClipboardDocumentListIcon } from './ui/Icons';
import { useUI } from '../context/UIContext';

type View = 'dashboard' | 'users' | 'budget' | 'arqueo' | 'projections';

interface SidebarProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onLogout?: () => void;
  userEmail?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, onExport, onImport, onLogout, userEmail }) => {
  const { setAlertModal } = useUI();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImport(e.target.files[0]);
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="h-5 w-5" /> },
    { id: 'arqueo', label: 'Arqueo de Caja', icon: <ClipboardDocumentListIcon className="h-5 w-5" /> },
    { id: 'budget', label: 'Presupuestos', icon: <CreditCardIcon className="h-5 w-5" /> },
    { id: 'projections', label: 'Proyecciones', icon: <CalendarDaysIcon className="h-5 w-5" /> },

    { id: 'users', label: 'Usuarios', icon: <PencilIcon className="h-5 w-5" /> },
  ];

  const textClass = isCollapsed ? 'hidden' : 'hidden md:block';
  const sidebarWidthClass = isCollapsed ? 'w-20' : 'w-64';

  return (
    <aside className={`${sidebarWidthClass} min-h-screen bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800 flex flex-col transition-all duration-300 relative z-40 shadow-sm`}>

      {/* --- Header / Logo --- */}
      <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'px-8'}`}>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-xl text-primary">
            <BanknotesIcon className="h-7 w-7" />
          </div>
          {!isCollapsed && (
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold tracking-tight text-slate-800 dark:text-white leading-none">FlowTrack</h1>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Enterprise</span>
            </div>
          )}
        </div>
      </div>

      {/* --- Toggle (Desktop Only) --- */}
      <button
        onClick={toggleSidebar}
        className="hidden md:flex absolute -right-3 top-9 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-slate-400 hover:text-primary hover:border-primary p-1.5 rounded-full shadow-sm transition-all z-50"
      >
        {isCollapsed ? <ChevronRightIcon className="h-3 w-3" /> : <ChevronLeftIcon className="h-3 w-3" />}
      </button>

      {/* --- Navigation --- */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {!isCollapsed && <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:block">Menú Principal</p>}

        {navItems.map(item => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as View)}
              className={`flex items-center w-full p-3.5 rounded-xl transition-all duration-200 group relative
                ${isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/25 font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white font-medium'
                }
                ${isCollapsed ? 'justify-center' : ''}
              `}
              title={isCollapsed ? item.label : ''}
            >
              <div className={`flex-shrink-0 transition-transform duration-200 ${!isActive && 'group-hover:scale-110'}`}>{item.icon}</div>
              <span className={`${textClass} ml-3 text-sm`}>{item.label}</span>

              {isActive && !isCollapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white/50" />}
            </button>
          );
        })}

        <div className="pt-8 pb-2">
          {!isCollapsed && <p className="px-4 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:block">Sistema</p>}

          <button
            onClick={onExport}
            className={`flex items-center w-full p-3 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
            title="Exportar base de datos"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span className={`${textClass} ml-3 text-sm font-medium`}>Exportar DB</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center w-full p-3 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
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
                    const { FirestoreService } = await import('../services/firestore');
                    await FirestoreService.resetSystemData();
                    window.location.reload();
                  } catch (e) {
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: String(e) });
                  }
                }
              });
            }}
            className={`flex items-center w-full p-3 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600 transition-all group ${isCollapsed ? 'justify-center' : ''}`}
            title="Resetear Fábrica"
          >
            <TrashIcon className="h-5 w-5" />
            <span className={`${textClass} ml-3 text-sm font-medium`}>Reset Fábrica</span>
          </button>
        </div>
      </nav>

      {/* --- Footer / User --- */}
      <div className="p-4 border-t border-gray-100 dark:border-slate-800">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-semibold border border-gray-200 dark:border-slate-700">
            {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
          </div>

          {!isCollapsed && (
            <div className="hidden md:flex flex-col overflow-hidden">
              <p className="text-sm font-semibold text-slate-700 dark:text-white truncate max-w-[120px]">{userEmail?.split('@')[0]}</p>
              <button onClick={onLogout} className="text-xs text-slate-400 hover:text-primary text-left transition-colors font-medium">Cerrar Sesión</button>
            </div>
          )}

          {isCollapsed && (
            <button onClick={onLogout} className="absolute inset-0 w-full h-full opacity-0" title="Cerrar Sesión" />
          )}
        </div>
      </div>

      {/* AlertModal handled globally via UIContext */}
    </aside>
  );
};

export default Sidebar;