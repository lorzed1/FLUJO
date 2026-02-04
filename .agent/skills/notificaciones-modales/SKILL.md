---
name: Sistema de Notificaciones Modales
description: Protocolo obligatorio para el manejo de alertas, confirmaciones y mensajes de estado mediante UIContext.
version: 1.0.0
---

# 🔔 Sistema de Notificaciones Modales

## Contexto
Para garantizar una experiencia de usuario "Premium" y consistente, la aplicación **ha deprecado** el uso de notificaciones nativas del navegador. Todo feedback visual debe ser gestionado a través del sistema centralizado de Modales (`UIContext`), el cual renderiza componentes estilizados (`AlertModal`) que se integran fluidamente con el diseño de la interfaz.

## 🛑 Reglas de Oro (Hard Rules)

1.  **PROHIBIDO `alert()` / `confirm()`**: Bajo ninguna circunstancia se debe utilizar `window.alert`, `window.confirm` o `window.prompt`. Su uso se considera "Legacy Code" y debe ser refactorizado inmediatamente.
2.  **Hook `useUI`**: El único mecanismo autorizado para disparar notificaciones es el hook `useUI`.
3.  **Confirmaciones Destructivas**:
    *   Para acciones críticas (eliminar, resetear), el modal debe configurarse con `type: 'warning'` o `'error'`.
    *   Debe habilitarse `showCancel: true`.
    *   El texto de confirmación debe ser explícito (ej: "Sí, eliminar").

## 📋 Instrucciones de Implementación

### 1. Inyección del Contexto
Importa el hook en tu componente:

```tsx
import { useUI } from '../../context/UIContext'; // Ajustar ruta relativa

// ... dentro del componente
const { setAlertModal } = useUI();
```

### 2. Disparar una Notificación Simple (Toast/Alert)
Para mensajes informativos o de éxito que no requieren confirmación compleja:

```tsx
setAlertModal({
    isOpen: true,
    type: 'success', // 'success' | 'error' | 'warning' | 'info'
    title: 'Operación Exitosa',
    message: 'Los datos se han guardado correctamente.'
});
```

### 3. Flujo de Confirmación (Reemplazo de `confirm()`)
Para reemplazar una lógica tipo `if (confirm(...)) { delete() }`:

```tsx
const handleDelete = (id: string) => {
    setAlertModal({
        isOpen: true,
        type: 'warning',
        title: 'Confirmar Eliminación',
        message: '¿Estás seguro de eliminar este elemento? Esta acción no se puede deshacer.',
        showCancel: true,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        onConfirm: async () => {
            try {
                // 1. Ejecutar acción
                await apiService.delete(id);
                
                // 2. Feedback de éxito (Reemplaza el modal actual)
                setAlertModal({ 
                    isOpen: true, 
                    type: 'success', 
                    title: 'Eliminado', 
                    message: 'El registro ha sido eliminado.' 
                });
                
                // 3. Actualizar estado local si es necesario
                // reloadData();
            } catch (error) {
                // Feedback de error
                setAlertModal({ 
                    isOpen: true, 
                    type: 'error', 
                    title: 'Error', 
                    message: 'No se pudo eliminar el registro.' 
                });
            }
        }
    });
};
```

## ⚠️ Manejo de Tablas y Bulk Actions (`SmartDataTable`)

Si estás implementando una acción masiva (`onBulkDelete`) en una tabla:
1.  **NO** uses la confirmación interna de la tabla (si existiera).
2.  Gestiona la confirmación en el padre (tu vista/página).
3.  Gestiona el estado de selección (`selectedIds`) en el padre y límpialo (`new Set()`) **SOLO** cuando la operación asíncrona haya tenido éxito en el `onConfirm`.
