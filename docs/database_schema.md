# Documentación de la Base de Datos - Proyecto App UNP
*Última Actualización: 15 de Febrero de 2026*

Este documento describe la nueva arquitectura de base de datos optimizada para el sistema contable y operativo de UNPLUGGED GASTRO BAR. La base de datos ha sido migrada de un modelo NoSQL (Firebase) a un modelo Relacional Robusto (PostgreSQL/Supabase) con características empresariales de integridad, seguridad y rendimiento.

## 1. Arquitectura General

El sistema se basa en un modelo **Estrella (Star Schema)** centrado en la dimensión temporal y transaccional.

*   **Motor**: PostgreSQL 16+ (Supabase)
*   **Paradigma**: Relacional Estricto (Foreign Keys, ACIDO)
*   **Seguridad**: Row Level Security (RLS) + Auditoría Automática
*   **Respaldo**: Soft Deletes (Borrado Lógico) en tablas críticas

---

## 2. Diagrama de Tablas Principales

### 📆 Dimensión Temporal (El Corazón)
**`master_calendar`**
*   Fuente única de verdad para todas las fechas del sistema (2024-2030).
*   Permite análisis por: Día, Semana, Mes, Trimestre, Año, Día de Semana, Fin de Semana.
*   **Relación**: Todas las tablas transaccionales (`arqueos`, `transactions`, `budget`) validan sus fechas contra esta tabla.

### 💰 Módulo Contable
**`transactions`** (Tabla Unificada)
*   Centraliza **Ingresos, Gastos y Transferencias**.
*   **Optimizaciones**:
    *   `type`: 'income' | 'expense' | 'transfer' (Enum validado).
    *   `amount`: Bloqueado a valores positivos (`CHECK amount >= 0`).
    *   `parsed_date`: Fecha real indexada vinculada al calendario.
    *   `arqueo_id`: Vinculación directa con el cierre de caja origen.
    *   **Búsqueda**: Índice *Full Text Search* trigram en `description`.
    *   **Seguridad**: Soft Delete (`deleted_at`).

**`categories`** (Catálogo Maestro)
*   Estandariza los conceptos de gastos/ingresos.
*   **Integridad**: Bloqueo de eliminación (`ON DELETE RESTRICT`) si la categoría tiene transacciones asociadas.

### 🧾 Módulo Operativo (Cierre de Caja)
**`arqueos`**
*   Cabecera del cierre diario.
*   **Integridad**: Trigger automático calcula `descuadre` para evitar errores matemáticos en frontend.
*   **Relación**: 1 Arqueo -> N Detalles de Pago.

**`arqueo_details`**
*   Detalle normalizado de métodos de pago.
*   Reemplaza columnas columnas fijas (nequi, datafono, etc.) por filas.
*   Permite agregar nuevos métodos de pago sin alterar la estructura de la tabla.

**`payment_methods`** (Catálogo Maestro)
*   Lista configurable de medios de pago (Efectivo, Bancolombia, Nequi...).

### 📉 Módulo de Presupuestos
**`budget_commitments`**
*   Compromisos financieros futuros y pasados.
*   **Integridad**: Estados validados (`pending`, `paid`, `cancelled`, `overdue`).
*   **Vinculación**: Relacionado estrictamente con `categories` y `master_calendar`.

---

## 3. Características Avanzadas Implementadas

### 🛡️ Blindaje de Datos (Data Integrity)
*   **Constraints**: Se prohíben montos negativos, fechas inexistentes o nulas en campos críticos.
*   **Foreign Keys Estrictas**: No se pueden borrar datos maestros (Categorías, Calendario) si hay datos transaccionales dependiendo de ellos.

### 🕵️ Auditoría Forense (Audit Logs)
*   **Tabla**: `audit_logs`
*   **Funcionamiento**: Un Trigger automático captura **cualquier cambio** (Insert, Update, Delete) en tablas críticas.
*   **Qué guarda**: Usuario responsable, timestamp, dato anterior (`old_data`) y dato nuevo (`new_data`).

### 🗑️ Borrado Lógico (Soft Deletes)
*   **Mecanismo**: Las tablas principales tienen columna `deleted_at`.
*   **Comportamiento**: Al ejecutar `DELETE`, el sistema intercepta la orden y solo marca el registro como borrado + timestamp.
*   **Beneficio**: Recuperación instantánea de datos "borrados" y trazabilidad total.

### 📊 Vistas para Dashboard (Business Intelligence)
Se han creado vistas SQL pre-calculadas para alimentar el frontend sin lógica compleja:
1.  **`view_daily_financial_full`**: Reporte diario con Ingresos, Gastos y Ganancia (cruzado con calendario).
2.  **`view_monthly_category_expenses`**: Agrupación mensual de gastos por categoría.
3.  **`view_payment_method_stats`**: Totales recaudados por medio de pago (Nequi vs Efectivo, etc.).

---

## 4. Guía de Uso para Desarrolladores

### Consultar el Dashboard
Para obtener el resumen financiero del mes actual:
```sql
SELECT * FROM view_daily_financial_full 
WHERE date BETWEEN '2026-02-01' AND '2026-02-28';
```

### Insertar una Nueva Transacción (Ejemplo Seguro)
```sql
INSERT INTO transactions (
    description, 
    amount, 
    type, 
    parsed_date, 
    category_id
) VALUES (
    'Compra Insumos Aseo', 
    50000, 
    'expense', 
    '2026-02-15', -- Debe existir en master_calendar
    'cat-aseo-id' -- Debe existir en categories
);
```

### Recuperar un Dato Borrado
```sql
-- Ver lo borrado
SELECT * FROM transactions 
WHERE deleted_at IS NOT NULL;

-- Restaurar (Manual)
UPDATE transactions 
SET deleted_at = NULL 
WHERE id = 'transaccion-borrada-id';
```
