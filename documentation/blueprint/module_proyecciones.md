# Módulo: Proyecciones de Ventas (Inteligencia de Negocio)

## 1. Problema de Negocio
La incertidumbre sobre el ingreso futuro dificulta la planificación de compras, la asignación de turnos de personal y la fijación de metas comerciales. Se requiere un sistema que "aprenda" del comportamiento histórico y lo ajuste según factores externos (festivos, quincenas, economía) para predecir la venta con precisión.

---

## 2. Arquitectura de Datos (Data Blueprint)

### A. Eventos de Impacto (Modificadores)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Factor de Impacto** | Multiplicador que aumenta o disminuye la venta. | Ej: 1.20 (+20% de venta). |
| **Tipo de Evento** | `Boost` (Impulso), `Neutral`, o `Inhibidor` (Baja). | Ayuda a categorizar la causa del cambio. |
| **Recurrencia** | Define si el evento se repite anualmente. | Ej: Día de la Madre, Festivos Nacionales. |

### B. Proyecciones (Metas y Sugerencias)
| Atributo | Propósito de Negocio | Regla / Requisito |
| :--- | :--- | :--- |
| **Calculado por Sistema** | Venta sugerida basada en algoritmos estadísticos. | No editable manualmente por el usuario. |
| **Meta Ajustada** | Valor final que el gerente fija como objetivo. | Bloquea la sugerencia automática si se edita. |
| **Estado del Día** | `Estimado` (Pendiente) o `Cerrado` (Realizado). | Cambia automáticamente cuando se liquida la caja. |

---

## 3. Mapa de Interconexiones (Contexto Sistémico)

- **Entrada desde Caja**: Extrae la "Venta Bruta Operativa" real de los arqueos históricos (Venta POS - Cobro de Covers) para limpiar el ruido del dato.
- **Entrada desde Calendario**: Se alimenta de los días festivos nacionales y eventos locales registrados.
- **Salida hacia Presupuestos**: El total proyectado del mes define el "Techo de Gasto" permitido en el módulo de tesorería.

---

## 4. Inteligencia y Algoritmos de Predicción
El motor de proyección utiliza una metodología de **Análisis de Recencia y Entorno**:

1.  **Venta Base (Lookback)**: Analiza el promedio de ventas de las últimas **8 semanas** para el mismo día de la semana (ej. promedio de los últimos 8 sábados).
2.  **Pesos Lineales**: El sistema da un mayor valor a las ventas más recientes, entendiendo que el mercado cambia semana tras semana.
3.  **Ajuste de Ruido**: Ignora automáticamente ventas anómalas (días con ingresos extremadamente altos o bajos por causas excepcionales) si superan un umbral de tolerancia.
4.  **Crecimiento Orgánico**: Aplica variables configurables de Crecimiento de Tráfico, Inflación y variación del Ticket Promedio.

---

## 5. Capacidades de Interacción (Operaciones)
- **Generador de Festivos (Seed)**: Crea automáticamente todos los festivos nacionales de un año (Ley Emiliani) con un impacto base del +20%.
- **Sincronizador de Quincenas**: Identifica los días 15 y 30 (ajustando a viernes si caen en domingo) para aplicar bonos de venta por día de pago.
- **Panel de KPIs**: Compara en tiempo real la **Venta Proyectada vs Venta Real** para calcular el cumplimiento de metas del mes.
- **Configuración de Motor**: Permite al administrador ajustar qué tan "agresiva" o "conservadora" debe ser la predicción.

---

## 6. Escenarios de Usuario
- **Planeación del Mes**: El administrador entra el primer día del mes -> El sistema ya ha proyectado todos los días basándose en el historial -> El administrador detecta un evento local (Feria) -> Crea un evento "Boost" -> Todo el mes se recalcula automáticamente.
- **Seguimiento de Meta**: A mitad de mes, el sistema muestra que se ha cumplido el 45% de la meta proyectada, permitiendo al gerente tomar medidas de impulso comercial.
