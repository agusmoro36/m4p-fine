# Fine · Planificación y Compras — Especificación del sistema nuevo (v2)

> Sistema nuevo, limpio, construido desde cero copiando **solo lo que sirve** del MRP actual.
> Es el **modelo funcional** que luego se recreará como módulo dentro de Fine Core.
> Estética: ver `ESTETICA.md`. Definido con Agustina — julio 2026.

---

## 🛒 MENÚ COMPRAS

### 1. Órdenes de Compra
- **Estados: solo `Pendiente` y `Entregada`.**
- **Recepción integrada en la OC** (desaparece la página "Recepción Depósito"):
  - Seleccionás la OC → ingresás *cantidad recibida + lote + fecha de vencimiento*.
  - **Recepciones parciales**: la OC acumula recepciones (cada una con su lote/vto); muestra el **saldo a entregar** (ej: 60/100 · faltan 40) y pasa a `Entregada` sola al completarse.
  - Cada recepción suma stock (con su lote) al momento.
- **Factura adjunta**: al subir el PDF, el sistema **extrae la fecha de vencimiento de pago** de la factura (auto, con confirmación manual si no la detecta). Sirve para saber cuándo pagar.
- **⚠ Integración con Fine Core (decisión 21-jul)**: este sistema **NO tiene módulo de facturas propio** — las facturas viven en el **módulo CFO** de Fine Core (finanzas). Al unificar, la OC debe **linkear la factura del CFO** (por proveedor/N° de OC): de ahí salen vencimiento de pago y estado pagada, sin doble carga. En el prototipo actual solo persiste el adjunto puntual por OC (`oc.factura`).

### 2. OCs Propuestas
- Las que propone el MRP (ver Planificación). Convertibles en OC con un click.

---

## 📚 MENÚ MAESTROS

### Maestro de Insumos
- **Fusión** de los actuales Maestro de Insumos + Maestro de Precios en uno solo (mismos datos: código, descripción, UM, precio, moneda, proveedor, etc.).

### Maestro de Proveedores

### Maestro de Producto Terminado
- Click en un producto → **se abre su fórmula por batch** (BOM completo).
- Campo **política de stock en días** por producto (ej: FIT 45, BEAUTY 30) → la lee el MPS.
- (Recomendado: campo SKU Fine Core para el mapeo PT-XXXX ↔ catálogo Core.)

---

## 🏭 MENÚ PRODUCCIÓN

### Órdenes a Fazón
- Como la v1 ya construida: multi-producto, explota BOM y consolida cantidad por insumo, columna "productos que lo consumen", PDF A4 horizontal (cant. enviada + lote + vto), estados borrador→despachada→producción→recibida, recepción por producto.
- **Regla de sugerencia en el despacho: envases `abiertos` primero → luego cerrados por FEFO** (vencimiento más próximo). Contexto: al cerrar la planta quedó bastante stock abierto que se envía primero.

### Stock de Insumos
- Por insumo/lote: cantidad · UM · productos que lo consumen · lote · vencimiento.
- **Flag "abierto"** por lote (lo marca la usuaria).
- **Reválidas**: adjuntar PDF → el sistema **extrae la nueva fecha de vencimiento** y actualiza el lote.
- **Ubicación por posiciones fijas** (desplegable, estilo "MP60" — lista configurable, Agustina la pasa cuando la tenga) **+ "Nutratec" como ubicación**.

### Nutratec como ubicación (modelo de consignación)
- El **despacho a fazón transfiere** el insumo a ubicación "Nutratec" (sigue siendo stock propio, visible).
- Al **ingresar producto terminado**, se descuenta de Nutratec lo consumido = **BOM × cantidad producida**; el sobrante (ej: bolsa cerrada de más) **queda en Nutratec** para próximas producciones.

### Historial de Movimientos
- Entradas (recepciones de OC) y salidas/transferencias (ej: envíos a Nutratec), con referencia.

---

## 📈 MENÚ PLANIFICACIÓN

### Forecast
- Pronóstico de venta de PT **levantado de Fine Core**. Doble vía: **import CSV** (hoy) y **API** (cuando haya acceso — hablar con Yul). El sistema queda preparado para ambas.

### Plan de Producción Fazón (MPS)
- Grilla por producto, **horizonte 9 meses**. Cruza:
  - Forecast Fine Core (demanda/mes)
  - **Stock actual de PT** total de Fine Core
  - **Órdenes a Fazón pendientes de ingreso**
  - **Política de stock (días)** del Maestro de PT
- Calcula stock proyectado mes a mes y **propone producción por batches** (múltiplos del lote mínimo del BOM), mostrada también **en unidades**, **editable a mano**.

### Circuito completo
**MPS → MRP → Compras**: lo planificado explota BOM → necesidades de insumos vs stock (incl. Nutratec) → **OCs Propuestas**.

---

## 📊 MENÚ REPORTES

### Semáforo de Insumos
- Semáforo de cobertura (verde/amarillo/rojo) por insumo, **situación actual + 3 meses siguientes** — cruza stock (incl. Nutratec) con las necesidades del plan (MPS→MRP). Igual criterio de pills DFC que el sistema actual.

### Calculadora MRP
- Se copia tal cual del sistema actual: producto + cantidad → explota BOM → alcanza/no alcanza, faltantes y cuánto comprar. Herramienta de simulación rápida.

---

## Transversales
- Estética según `ESTETICA.md` (crema/dorado, Cormorant + JetBrains Mono, modo oscuro).
- **Guardado robusto desde el día 1**: merge por ID, sin "el último pisa todo" (preparado para multi-usuario).
- **Migración de datos reales** del sistema v1: insumos+precios, BOM, proveedores, OCs, stock con lotes.
- El sistema v1 queda intacto como respaldo hasta completar la transición.

## Páginas del v1 que NO pasan
Dashboard/Alertas (se rediseña después si hace falta) · Recepción Depósito (absorbida por OCs) · Plan de Producción viejo · Proyección Stock · Planificador IA · Producción Real (la planta cerró) · Facturas (absorbida por OCs) · Cotizaciones · Análisis PPP · Dashboard de Costos · Importar Excel (queda como utilidad interna de migración).
(La **Calculadora MRP** sí pasa → Menú Reportes.)
