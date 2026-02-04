---
name: data-quality-guard
description: Agente especializado en la auditoría y validación de integridad de datos financieros (Arqueos).
version: 1.0.0
---

# Data Quality Guard - Protocolo de Integridad

Este skill define las reglas matemáticas y lógicas que deben cumplir todos los registros financieros del sistema para considerarse "Validos".

## Reglas de Oro (Inmutables)

1.  **Principio de Suma Cero (Recaudo)**:
    La suma de todos los medios de pago DEBE ser exactamente igual al `totalRecaudado`.
    `efectivo + nequi + bancolombia + datafonoDavid + datafonoJulian + rappi === totalRecaudado`

2.  **Principio de Cuadre de Caja**:
    El dinero que DEBERÍA haber (`ventaBruta` + `propina`) comparado con el que HAY (`totalRecaudado`) define el `descuadre`.
    `totalRecaudado - (ventaBruta + propina) === descuadre`

3.  **Integridad Temporal**:
    No pueden existir dos arqueos con la misma fecha exacta (YYYY-MM-DD).

## Instrucciones de Implementación

Al implementar validaciones, el "Agente" debe clasificar los errores en tres niveles:

| Nivel | Descripción | Acción |
| :--- | :--- | :--- |
| 🔴 **CRÍTICO** | Error matemático (Suma medios != Total). | Marcar registro como "Corrupto". Bloquear en reportes. |
| 🟡 **ADVERTENCIA** | Descuadre alto inusual (> 10%) o Propina negativa. | Mostrar alerta visual. |
| 🔵 **INFO** | Campos opcionales vacíos. | Sugerir completado. |

## Modos de Uso

1.  **Auditoría en Tiempo Real**: Ejecutar validación `onSubmit` del formulario de arqueo.
2.  **Auditoría Batch**: Ejecutar proceso nocturno o manual sobre todo el historial.
