import React, { useState, useEffect } from 'react';
import { getUsersForDisplay, createUser, updateUser, deleteUser, changePassword, LocalUser, UserRole } from '../../services/auth';
import { PlusCircleIcon, TrashIcon, PencilIcon, KeyIcon, ExclamationTriangleIcon, CheckCircleIcon, UserIcon } from '../../components/ui/Icons';
import AlertModal from '../../components/ui/AlertModal';
import { SmartDataTable } from '../../components/ui/SmartDataTable';

const UsersManagementView: React.FC = () => {
    const [users, setUsers] = useState<Array<Omit<LocalUser, 'password'>>>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        role: 'cajero' as UserRole,
        password: '',
    });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal State
    const [alertConfig, setAlertConfig] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        showCancel?: boolean;
    }>({ isOpen: false, message: '' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => {
        const loadedUsers = getUsersForDisplay();
        setUsers(loadedUsers);
    };

    const handleCreateUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.username || !formData.displayName || !formData.password) {
            setError('Todos los campos son obligatorios');
            return;
        }

        if (formData.password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const result = createUser({
            username: formData.username,
            displayName: formData.displayName,
            role: formData.role,
            password: formData.password,
        });

        if (result.success) {
            setSuccess('Usuario creado exitosamente');
            setFormData({ username: '', displayName: '', role: 'cajero', password: '' });
            setShowCreateModal(false);
            loadUsers();
        } else {
            setError(result.error || 'Error al crear usuario');
        }
    };

    const handleEditUser = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!selectedUser || !formData.displayName) {
            setError('El nombre para mostrar es obligatorio');
            return;
        }

        const result = updateUser(selectedUser, {
            displayName: formData.displayName,
            role: formData.role,
        });

        if (result.success) {
            setSuccess('Usuario actualizado exitosamente');
            setShowEditModal(false);
            setSelectedUser(null);
            loadUsers();
        } else {
            setError(result.error || 'Error al actualizar usuario');
        }
    };

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!selectedUser) return;

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        const result = changePassword(selectedUser, newPassword);

        if (result.success) {
            setSuccess('Contraseña cambiada exitosamente');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordModal(false);
            setSelectedUser(null);
        } else {
            setError(result.error || 'Error al cambiar contraseña');
        }
    };

    const handleDeleteUser = (username: string) => {
        setAlertConfig({
            isOpen: true,
            type: 'warning',
            title: 'Eliminar Usuario',
            message: `¿Estás seguro de eliminar al usuario "${username}"?`,
            confirmText: 'Sí, Eliminar',
            cancelText: 'Cancelar',
            showCancel: true,
            onConfirm: () => {
                const result = deleteUser(username);
                if (result.success) {
                    setSuccess('Usuario eliminado exitosamente');
                    loadUsers();
                } else {
                    setError(result.error || 'Error al eliminar usuario');
                }
                setAlertConfig(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const openEditModal = (user: Omit<LocalUser, 'password'>) => {
        setSelectedUser(user.username);
        setFormData({
            username: user.username,
            displayName: user.displayName,
            role: user.role,
            password: '',
        });
        setShowEditModal(true);
    };

    const openPasswordModal = (username: string) => {
        setSelectedUser(username);
        setNewPassword('');
        setConfirmPassword('');
        setShowPasswordModal(true);
    };

    return (
        <div className="max-w-6xl mx-auto">
            <header className="mb-6">
                <h2 className="text-3xl font-bold text-dark-text dark:text-white">Gestión de Usuarios</h2>
                <p className="text-medium-text dark:text-gray-400 mt-2">Administra usuarios, roles y contraseñas</p>
            </header>

            {/* Mensajes de error/éxito */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                    <div className="flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-4 w-4" />
                        {error}
                    </div>
                </div>
            )}
            {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded text-green-700 dark:text-green-400 text-sm">
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4" />
                        {success}
                    </div>
                </div>
            )}

            {/* Botón crear usuario */}
            <div className="mb-6">
                <button
                    onClick={() => {
                        setFormData({ username: '', displayName: '', role: 'cajero', password: '' });
                        setShowCreateModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <PlusCircleIcon className="h-5 w-5" />
                    Crear Nuevo Usuario
                </button>
            </div>

            {/* Tabla de usuarios */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <SmartDataTable
                    data={users.map(u => ({ ...u, id: u.username }))}
                    columns={[
                        { key: 'username', label: 'Usuario', width: 'w-1/4', sortable: true, filterable: true },
                        { key: 'displayName', label: 'Nombre', width: 'w-1/4', sortable: true, filterable: true },
                        {
                            key: 'role',
                            label: 'Rol',
                            width: 'w-1/6',
                            sortable: true,
                            filterable: true,
                            render: (value: any) => (
                                <span className={`px-2 py-1 rounded text-xs font-medium inline-flex items-center gap-1 ${value === 'admin'
                                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    }`}>
                                    {value === 'admin' ? <KeyIcon className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                                    {value === 'admin' ? 'Admin' : 'Cajero'}
                                </span>
                            )
                        },
                        {
                            key: 'createdAt',
                            label: 'Creado',
                            width: 'w-1/6',
                            sortable: true,
                            render: (value: any) => value ? new Date(value as number).toLocaleDateString() : '-'
                        },
                        {
                            key: 'actions' as any,
                            label: 'Acciones',
                            width: 'w-1/6',
                            align: 'text-right',
                            render: (_: any, user: any) => (
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                        title="Editar usuario"
                                    >
                                        <PencilIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => openPasswordModal(user.username)}
                                        className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                        title="Cambiar contraseña"
                                    >
                                        <KeyIcon className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteUser(user.username)}
                                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                        title="Eliminar usuario"
                                    >
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        }
                    ]}
                    enableSelection={false}
                    enableExport={true}
                    searchPlaceholder="Buscar usuarios..."
                />
            </div>

            {/* Modal Crear Usuario */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-dark-text dark:text-white mb-4">Crear Nuevo Usuario</h3>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    placeholder="usuario123"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre para mostrar</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    placeholder="Juan Pérez"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                >
                                    <option value="cajero">Cajero</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña</label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Crear Usuario
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Editar Usuario */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-dark-text dark:text-white mb-4">Editar Usuario</h3>
                        <form onSubmit={handleEditUser} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-gray-100 dark:bg-slate-900 text-gray-600 dark:text-gray-400"
                                    disabled
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El nombre de usuario no se puede modificar</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre para mostrar</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                >
                                    <option value="cajero">Cajero</option>
                                    <option value="admin">Administrador</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Guardar Cambios
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Cambiar Contraseña */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-dark-text dark:text-white mb-4">Cambiar Contraseña</h3>
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg focus:ring-2 focus:ring-primary/50 focus:outline-none"
                                    placeholder="Repetir contraseña"
                                    required
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
                                >
                                    Cambiar Contraseña
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <AlertModal
                isOpen={alertConfig.isOpen}
                onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                onConfirm={alertConfig.onConfirm}
                confirmText={alertConfig.confirmText}
                cancelText={alertConfig.cancelText}
                showCancel={alertConfig.showCancel}
            />
        </div>
    );
};

export default UsersManagementView;
