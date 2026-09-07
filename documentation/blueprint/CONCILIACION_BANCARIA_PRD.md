# Conciliador Financiero — Blueprint de Producto (PRD Agnóstico)

> **Objetivo de este documento:** Describir de forma **100% agnóstica** (sin mencionar tecnologías, frameworks, nombres de tablas ni código fuente) cómo funciona el módulo de conciliación financiera, de modo que un equipo nuevo pueda replicar esta funcionalidad en cualquier plataforma.

---

## 1. Resumen de Propósito

### ¿Qué problema resuelve?

Las organizaciones manejan múltiples **cuentas financieras** (bancarias, de ahorro, corrientes) cuyos extractos deben cruzarse contra un **libro contable central** (asientos contables). El proceso manual de cruzar cada movimiento bancario con su contraparte contable es tedioso, propenso a errores y consume horas.

### ¿Qué hace este módulo?

Este módulo automatiza la **conciliación bancaria**, es decir, el proceso de emparejar ("vincular") cada movimiento registrado en un extracto bancario con su correspondiente asiento en el libro contable, detectando:

- ✅ Coincidencias exactas (mismo valor, misma fecha)
- ⚠️ Coincidencias aproximadas (valor similar, fecha cercana)
- 🔄 Transferencias entre cuentas propias
- 🚫 Movimientos sin contraparte (pendientes de registro)
- 🔍 Posibles duplicados

---

## 2. Arquitectura Conceptual

### 2.1 Entidades del Dominio

```
┌──────────────────────┐        ┌──────────────────────┐
│   CUENTA FINANCIERA  │        │   LIBRO CONTABLE     │
│   (Extracto Banco)   │        │   (Asientos)         │
├──────────────────────┤        ├──────────────────────┤
│ • Fecha              │        │ • Fecha              │
│ • Valor              │  ←──→  │ • Débito / Crédito   │
│ • Descripción        │        │ • Descripción        │
│ • Sucursal           │        │ • Contacto           │
│ • Referencia Bancaria│        │ • Cuenta Contable    │
│ • Doc. Banco         │        │ • Centro de Costo    │
│ • Notas              │        │ • Documento          │
│                      │        │ • Identificación     │
│                      │        │ • Notas              │
└──────────────────────┘        └──────────────────────┘
           │
           ▼
┌──────────────────────┐
│  HISTORIAL DE        │
│  CONCILIACIÓN        │
├──────────────────────┤
│ • Cuenta origen      │
│ • ID registro origen │
│ • ID registro destino│
│ • Tipo (auto/manual) │
│ • Puntuación confianza│
│ • Diferencia valor   │
│ • Diferencia días    │
│ • Estado (activo/rev)│
│ • Fecha creación     │
│ • Motivo reversión   │
└──────────────────────┘
```

### 2.2 Relación entre Entidades

| Relación | Descripción |
|:---|:---|
| **Cuenta Financiera → Libro Contable** | Cada registro del extracto bancario puede vincularse con uno o más asientos contables |
| **Múltiples Cuentas** | El sistema soporta N cuentas financieras configurables, cada una con su propia tabla de datos |
| **Historial** | Cada vinculación se registra en un historial con trazabilidad completa |

---

## 3. Catálogo de Cuentas Financieras

### 3.1 Configuración de Cuenta

Cada cuenta financiera se define con los siguientes atributos de configuración:

| Atributo | Propósito | Regla/Requisito |
|:---|:---|:---|
| Identificador | Clave única interna de la cuenta | Texto corto, único, sin espacios (ej: `cta-principal`) |
| Nombre visible | Etiqueta que ve el usuario | Texto legible (ej: "Cuenta Corriente Principal") |
| Repositorio de datos | Tabla o fuente donde se almacenan los movimientos | Nombre de la tabla/colección de datos |
| Campo de valor | Columna que contiene el monto | Nombre del campo numérico |
| Campo de fecha | Columna que contiene la fecha | Nombre del campo de fecha |
| Campo de descripción | Columna que contiene la narrativa del movimiento | Nombre del campo de texto |
| Código contable | Código del plan de cuentas asociado | Código numérico (opcional, para exportación) |

### 3.2 Comportamiento Multi-Cuenta

- El usuario puede alternar entre cuentas mediante un **selector desplegable** en la cabecera
- Al cambiar de cuenta, el sistema recarga automáticamente:
  - Los movimientos del extracto bancario de esa cuenta
  - Los filtros, búsquedas y configuraciones de columnas **guardados por cuenta**
  - Las marcas de "sospechoso" y "registrado" específicas de esa cuenta
- La configuración de cada cuenta se persiste localmente (almacenamiento del navegador), de modo que al volver a la misma cuenta se restauran todas las preferencias

---

## 4. Módulo: Conciliador Principal

### 4.1 Interfaz de Trabajo — Layout de Panel Dividido

La interfaz se organiza en un diseño de **doble panel lado a lado** (50%-50%):

```
┌──────────────────────────────────────────────────────────────┐
│  ═══ CABECERA ═══                                            │
│  [Ícono] Conciliación Bancaria                               │
│  Subtítulo: {Cuenta Seleccionada} vs Asientos Contables      │
│                                    [Selector Cuenta ▾] [⚙]   │
├──────────────────────────────────────────────────────────────┤
│  ═══ BARRA DE CONFIGURACIÓN (colapsable) ═══                │
│  Tolerancia Valor: [___2000___]  |  Margen Días: [___2___]   │
├──────────────────────────────────────────────────────────────┤
│  ═══ BARRA DE KPIs + PESTAÑAS + ACCIONES ═══                │
│  🟢 125 conciliados | 🟡 47 pendientes                       │
│  [Conciliar] [Historial (125)] [Transferencias Int.]         │
│                                                              │
│  [Todos] [● Ingresos] [● Egresos]                           │
│  [📅 Rango] [✨ Buscar Sugerencias]                          │
├────────────────────────────┬─────────────────────────────────┤
│  ═══ PANEL IZQUIERDO ═══  │  ═══ PANEL DERECHO ═══          │
│  🏦 Extracto Bancario     │  📄 Asientos Contables           │
│  {Cuenta Seleccionada}     │                                 │
│  [🔍 Buscar...        ]   │  [🔍 Buscar...        ]         │
│  [⚠3] [✓2] [👁Cols]       │  [⚠] [✓] [🔽Excluir] [↔Inv]   │
│                            │  [👁Cols]                        │
│  ┌────────────────────┐   │  ┌───────────────────────┐      │
│  │ Fecha │ Valor │Des │   │  │ # │Fecha│Valor│Des│Acc│      │
│  │───────┼───────┼────│   │  │───┼─────┼─────┼───┼───│      │
│  │ 15/01 │-$500k │Pago│   │  │ 1 │15/01│-500k│Pag│⚠✓│      │
│  │ 16/01 │+$1.2M │Dep │   │  │ 2 │16/01│+1.2M│Dep│⚠✓│      │
│  │ ...   │       │    │   │  │...│     │     │   │  │      │
│  └────────────────────┘   │  └───────────────────────┘      │
└────────────────────────────┴─────────────────────────────────┘
```

### 4.2 Panel Izquierdo — Extracto Bancario ("Fuente")

**Contenido**: Muestra los movimientos del extracto bancario de la cuenta seleccionada que **aún no han sido conciliados**.

#### Datos por registro:

| Campo | Propósito | Visible por defecto |
|:---|:---|:---|
| Fecha | Fecha del movimiento bancario | ✅ Sí |
| Valor | Monto del movimiento (positivo = ingreso, negativo = egreso) | ✅ Sí |
| Descripción | Narrativa del banco sobre el movimiento | ✅ Sí |
| Sucursal | Sucursal bancaria donde ocurrió | ❌ No |
| Referencia | Número de referencia bancaria | ❌ No |
| Doc. Banco | Documento bancario asociado | ❌ No |
| Notas | Comentarios del usuario sobre el registro | ✅ Sí |

#### Capacidades:

- **Búsqueda en tiempo real**: Filtra registros por cualquier campo visible (descripción, valor formateado, fecha, sucursal, referencia, doc. banco)
- **Selección de columnas**: Menú desplegable para mostrar/ocultar cada columna
- **Click para seleccionar**: Al hacer click en un registro, se activa el **Modo Vinculación Manual** (ver §4.5)
- **Multi-selección**: Se pueden seleccionar múltiples registros del extracto (la suma se acumula)
- **Cross-highlighting**: Al pasar el cursor sobre un registro, se resaltan automáticamente en el panel derecho los registros contables que podrían coincidir (basándose en la tolerancia de valor y margen de días configurados)
- **Alineación de scroll**: Al seleccionar un registro, el panel derecho auto-scroll para alinear visualmente la mejor sugerencia a la misma altura
- **Marcado de registros** (ver §4.6)
- **Notas editables**: Ícono para abrir un modal y agregar/editar notas por registro

### 4.3 Panel Derecho — Libro Contable ("Destino")

**Contenido**: Muestra los asientos contables que **aún no han sido conciliados**.

#### Datos por registro:

| Campo | Propósito | Visible por defecto |
|:---|:---|:---|
| # (Índice) | Número secuencial del registro en la lista filtrada | ✅ Sí (siempre) |
| Fecha | Fecha del asiento contable | ✅ Sí |
| Valor | Valor neto del asiento (Débito - Crédito) | ✅ Sí |
| Descripción | Narrativa del asiento | ✅ Sí |
| Cuenta Contable | Código de la cuenta del plan contable | ❌ No |
| Contacto | Nombre del tercero/proveedor/cliente | ❌ No |
| Identificación | Número de documento del contacto | ❌ No |
| Centro de Costo | Área de la organización | ❌ No |
| Documento | Número de documento contable | ❌ No |
| Notas | Comentarios del usuario | ✅ Sí |

#### Capacidades adicionales:

- **Búsqueda en tiempo real** por descripción, valor, contacto, documento
- **Filtro de exclusión de cuentas**: Menú desplegable que lista todas las cuentas contables únicas presentes en los datos; permite **excluir** cuentas específicas de la vista (útil para ocultar cuentas que no aplican a la conciliación)
- **Detección de posibles duplicados**: Si un registro pendiente tiene el mismo monto y fecha que otro ya conciliado, se muestra un ícono de advertencia con tooltip explicativo. Al hacer click, navega al vínculo existente.
- **Marcado de registros** (sospechosos/registrados, ver §4.6)

---

### 4.4 Conciliación Automática (Sugerencias Masivas)

Al presionar **"Buscar Sugerencias"**, el sistema ejecuta un algoritmo de emparejamiento en 3 fases progresivas:

#### Fase 1 — Coincidencia Exacta (Puntuación: 100%)

| Criterio | Condición |
|:---|:---|
| Valor absoluto | Idéntico entre origen y destino |
| Signo del valor | Mismo signo (+ con +, - con -) |
| Fecha | Idéntica |

**Regla**: Si la magnitud del valor es idéntica, el signo coincide Y la fecha es exactamente la misma → puntuación 100%.

#### Fase 2 — Valor Exacto con Fecha Flexible (Puntuación: 93-99%)

| Criterio | Condición |
|:---|:---|
| Valor absoluto | Idéntico |
| Signo del valor | Mismo signo |
| Fecha | Dentro del margen configurado (±N días) |

**Fórmula de Puntuación**: `99 - (diferencia_días × 2)`

Ejemplo: Si el margen es ±2 días y la diferencia es 1 día → puntuación = 97%.

#### Fase 3 — Tolerancia de Valor con Fecha Flexible (Puntuación: 50-98%)

| Criterio | Condición |
|:---|:---|
| Diferencia de valor | ≤ Tolerancia configurada |
| Signo del valor | Mismo signo |
| Fecha | Dentro del margen de días |

**Fórmula de Puntuación**:
```
penalización_valor = (diferencia_valor / tolerancia) × 5
penalización_fecha = diferencia_días × 1.5
puntuación = 98 - penalización_valor - penalización_fecha
```

Solo se incluyen matches con puntuación > 50%.

#### Comportamiento del algoritmo:

- Cada registro solo puede ser emparejado **una vez** (1:1)
- Las fases se ejecutan secuencialmente: un registro ya emparejado en Fase 1 no participa en Fase 2
- Los registros ya conciliados previamente se excluyen automáticamente
- Si hay filtro de fechas activo, solo se consideran registros dentro del rango
- Si hay filtro de flujo (ingresos/egresos), solo se consideran registros del tipo seleccionado

#### Interfaz de resultados:

Los matches encontrados se presentan en un **panel colapsable tipo barra sticky** entre la cabecera y los paneles:

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ COINCIDENCIAS ENCONTRADAS (15 activas)   [Solo 100%] [👁]│
├──┬───────┬────────┬────────┬──────┬───────┬───────┬─────────┤
│# │F.Banco│V.Banco │D.Banco │Conf. │Dif.$  │Dif.D  │F.Asiento│
│──┼───────┼────────┼────────┼──────┼───────┼───────┼─────────│
│1 │15/01  │-$500k  │Pago    │100%  │Exacto │0d     │15/01    │
│2 │16/01  │+$1.2M  │Dep     │97%   │Exacto │1d     │15/01    │
│3 │18/01  │-$50k   │Comisión│93%   │$2.000 │2d     │20/01    │
├──┴───────┴────────┴────────┴──────┴───────┴───────┴─────────┤
│              [✓ Confirmar (15)]  [Descartar]                 │
└──────────────────────────────────────────────────────────────┘
```

**Acciones disponibles sobre los resultados:**

| Acción | Descripción |
|:---|:---|
| **Confirmar todos** | Guarda en lote todos los matches no rechazados |
| **Descartar** | Limpia las sugerencias sin guardar nada |
| **Rechazar individual** | Marca un match como rechazado (se atenúa visualmente, no se guarda) |
| **Restaurar** | Revierte un rechazo individual |
| **Reasignar** | Rechaza el match automático y abre el modo manual para elegir otro destino |
| **Solo 100%** | Filtro rápido que rechaza todos los matches con confianza < 100% |
| **Selector de columnas** | Mostrar/ocultar columnas en la tabla de resultados |

---

### 4.5 Modo Vinculación Manual (Barra Sticky)

Cuando el usuario **hace click en un registro del extracto bancario** (panel izquierdo), se activa el Modo Vinculación Manual. Aparece una **barra interactiva tipo sticky panel** entre la cabecera y los paneles duales:

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ MODO VINCULACIÓN                                    [✕]  │
│ 15/01/2025   Pago Proveedor XYZ   ┌──────────┐             │
│                                    │ -$500.000 │             │
│                                    └──────────┘             │
│ Asiento seleccionado — listo para vincular                  │
│ (ó: 3 sugerencias | ó: Haz click en un asiento)            │
├──────┬──────┬────────┬──────────┬────────┬──────┬───────────┤
│Conf. │Fecha │Valor   │Descripción│Contacto│Dif.$ │Acción    │
│──────┼──────┼────────┼──────────┼────────┼──────┼───────────│
│ 97%  │15/01 │-$500k  │Pago Prov │Prov XY │Exacto│[Vincular]│
│ 85%  │16/01 │-$498k  │Pago Serv │Prov XY │$2k   │[Vincular]│
│ 73%  │18/01 │-$505k  │Pago Mat  │Prov AB │$5k   │[Vincular]│
└──────┴──────┴────────┴──────────┴────────┴──────┴───────────┘
```

#### Flujo de vinculación manual:

1. **Seleccionar origen(es)**: Click en uno o más registros del extracto bancario (izquierda)
   - Multi-selección por clicks sucesivos (toggle)
   - Se muestra la **suma acumulada** cuando hay múltiples seleccionados
2. **Ver sugerencias**: El sistema calcula automáticamente las mejores coincidencias del libro contable
   - Máximo 5 sugerencias, ordenadas por puntuación descendente
   - Se incluyen matches con puntuación ≥ 20%
3. **Vincular por sugerencia** (1 click): Click en cualquier sugerencia para vincular inmediatamente
4. **Vincular manualmente**: Click en cualquier registro del panel derecho para seleccionarlo como destino
   - Se muestra una fila de confirmación con el par seleccionado
   - Botón [Vincular] para confirmar, [✕] para cambiar selección
5. **Cancelar**: Botón ✕ en la barra o deseleccionar todos los registros

#### Cálculo de sugerencias:

Las sugerencias se calculan sobre el **monto acumulado** de los registros seleccionados, permitiendo **vincular N movimientos bancarios con 1 asiento contable** cuando el asiento agrupa varios pagos.

Niveles de sugerencia:

| Condición | Puntuación | Etiqueta |
|:---|:---|:---|
| Valor exacto + fecha exacta | 100% | "Exacto" |
| Valor exacto + fecha ±N días | 99 - N×2 | "Valor exacto, ±Nd" |
| Valor con tolerancia + fecha ±N días | Calculado | "Δ$X, ±Nd" |
| Valor con tolerancia amplia (hasta 2× tolerancia) | 20-50% | "Δ$X, ±Nd" |

---

### 4.6 Sistema de Marcado de Registros

Cada registro pendiente (tanto bancario como contable) puede marcarse con dos estados mutuamente excluyentes:

| Marca | Ícono | Color | Significado |
|:---|:---|:---|:---|
| **Sospechoso** | ⚠️ Triángulo de advertencia | Ámbar/Amarillo | "Este registro no tiene contraparte lógica, podría ser un error o un movimiento que no se contabilizó" |
| **Registrado** | ✓ Círculo de check | Verde | "Este registro ya fue contabilizado por otra vía y no necesita conciliación" |

#### Reglas de comportamiento:

- Al marcar como **Sospechoso**, se quita automáticamente la marca de **Registrado** (y viceversa)
- Las marcas se persisten **por cuenta** en el almacenamiento local
- Los contadores de marcas aparecen como **badges filtro** en la cabecera de cada panel:
  - Click en el badge activa el filtro (muestra solo registros con esa marca)
  - Click de nuevo desactiva el filtro
- Las filas marcadas se colorean visualmente (ámbar para sospechosos, verde para registrados)
- Los botones de marcado solo aparecen al pasar el cursor (hover) sobre la fila, excepto cuando ya están marcados (siempre visibles)

---

### 4.7 Filtros y Configuración

#### Filtro de Flujo (Ingresos/Egresos)

Un segmented control con 3 opciones:

| Opción | Comportamiento |
|:---|:---|
| **Todos** | Muestra todos los registros sin filtrar por signo |
| **Ingresos** | Solo registros con valor positivo (entradas de dinero) |
| **Egresos** | Solo registros con valor negativo (salidas de dinero) |

- Se aplica simultáneamente a ambos paneles (extracto y asientos)
- Al cambiar el filtro, se limpian las selecciones y sugerencias activas
- Se persiste por cuenta

#### Filtro de Rango de Fechas

- Botón tipo toggle que abre un sub-panel con dos campos de fecha (Desde / Hasta)
- Si hay rango activo, se muestra en el botón: `"15/01/2025 – 31/01/2025"`
- El rango afecta:
  - La conciliación automática (solo considera registros dentro del rango)
  - Las transferencias internas
- Botón "Limpiar" para desactivar el filtro
- Se persiste por cuenta

#### Parámetros de Conciliación

Panel colapsable (toggle con ícono de engranaje):

| Parámetro | Valor por defecto | Propósito |
|:---|:---|:---|
| **Tolerancia de Valor** | 2.000 | Diferencia máxima permitida en el monto para considerar una coincidencia |
| **Margen de Días** | 2 | Diferencia máxima en días de fecha para considerar una coincidencia |

Estos parámetros afectan:
- El algoritmo de conciliación automática (fases 2 y 3)
- El cross-highlighting (hover del extracto resalta asientos dentro de tolerancia)
- Las sugerencias del modo manual

---

## 5. Módulo: Modo Invertido (Búsqueda desde Contabilidad hacia Bancos)

### 5.1 Concepto

En el flujo normal, el usuario parte de un **movimiento bancario** y busca su contraparte **contable**. El Modo Invertido **invierte la dirección**: el usuario parte de un **asiento contable** y busca en cuál de las **cuentas bancarias** apareció ese movimiento.

### 5.2 Activación

- Botón toggle [↔ Invertir] en la cabecera del panel derecho (Asientos Contables)
- Al activarse por primera vez, el sistema carga los registros de **todas las cuentas bancarias** en paralelo
- Indicador visual: el panel derecho cambia de borde azul a naranja, y aparece un dot pulsante en el botón

### 5.3 Flujo de Uso

1. **Activar modo invertido** → el panel derecho cambia a modo selección múltiple
2. **Seleccionar uno o más asientos contables** → clicks en el panel derecho
3. El sistema **busca en todas las cuentas bancarias** registros cuyo valor absoluto coincida con la suma de los asientos seleccionados
4. Los resultados aparecen en un **panel naranja** entre la cabecera y los paneles:

```
┌──────────────────────────────────────────────────────────────┐
│ ↔ BÚSQUEDA INVERSA (2 asientos) suma: -$500.000        [✕]  │
│ 3 coincidencias                                              │
├──────────┬──────┬─────────┬──────────────┬────────┬─────────┤
│Cuenta    │Fecha │Valor    │Descripción   │Estado  │Acción   │
│──────────┼──────┼─────────┼──────────────┼────────┼─────────│
│★ Cta Corr│15/01 │-$500.000│Pago Proveedor│Pendiente│[Conciliar]│
│  Cta Aho │15/01 │-$500.000│Transfer.     │Conciliado│  —    │
│  Cta Nat │16/01 │-$500.000│Pago Servicio │Pendiente│[Conciliar]│
└──────────┴──────┴─────────┴──────────────┴────────┴─────────┘
```

### 5.4 Reglas de la Búsqueda Inversa

| Criterio | Condición |
|:---|:---|
| Valor absoluto | Debe coincidir exactamente con la suma de los asientos seleccionados |
| Signo | Debe coincidir (+ con +, - con -) |
| Todas las cuentas | Se busca en todas las cuentas financieras configuradas |

### 5.5 Resultados de la Búsqueda

Cada coincidencia muestra:

| Campo | Descripción |
|:---|:---|
| Cuenta Bancaria | Nombre de la cuenta donde se encontró el movimiento (★ = cuenta actualmente seleccionada) |
| Fecha | Fecha del movimiento bancario |
| Valor | Monto del movimiento |
| Descripción | Narrativa del banco |
| Estado | "Pendiente" (no conciliado) o "Conciliado" (ya vinculado a otro asiento) |
| Acción | Botón [Conciliar] solo para pendientes; para conciliados, link "Ver vínculo" |

### 5.6 Acción: Conciliar desde Modo Invertido

- Al presionar [Conciliar], el sistema vincula **cada asiento contable seleccionado** con el registro bancario elegido
- La vinculación se registra en el historial como tipo "Manual" con la etiqueta "Conciliación Inversa"
- Tras conciliar, se limpia la selección y se refresca el estado

---

## 6. Módulo: Detección de Transferencias Internas

### 6.1 Concepto

Las **transferencias entre cuentas propias** (ej: de Cuenta Corriente a Cuenta de Ahorros) generan dos movimientos opuestos: un egreso en la cuenta de origen y un ingreso en la cuenta de destino. Contablemente, no representan un gasto ni un ingreso real — son reclasificaciones.

Este módulo detecta automáticamente estos pares y los presenta como transferencias para facilitar su registro contable.

### 6.2 Algoritmo de Detección (5 fases)

#### Fase 0A — Referencia Bancaria Compartida (Máxima Certeza)

| Criterio | Condición |
|:---|:---|
| Tipo de registros | Un retiro (negativo) + un depósito (positivo) en cuentas **diferentes** |
| Referencia | Idéntica en ambos registros |
| Valor | Mismo valor absoluto |

**Comportamiento**: Si ambos registros comparten la misma referencia bancaria, se consideran las dos caras de la misma transferencia con máxima certeza.

#### Fase 0B — Monto + Fecha + Descripción de Transferencia

| Criterio | Condición |
|:---|:---|
| Tipo de registros | Retiro + depósito en cuentas diferentes |
| Valor absoluto | Idéntico |
| Fecha | Dentro del margen de días |
| Descripción | Contiene palabras clave de transferencia |

**Palabras clave de transferencia**: "TRANSFERENCIA CTA", "TRANSFERENCIA BANCARIA", "TRF ", "TRANSF "

#### Fase 1 — Monto Exacto + Fecha Exacta

| Criterio | Condición |
|:---|:---|
| Valor absoluto | Idéntico |
| Fecha | Exactamente igual |
| Cuentas | Diferentes |

#### Fase 2 — Monto Exacto + Fecha Flexible

| Criterio | Condición |
|:---|:---|
| Valor absoluto | Idéntico |
| Fecha | Dentro del margen configurado (±N días) |
| Cuentas | Diferentes |

#### Fase 3 — Detección por Texto (Retiros de Cajero y Consignaciones)

Detecta transferencias con una "Cuenta Virtual de Caja":

| Patrón | Descripción |
|:---|:---|
| Descripción contiene "RETIRO DE CAJERO" | El banco envía dinero → Caja (físico) |
| Descripción contiene "CONSIGNACION" | Caja envía dinero → Banco |

**Solo se aplica a registros no emparejados en fases anteriores**, para evitar falsos positivos.

### 6.3 Interfaz de Transferencias

Pestaña "Transferencias Int." con tabla que muestra:

| Columna | Descripción |
|:---|:---|
| Fecha | Fecha de la operación |
| Origen (Salida) | Cuenta que disminuyó (en rojo) + descripción + referencia |
| Destino (Entrada) | Cuenta que aumentó (en verde) + descripción + referencia |
| Valor | Monto de la transferencia (siempre positivo) |
| Conciliación | Badge "Conciliado" / "Pendiente" según si alguno de los registros ya fue conciliado |
| Estado | Toggle circular para marcar como "Registrado" (ya asentado contablemente) |

### 6.4 Exportación Contable

- Botón para **exportar las transferencias seleccionadas** como archivo separado por punto y coma (CSV)
- Cada transferencia genera **2 filas** en el archivo:
  1. Fila de origen: Crédito (salida de la cuenta origen)
  2. Fila de destino: Débito (entrada a la cuenta destino)

**Estructura del archivo de exportación:**

| Campo | Descripción |
|:---|:---|
| Tipo de documento | Código de tipo documental (ej: "RC") |
| Consecutivo | Número secuencial (ambas filas del par comparten el mismo) |
| Fecha de elaboración | Fecha de la transferencia |
| Fecha de vencimiento | Igual a fecha de elaboración |
| Código de cuenta | Código contable de la cuenta origen/destino |
| ID contacto | (Vacío) |
| Centro de costos | (Vacío) |
| Débito | Monto (solo en la fila de destino) |
| Crédito | Monto (solo en la fila de origen) |
| Base | (Vacío) |
| Descripción | "Transferencia de {Origen} a {Destino}" |
| Descripción movimiento | Narrativa original del banco |

### 6.5 Asistente de Exportación Contable

Existe un componente de **asistente (wizard)** para exportar transferencias con mayor control:
- Permite seleccionar qué transferencias incluir
- Genera el archivo con formato contable estandarizado
- Validaciones de datos antes de exportar

---

## 7. Módulo: Historial de Conciliaciones

### 7.1 Contenido

Pestaña "Historial" que muestra **todas las conciliaciones activas** de todas las cuentas bancarias en una única tabla consolidada.

### 7.2 Datos del Historial

| Columna | Descripción |
|:---|:---|
| Estado | Badge: "Conciliado" (verde) o "Revertido" (rojo) |
| Cuenta Banco | Nombre de la cuenta bancaria de origen |
| Fecha Banco | Fecha del movimiento bancario |
| Valor Banco | Monto del movimiento bancario |
| Desc. Banco | Descripción del movimiento bancario |
| Asiento/Doc | Número de documento del asiento + nombre del contacto |
| Valor Contable | Monto del asiento (con indicador de diferencia si aplica) |
| F. Conciliación | Fecha en que se realizó la vinculación + tipo (Automático/Manual) |
| Confianza | Pill de color con % de confianza del emparejamiento |
| Acciones | [Ver detalle] [Revertir] |

### 7.3 Acciones sobre el Historial

#### Ver Detalle
Modal con todos los campos del asiento contable vinculado.

#### Revertir Conciliación
- **Individual**: Botón de revertir por fila → eliminación inmediata del vínculo
- **Masiva**: Selección múltiple + botón de revertir en lote → confirmación con diálogo
- Al revertir, los registros vuelven a aparecer como "pendientes" en ambos paneles
- La reversión es una **eliminación real** del registro de historial (no un cambio de estado)

### 7.4 Búsqueda en Historial

Campo de búsqueda de texto que filtra el historial por cualquier campo visible.

---

## 8. Sistema de Notas

### 8.1 Funcionalidad

Cada registro (tanto del extracto bancario como del libro contable) puede tener una **nota/comentario** editable.

### 8.2 Flujo

1. Click en el ícono de nota (lápiz si no tiene nota, bocadillo si tiene)
2. Se abre un **modal** con un campo de texto largo
3. Al guardar, la nota se persiste directamente en el repositorio de datos del registro
4. La nota aparece como texto en itálica y truncada en la columna "Notas" de las tablas

---

## 9. Inteligencia y Cálculos — Resumen de Reglas de Negocio

### 9.1 Regla de Signos

| Extracto Bancario | Libro Contable | Interpretación |
|:---|:---|:---|
| Valor positivo (+) | Débito > Crédito | Ingreso/Entrada de dinero |
| Valor negativo (-) | Crédito > Débito | Egreso/Salida de dinero |

**Regla fundamental**: Solo se emparejan registros del **mismo signo**. Un ingreso bancario nunca se vincula con un egreso contable.

### 9.2 Cálculo de Valor Neto del Libro Contable

El valor de cada asiento contable se calcula como:
```
Valor Neto = Débito - Crédito
```

### 9.3 Detección de Duplicados Potenciales

Un registro contable pendiente se marca como **posible duplicado** si cumple:
- Existe otro registro contable **ya conciliado**
- Con el **mismo valor absoluto** y la **misma fecha**

Se genera una "huella digital" por registro: `|valor_absoluto|_YYYY-MM-DD`

### 9.4 Indicador de Confianza (Score Pill)

| Rango | Color | Significado |
|:---|:---|:---|
| ≥ 90% | Verde (Esmeralda) | Alta confianza — probablemente correcto |
| 70-89% | Ámbar | Media — revisar antes de confirmar |
| < 70% | Naranja | Baja — verificación manual recomendada |

### 9.5 Persistencia Local por Cuenta

Los siguientes estados se almacenan **por cuenta** en el almacenamiento local del cliente:

| Estado | Clave de almacenamiento |
|:---|:---|
| Cuenta seleccionada | `conciliacion_accountId` |
| Fecha desde/hasta | `conciliacion_{cuentaId}_dateFrom/dateTo` |
| Filtro de flujo | `conciliacion_{cuentaId}_flowFilter` |
| Columnas visibles (fuente) | `conciliacion_{cuentaId}_visibleSourceCols` |
| Columnas visibles (destino) | `conciliacion_{cuentaId}_visibleTargetCols` |
| Columnas visibles (matches) | `conciliacion_{cuentaId}_visibleMatchCols` |
| Búsqueda (fuente/destino) | `conciliacion_{cuentaId}_sourceSearch/targetSearch` |
| Cuentas excluidas | `conciliacion_{cuentaId}_targetExcludeAccounts` |
| IDs sospechosos (fuente) | `conciliacion_suspected_{cuentaId}` |
| IDs registrados (fuente) | `conciliacion_registered_{cuentaId}` |
| IDs sospechosos (destino) | `conciliacion_target_suspected_{cuentaId}` |
| IDs registrados (destino) | `conciliacion_target_registered_{cuentaId}` |
| Transferencias registradas | `conciliacion_registered_transfers` |

---

## 10. Escenarios Críticos

### 10.1 Escenario: Conciliación Automática Exitosa (Happy Path)

1. Usuario selecciona la cuenta "Cuenta Corriente" del selector
2. El sistema carga 200 movimientos bancarios y 500 asientos contables
3. KPIs muestran: 0 conciliados, 200 pendientes
4. Usuario presiona [✨ Buscar Sugerencias]
5. El sistema encuentra 150 coincidencias (120 al 100%, 30 entre 85-99%)
6. Usuario revisa la lista, rechaza 2 matches que parecen incorrectos
7. Usuario presiona [✓ Confirmar (148)]
8. El sistema guarda los 148 vínculos en lote
9. KPIs se actualizan: 148 conciliados, 52 pendientes
10. Los 148 pares desaparecen de los paneles de pendientes

### 10.2 Escenario: Vinculación Manual (Múltiples → Uno)

1. Usuario identifica 3 pagos parciales en el extracto: $100k, $150k, $250k
2. Hace click en los 3 registros (la barra muestra: "3 registros — Total: $500.000")
3. La sugerencia muestra un asiento contable por $500k con 100% confianza
4. Usuario hace click en [Vincular]
5. Se crean 3 vínculos (uno por cada registro bancario → mismo asiento)

### 10.3 Escenario: Búsqueda Inversa

1. Usuario ve un asiento contable de -$1.200.000 sin aparente contraparte
2. Activa [↔ Invertir]
3. Selecciona el asiento → aparece panel naranja
4. El sistema busca en las 3 cuentas bancarias
5. Encuentra el movimiento en "Cta Ahorros" (que no es la cuenta actualmente seleccionada)
6. Usuario presiona [Conciliar]
7. El vínculo se guarda correctamente referenciando la tabla de "Cta Ahorros"

### 10.4 Escenario: Reversión de Conciliación Errónea

1. Usuario detecta en el Historial que un match fue incorrecto
2. Presiona [↩ Revertir] en la fila
3. El sistema elimina el registro del historial
4. Ambos registros (bancario y contable) reaparecen como "pendientes"

### 10.5 Control de Errores

| Situación | Comportamiento |
|:---|:---|
| Error de red al guardar | Alerta con mensaje de error, no se modifica el estado local |
| Registro ya conciliado por otro usuario | El sistema re-consulta los IDs conciliados antes de mostrar pendientes |
| Datos inválidos (fecha vacía, monto cero) | Se muestran con indicadores vacíos ("—"), pero no se excluyen |
| Registro eliminado tras conciliar | Sistema de limpieza de huérfanos (desactivado por seguridad en la versión actual) |

---

## 11. Carga y Paginación de Datos

### 11.1 Estrategia de Carga

Los datos se cargan mediante **paginación progresiva** con bloques de 1.000 registros:

1. Solicitar los primeros 1.000 registros ordenados por fecha descendente
2. Si devuelve 1.000 → solicitar el siguiente bloque (1.000 a 1.999)
3. Repetir hasta que un bloque devuelva < 1.000 registros (fin de datos)
4. Concatenar todos los bloques en memoria

### 11.2 Carga Paralela

Al iniciar, el sistema carga en paralelo:
- Registros del extracto bancario (cuenta seleccionada)
- Registros del libro contable (todos)
- IDs conciliados (estado actual)
- Historial de conciliaciones

### 11.3 Feedback Visual

- **Overlay semitransparente** con spinner durante la carga inicial (no desmonta los paneles, solo atenúa)
- Los paneles mantienen su último estado visible durante la recarga
- Indicadores de carga independientes para transferencias y modo invertido

---

## 12. Interconexiones con Otros Módulos

### Entradas (datos que consume este módulo)

| Módulo/Fuente | Dato | Propósito |
|:---|:---|:---|
| Extractos Bancarios | Registros de movimientos por cuenta | Panel izquierdo (fuente) |
| Libro Contable | Asientos con débito/crédito | Panel derecho (destino) |

### Salidas (datos que produce o afecta)

| Módulo/Destino | Dato | Propósito |
|:---|:---|:---|
| Historial de Conciliación | Vínculos fuente↔destino | Trazabilidad y auditoría |
| Exportación Contable | Archivo CSV de transferencias | Importación en software contable |
| Detección de Duplicados | Marcas de duplicados potenciales | Calidad de datos |

---

## 13. Glosario de Términos Genéricos

| Término en este documento | Significado |
|:---|:---|
| **Cuenta Financiera** | Cualquier cuenta bancaria, de ahorro, corriente o equivalente |
| **Extracto Bancario** | Lista de movimientos de una cuenta financiera en un período |
| **Libro Contable** | Registro centralizado de asientos contables de la organización |
| **Asiento Contable** | Un registro individual en el libro contable (con débito y crédito) |
| **Conciliación** | El acto de vincular un movimiento bancario con su asiento contable |
| **Match / Emparejamiento** | Coincidencia encontrada por el algoritmo entre un registro bancario y uno contable |
| **Puntuación de Confianza** | Porcentaje que indica qué tan probable es que dos registros se correspondan |
| **Tolerancia** | Margen permitido de diferencia en valor para considerar una coincidencia |
| **Modo Invertido** | Búsqueda desde el libro contable hacia las cuentas bancarias |
| **Transferencia Interna** | Movimiento de fondos entre cuentas propias de la misma organización |
| **Fuente / Source** | El extracto bancario (panel izquierdo) |
| **Destino / Target** | El libro contable (panel derecho) |
| **Barra Sticky** | Panel interactivo que aparece entre la cabecera y los paneles cuando hay sugerencias o selección activa |
| **Cross-highlighting** | Resaltado cruzado: al pasar el cursor en un panel, se iluminan coincidencias en el otro |
