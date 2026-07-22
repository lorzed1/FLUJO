# Módulo: Gestión de Presupuestos y Egresos (Tesorería)

## 1. Problema de Negocio
El desconocimiento del flujo de caja futuro y la falta de control sobre los gastos fijos y variables dificulta la toma de decisiones financieras. Se requiere un sistema que proyecte compromisos, automatice la generación de gastos recurrentes y permita monitorear la "disponibilidad real" de dinero en múltiples cuentas.

---

## 2. Arquitectura de Datos (Data Blueprint)

### A. Compromisos (Cuentas por Pagar)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Concepto de Gasto** | Descripción clara del egreso (Ej: Arriendo, Proveedor X). | Obligatorio. |
| **Monto Estimado** | Valor proyectado del compromiso. | Base para el cálculo de disponibilidad semanal. |
| **Fecha de Vencimiento** | Fecha límite para realizar el pago. | Dispara alertas de "Monto en Mora". |
| **Estado** | `Pendiente`, `Pagado`, `Cancelado`. | El cambio a `Pagado` dispara un registro de ejecución. |

### B. Reglas de Recurrencia (Gastos Fijos)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Periodicidad** | Frecuencia del gasto (Diario, Semanal, Mensual). | Automatiza la creación de compromisos futuros. |
| **Día de Ejecución** | Día exacto del mes/semana en que se debe pagar. | Genera el compromiso en la fecha correcta. |

---

## 3. Mapa de Interconexiones (Contexto Sistémico)

- **Entrada desde Caja**: Los gastos menores reportados por el cajero durante su jornada se integran como **Registros de Ejecución** automáticos.
- **Entrada desde Disponibilidad**: El sistema consulta los saldos de 4 fuentes (3 Bancos + Efectivo) para calcular el semáforo de gastos.
- **Salida hacia Contabilidad**: Cada pago ejecutado se traduce en un asiento de salida (Crédito a Banco/Caja, Débito a Gasto).

---

## 4. Inteligencia y Control de Flujo
El sistema opera bajo un modelo de **Snapshots de Ejecución**:

1.  **Lógica de Disponibilidad Semanal**: Al inicio de cada semana, el administrador define un "techo" de dinero disponible repartido en las cuentas bancarias.
2.  **Motor de Generación**: Un proceso en segundo plano lee las "Reglas de Recurrencia" y genera automáticamente los compromisos del mes, permitiendo ver el balance proyectado a 30 días.
3.  **Conciliación de Ejecución**: El sistema compara el `Saldo Inicial` de la mañana vs los `Pagos Realizados` para determinar el `Saldo Final` esperado en las cuentas.

---

## 5. Capacidades de Interacción (Operaciones)
- **Wizard de Pago**: Interfaz para marcar compromisos como pagados, transformándolos en registros de ejecución históricos.
- **Monitoreo de Disponibilidad**: Semáforo visual que indica cuánto dinero queda de la asignación semanal después de los gastos realizados.
- **Gestión de Gastos Fijos (Seed)**: Herramienta para "sembrar" todos los gastos recurrentes de un año en un solo click.
- **Alertas de Mora**: Panel dedicado a compromisos cuya fecha de vencimiento ya pasó pero siguen en estado `Pendiente`.

---

## 6. Escenarios de Usuario
- **Pago de Servicios**: Existe un compromiso recurrente de "Agua" -> Llega el recibo -> Se edita el monto real -> Se marca como pagado -> El sistema resta el monto de la "Disponibilidad Semanal" y genera el registro de salida bancaria.
- **Gasto de Emergencia**: Surge un gasto no planeado -> Se crea una "Ejecución Directa" -> El sistema reduce el saldo disponible aunque no existiera un compromiso previo.
