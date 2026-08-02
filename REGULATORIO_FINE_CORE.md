# Módulo Regulatorio — spec para Fine Core

> Documento de handoff para el equipo/agente que mantiene **Fine Core**.
> Hay un **prototipo funcional andando** en P&C (`/pyc/`, menú "Regulatorio") que sirve de
> referencia visual y de modelo de datos. Este documento describe qué construir en Core.
>
> Prototipo: https://agusmoro36.github.io/m4p-fine/pyc/ → menú **Regulatorio**
> Código: `pyc/app.js` (sección `═══ REGULATORIO ═══`), `pyc/store.js` (colecciones `regdocs` y `regtramites`)

---

## 1. Qué es y qué problema resuelve

Es la **carpeta regulatoria de la empresa, con alarma**. Hoy vive en papel y en la cabeza de
Agustina: los certificados están en una carpeta física y el único mecanismo de aviso es acordarse.

Cubre dos cosas distintas que hoy se confunden:

```
TRÁMITE (expediente en curso)                 REGISTRO (lo que quedó otorgado)
────────────────────────────                  ─────────────────────────────────
"El RNPA de Morning Boost"                    "RNPA 04-123456, vence 2031"
"La renovación de matafuegos"        ───►     "Matafuegos depósito, vence 08/2027"
"La aprobación del rótulo para Chile"         "Rótulo Chile aprobado"

tiene: checklist de requisitos,               tiene: número, emisión, vencimiento,
estado, expediente, organismo, plazos         alerta anticipada, responsable
```

El trámite **produce** el registro. El registro, cuando se acerca su vencimiento, **abre** el
trámite de renovación. Ese ciclo cerrado es todo el módulo.

**Alcance explícito:** esto es regulatorio *de la empresa y de los productos* — RNE, RNPA,
habilitación municipal, matafuegos, bomberos, control de plagas, potabilidad de agua, libretas
sanitarias, seguros, rótulos aprobados, certificados de libre venta y registros en país de destino.

**No es** el vencimiento de la mercadería: los lotes de insumos y su vencimiento ya viven en Core
(stock por lote). El módulo regulatorio no toca insumos ni lotes.

---

## 2. Modelo de datos

Dos entidades. En el prototipo son dos colecciones del blob JSON; en Core deberían ser dos tablas.

### 2.1 `regdocs` — registros y habilitaciones vigentes

```jsonc
{
  "id": "…",
  "tipo": "Matafuegos",          // enum, ver §2.3
  "nombre": "Matafuegos depósito · 6 extintores ABC",  // cómo lo reconoce ella
  "alcance": "Depósito",         // Empresa | Depósito | Oficina | Nutratec (fazón) | Producto
  "producto": "PT-0001",         // solo si alcance = Producto → FK al maestro de PT
  "pais": "Chile",               // solo export (libre venta, registro en destino)
  "organismo": "Bomberos",
  "numero": "RNPA 04-123456",
  "emision": "2026-08-02",
  "vencimiento": "2027-08-02",   // vacío = no vence
  "alertaDias": 60,              // con cuánta anticipación avisar
  "responsable": "Agustina Moro",
  "estado": "vigente",           // vigente | baja  (baja = reemplazado o ya no aplica)
  "obs": "original en carpeta regulatoria, copia en Drive"
}
```

### 2.2 `regtramites` — expedientes en curso

```jsonc
{
  "id": "…",
  "tipo": "RNPA",
  "nombre": "RNPA Morning Boost — lanzamiento",
  "alcance": "Producto", "producto": "PT-0014", "pais": "",
  "organismo": "ANMAT",
  "expediente": "EX-2026-0012345",
  "estado": "presentado",        // preparacion | presentado | observado | aprobado | rechazado
  "responsable": "Agustina Moro",
  "inicio": "2026-08-02", "presentado": "2026-08-20", "resuelto": "",
  "costo": 185000,
  "obs": "INAL observó la declaración de alérgenos",
  "requisitos": [               // checklist — el corazón del módulo para lanzamientos
    { "texto": "Fórmula cuali-cuantitativa", "ok": true,  "nota": "" },
    { "texto": "Proyecto de rótulo",         "ok": false, "nota": "falta arte final" }
  ],
  "docId":    "…",              // registro que emitió al aprobarse
  "renuevaId": "…"              // registro que viene a reemplazar (si es una renovación)
}
```

### 2.3 Enums

**Tipos** (con vigencia habitual, que precarga el vencimiento sugerido — siempre editable, manda
lo que diga el papel):

| Tipo | Alcance sugerido | Vigencia habitual |
|---|---|---|
| RNE · Registro Nacional de Establecimiento | Empresa | 5 años |
| RNPA · Registro Nacional de Producto Alimenticio | Producto | 5 años |
| Rótulo · arte aprobado | Producto | no vence |
| Certificado de libre venta (export) | Producto | 1 año |
| Registro en país de destino (export) | Producto | no vence |
| Habilitación municipal | Depósito | 1 año |
| Matafuegos · recarga y control | Depósito | 1 año |
| Certificado de bomberos | Depósito | 1 año |
| Control de plagas | Depósito | 6 meses |
| Análisis de potabilidad de agua | Depósito | 6 meses |
| Libretas sanitarias del personal | Empresa | 1 año |
| Seguro / ART | Empresa | 1 año |
| Residuos y efluentes | Depósito | 1 año |
| Otro | Empresa | no vence |

**Alcances:** `Empresa`, `Depósito`, `Oficina`, `Nutratec (fazón)`, `Producto`.
Nutratec está en la lista a propósito: es el fazonero, y su RNE y habilitaciones son un riesgo de
Fine aunque el papel sea de ellos.

**Organismos** (sugerencias de autocompletado, campo libre): ANMAT, INAL, Municipalidad, Bomberos,
SENASA, Ministerio de Salud provincial, ART / aseguradora, Otro.

---

## 3. Reglas de negocio

### 3.1 Semáforo de vigencia
```
sin vencimiento           → gris, no alerta
vencimiento < hoy         → ROJO   "vencido hace N días"
vencimiento ≤ hoy + alertaDias → ÁMBAR "vence en N días"
resto                     → VERDE  (mostrar meses/años, no días sueltos)
estado = baja             → gris, fuera del semáforo y del contador
```
`alertaDias` es **por registro** (60 por defecto). Un matafuego con 30 días de aviso alcanza; un
RNPA necesita 180 porque el trámite tarda.

### 3.2 Renovación
Desde un registro, "Iniciar renovación" crea un trámite del mismo tipo/alcance/producto, con:
- el checklist estándar del tipo precargado,
- `renuevaId` apuntando al registro que reemplaza,
- observación automática con el número y vencimiento del registro que vence.

### 3.3 Emisión (trámite aprobado → registro)
Al pasar un trámite a `aprobado`, el sistema pide cargar el certificado obtenido. Precarga tipo,
alcance, producto, organismo, expediente como número, `emision` = fecha de resolución y
`vencimiento` = emisión + vigencia habitual del tipo (estimado, editable).
Si el trámite era una renovación, **el registro anterior pasa solo a `baja`** — no se borra, queda
como antecedente.

### 3.4 Borrado
Igual que el resto de P&C: **tumba lógica**, nunca delete físico. Un certificado vencido que ya no
aplica se pone en `baja`, no se borra: el antecedente es lo que se muestra en una inspección.

---

## 4. Pantallas

**Registros y Habilitaciones** — la tabla es el calendario regulatorio. Ordenada por vencimiento
(vencidos arriba, sin vencimiento al final). KPIs: vigentes / por vencer / vencidos / trámites en
curso. Filtros por alcance y por estado de vigencia, búsqueda libre, export CSV.

**Trámites** — filtrada por defecto a los que están sin cerrar. Columnas: estado, tipo + detalle,
alcance, organismo, **requisitos cumplidos (3/7)**, inicio, presentado, días abierto, responsable.
El modal tiene el checklist editable con el botón "checklist estándar del tipo".

**Badge en el menú** — el ítem de Registros lleva un contador de vencidos + por vencer, rojo si hay
alguno vencido. Es lo que hace que el módulo sirva sin entrar a mirarlo.

---

## 5. Lo que el prototipo NO tiene y Core sí debería dar

Esto es lo que justifica que el módulo viva en Core y no en P&C:

1. **Adjuntar el PDF del certificado.** Hoy solo hay un campo de observaciones que dice dónde está
   el papel. El certificado escaneado tiene que poder colgarse del registro. Core ya maneja
   adjuntos (facturas de OC), así que es el mismo mecanismo.
2. **Aviso por mail.** El badge sirve si entrás; el mail sirve si no entrás. Un digest semanal con
   lo que vence en los próximos 60 días es la funcionalidad de más valor de todo el módulo.
3. **Producto = la entidad de Core.** `producto` referencia `PT-xxxx` de P&C. En Core es
   directamente el producto/SKU comercial — y ahí aparece lo interesante: **un producto sin RNPA
   vigente no debería poder venderse ni planificarse**. Ese cruce hoy no existe en ningún lado.
4. **Permisos.** Aplica lo definido en la ronda 16: edita el usuario de Agustina, el resto mira.
   Mismo esquema que P&C (`pyc: 2` / `pyc: 1`), o un flag propio si conviene separarlo.
5. **Auditoría.** Quién cambió una fecha de vencimiento y cuándo. En una inspección eso importa.

---

## 6. Datos de arranque

**No hay datos para migrar.** Los certificados están en papel y en PDFs sueltos; el módulo arranca
vacío y Agustina los carga a mano. Es una ventaja para Core: no hay conciliación ni mapeos, solo
las dos tablas nuevas.

Sugerencia de orden de carga, de mayor a menor riesgo si se vence:
1. RNE y habilitación municipal (sin eso no se opera).
2. Matafuegos, bomberos, control de plagas, potabilidad (inspección de rutina).
3. RNPA de cada producto activo.
4. Rótulos aprobados y libre venta (export).
5. Seguros, libretas sanitarias.

---

## 7. Preguntas para el lado de Core

1. **¿Va como módulo propio o como pestaña dentro del maestro de productos?** Los registros de
   producto (RNPA, rótulo, libre venta) son naturalmente una pestaña del producto; los de empresa
   y depósito no tienen dónde colgarse. El prototipo los pone juntos porque es la misma carpeta
   física y la misma persona; se puede partir si en Core queda más natural.
2. **¿Hay ya un mecanismo de notificaciones por mail?** Si existe, el digest de vencimientos es
   casi gratis. Si no, ¿conviene reusar lo que use el CFO para vencimientos de pago?
3. **¿Adjuntos: qué límite de tamaño y dónde se guardan?** Los certificados escaneados suelen ser
   PDFs de varios MB.
4. **¿Se quiere el bloqueo duro** de "producto sin RNPA vigente no se planifica / no se vende", o
   alcanza con una advertencia visible? Es una decisión de negocio, no técnica.

---

## 8. Cosas que no hay que romper

- **`alertaDias` es por registro, no global.** Un matafuego y un RNPA no se avisan con la misma
  anticipación, porque los trámites tardan cosas distintas.
- **Un registro dado de baja no se borra.** Es el antecedente que se muestra en una inspección.
- **El vencimiento sugerido por tipo es una estimación.** Siempre manda la fecha del certificado;
  la precarga es una comodidad, no una fuente de verdad.
- **Nutratec es un alcance válido.** Fine depende de las habilitaciones del fazonero aunque el
  papel no sea suyo. Un modelo que solo contemple establecimientos propios deja ese riesgo afuera.
- **Esto no toca vencimientos de mercadería.** Los lotes de insumos ya están en Core; mezclar las
  dos cosas en una sola pantalla de "vencimientos" confunde dos problemas distintos.
