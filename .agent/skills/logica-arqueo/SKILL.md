---
name: Arqueo Cash Flow Logic
description: Reglas matemáticas obligatorias para el cálculo de arqueos y descuadres.
version: 1.0.0
---

# Contexto
Este skill define la verdad absoluta sobre cómo se calculan los saldos de arqueo en la aplicación. Debe respetarse en cualquier componente de UI, servicio de exportación o lógica de base de datos.

# Reglas de Oro
1. **Venta Bruta** = `Venta POS` - `Covers` (Valor informativo).
2. **Total Ingresos** = `Venta POS` + `Propina`.
3. **Total Egresos** = Sumatoria de todos los medios de pago físicos y digitales (Efectivo, Nequi, Bancolombia, Datafonos, Rappi).
4. **Descuadre** = `Total Egresos` - `Total Ingresos`.
5. **Exclusión de Covers**: Los ingresos por covers NO forman parte del ingreso esperado para el cálculo del descuadre. Son informativos.

# Instrucciones
Al modificar el código en `AppContext.tsx`, `ArqueosTable.tsx` o `excelParser.ts`, asegúrate de aplicar estas fórmulas:

```typescript
const totalIngresos = (ventaPos || 0) + (propina || 0);
const descuadre = totalEgresos - totalIngresos;
```

Si el descuadre es positivo, significa que hay un sobrante de dinero. Si es negativo, hay un faltante.

# Reglas de Ingesta y Parsing (Excel)
Para garantizar la integridad de los datos importados desde Excel (`excelParser.ts`), se deben seguir estas reglas:

## 1. Lectura de Archivos (XLSX)
- **Modo Forzado de Texto:** Al usar `xlsx`, siempre se debe usar la opción `{ raw: false }` en `sheet_to_json`.
    - *Razón:* Excel puede interpretar puntos de miles como decimales (ej. `914.350` -> `914.35`). Al leer como texto formateado, preservamos la integridad visual del número antes de parsearlo nosotros mismos.

## 2. Detección de Columnas (Inteligencia Fuzzy)
- **Prioridad de Venta:** Al buscar la columna de "Venta POS", se debe excluir explícitamente columnas que contengan "BRUTA", "BASE" o "NETA".
    - *Razón:* Muchos reportes contables incluyen una columna "Venta Bruta" (Base sin IVA) y una "Venta Neta" o Total. El arqueo se debe cuadrar contra el Total Final (con impuestos), por lo que debemos evitar falsos positivos con la base.

## 3. Limpieza de Moneda
- Al parsear strings de dinero (ej. `"$ 1.234.567,00"`), se debe eliminar todo carácter que no sea número o signo menos (`-`).
- No confiar en la detección automática de decimales de librerías genéricas si el input es ambiguo; asumir formato local (COP) donde usualmente no hay decimales fraccionarios relevantes para el arqueo final.
