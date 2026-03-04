# Brand Book y Sistema de Diseño (Identidad Visual)

Este documento define la Identidad de Marca y UI (User Interface) exclusiva de este proyecto. Todas las herramientas visuales, estilos y jerarquías se rigen estrictamente por estas reglas.

## 1. Diseño Principal y Temática
- **Colores Base (Brand Primary):** Empleamos TONOS MORADOS. Los principales de Tailwind a usar son `bg-purple-600` para fondos sólidos, `hover:bg-purple-700` para interacciones, y `shadow-purple-500/20` para sombras acentuadas.
- **Tipografía:** Se usa el stack `sans-serif` nativo, específicamente `Segoe UI` enfocado en legibilidad máxima para alta densidad de datos.
- **Formas y Redondeos:** Evitamos extremos infantiles (estrictamente PROHIBIDO usar botones redondeados al máximo como píldoras `rounded-xl`). Los botones estándar deben usar `rounded-md` o `rounded-lg` a lo sumo. Los contenedores como tarjetas sí emplean `rounded-xl` o `rounded-lg`.

## 2. Componentes UI Estandarizados (Prohibiciones de Código)
Para mantener un código limpio y acoplado a la marca, existen piezas clave que **deben invocarse como Componentes de React (`import`) y NUNCA recrearse con HTML bruto**:

- **Botones y Acciones:** Está ESTRICTAMENTE PROHIBIDO usar la etiqueta de HTML puro `<button className="bg-purple-600...">`. Todo botón debe ser instanciado importando `<Button variant="primary">`, `<Button variant="secondary">`, etc. desde `src/components/ui/Button`.
- **Ventanas y Superficies:** Prohibido armar tarjetas a mano usando `<div className="bg-white rounded-xl shadow-sm...">`. Todo contenedor de contenido de sección DEBE importar e instanciar el componente `<Card>` desde `src/components/ui/Card`.
- **Formularios:** Prohibido el uso de `<input>`, `<select>` crudos. Utiliza las versiones creadas en la librería de UI (`<Input>`, `<Select>`, `<CurrencyInput>`).
- **Tablas y Vistas de Datos:** Emplear `<SmartDataTable>` o `<SmartDataPage>`. No crear `<table>` puros. Al usar `SmartDataPage`, NO debes inyectar columnas ad-hoc de editar/eliminar, ya que el componente las provee automáticamente.

## 3. Anatomía y Posicionamiento (Layout System)
- Toda pantalla de administración emplea un **PageHeader** con tres (3) únicas zonas:
  - **ZONA A (Acciones de Página):** A la derecha del título (ej: controles segmentados, filtro temporal, botón primario de acción).
  - **ZONA B (Toolbar de Tabla):** Búsqueda, exportación, filtros contextuales estrictamente situados dentro del Toolbar de una tabla.
  - **ZONA C (Paneles, Sidebars o Resúmenes):** Botones suplementarios en un área lateral solo si hay panel.
  - **ZONA D (Footer de Modal):** Botones en el pie de un modal: Confirmar a la derecha, Cancelar a la izquierda (o adyacente pero distinguidos).

No coloques botones flotantes fuera de este posicionamiento. Tampoco agregues un margen interior (`p-6`) global en el componente padre superior, ya que `MainLayout` provee el contenedor de separación externa.
