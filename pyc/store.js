// ═══ Fine Planificación y Compras — almacenamiento robusto ═══
// Modelo: colecciones keyeadas por id; cada registro lleva updatedAt (ms).
// Merge por registro (gana el updatedAt más nuevo) — nunca "el último pisa todo".
// Persistencia: localStorage (inmediato) + Supabase (debounced, solo si hay cambios).

const PYC_LS_KEY = 'fine_pyc_v1';
const PYC_SB_URL = 'https://njxmxzddhukquspzrjwh.supabase.co';
const PYC_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qeG14emRkaHVrcXVzcHpyandoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2NzI4NzEsImV4cCI6MjA4OTI0ODg3MX0.9K7CegfGzCTRUhAh95y8M3zx7XEE29KhzLzuZ-o5dZo';
const PYC_SB_TABLE = 'app_state';

// Estado global: cada colección es {id: registro}
const DB = {
  insumos: {},      // codigo → {codigo,nombre,um,tipo,precio,moneda,proveedor,fechaPrecio,updatedAt}
  proveedores: {},  // id → {...}
  productos: {},    // codigo PT → {codigo,nombre,loteMin,politicaDias,skuCore,insumos[],updatedAt}
  lotes: {},        // id → {id,codigo,lote,cantidad,vencimiento,ubicacion,abierto,proveedor,fecha,revalida?,updatedAt}
  ocs: {},          // id → {id,nro,proveedor,fecha,moneda,tc,condPago,leadTime,obs,items[],estado,factura?,updatedAt}
  facturas: {},     // id → {id,fecha,proveedor,numero,monto,moneda,vencimiento,situacion,obs,drive,empresa,ocId?,updatedAt}
  ofs: {},          // id → órdenes a fazón {id,nro,fazon,productos[],lineas[],estado,recepciones[],updatedAt}
  forecast: {},     // id `SKU|aaaa-mm` → {id,sku,mes,unidades,updatedAt}
  stockpt: {},      // id SKU → {id,sku,unidades,fecha,updatedAt}  (stock PT actual de Fine Core)
  mps: {},          // id `PT-xxxx|aaaa-mm` → {id,cod,mes,cantidad,manual:true} overrides del plan
  movimientos: {},  // id → {id,fecha,tipo,codigo,nombre,cantidad,desde,hacia,ref,updatedAt}
  config: {},       // posiciones → {id:'posiciones', lista:[...]}
};
const COLLS = Object.keys(DB);

let _dirty = false;
let _saveTimer = null;
let SB = null;
try { SB = supabase.createClient(PYC_SB_URL, PYC_SB_KEY); } catch(e) { console.warn('Supabase offline', e); }

// ── Utilidades ──
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const now = () => Date.now();

// ── Merge por registro: gana updatedAt más nuevo ──
function mergeColl(local, remote) {
  const out = { ...local };
  Object.entries(remote || {}).forEach(([id, rec]) => {
    if (!out[id] || (rec.updatedAt || 0) > (out[id].updatedAt || 0)) out[id] = rec;
  });
  return out;
}
function mergeAll(remote) {
  COLLS.forEach(c => { DB[c] = mergeColl(DB[c], remote?.[c]); });
}

// ── Escritura de registros (siempre por acá: estampa updatedAt) ──
function putRec(coll, id, rec) {
  DB[coll][id] = { ...rec, updatedAt: now() };
  scheduleSave();
}
function delRec(coll, id) {
  // borrado lógico con tumba: sobrevive a merges (updatedAt nuevo + _deleted)
  DB[coll][id] = { ...(DB[coll][id] || {}), _deleted: true, updatedAt: now() };
  scheduleSave();
}
function allRecs(coll) {
  return Object.values(DB[coll]).filter(r => !r._deleted);
}

// ── Persistencia ──
function saveLocal() {
  try { localStorage.setItem(PYC_LS_KEY, JSON.stringify({ colls: DB, ts: now() })); } catch(e) {}
}
async function saveRemote() {
  if (!SB) { setSaveInd('offline'); return; }
  setSaveInd('sync');
  try {
    // leer remoto y mergear antes de escribir — nunca pisar registros ajenos
    const { data } = await SB.from(PYC_SB_TABLE).select('value').eq('key', PYC_LS_KEY).maybeSingle();
    if (data?.value?.colls) mergeAll(data.value.colls);
    saveLocal();
    const { error } = await SB.from(PYC_SB_TABLE).upsert(
      { key: PYC_LS_KEY, value: { colls: DB, ts: now() }, update_at: new Date().toISOString() },
      { onConflict: 'key' });
    setSaveInd(error ? 'err' : 'ok');
  } catch(e) { console.warn('saveRemote', e); setSaveInd('err'); }
}
function scheduleSave() {
  _dirty = true;
  saveLocal();
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { _dirty = false; saveRemote(); }, 900);
}

function setSaveInd(st) {
  const el = document.getElementById('save-ind');
  if (!el) return;
  const map = { sync: '⟳ sincronizando…', ok: '● guardado en la nube', err: '⚠ error de red', offline: '○ offline' };
  el.textContent = map[st] || st;
  el.className = 'save-ind' + (st === 'ok' ? ' ok' : '');
}

// ── Carga inicial: local → remoto → seeds ──
async function initStore() {
  try {
    const raw = localStorage.getItem(PYC_LS_KEY);
    if (raw) mergeAll(JSON.parse(raw).colls);
  } catch(e) {}
  if (SB) {
    try {
      const { data } = await SB.from(PYC_SB_TABLE).select('value').eq('key', PYC_LS_KEY).maybeSingle();
      if (data?.value?.colls) mergeAll(data.value.colls);
    } catch(e) { console.warn('load remote', e); }
  }
  // Seeds: solo si la colección está vacía (primera vez)
  let seeded = false;
  if (!Object.keys(DB.insumos).length && typeof SEED_INSUMOS !== 'undefined') {
    SEED_INSUMOS.forEach(i => { DB.insumos[i.codigo] = { ...i, updatedAt: 1 }; }); seeded = true;
  }
  if (!Object.keys(DB.proveedores).length && typeof SEED_PROVEEDORES !== 'undefined') {
    SEED_PROVEEDORES.forEach(p => { const id = p.codigo || p.nombre || uid(); DB.proveedores[id] = { id, ...p, updatedAt: 1 }; }); seeded = true;
  }
  if (!Object.keys(DB.productos).length && typeof SEED_PRODUCTOS !== 'undefined') {
    SEED_PRODUCTOS.forEach(p => { DB.productos[p.codigo] = { ...p, updatedAt: 1 }; }); seeded = true;
  }
  if (!Object.keys(DB.lotes).length && typeof SEED_LOTES !== 'undefined') {
    SEED_LOTES.forEach(l => { DB.lotes[l.id] = { ...l, updatedAt: 1 }; }); seeded = true;
  }
  if (!DB.config.posiciones && typeof SEED_POSICIONES !== 'undefined') {
    DB.config.posiciones = { id: 'posiciones', lista: SEED_POSICIONES, updatedAt: 1 }; seeded = true;
  }
  if (seeded) { saveLocal(); saveRemote(); }
  setSaveInd('ok');
}
