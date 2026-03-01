---
description: Define la arquitectura estándar para manejar cálculos matemáticos y agrupaciones de datos (Frontend vs Backend/DB)
---

# 🏗️ Arquitectura de Cálculos y Datos (Patrón UNP)

Este documento establece la "Ley Cero" sobre dónde y cómo deben ejecutarse las operaciones matemáticas, transformaciones y consultas masivas en todo el ecosistema de la aplicación.

## 1. La Regla de Oro (Separation of Concerns)

El sistema opera bajo un modelo híbrido estrictamente delimitado para garantizar **cero latencia en la interfaz (UX)** y **máximo rendimiento en los reportes analíticos**.

### 🟢 Frontera Frontend (TypeScript / React)
**QUÉ SE HACE AQUÍ:** Toda la matemática Operativa, Transaccional y de Ingreso de Datos (Día a Día).
*   **Ejemplos:** Calcular el descuento de un arqueo, la división de propinas, restarle la comisión de plataformas a una venta, proyecciones diarias individuales.
*   **Condición Crítica:** NINGUNA fórmula matemática financiera o de negocio debe vivir dentro de un Componente de React (`.tsx`) ni dentro de un Hook (`useHook.tsx`).
*   **Implementación:** Todo cálculo debe extraerse a archivos en la carpeta `src/utils/` (Ej. `tipCalculations.ts`, `arqueoCalculations.ts`). Estas funciones deben ser estáticas, puras y tipadas.

### 🔵 Frontera Backend (Supabase / Postgres)
**QUÉ SE HACE AQUÍ:** Toda Agregación Histórica, Dashboards y Analítica Masiva.
*   **Ejemplos:** "Suma total de propinas de Enero", "Balance trimestral de Flujo de Caja", "Promedio móvil de ventas", etc.
*   **Condición Crítica:** JAMÁS se deben descargar miles de filas al Frontend usando un simple `select('*')` solo para sumar sus valores en un `datos.reduce()`. Eso destruye la memoria RAM y bloquea el Main Thread.
*   **Implementación:** Usar Vistas Materializadas (`Materialized Views`), Vistas normales (`Views`), o Funciones Remotas (`RPC - Remote Procedure Calls`) en Supabase. El Backend suma 10,000 registros y le devuelve a React un único objeto JSON con el total.

---

## 2. Inventario de Tablas y Estandarización de Cálculos

A continuación, se detalla el manejo estándar para las tablas que contienen lógica matemática:

### 1. Sistema de Caja y Cierres (`arqueos` y `arqueo_details`)
*   **Frontend (`utils/arqueoCalculations.ts`):** 
    *   Suma del Total Recaudado (Efectivo + Transferencias + Tarjetas).
    *   Suma de la Venta Esperada (Venta POS + Propinas).
    *   Cálculo del Descuadre de Caja.
    *   *Nota: Se debe unificar con las utilidades de importación de Excel para evitar dualidad.*

### 2. Gestión de Propinas (`tips_records`)
*   **Frontend (`utils/tipCalculations.ts`):**
    *   Cálculo de Comisión (3%).
    *   Base neta (Propinas Totales - Comisión).
    *   División exacta por persona (Redondeo hacia abajo).
    *   Cálculo automático del fondo UNP.

### 3. Presupuestos y Cuentas por Pagar (`budget_commitments`)
*   **Frontend (`utils/budgetCalculations.ts`):** ✅ IMPLEMENTADO
    *   Cálculo de Disponibilidad Semanal (Suma de cuentas bancarias + efectivo).
    *   Resumen de Ejecución Presupuestal (Balance residual, porcentaje de uso, alerta de déficit).
    *   Determinación de Estado de Compromiso: `isCommitmentOverdue()` centraliza la lógica de comparación de fecha de vencimiento vs hoy.
    *   Resolución Visual: `resolveCommitmentVisualStatus()` y `getCommitmentColors()` eliminan la repetición de paletas de color en Calendario, Dashboard y Ejecución.
*   **Backend (RPCs/Views):**
    *   Sumatorias masivas del "Total Adeudado General" o "Presupuesto Ejecutado del Trimestre" para mostrar en Dashboards.

### 4. Flujo de Caja Maestro (`transactions` / `budget_purchases`)
*   **Frontend:**
    *   Validaciones de entrada (Ingresos siempre en positivo).
*   **Backend (Vistas SQL en Supabase):** ✅ IMPLEMENTADO
    *   `view_monthly_sales_summary` — Ventas brutas, visitas, ticket promedio y días operados, agrupados por mes. Elimina el `reduce()` de 30+ filas en el Dashboard de Ventas.
    *   `view_monthly_purchases_summary` — Total de débitos y compras agrupados por mes. Elimina la descarga completa de `budget_purchases` para obtener KPIs.
    *   `view_payment_method_stats` — Mix de pagos (Efectivo, Datafónos, Nequi, Rappi) ya pre-sumado por mes.
    *   `view_daily_financial_summary` — Ingresos y gastos diarios por transacción.
    *   `view_daily_financial_full` — Vista enrichada con nombre del día, mes, año, y flag de fin de semana.
    *   **Nota Crítica:** El Flujo de Caja acumula miles de transacciones. Para ver "El saldo actual de la cuenta" o "Gastos del mes por categoría", es obligatorio usar estas Vistas. JAMÁS aplicar `Array.reduce()` sobre esta tabla en React.

### 5. Proyecciones y Eventos Estadísticos (`sales_projections`)
*   **Frontend (`utils/projectionAlgorithms.ts`):**
    *   Cálculos diarios al crear una proyección manual (Variables ajustadas vs Sistema).
*   **Backend:**
    *   Cálculo de Modelos de Series de Tiempo (Si algún día se integran algoritmos complejos o IA) deben vivir en Edge Functions o DB Functions.

---

## 3. Guía de Ejecución para Nuevos Ficheros
Si tienes que agregar una nueva pantalla o tabla que calcula plata:
1. Revisa si la fórmula ya existe en `src/utils/`.
2. Si no existe, crea la interfaz y la función allí de inmediato.
3. Importa esa función en tu componente Modal, o Tabla de React.
4. Si necesitas sumar todos esos montos agrupados por un mes para un gráfico, ve directo a Supabase y crea una Vista (View). No uses `Array.reduce` en el Frontend.
