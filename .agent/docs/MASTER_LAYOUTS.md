# 🏗️ Master Layouts (Estructuras de Página)

Para mantener la consistencia en toda la aplicación, usamos estos 3 patrones estructurales. Esto evita que cada página tenga márgenes y comportamientos diferentes.

## 1. Patrón: Página de Tabla (Data Grid)
Ideal para bases de datos, historiales y listados extensos.

### Estructura
1.  **PageHeader:** Título, navegación Breadcrumb y botón de acción principal (ej. "Nuevo").
2.  **Contenedor Principal:** Un único `div` con `bg-white` y `rounded-xl`.
3.  **SmartDataTable:** Ocupa todo el ancho. **IMPORTANTE:** El contenedor padre NO debe tener padding.

### Código de Referencia
```tsx
return (
  <div className="space-y-6">
    <PageHeader 
      title="Título de la Página"
      actions={<Button variant="primary">Acción</Button>}
    />
    
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <SmartDataTable 
         data={data}
         columns={columns}
         containerClassName="border-none shadow-none"
      />
    </div>
  </div>
);
```

## 2. Patrón: Dashboard (Tablero de Control)
Ideal para vistas analíticas con KPIs y gráficos.

### Estructura
1.  **PageHeader:** Incluye el selector de fecha (Month Picker) en el área de `actions`.
2.  **KPI Row:** Grid de 4 columnas (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`) con tarjetas de métricas.
3.  **Gráficos:** Split 8:4 o 6:6 en desktop.

### Código de Referencia
```tsx
return (
  <div className="space-y-6">
    <PageHeader title="BI Dashboard" actions={<MonthPicker />} />
    
    {/* KPIs */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total" value={100} icon={Icon} />
      {/* ... */}
    </div>
    
    {/* Charts */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 bg-white p-6 rounded-xl border">
         <MainChart />
      </div>
      <div className="lg:col-span-4 bg-white p-6 rounded-xl border">
         <SecondaryChart />
      </div>
    </div>
  </div>
);
```

## 3. Patrón: Formulario / Vista de Detalle
Ideal para configuraciones o edición de registros únicos.

### Estructura
1.  **Layout Centrado:** `max-w-4xl mx-auto`.
2.  **Secciones:** Separadas por encabezados sutiles o divisores.
3.  **Inputs:** Agrupados en grid de 2 o 3 columnas.

---

## 🚫 Prácticas Prohibidas
*   **NO** uses `p-6` o `p-10` en el elemento raíz de tu página. El margen global lo da el `MainLayout`.
*   **NO** definas colores hexadecimales como `#ffffff` o `#000000` en el JSX. Usa `bg-white` o `bg-slate-900`.
*   **NO** crees barras de navegación personalizadas dentro de las páginas. Usa el prop `actions` del `PageHeader`.
