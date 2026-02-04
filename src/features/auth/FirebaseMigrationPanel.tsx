import React, { useState } from 'react';
import { DataService } from '../../services/storage';

interface FirebaseMigrationPanelProps {
    onClose: () => void;
}

const FirebaseMigrationPanel: React.FC<FirebaseMigrationPanelProps> = ({ onClose }) => {
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleMigration = async () => {
        setIsMigrating(true);
        setMigrationStatus('idle');

        try {
            const success = await DataService.migrateToFirebase();
            if (success) {
                setMigrationStatus('success');
                setTimeout(() => {
                    window.location.reload(); // Recargar la página para cargar desde Firebase
                }, 2000);
            } else {
                setMigrationStatus('error');
            }
        } catch (error) {
            console.error('Error durante la migración:', error);
            setMigrationStatus('error');
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border dark:border-slate-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Migración a Firebase</h2>

                <div className="mb-6">
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Esta herramienta migrará todos tus datos de LocalStorage a Firebase.
                    </p>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                    <strong>Importante:</strong> Asegúrate de haber configurado las reglas de Firestore antes de migrar.
                                </p>
                            </div>
                        </div>
                    </div>

                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-2">
                        <li>Se copiarán todas las transacciones</li>
                        <li>Se copiarán todas las categorías</li>
                        <li>Se copiarán todos los gastos recurrentes</li>
                        <li>Se copiarán todos los overrides y días registrados</li>
                        <li>Los datos locales no se eliminarán (por seguridad)</li>
                    </ul>
                </div>

                {migrationStatus === 'success' && (
                    <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <p className="text-green-700 dark:text-green-400 flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            ¡Migración completada! Recargando...
                        </p>
                    </div>
                )}

                {migrationStatus === 'error' && (
                    <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <p className="text-red-700 dark:text-red-400 flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            Error durante la migración. Revisa la consola.
                        </p>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={handleMigration}
                        disabled={isMigrating || migrationStatus === 'success'}
                        className={`flex-1 py-2 px-4 rounded font-medium transition-colors ${isMigrating || migrationStatus === 'success'
                            ? 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isMigrating ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Migrando...
                            </span>
                        ) : (
                            'Iniciar Migración'
                        )}
                    </button>

                    <button
                        onClick={onClose}
                        disabled={isMigrating}
                        className="flex-1 py-2 px-4 rounded font-medium bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirebaseMigrationPanel;
