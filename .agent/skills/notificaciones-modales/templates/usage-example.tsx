import React, { useState } from 'react';
import { useUI } from '../../context/UIContext';

// Ejemplo de Componente que implementa el estándar
const UserManagementPanel: React.FC = () => {
    const { setAlertModal } = useUI();
    const [isLoading, setIsLoading] = useState(false);

    // CASO 1: Notificación Simple (Success/Info/Error)
    const handleSave = () => {
        // Simular guardado
        setTimeout(() => {
            setAlertModal({
                isOpen: true,
                type: 'success',
                title: 'Cambios Guardados',
                message: 'La configuración de usuario se ha actualizado correctamente.'
            });
        }, 500);
    };

    // CASO 2: Confirmación de Acción Destructiva
    const handleDeleteUser = (userId: string) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Eliminar Usuario',
            message: `¿Estás seguro que deseas eliminar al usuario ${userId}? Se perderá todo su historial.`,
            showCancel: true,
            confirmText: 'Sí, Eliminar',
            cancelText: 'Cancelar',
            onConfirm: () => executeDelete(userId)
        });
    };

    // Función auxiliar ejecutada al confirmar
    const executeDelete = async (userId: string) => {
        setIsLoading(true);
        // Nota: Si el modal no se cierra automáticamente, muestra loading en UI o cierra modal aquí.
        // En nuestra implementación actual, el modal permanece hasta que llamamos setAlertModal de nuevo.

        try {
            // await api.deleteUser(userId);
            console.log("Eliminando...", userId);

            // Éxito: Reemplazamos el modal de warning con uno de success
            setAlertModal({
                isOpen: true,
                type: 'success',
                title: 'Usuario Eliminado',
                message: 'El usuario ha sido eliminado del sistema.'
            });
        } catch (error) {
            // Error: Mostramos qué pasó
            setAlertModal({
                isOpen: true,
                type: 'error',
                title: 'Error de Servidor',
                message: 'No se pudo eliminar el usuario. Inténtalo de nuevo más tarde.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 space-x-4">
            <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded"
            >
                Guardar Cambios
            </button>

            <button
                onClick={() => handleDeleteUser('user-123')}
                className="bg-red-600 text-white px-4 py-2 rounded"
                disabled={isLoading}
            >
                {isLoading ? 'Procesando...' : 'Eliminar Usuario'}
            </button>
        </div>
    );
};

export default UserManagementPanel;
