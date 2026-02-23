import React, { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon, PlusIcon } from '../ui/Icons';
import { useAuth } from '../../context/AuthContext';

export const TopBar: React.FC = () => {
    const { userName, handleLogout } = useAuth();
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
        <header className="flex h-10 sm:h-16 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 items-center justify-between px-3 sm:px-6 shrink-0 z-20">
            {/* Left: Search & Context */}
            <div className="flex items-center gap-6 flex-1">
                {/* Global Search */}
                <div className="relative group w-full max-w-xs hidden md:block">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Busca en todas partes..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border-none rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-primary/20 focus:bg-white dark:focus:bg-slate-700 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    />
                </div>

                {/* Company Name */}
                <div className="hidden lg:block border-l border-gray-200 dark:border-slate-700 pl-6">
                    <h2 className="text-xs font-bold text-primary tracking-widest uppercase">
                        UNP GASTRO BAR
                    </h2>
                </div>
            </div>

            {/* Right: Actions & Profile */}
            <div className="flex items-center gap-4">
                <button className="text-gray-400 dark:text-gray-500 hover:text-primary transition-colors text-xs font-semibold hidden sm:block">
                    Sugerir mejoras
                </button>

                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 hidden sm:block"></div>

                {/* Notifications */}
                <button className="relative p-2 text-gray-400 dark:text-gray-500 hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-all">
                    <BellIcon className="h-5 w-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                </button>

                {/* Create Action */}
                <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700">
                    <PlusIcon className="h-4 w-4" />
                    Crear
                </button>

                {/* Profile Widget */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700"
                    >
                        <div className="flex flex-col items-end hidden md:block">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none">
                                {userName?.split(' ')[0] || 'Usuario'}
                            </span>
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-medium uppercase leading-none mt-0.5">
                                Conectado
                            </span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            <UserCircleIcon className="h-5 w-5" />
                        </div>
                    </button>

                    {/* Profile Dropdown */}
                    {showProfileMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 p-1 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                Cerrar Sesión
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
