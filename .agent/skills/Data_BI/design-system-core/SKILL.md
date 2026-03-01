---
name: design-system-core
description: Estandarización obligatoria visual de botones, tablas, notificaciones modales y layouts para todo el proyecto Data_BI.
version: 2.0.0
---

# 🎨 Design System Core

**SIEMPRE** consulta este documento antes de hacer cambios visuales, CSS, crear nuevas pantallas o mostrar un modal interctivo. Ningún componente debe salirse de estas reglas, para asegurar que la aplicación mantenga un estándar corporativo "high-end".

## 📚 Documentación Obligatoria
**DEBES LEER ESTOS ARCHIVOS ANTES DE REALIZAR CAMBIOS VISUALES:**
1. 📄 `.agent/docs/UI_KIT.md` (Paleta de colores, tipografía y componentes).
2. 📄 `.agent/docs/MASTER_LAYOUTS.md` (Estructuras de página y márgenes).

---

## 1. Tipografía, Estructura y Paleta
- **Fuente Principal**: Segoe UI (`font-sans` en Tailwind).
- **Densidad**: Layout compacto. Reduce paddings globales exagerados. Todo debe sentirse denso pero respirable.
- **Marca Principal**: TONOS MORADOS. `bg-purple-600`, `hover:bg-purple-700`, sombras `shadow-purple-500/20`.
- **Botones Secundarios**: Bordes tenues (`border-slate-200 / 700`), hover en gris claro (`hover:bg-slate-50`).
- **Destructive**: `bg-red-50 text-red-600 border border-red-200`.
- **Mobile-First Responsive**: Usa SIEMPRE clases de porcentaje en móvil y media queries de Tailwind (ej. `w-full md:w-1/2`). Nunca asumas pantallas de PC.

---

## 2. Anatomía del Layout y Ley de Posicionamiento

El `PageHeader` externo debe dividirse **estrictamente** en 3 Zonas Horizontales (flex).
Solo existen estas **ÚNICAS zonas** para botones interactivos:
- **ZONA A: PageHeader Actions**: (Derecha del título). Segmented Control (Tabs), Filtro Temporal, Botones Acción. *ÚNICA zona para botones primarios globales.*
- **ZONA B: Toolbar de Tabla**: (Dentro de una tabla). Búsqueda, filtros, exportar, selección. *Contextual a la tabla.*
- **ZONA C: Panel Lateral / Summary Card**. Botones de resumen (ej: "Ejecutar Pagos"). *Solo si hay panel.*
- **ZONA D: Footer de Modal**: Botón Confirmar (der) + Botón Cancelar (izq o der, pero separados visualmente del contenido).

**Reglas Estrictas**: NUNCA coloques botones flotantes sueltos. Todo botón normal debe usar `rounded-md` (~6px). **NUNCA** usar `rounded-xl` en botones (se ven infantiles). Solo usar border-radius grandes en Cards o Modales.

---

## 3. Manejo de Tablas y Vistas de Datos (SmartDataPage)
Cuando crees una "Vista de datos", lista o página de administración conectada a BD (búsqueda, filtros, importación), **siempre usa el componente genérico `<SmartDataPage>`** y `SmartDataTable`.
- **No crees estados complejos en la UI**: `SmartDataPage` maneja Supabase (GET, INSERT, DELETE) internamente. Pásale solo las columnas (`columns`) y el nombre de tabla (`supabaseTableName`).
- **Layout de Tablas Interno**:
  - Scroll horizontal (`overflow-x-auto`) obligatorio en resoluciones pequeñas (mobile).
  - Cebra de filas (Zebra-striping): Filas impares `bg-white`; filas pares `bg-slate-100` (En oscuro: `bg-slate-800`).
  - Columnas Numéricas: Siempre con clase `tabular-nums` y alineadas a la derecha (`align: 'text-right'`).

### ⛔ Reglas Anti-Duplicación (SmartDataPage)
Cuando uses `<SmartDataPage>`, este componente ya provee **automáticamente**:
- ✅ Columna "Acciones" con botones Editar (✏️) y Eliminar (🗑️)
- ✅ Eliminación masiva (`onBulkDelete`)
- ✅ PageHeader con breadcrumbs y botón "+ Nuevo Registro"
- ✅ Importación, Exportación, Búsqueda, Paginación

**PROHIBIDO** en páginas que usen `SmartDataPage`:
- ❌ Definir una columna con `key: 'actions'` (causa doble encabezado "Acciones")
- ❌ Crear botones manuales de Editar/Eliminar (ya los genera el componente)
- ❌ Reimplementar `PageHeader` fuera del componente

**PERMITIDO**: Agregar columnas con acciones **extra** (ej: Duplicar, Pago Rápido) usando un `key` descriptivo diferente como `'duplicate'`, `'quickPay'`, etc.

---

## 4. Sistema de Notificaciones Modales (UIContext)

**PROHIBIDO usar `alert()`, `confirm()` o `prompt()` nativos del navegador.** Son considerados "Legacy Code". Todo feedback debe pasar por el sistema centralizado `UIContext`.

Para disparar un modal estilizado, usa el hook `useUI`:

```tsx
import { useUI } from '@/context/UIContext'; // Asegura la ruta de tu alias

const MiComponente = () => {
    const { setAlertModal } = useUI();

    // 1. Notificación Simple (Toast Informativo / Éxito)
    const showSuccess = () => {
        setAlertModal({ 
            isOpen: true, type: 'success', title: 'Operación Exitosa', 
            message: 'Los datos se han guardado.' 
        });
    };

    // 2. Confirmación Destructiva (Warning) - Reemplaza el confirm()
    const deleteItem = (id) => {
        setAlertModal({
            isOpen: true, type: 'warning', title: 'Confirmar Eliminación', 
            message: '¿Estás seguro de eliminar este elemento? No se puede deshacer.', 
            showCancel: true, confirmText: 'Sí, eliminar',
            onConfirm: async () => {
                // Aquí va la lógica asíncrona de borrado
            }
        });
    };

    return <button onClick={showSuccess}>Test</button>;
}
```
Si usas Actions Masivas desde una tabla (`onBulkDelete`), no uses diálogos nativos. Engancha este mismo modal allí.
