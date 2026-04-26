# Módulo: Núcleo Contable y Conciliación Bancaria

## 1. Problema de Negocio
La desconexión entre los registros operativos (ventas), los asientos contables y los movimientos reales en las cuentas bancarias genera incertidumbre financiera y riesgo de fraude. Se requiere un sistema que "cierre el círculo" vinculando cada centavo registrado en contabilidad con un movimiento bancario verificado.

---

## 2. Arquitectura de Datos (Data Blueprint)

### A. Asientos Contables (Libro Mayor)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Fecha de Asiento** | Fecha contable del hecho económico. | Puede variar respecto a la fecha bancaria. |
| **Cuenta (PUC)** | Código del Plan Único de Cuentas. | Ej: 1105 (Caja), 1110 (Bancos). |
| **Débito / Crédito** | Naturaleza del movimiento. | El sistema calcula el `Valor Neto` para matching. |
| **Tercero/Contacto** | Entidad o persona vinculada al movimiento. | Identificación fiscal obligatoria. |

### B. Extractos Bancarios (Fuentes de Verdad)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Referencia Bancaria** | Identificador único emitido por el banco. | Clave para matching de máxima certeza. |
| **Descripción Bancaria** | Texto original del extracto. | Usado para detectar transferencias internas. |
| **Valor** | Monto exacto que entró o salió de la cuenta. | Debe coincidir (con margen) con el asiento. |

---

## 3. Mapa de Interconexiones (Contexto Sistémico)

- **Entrada desde Operación**: Recibe asientos generados por los módulos de **Caja** (Ventas diarias) y **Beneficios** (Pago de propinas).
- **Entrada desde Bancos**: Importación de extractos de 3 cuentas principales (Natalia, Julian, Corriente).
- **Salida hacia Reportes**: Alimenta el informe consolidado de P&G (Pérdidas y Ganancias).

---

## 4. Inteligencia y Algoritmos de Conciliación
El sistema utiliza un motor de Inteligencia de Relación (Matching) de 3 capas:

1.  **Capa de Certeza Total**: Vincula registros con Valor Exacto y Fecha Idéntica.
2.  **Capa de Flexibilidad Operativa**: Permite un margen de **±2 días** y una tolerancia de **±$2.000 COP** (ajuste al peso) para absorber pequeñas discrepancias bancarias.
3.  **Detección de Transferencias Internas**: Algoritmo que identifica movimientos espejo entre dos cuentas bancarias de la empresa (Ej: Retiro de Cta A -> Depósito en Cta B), evitando duplicar ingresos falsos.

---

## 5. Capacidades de Interacción (Operaciones)
- **Conciliación en Lote**: El sistema sugiere "Parejas" de movimientos; el usuario aprueba con un click.
- **Búsqueda Inversa**: Permite seleccionar un asiento contable y pedirle al sistema que busque en todas las cuentas bancarias posibles coincidencias.
- **Auditoría de "Ghost Records"**: Protección automática que invalida una conciliación si se detecta que el registro original fue modificado o eliminado (prevención de corrupción de datos).
- **Consolidador P&G**: Genera resúmenes mensuales de ingresos vs gastos por código de cuenta.

---

## 6. Escenarios de Usuario
- **Conciliación de Nómina**: El usuario paga propinas en efectivo → Se genera asiento contable → El usuario retira del banco el efectivo → El sistema vincula el retiro bancario con el reporte de propinas pagadas.
- **Detección de Duplicados**: El sistema alerta si un mismo movimiento bancario intenta vincularse con dos asientos distintos.
