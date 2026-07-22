# Arquitectura y Reglas de Negocio (El Motor de Datos)

Este documento define la Identidad Tecnológica y el comportamiento subyacente de la lógica de negocio y datos matemáticos de la aplicación.

## 1. Configuración de Stack Core
- **Frontend Framework:** React + Vite + TypeScript.
- **Backend / DBaaS:** Supabase (PostgreSQL).
  - Todos los IDs de tablas en la base de datos **deben** ser UUIDs (ej. uso de `gen_random_uuid()`).
  - La zona horaria local de negocio por defecto es `America/Bogota` (UTC-5).
  - Las fechas se instancian e ingresan transaccionalmente siempre mediante cadenas en formato ISO 8601 (`YYYY-MM-DD`). Evitar la recolección UTC pura si puede generar un "time shift" destructivo sobre reportes de "el día de hoy".

## 2. Paradigma Híbrido de Cálculos (La Ley Cero)
Para garantizar la agilidad en la UI y la capacidad funcional de las analíticas operativas:
- **Matemática del Frontend (Transaccional):** Todo cálculo del "Día a Día" ocurre en el cliente y DEBE estar centralizado matemáticamente en funciones puras y estáticas dentro de `src/utils/` (nunca inyectado en un `useEffect` crudo o dentro de un renderizado). Ejemplos: Descuadres de caja (`arqueoCalculations`), cálculo unitario de propinas (`tipCalculations`), o el cruce simple de fechas adeudadas.
- **Matemática del Backend (Analítica):** Las agregaciones masivas ("Dashboard mensual", "Total vendido en el mes por métodos de pago", "Métricas del trimestre") ocurren delegadas al API de Supabase haciendo uso estricto de **Vistas Materializadas** (`Materialized Views`), **Vistas SQL** (`Views`) o `RPC` Functions. Está categóricamente prohibido invocar un `.select('*')` de la tabla `transactions` de seis meses de amplitud para luego iterarlo haciendo `reduce()` en un Hook de React para conseguir los "totales".

## 3. Integridad de Datos (Reglas Hard Deletes)
La metodología base de la aplicación respecto a manipulación de datos sensibles no tolera datos fantasma.
- **Borrado Absoluto:** Todo proceso de eliminación debe invocar un `DELETE` real a la base de datos (Hard Delete).
- **Adiós a Soft Deletes:** Queda estrictamente prohibido programar y condicionar consultas filtrando nulos a columnas como `deleted_at`. (La columna ya fue extirpada).

## 4. Reglas Financieras Centrales
Para que los KPIs sean inmutables y consistentes por toda la app, existen verdades financieras monolíticas:
- **Venta Bruta:** Es el indicador de éxito y de ingreso estandarizado y general. Su cálculo por cierre es SIEMPRE la sumatoria de `venta_pos` menos deducciones primarias como `ingreso_covers` (los covers descontados es imperativo para cruzar informes del restaurante).
- **Total de Ingresos Esperados:** `Venta POS`.
- **Total Egresos en Caja:** La sumatoria reportada de todos los medios y canales de pago procesados.
- **Descuadre de Caja:** La diferencia aritmética simple: (Total Egresos Reales - Ingresos Esperados). Un número positivo es Sobrante, bajo cero es un Faltante.
