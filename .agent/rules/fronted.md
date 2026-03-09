---
trigger: always_on
---

- DESIGN_FIRST: Para cambios visuales, aplica el Sistema de Diseño Aliaddo (morados, layout compacto, 3 zonas en header, ley pos. de botones). Solo consulta el skill design-system en dudas puntuales.

## Componentes UI Obligatorios

Al crear o modificar formularios, **siempre** usar los componentes de `src/components/ui/`:

| Elemento | Componente obligatorio | Import |
|----------|----------------------|--------|
| Label + Input | `<FormGroup>` | `from '…/components/ui/FormGroup'` |
| Botones | `<Button>` | `from '…/components/ui/Button'` |
| Inputs de texto | `<Input>` | `from '…/components/ui/Input'` |
| Tarjetas/Contenedores | `<Card>` | `from '…/components/ui/Card'` |
| Modales | `<Modal>` | `from '…/components/ui/Modal'` |
| Iconos | Desde `Icons.tsx` | `from '…/components/ui/Icons'` |
| Tablas de datos | `<SmartDataTable>` | `from '…/components/ui/SmartDataTable'` |
| Badges de estado | `<StatusBadge>` | `from '…/components/ui/StatusBadge'` |
| Inputs de moneda | `<CurrencyInput>` | `from '…/components/ui/CurrencyInput'` |
| Selector de fecha | `<DatePicker>` | `from '…/components/ui/DatePicker'` |
| Loading spinner | `<Spinner>` | `from '…/components/ui/Spinner'` |
| Placeholder carga | `<Skeleton>` | `from '…/components/ui/Skeleton'` |
| Estado vacío | `<EmptyState>` | `from '…/components/ui/EmptyState'` |

### FormGroup — Patrón estándar para campos de formulario

**NUNCA** escribir `<label className="block text-...">` manualmente. Siempre usar `<FormGroup>`:

```tsx
// ✅ CORRECTO
<FormGroup label="Nombre del campo" required description="Texto de ayuda opcional">
    <Input value={val} onChange={handleChange} />
</FormGroup>

// ❌ PROHIBIDO
<div>
    <label className="block text-sm font-medium ...">Nombre</label>
    <input ... />
    <p className="text-xs ...">Texto de ayuda</p>
</div>
```

**Props de FormGroup:**
- `label` — Texto o ReactNode para la etiqueta
- `required` — Muestra asterisco rojo (*)
- `description` — Texto de ayuda debajo del input (solo si no hay error)
- `error` — Mensaje de error con icono y animación
- `className` — Clases adicionales para el contenedor
- `htmlFor` / `id` — Para asociar label-input (auto-generado si no se pasa)

### Imports de Iconos

**NUNCA** importar directamente de `@heroicons/react/24/outline`. Siempre desde el barrel:
```tsx
// ✅ CORRECTO
import { PlusIcon, TrashIcon } from '…/components/ui/Icons';

// ❌ PROHIBIDO
import { PlusIcon } from '@heroicons/react/24/outline';
```

Si un icono no existe en `Icons.tsx`, agregarlo como **re-export** al final del archivo:
```tsx
// En Icons.tsx — agregar al bloque de re-exports
export { NuevoIcono } from '@heroicons/react/24/outline';
```

### Estados UI Globales

**NUNCA** hardcodear spinners, estados vacíos o skeletons. Siempre usar los componentes globales:

```tsx
// ✅ CORRECTO
import { Spinner } from '…/components/ui/Spinner';
import { EmptyState } from '…/components/ui/EmptyState';

if (loading) return <Spinner size="lg" />;
if (!data.length) return <EmptyState icon={...} title="Sin datos" description="..." />;

// ❌ PROHIBIDO
if (loading) return <div className="animate-spin ...">...</div>;
if (!data.length) return <p className="text-gray-400">No hay datos</p>;
```

---

## Modal y DatePicker — Portal automático

El `<DatePicker>` renderiza su calendario en un **React Portal** (`document.body`), lo que significa que **escapa automáticamente** de cualquier `overflow-hidden` de contenedores padres, incluyendo modales.

### ✅ No se requiere ninguna configuración especial

El componente ya maneja internamente el portal y el seguimiento de posición.

### ⚠️ Prevención de saltos visuales en Portals

Al trabajar con elementos que se posicionan dinámicamente mediante Portals (como el calendario o dropdowns), se deben seguir estas reglas para evitar que el componente "salte" desde la esquina superior izquierda (0,0) la primera vez:

1.  **Renderizado Condicional Estricto**: El Portal **NUNCA** debe montarse en el DOM hasta que la posición inicial haya sido calculada.
    ```tsx
    // ✅ CORRECTO
    const popoverContent = (isOpen && popoverPos.ready) 
        ? ReactDOM.createPortal(<div style={{ top, left }}>...</div>, document.body) 
        : null;
    ```
2.  **Transiciones Restringidas**: Si el componente tiene animaciones (como `fade-in`), asegúrate de que el CSS de transición **SOLO** afecte a la opacidad y no a las coordenadas de posición.
    ```tsx
    // ✅ CORRECTO
    <div style={{ top, left, transitionProperty: 'opacity' }}>...</div>
    ```

### ❌ Anti-patrones — NO hacer esto

```tsx
// ❌ PROHIBIDO — Montar el portal antes de tener posición (causa salto desde 0,0)
const popoverContent = isOpen ? ReactDOM.createPortal(...) : null;

// ❌ PROHIBIDO — Dejar que las transiciones afecten al top/left (causa lag visual al mover)
<div className="transition-all" style={{ top, left }}>...</div>

// ❌ PROHIBIDO — NO agregar overflow-visible al Modal para el DatePicker (innecesario y rompe bordes)
<Modal className="overflow-visible" ...>
    <DatePicker ... />
</Modal>
```

### Nota técnica

El `<Modal>` mantiene `overflow-hidden` en su `Dialog.Panel` por diseño — esto garantiza que los bordes redondeados (`rounded-xl`) siempre se vean correctamente. El `<DatePicker>` no se ve afectado porque su calendario se renderiza fuera del árbol DOM del modal.

---

## Button — Variantes CVA

El componente `<Button>` usa `class-variance-authority` (CVA). **NUNCA** crear botones con `<button className="...">` inline.

### Variantes disponibles

| Variant | Uso | Ejemplo |
|---|---|---|
| `primary` | Acciones principales (guardar, crear) | `<Button variant="primary">Guardar</Button>` |
| `secondary` | Acciones secundarias (cancelar, filtrar) | `<Button variant="secondary">Cancelar</Button>` |
| `danger` | Acciones destructivas (eliminar) | `<Button variant="danger">Eliminar</Button>` |
| `ghost` | Acciones terciarias sin fondo | `<Button variant="ghost">Más</Button>` |
| `white` | Botones sobre fondos de color | `<Button variant="white">...</Button>` |
| `icon` | Botones de icono en tablas (ver, editar) | `<Button variant="icon" size="icon-sm">` |
| `icon-danger` | Botones de eliminar en tablas | `<Button variant="icon-danger" size="icon-sm">` |

### Tamaños disponibles

| Size | Altura | Uso |
|---|---|---|
| `xs` | h-7 | Botones compactos (filtros, tags) |
| `sm` | h-8 | Botones pequeños |
| `md` | h-10 | **Default** — botones estándar |
| `lg` | h-11 | Botones grandes (CTA) |
| `icon-sm` | h-6 w-6 | Icon buttons en tablas |
| `icon-md` | h-8 w-8 | Icon buttons medianos |
| `icon-lg` | h-10 w-10 | Icon buttons grandes |

### Anti-patrones de Button

```tsx
// ❌ PROHIBIDO — botón inline con estilos hardcoded
<button className="bg-purple-600 hover:bg-purple-700 text-white rounded-md ...">
    Guardar
</button>

// ❌ PROHIBIDO — sobreescribir tamaño con !important
<Button className="!h-10 !px-8">Guardar</Button>

// ✅ CORRECTO — usar variant y size
<Button variant="primary" size="md">Guardar</Button>

// ✅ CORRECTO — icon button en tabla
<Button variant="icon" size="icon-sm" onClick={handleEdit} title="Editar">
    <PencilIcon className="h-4 w-4" />
</Button>
```

### Composición externa con `buttonVariants`

Para elementos que no son `<button>` pero deben verse como uno:
```tsx
import { buttonVariants } from '…/components/ui/Button';
<Link className={buttonVariants({ variant: 'primary', size: 'sm' })}>Ir</Link>
```

---

## Tokens de Diseño (tailwind.config.cjs)

### Tipografía — Usar tokens, NO valores arbitrarios

| Token | Tamaño | Uso típico |
|---|---|---|
| `text-4xs` | 7px | Footer de matriz financiera |
| `text-3xs` | 8px | Micro-badges, campo calculado |
| `text-2xs` | 9px | Filtros de período, sub-índices |
| `text-xs2` | 10px | KPI labels, badges, tracking labels |
| `text-xs` | 12px | Texto pequeño general (nativo Tailwind) |
| `text-sm-` | 13px | Botones, tabs, inputs |
| `text-sm` | 14px | Texto body (nativo Tailwind) |

```tsx
// ❌ PROHIBIDO
<span className="text-[10px] ...">Label</span>

// ✅ CORRECTO
<span className="text-xs2 ...">Label</span>
```

### Letter-spacing — Tokens de tracking

| Token | Valor | Uso |
|---|---|---|
| `tracking-micro` | 0.1em | KPI labels |
| `tracking-caps` | 0.15em | Section headers |
| `tracking-spread` | 0.2em | Footer labels, badges |
| `tracking-ultra` | 0.3em | Loading text, titulares |
| `tracking-wider` | — | Nativo Tailwind — uso general |
| `tracking-widest` | — | Nativo Tailwind — uppercase labels |

```tsx
// ❌ PROHIBIDO
<span className="tracking-[0.2em] ...">LABEL</span>

// ✅ CORRECTO
<span className="tracking-spread ...">LABEL</span>
```

### Border-radius custom

| Token | Valor | Uso |
|---|---|---|
| `rounded-xl2` | 1.2rem | Botones premium |
| `rounded-2xl2` | 1.5rem | Cards de config |
| `rounded-3xl2` | 2.5rem | Empty state containers |

### Valores arbitrarios ACEPTADOS

Los siguientes valores arbitrarios son **legítimos** y NO deben sustituirse:
- `h-[300px]`, `h-[280px]` — Alturas de gráficas Recharts
- `max-w-[250px]`, `max-w-[180px]` — Truncamiento en tablas
- `max-h-[90vh]`, `max-h-[280px]` — Scroll containers de modales
- `w-[200px]`, `w-[260px]` — Dropdowns, date pickers
- `min-w-[120px]`, `w-[140px]` — Anchos de columnas de tabla

---

## Dependencias de Iconos

- ✅ `@heroicons/react` — Única librería de iconos permitida
- ❌ `lucide-react` — **ELIMINADA.** No reinstalar.
- Todos los iconos se importan desde `src/components/ui/Icons.tsx`

