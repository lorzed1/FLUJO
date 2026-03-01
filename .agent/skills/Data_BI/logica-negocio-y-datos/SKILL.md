---
name: logica-negocio-y-datos
description: Reglas maestras de negocio, cálculo exacto de KPIs financieros (arqueo), ingeniería de datos, arquitectura de React y algoritmos de limpieza/importación Excel.
version: 2.0.0
---

# 🧮 Lógica de Negocio y Estructura de Datos

Esta habilidad documenta la fuente definitiva de verdad para la arquitectura de código en toda la app de **Data_BI**, cálculos financieros de Aliaddo/Unplugged, integridad de la base de datos (Supabase) e importación segura de archivos.

## 📚 Documentación Obligatoria
**DEBES LEER ESTOS ARCHIVOS ANTES DE MODIFICAR LÓGICA, ESTADO O TABLAS:**
1. 📄 `.agent/docs/CODING_STANDARDS.md` (Estándares de codificación limpios).
2. 📄 `.agent/docs/TECH_SPEC.md` (Especificaciones del stack técnico).
3. 📄 `.agent/docs/DATA_ENGINEERING.md` (Vistas e Ingeniería de datos).
4. 📄 `.agent/docs/SEC_OPS.md` (Seguridad, roles y RLS de Supabase).

---

## 1. Arquitectura Core y Estado React (Reglas Infranqueables)
1. **Separación de Responsabilidades**: Los componentes UI (`.tsx` dentro de `pages/` o `components/`) **NO** deben contener lógica de negocio masiva, formateos pesados, ni llamadas crudas a Supabase APIs. Mueve esa lógica matemática a Custom Hooks (`useAlgo.ts`) o a los módulos en `src/services/` (ej. `dashboardService.ts`).
2. **Cero `any`**: Tipado estricto en TypeScript es obligatorio. Define las interfaces exactas en `src/types/`. Las repuestas asíncronas deben castearse a su tipo correcto.
3. **Manejo de Errores Async**: Siempre envuelve las promesas en bloques `try/catch`. En el `catch`, envía feedback al usuario (con el `AlertModal` de UI). **NUNCA** dejes caer un error sin decirle nada a la UI.

---

## 2. Lógica Financiera y Arqueos (Hard Rules)
- **Venta Bruta (Indicador Maestro de Ventas)**: Este es el indicador estándar que CASI SIEMPRE se debe usar en todos los KPIs y dashboards como métrica principal de ventas reales. Sale directamente de la columna "Venta Bruta" del historial de cierres. Matemáticamente siempre equivale a `SUM(venta_pos) - SUM(ingreso_covers)`. Usa la constante calculada `ventaBruta` en el front-end como verdad absoluta para evitar descuadres. NUNCA calcules el volumen de ventas sumando los métodos de pago (Nequi + Efectivo). (Los Covers son solo informativos del derecho de admisión y por eso mismo se descuentan).
- **Total de Ingresos Esperados**: `Venta POS` (incluye covers o propinas pre-cargadas desde el punto de venta).
- **Total Egresos (Reportado por Cajero)**: Sumatoria de todos los medios de pago físicos y digitales recogidos al final (Efectivo, Datáfonos 1 y 2, Bancolombia, Nequi, etc.).
- **Descuadre de Caja**: `Total Egresos - Total Ingresos Esperados`. Si la cifra es positiva, hubo Sobrante de dinero. Si es negativa, es un Faltante.
- **Formateo Numérico**: Nunca realices un `.toLocaleString()` en mitad del render sin asegurarte de limpiar caracteres `NaN`. Usa funciones consolidadas como `formatMoney()` y `safeSum()`.

---

## 3. Integración Base de Datos (Supabase) y Consultas
1. **Regla de Borrados (Hard Deletes)**: Anteriormente se usaba `deleted_at` para borrado lógico (Soft Deletes), pero fue ELIMINADO del sistema porque generaba reportes con datos fantasma. Todo borrado (`DELETE`) en Supabase debe ser un borrado absoluto y destructivo (Hard Delete). No incluyas filtros `.is('deleted_at', null)` en las consultas, pues la columna ya no se maneja o causará errores prehistóricos.
2. **Fechas ISO Universales**: Al guardar en base de datos, toda fecha se pasa a string `YYYY-MM-DD`. Ordena siempre tus queries por fecha (ascendente o descendente) para garantizar la coherencia de reportes y gráficas.
3. **Migraciones (DDL)**: No inyectes SQL directo en el código para alterar el esquema. Las modificaciones de columnas (`ALTER TABLE`) se realizan únicamente a través de migraciones formales invocando la herramienta MCP `apply_migration`.

---

## 4. Importador Funcional Excel/CSV (Aduanero COP)
Cuando se programe la lectura de informes (.xlsx, .csv) subidos por los cajeros contables:
- **Detección Dinámica de Encabezados (Fuzzy Search)**: No asumas nunca que el row índice `0` tiene el nombre de las columnas (los contadores suelen meter títulos estéticos). Escanea recursivamente las primeras 15 líneas hasta encontrar la fila que contiene las columnas clave ("Fecha", "Valor", "Factura"). Esa es tu fila base. Descarta todo lo que esté encima.
- **Limpieza Moneda Colombiana (COP)**: Una celda leída puede venir como `$ 1.250.300,00`. Si parseas eso crudo fallará. Siempre pasa la cadena por Regex que: elimine el `$`, quite espacios, elimine puntos `.` (separadores de miles en hispanoamérica) antes de convertir a `<Number>`.
- **Limpieza Fechas**: Transforma obligatoriamente cualquier formato (DD/MM/YYYY, o Nro Sereal de Excel) al formato estándar backend `YYYY-MM-DD`.
- **Textos**: Asegura el uso de `.trim()` obligatorio para purgar espacios residuales.
