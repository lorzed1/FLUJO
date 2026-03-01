import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';
import { Column } from '../../../components/ui/SmartDataTable';
import { purchaseService } from '../../../services/budget/purchases';
import { Purchase } from '../../../types/budget';
import { PurchaseFormModal } from '../components/PurchaseFormModal';
import { SmartDataPage } from '../../../components/layout/SmartDataPage';
import { useUI } from '../../../context/UIContext';

export const BudgetPurchases: React.FC = () => {
    const { setAlertModal } = useUI();
    // --- MAIN VIEW STATE ---
    const [isImporting, setIsImporting] = useState(false);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // --- WIZARD STATES ---
    const existingIds = useMemo(() => new Set(purchases.map(p => p.id)), [purchases]);

    // --- LOAD MAIN DATA ---
    const loadData = useCallback(async () => {
        if (isImporting) return;
        setLoading(true);
        try {
            // Traer un rango amplio de datos
            const start = '2020-01-01';
            const end = '2030-12-31';
            const data = await purchaseService.getPurchases(start, end);

            // Ya que limpiamos la base de datos, mostramos todo directamente
            setPurchases(data);
        } catch (error) {
            console.error("Error loading purchases:", error);
        } finally {
            setLoading(false);
        }
    }, [isImporting]);

    const handleAddPurchase = async (data: any) => {
        try {
            await purchaseService.savePurchase(data);
            await loadData();
        } catch (error) {
            console.error(error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Hubo un error al guardar la compra.' });
        }
    };

    useEffect(() => {
        loadData();
    }, [loadData]);


    // --- WIZARD ID GENERATION ---
    const generateId = (row: Record<string, any>) => {
        const extractVal = (names: string[]) => {
            for (const [key, value] of Object.entries(row)) {
                const nk = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f\s_]/g, "");
                if (names.some(n => nk.includes(n)) && value) return String(value).trim().toLowerCase();
            }
            return '0';
        };

        const coreFecha = extractVal(['fecha', 'date']);
        const coreDoc = extractVal(['documento', 'factura', 'invoice']);
        const coreProv = extractVal(['identificacion', 'nit', 'cedula', 'proveedor', 'contacto']);
        const coreCuenta = extractVal(['cuenta', 'rubro']);
        const coreMonto = extractVal(['base', 'debito', 'credito', 'total', 'valor', 'monto']);

        const keyString = `${coreFecha}-${coreDoc}-${coreProv}-${coreCuenta}-${coreMonto}`;

        let hash1 = 5381;
        let hash2 = 52711;
        for (let i = 0; i < keyString.length; i++) {
            const char = keyString.charCodeAt(i);
            hash1 = ((hash1 << 5) + hash1) ^ char;
            hash2 = ((hash2 << 5) + hash2) ^ char;
        }

        const h1 = Math.abs(hash1).toString(16).padStart(8, '0');
        const h2 = Math.abs(hash2).toString(16).padStart(4, '0');
        const h3 = "4" + Math.abs(hash1 ^ hash2).toString(16).padStart(3, '0');
        const h4 = "a" + Math.abs(hash2).toString(16).padStart(3, '0');
        const h5 = Math.abs(hash1 * hash2).toString(16).padStart(12, '0');

        return `${h1}-${h2}-${h3}-${h4}-${h5}`.substring(0, 36);
    };

    // --- WIZARD IMPORT HANDLING ---
    const handleFinalizeImport = async (rowsToImport: any[]) => {
        try {
            // Mapeamos los datos de la tabla dinámica a la interfaz Purchase esperada por el servicio
            const purchasesToImport = rowsToImport.map(row => {
                const getField = (possibleNames: string[]) => {
                    for (const key of Object.keys(row)) {
                        if (possibleNames.some(name => key.toLowerCase().includes(name))) return row[key];
                    }
                    return null;
                };

                const date = getField(['date', 'fecha', 'dia']) || new Date().toISOString().split('T')[0];
                const provider = getField(['provider', 'proveedor', 'tercero']) || 'Proveedor Desconocido';
                const description = getField(['description', 'descripción', 'detalle', 'concepto']) || 'Importación Múltiple';
                const amount = Number(getField(['amount', 'monto', 'total', 'valor', 'precio'])) || 0;
                const category = getField(['category', 'categoria', 'categoría', 'rubro']) || 'General';
                const invoiceNumber = getField(['invoice', 'factura', 'numero', 'ref']) || '';
                const statusStr = getField(['status', 'estado', 'pagado']);

                let isPaid = false;
                if (typeof statusStr === 'boolean') isPaid = statusStr;
                else if (typeof statusStr === 'string') isPaid = statusStr.toLowerCase().includes('pagado') || statusStr.toLowerCase() === 'sí';

                return {
                    id: row.id,
                    date,
                    provider,
                    description,
                    amount,
                    category,
                    invoiceNumber,
                    status: isPaid ? 'paid' : 'pending',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ...row,
                } as any;
            });

            await purchaseService.batchImport(purchasesToImport);

            setAlertModal({ isOpen: true, type: 'success', title: '¡Éxito!', message: 'Se han importado / actualizado los registros correctamente.' });
            setIsImporting(false);
            loadData();
        } catch (error: any) {
            console.error("Error al importar: ", error);
            setAlertModal({ isOpen: true, type: 'error', title: 'Error de Importación', message: `Error durante la importación: ${error.message || 'Desconocido'}` });
        }
    };


    // --- BULK DELETE ---
    const handleBulkDelete = async (selectedIds: Set<string>) => {
        setAlertModal({
            isOpen: true,
            type: 'warning',
            title: 'Confirmar Eliminación Masiva',
            message: `¿Estás seguro de que deseas eliminar ${selectedIds.size} compras? Esta acción no se puede deshacer.`,
            showCancel: true,
            confirmText: 'Eliminar',
            onConfirm: async () => {
                setAlertModal({ isOpen: false, message: '' });
                setLoading(true);
                try {
                    const idsArray = Array.from(selectedIds);
                    for (const id of idsArray) {
                        await purchaseService.deletePurchase(id);
                    }
                    await loadData();
                    setAlertModal({ isOpen: true, type: 'success', title: 'Éxito', message: 'Registros eliminados exitosamente.' });
                } catch (error) {
                    console.error("Error al eliminar registros:", error);
                    setAlertModal({ isOpen: true, type: 'error', title: 'Error', message: 'Ocurrió un error al intentar eliminar algunos registros.' });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    // --- MAIN LIST COLUMNS ---
    const mainColumns: Column<Purchase>[] = useMemo(() => [
        {
            key: 'cuenta',
            label: 'Cuenta',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span>{item.cuenta || item.metadata?.cuenta || '-'}</span>
        },
        {
            key: 'nombre_cuenta',
            label: 'Nombre de Cuenta',
            sortable: true,
            filterable: true,
            className: 'min-w-[150px]',
            render: (value: any, item: any) => <span>{item.nombre_cuenta || item.metadata?.['nombre_cuenta'] || item.metadata?.['nombre de cuenta'] || '-'}</span>
        },
        {
            key: 'contacto',
            label: 'Contacto',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span>{item.contacto || item.metadata?.contacto || '-'}</span>
        },
        {
            key: 'identificacion',
            label: 'Identificación',
            sortable: true,
            render: (value: any, item: any) => <span className="font-mono">{item.identificacion || item.metadata?.identificacion || item.metadata?.identificación || '-'}</span>
        },
        {
            key: 'centro_costo',
            label: 'Centro de Costo',
            sortable: true,
            filterable: true,
            render: (value: any, item: any) => <span>{item.centro_costo || item.metadata?.['centro_costo'] || item.metadata?.['centro de costo'] || '-'}</span>
        },
        {
            key: 'documento',
            label: 'Documento',
            sortable: true,
            render: (value: any, item: any) => <span>{item.documento || item.metadata?.documento || '-'}</span>
        },
        {
            key: 'fecha',
            label: 'Fecha',
            type: 'date',
            render: (value: any, item: any) => {
                const raw = item.fecha || item.date || item.metadata?.fecha || '-';
                if (raw === '-') return <span>-</span>;
                try {
                    const parts = String(raw).split('T')[0].split('-');
                    if (parts.length === 3) return <span>{parts[2]}/{parts[1]}/{parts[0]}</span>;
                } catch (e) { }
                return <span>{raw}</span>;
            }
        },
        {
            key: 'descripcion',
            label: 'Descripción',
            className: 'max-w-xs truncate',
            render: (value: any, item: any) => <span title={item.descripcion || item.description || item.metadata?.descripcion || item.metadata?.descripción}>{item.descripcion || item.description || item.metadata?.descripcion || item.metadata?.descripción || '-'}</span>
        },
        {
            key: 'descripcion_movimiento',
            label: 'Descripción del movimiento',
            className: 'max-w-[200px] truncate',
            render: (value: any, item: any) => <span title={item.descripcion_movimiento || item.metadata?.['descripcion_movimiento'] || item.metadata?.['descripción del movimiento']}>{item.descripcion_movimiento || item.metadata?.['descripcion_movimiento'] || item.metadata?.['descripción del movimiento'] || '-'}</span>
        },
        {
            key: 'base',
            label: 'Base',
            type: 'currency',
            sortable: true
        },
        {
            key: 'saldo_inicial',
            label: 'Saldo Inicial',
            type: 'currency',
            sortable: true
        },
        {
            key: 'debito',
            label: 'Debito',
            type: 'currency',
            sortable: true
        },
        {
            key: 'credito',
            label: 'Credito',
            type: 'currency',
            sortable: true,
            className: 'text-rose-600 dark:text-rose-400 font-bold'
        },
        {
            key: 'saldo_final',
            label: 'Saldo Final',
            type: 'currency',
            sortable: true
        }
    ], []);

    // --- RENDER ---
    return (
        <SmartDataPage<Purchase>
            title="Compras"
            icon={<ShoppingBagIcon className="h-6 w-6 text-purple-600" />}
            breadcrumbs={[
                { label: 'Egresos', href: '/budget' },
                { label: 'Compras' }
            ]}
            supabaseTableName="purchases"
            fetchData={async () => {
                const start = '2020-01-01';
                const end = '2030-12-31';
                return await purchaseService.getPurchases(start, end);
            }}
            columns={mainColumns}
            enableAdd={true}
            onAdd={() => setIsFormOpen(true)}
            searchPlaceholder="Buscar por cuenta, contacto o documento..."
            infoDefinitions={[
                {
                    label: 'Cuenta y Nombre',
                    description: 'Identificador contable y nombre legal de la cuenta donde se registra el egreso.',
                    origin: 'Plan Único de Cuentas (PUC)'
                },
                {
                    label: 'Contacto e Identificación',
                    description: 'Nombre del proveedor o tercero y su respectivo NIT/Cédula.',
                    origin: 'Base de Datos de Proveedores'
                },
                {
                    label: 'Centro de Costo',
                    description: 'Unidad de negocio o área operativa a la que se le atribuye el gasto para análisis de rentabilidad.',
                    origin: 'Estructura Organizacional'
                },
                {
                    label: 'Documento / Fecha',
                    description: 'Número de factura o documento equivalente y la fecha en que se realizó la transacción.',
                    origin: 'Comprobante de Egreso'
                },
                {
                    label: 'Base',
                    description: 'Monto antes de impuestos y retenciones sobre el cual se calcula el gasto.',
                    origin: 'Factura de Compra'
                },
                {
                    label: 'Débito / Crédito',
                    description: 'Movimientos contables de la partida doble. El crédito suele representar la obligación de pago.',
                    calculation: 'Dinámica Contable Estándar'
                },
                {
                    label: 'Saldo Final',
                    description: 'Resultado neto acumulado de la cuenta tras el movimiento registrado.',
                    calculation: 'Saldo Inicial + Débito - Crédito'
                }
            ]}
            renderForm={(isOpen, onClose, onSubmit, item) => (
                <PurchaseFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    onSubmit={handleAddPurchase}
                />
            )}
        />
    );
};
