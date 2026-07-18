// ═══ Fine Planificación y Compras — app (Fase 1: Maestros) ═══

// ── Helpers ──
const fmt = (n, dec = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec });
// Normaliza para búsqueda: minúsculas y sin acentos ("citrico" encuentra "Cítrico")
const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
function toast(msg, icon = '✓', dur = 2800) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = `<span>${icon}</span><span>${esc(msg)}</span>`;
  box.appendChild(t);
  setTimeout(() => t.remove(), dur);
}
function openM(id) { document.getElementById(id).classList.add('open'); }
function closeM(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('click', e => { if (e.target.classList?.contains('overlay')) e.target.classList.remove('open'); });

// ── Navegación ──
const TITLES = {
  minsumos: 'Maestro de Insumos', mproveedores: 'Maestro de Proveedores', mproductos: 'Maestro de Producto Terminado',
  stock: 'Stock de Insumos', historial: 'Historial de Movimientos', calculadora: 'Calculadora MRP',
  ocs: 'Órdenes de Compra', ofs: 'Órdenes a Fazón',
  forecast: 'Forecast', mps: 'Plan de Producción Fazón (MPS)', propuestas: 'OCs Propuestas', semaforo: 'Semáforo de Insumos',
};
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (!pg) return;
  pg.classList.add('active');
  const _it = document.querySelector(`.nav-item[data-page="${id}"]`);
  _it?.classList.add('active');
  _expandirGrupoDe(_it);
  document.getElementById('tb-title').innerHTML = `${TITLES[id] || id} <span>· Fine Planificación y Compras</span>`;
  const renders = { minsumos: renderInsumos, mproveedores: renderProveedores, mproductos: renderProductos,
    stock: renderStock, historial: renderHistorial, calculadora: renderCalc, ocs: renderOCs, ofs: renderOFs,
    forecast: renderForecast, mps: renderMPS, propuestas: renderPropuestas, semaforo: renderSemaforo };
  renders[id]?.();
}
// ── Grupos de menú colapsables (▾) con memoria ──
function _navState() { try { return JSON.parse(localStorage.getItem('pyc_nav_collapse') || '[]'); } catch(e) { return []; } }
function _navApply(el, collapsed) {
  el.classList.toggle('collapsed', collapsed);
  let n = el.nextElementSibling;
  while (n && !n.classList.contains('nav-group')) {
    n.classList.toggle('hid', collapsed);
    n = n.nextElementSibling;
  }
}
function toggleNavGroup(el) {
  _navApply(el, !el.classList.contains('collapsed'));
  const st = [...document.querySelectorAll('.nav-group')].filter(g => g.classList.contains('collapsed')).map(g => g.textContent.trim());
  try { localStorage.setItem('pyc_nav_collapse', JSON.stringify(st)); } catch(e) {}
}
function restaurarNav() {
  const st = _navState();
  document.querySelectorAll('.nav-group').forEach(g => { if (st.includes(g.textContent.trim())) _navApply(g, true); });
}
function _expandirGrupoDe(item) {
  if (!item) return;
  let n = item.previousElementSibling;
  while (n && !n.classList.contains('nav-group')) n = n.previousElementSibling;
  if (n && n.classList.contains('collapsed')) _navApply(n, false);
}

function toggleDark() {
  document.documentElement.classList.toggle('dark');
  try { localStorage.setItem('pyc_dark', document.documentElement.classList.contains('dark') ? '1' : '0'); } catch(e) {}
}
if (localStorage.getItem('pyc_dark') === '1') document.documentElement.classList.add('dark');

// ── Paginación genérica ──
function renderPag(elId, total, per, cur, cb) {
  const el = document.getElementById(elId);
  if (!el) return;
  const pages = Math.max(1, Math.ceil(total / per));
  if (pages === 1) { el.innerHTML = total ? `<span class="pag-info">${total} registros</span>` : ''; return; }
  let h = `<span class="pag-info">${total} registros</span>`;
  for (let p = 1; p <= pages; p++) h += `<button class="${p === cur ? 'cur' : ''}" data-p="${p}">${p}</button>`;
  el.innerHTML = h;
  el.querySelectorAll('button').forEach(b => b.onclick = () => cb(parseInt(b.dataset.p, 10)));
}

// ═══════════════ MAESTRO DE INSUMOS ═══════════════
let insPage = 1;
const INS_PER = 25;
// Mapa insumo → productos que lo consumen (calculado en vivo desde las fórmulas)
function usoInsumos() {
  const map = {};
  allRecs('productos').forEach(p => (p.insumos || []).forEach(i => {
    if (!map[i.codigo]) map[i.codigo] = [];
    if (!map[i.codigo].includes(p.nombre)) map[i.codigo].push(p.nombre);
  }));
  return map;
}
function insumosFiltrados(uso) {
  const q = norm(document.getElementById('s-insumos')?.value || '');
  const ft = document.getElementById('f-ins-tipo')?.value || '';
  return allRecs('insumos')
    .filter(i => (!ft || i.tipo === ft) &&
      (!q || norm(i.codigo).includes(q) || norm(i.nombre).includes(q) || norm(i.proveedor).includes(q)
        || norm((uso[i.codigo] || []).join(' ')).includes(q)))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
function renderInsumos() {
  const uso = usoInsumos();
  const data = insumosFiltrados(uso);
  const kp = document.getElementById('ins-kpis');
  const all = allRecs('insumos');
  const conPrecio = all.filter(i => i.precio > 0).length;
  kp.innerHTML = [
    ['Insumos', all.length, 'var(--gold)'],
    ['Con precio', conPrecio, 'var(--green)'],
    ['Sin precio', all.length - conPrecio, 'var(--red)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');

  const start = (insPage - 1) * INS_PER;
  const slice = data.slice(start, start + INS_PER);
  document.getElementById('tbl-insumos').innerHTML = slice.map(i => {
    const prods = uso[i.codigo] || [];
    const prodsHtml = prods.length
      ? `<span style="font-size:11px;color:var(--gold2)">${esc(prods.join(', '))}</span>`
      : '<span style="color:var(--text3)">—</span>';
    return `
    <tr class="clickable" onclick="editInsumo('${esc(i.codigo)}')">
      <td class="mono">${esc(i.codigo)}</td>
      <td style="font-weight:600">${esc(i.nombre)}</td>
      <td style="max-width:230px">${prodsHtml}</td>
      <td class="tc"><span class="pill pill-${i.tipo.toLowerCase()}">${i.tipo}</span></td>
      <td class="tc mono">${esc(i.um)}</td>
      <td class="num">${i.precio > 0 ? (i.moneda === 'ARS' ? '$ ' : 'USD ') + fmt(i.precio) : '—'}</td>
      <td>${esc(i.proveedor || '—')}</td>
      <td class="tc mono" style="font-size:10px;color:var(--text3)">${esc((i.fechaPrecio || '').slice(0, 10)) || '—'}</td>
    </tr>`;
  }).join('');
  document.getElementById('ins-empty').style.display = data.length ? 'none' : 'block';
  renderPag('pag-insumos', data.length, INS_PER, insPage, p => { insPage = p; renderInsumos(); });
}
function editInsumo(cod) {
  const i = cod ? DB.insumos[cod] : null;
  document.getElementById('mi-title').textContent = i ? '✏ Editar insumo' : '+ Nuevo insumo';
  document.getElementById('mi-cod').value = i?.codigo || '';
  document.getElementById('mi-cod').disabled = !!i;
  document.getElementById('mi-nombre').value = i?.nombre || '';
  document.getElementById('mi-tipo').value = i?.tipo || 'MP';
  document.getElementById('mi-um').value = i?.um || 'kg';
  document.getElementById('mi-precio').value = i?.precio ?? '';
  document.getElementById('mi-moneda').value = i?.moneda || 'USD';
  document.getElementById('mi-prov').value = i?.proveedor || '';
  document.getElementById('mi-fecha').value = (i?.fechaPrecio || '').slice(0, 10);
  document.getElementById('mi-del').style.display = i ? '' : 'none';
  openM('m-insumo');
}
function guardarInsumo() {
  const cod = document.getElementById('mi-cod').value.trim().toUpperCase();
  if (!cod) { toast('Falta el código', '⚠'); return; }
  const rec = {
    codigo: cod,
    nombre: document.getElementById('mi-nombre').value.trim(),
    tipo: document.getElementById('mi-tipo').value,
    um: document.getElementById('mi-um').value.trim() || 'kg',
    precio: parseFloat(document.getElementById('mi-precio').value) || null,
    moneda: document.getElementById('mi-moneda').value,
    proveedor: document.getElementById('mi-prov').value.trim(),
    fechaPrecio: document.getElementById('mi-fecha').value || '',
  };
  putRec('insumos', cod, { ...(DB.insumos[cod] || {}), ...rec, _deleted: false });
  closeM('m-insumo'); renderInsumos(); toast('Insumo guardado · ' + cod);
}
function borrarInsumo() {
  const cod = document.getElementById('mi-cod').value.trim().toUpperCase();
  if (!cod || !confirm('¿Eliminar el insumo ' + cod + '?')) return;
  delRec('insumos', cod);
  closeM('m-insumo'); renderInsumos(); toast('Insumo eliminado', '🗑');
}

// ═══════════════ MAESTRO DE PROVEEDORES ═══════════════
let provPage = 1;
const PROV_PER = 20;
function renderProveedores() {
  const q = norm(document.getElementById('s-provs')?.value || '');
  // Busca por proveedor O por insumo del catálogo: si matchea un insumo,
  // muestra el proveedor con los insumos encontrados y su precio.
  const data = allRecs('proveedores').map(p => {
    const matchProv = !q || norm(p.nombre).includes(q) || norm(p.contacto).includes(q);
    const matchIns = q ? (p.insumos || []).filter(i => norm(i.insumo).includes(q)) : [];
    return (matchProv || matchIns.length) ? { ...p, _match: matchIns } : null;
  }).filter(Boolean).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  document.getElementById('prov-kpis').innerHTML =
    `<div class="kpi"><div class="kpi-acc" style="background:var(--gold)"></div><div class="kpi-l">Proveedores</div><div class="kpi-v">${allRecs('proveedores').length}</div></div>` +
    (q ? `<div class="kpi"><div class="kpi-acc" style="background:var(--blue)"></div><div class="kpi-l">Resultados</div><div class="kpi-v">${data.length}</div></div>` : '');

  const start = (provPage - 1) * PROV_PER;
  document.getElementById('tbl-provs').innerHTML = data.slice(start, start + PROV_PER).map(p => {
    const matches = (p._match || []).slice(0, 6).map(i => {
      const precio = i.precio > 0 ? ` — <b>${i.moneda === 'ARS' ? '$' : 'USD'} ${fmt(i.precio)}</b>` : ' — s/precio';
      const pres = i.presentacion ? ` · ${esc(i.presentacion)}` : '';
      return `<div style="font-size:11.5px;color:var(--gold2);font-family:var(--mono)">🧪 ${esc(i.insumo)}${precio}${pres}</div>`;
    }).join('');
    return `
    <tr class="clickable" onclick="editProv('${esc(p.id)}')">
      <td><div style="font-weight:600">${esc(p.nombre)}</div>${matches}</td>
      <td>${esc(p.contacto || '—')}</td>
      <td class="mono" style="font-size:11px">${esc(p.email || '—')}</td>
      <td class="mono" style="font-size:11px">${esc(p.telefono || '—')}</td>
      <td class="tc mono" style="color:var(--text3)">${(p.insumos || []).length || '—'}</td>
      <td class="tc mono">${p.leadTime ? p.leadTime + ' d' : '—'}</td>
      <td>${esc(p.condPago || '—')}</td>
      <td class="tc"><button class="btn btn-g btn-sm" onclick="event.stopPropagation();editProv('${esc(p.id)}')">✏ Editar</button></td>
    </tr>`;
  }).join('');
  document.getElementById('prov-empty').style.display = data.length ? 'none' : 'block';
  renderPag('pag-provs', data.length, PROV_PER, provPage, p => { provPage = p; renderProveedores(); });
}
function editProv(id) {
  const p = id ? DB.proveedores[id] : null;
  document.getElementById('mp-title').textContent = p ? '✏ Editar proveedor' : '+ Nuevo proveedor';
  document.getElementById('mp-id').value = p?.id || '';
  ['nombre','contacto','email','telefono','direccion','cuit','tipo','condPago'].forEach(f => {
    document.getElementById('mp-' + f).value = p?.[f] || '';
  });
  document.getElementById('mp-leadTime').value = p?.leadTime || '';
  document.getElementById('mp-del').style.display = p ? '' : 'none';
  openM('m-prov');
}
function guardarProv() {
  const id = document.getElementById('mp-id').value || uid();
  const nombre = document.getElementById('mp-nombre').value.trim();
  if (!nombre) { toast('Falta el nombre', '⚠'); return; }
  const rec = { id, nombre };
  ['contacto','email','telefono','direccion','cuit','tipo','condPago'].forEach(f => rec[f] = document.getElementById('mp-' + f).value.trim());
  rec.leadTime = parseInt(document.getElementById('mp-leadTime').value, 10) || '';
  putRec('proveedores', id, { ...(DB.proveedores[id] || {}), ...rec, _deleted: false });
  closeM('m-prov'); renderProveedores(); toast('Proveedor guardado · ' + nombre);
}
function borrarProv() {
  const id = document.getElementById('mp-id').value;
  if (!id || !confirm('¿Eliminar este proveedor?')) return;
  delRec('proveedores', id);
  closeM('m-prov'); renderProveedores(); toast('Proveedor eliminado', '🗑');
}

// ═══════════════ MAESTRO DE PRODUCTO TERMINADO ═══════════════
function renderProductos() {
  const q = norm(document.getElementById('s-prods')?.value || '');
  const data = allRecs('productos')
    .filter(p => !q || norm(p.codigo).includes(q) || norm(p.nombre).includes(q) || norm(p.skuCore).includes(q))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
  const all = allRecs('productos');
  document.getElementById('prod-kpis').innerHTML = [
    ['Productos', all.length, 'var(--gold)'],
    ['Mapeados a Fine Core', all.filter(p => p.skuCore).length, 'var(--green)'],
    ['Sin SKU Core', all.filter(p => !p.skuCore).length, 'var(--red)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');
  document.getElementById('tbl-prods').innerHTML = data.map(p => `
    <tr class="clickable" onclick="verFormula('${esc(p.codigo)}')">
      <td class="mono">${esc(p.codigo)}</td>
      <td style="font-weight:600">${esc(p.nombre)}</td>
      <td class="tc">${p.skuCore ? `<span class="pill pill-green">${esc(p.skuCore)}</span>` : '<span class="pill pill-red">sin SKU</span>'}</td>
      <td>${esc(p.cliente || '—')}</td>
      <td class="num">${fmt(p.loteMin, 0)} u</td>
      <td class="num">${p.politicaDias || '—'} días</td>
      <td class="tc mono" style="color:var(--text3)">${(p.insumos || []).length} insumos</td>
    </tr>`).join('');
  document.getElementById('prod-empty').style.display = data.length ? 'none' : 'block';
}
function verFormula(cod) {
  const p = DB.productos[cod]; if (!p) return;
  document.getElementById('mf-title').textContent = p.nombre;
  document.getElementById('mf-cod').textContent = p.codigo;
  document.getElementById('mf-sku').value = p.skuCore || '';
  document.getElementById('mf-lote').value = p.loteMin || '';
  document.getElementById('mf-dias').value = p.politicaDias || '';
  const mp = (p.insumos || []).filter(i => !String(i.codigo).startsWith('PK'));
  const pk = (p.insumos || []).filter(i => String(i.codigo).startsWith('PK'));
  const tabla = arr => `<div class="tbl-wrap"><table>
    <thead><tr><th>Código</th><th>Insumo</th><th class="tr">Cant. por batch</th><th class="tc">UM</th></tr></thead>
    <tbody>${arr.map(i => `<tr>
      <td class="mono">${esc(i.codigo)}</td><td>${esc(i.nombre)}</td>
      <td class="num">${fmt(i.cantidad, 3)}</td><td class="tc mono">${esc(i.um)}</td></tr>`).join('')}
    </tbody></table></div>`;
  document.getElementById('mf-body').innerHTML =
    (mp.length ? `<div class="form-sec">🧪 Materias primas · núcleos (${mp.length})</div>` + tabla(mp) : '') +
    (pk.length ? `<div class="form-sec">📦 Empaque · packaging (${pk.length})</div>` + tabla(pk) : '');
  document.getElementById('m-formula').dataset.cod = cod;
  openM('m-formula');
}
function guardarProducto() {
  const cod = document.getElementById('m-formula').dataset.cod;
  const p = DB.productos[cod]; if (!p) return;
  putRec('productos', cod, {
    ...p,
    skuCore: document.getElementById('mf-sku').value.trim(),
    loteMin: parseFloat(document.getElementById('mf-lote').value) || p.loteMin,
    politicaDias: parseInt(document.getElementById('mf-dias').value, 10) || null,
  });
  closeM('m-formula'); renderProductos(); toast('Producto guardado · ' + cod);
}

// ═══════════════ STOCK DE INSUMOS (Fase 2) ═══════════════
let stkPage = 1;
const STK_PER = 15;
const hoyISO = () => new Date().toISOString().slice(0, 10);

function lotesVivos() { return allRecs('lotes').filter(l => (l.cantidad || 0) > 0.0005 || l._keep); }
function posicionesLista() {
  const base = DB.config.posiciones?.lista || [];
  return base.includes('Nutratec') ? base : [...base, 'Nutratec'];
}
function fmtVenc(v) { return v ? v.split('-').reverse().join('/') : '—'; }
function estadoVenc(v) {
  if (!v) return ['', ''];
  const hoy = hoyISO();
  const d90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  if (v < hoy) return ['vencido', `<span class="pill pill-red">vencido</span>`];
  if (v <= d90) return ['pronto', `<span class="pill" style="background:var(--orange-dim);color:var(--orange);border:1px solid rgba(249,115,22,.3)">≤ 90 días</span>`];
  return ['ok', ''];
}
function registrarMov(tipo, codigo, cantidad, desde, hacia, ref) {
  const id = uid();
  putRec('movimientos', id, {
    id, fecha: new Date().toISOString(), tipo, codigo,
    nombre: DB.insumos[codigo]?.nombre || codigo,
    cantidad, desde: desde || '', hacia: hacia || '', ref: ref || '',
  });
}

function renderStock() {
  const uso = usoInsumos();
  const q = norm(document.getElementById('s-stock')?.value || '');
  const fu = document.getElementById('f-stk-ubic')?.value || '';
  const fv = document.getElementById('f-stk-venc')?.value || '';
  const hoy = hoyISO();
  const dLim = fv && fv !== 'vencido' ? new Date(Date.now() + parseInt(fv, 10) * 864e5).toISOString().slice(0, 10) : '';

  // poblar filtro de ubicaciones + datalists
  const ubicSel = document.getElementById('f-stk-ubic');
  if (ubicSel && ubicSel.options.length <= 1) {
    posicionesLista().forEach(p => ubicSel.innerHTML += `<option value="${esc(p)}">${esc(p)}</option>`);
  }
  const dlp = document.getElementById('dl-posiciones');
  if (dlp) dlp.innerHTML = posicionesLista().map(p => `<option value="${esc(p)}">`).join('');
  const dli = document.getElementById('dl-insumos');
  if (dli && !dli.children.length) allRecs('insumos').sort((a,b)=>a.codigo.localeCompare(b.codigo))
    .forEach(i => dli.innerHTML += `<option value="${esc(i.codigo)}" label="${esc(i.codigo)} — ${esc(i.nombre)}">`);

  // agrupar lotes por insumo
  const grupos = {};
  lotesVivos().forEach(l => { (grupos[l.codigo] ||= []).push(l); });
  let items = Object.entries(grupos).map(([cod, ls]) => {
    const ins = DB.insumos[cod] || { codigo: cod, nombre: cod, um: 'kg' };
    ls.sort((a, b) => (b.abierto ? 1 : 0) - (a.abierto ? 1 : 0) || (a.vencimiento || '9999').localeCompare(b.vencimiento || '9999'));
    return { cod, ins, ls, total: ls.reduce((s, l) => s + (l.cantidad || 0), 0), prods: uso[cod] || [] };
  });

  items = items.filter(it => {
    if (q && !(norm(it.cod).includes(q) || norm(it.ins.nombre).includes(q)
      || norm(it.prods.join(' ')).includes(q) || it.ls.some(l => norm(l.lote).includes(q)))) return false;
    if (fu && !it.ls.some(l => (l.ubicacion || '').includes(fu))) return false;
    if (fv === 'vencido' && !it.ls.some(l => l.vencimiento && l.vencimiento < hoy)) return false;
    if (dLim && !it.ls.some(l => l.vencimiento && l.vencimiento <= dLim && l.vencimiento >= hoy)) return false;
    return true;
  }).sort((a, b) => a.cod.localeCompare(b.cod));

  // KPIs
  const todos = lotesVivos();
  const vencidos = todos.filter(l => l.vencimiento && l.vencimiento < hoy).length;
  const d90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
  const prox = todos.filter(l => l.vencimiento && l.vencimiento >= hoy && l.vencimiento <= d90).length;
  const enNutra = todos.filter(l => (l.ubicacion || '').includes('Nutratec'));
  const abiertos = todos.filter(l => l.abierto).length;
  document.getElementById('stk-kpis').innerHTML = [
    ['Insumos con stock', Object.keys(grupos).length, 'var(--gold)'],
    ['Lotes', todos.length, 'var(--gold2)'],
    ['Abiertos', abiertos, 'var(--blue)'],
    ['Vencidos', vencidos, 'var(--red)'],
    ['Vencen ≤ 90 días', prox, 'var(--orange)'],
    ['Lotes en Nutratec', enNutra.length, 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');

  const start = (stkPage - 1) * STK_PER;
  const slice = items.slice(start, start + STK_PER);
  document.getElementById('tbl-stock').innerHTML = slice.map(it => it.ls.map((l, i) => {
    const [, vencPill] = estadoVenc(l.vencimiento);
    const abiertoPill = l.abierto ? '<span class="pill" style="background:var(--gold-dim);color:var(--gold2);border:1px solid rgba(201,168,76,.35)">abierto</span>' : '';
    const revPill = l.revalida ? `<span class="pill pill-green" title="Reválida ${esc(l.revalida.archivo || '')}">reválida</span>` : '';
    const first = i === 0;
    return `<tr>
      ${first ? `<td class="mono" rowspan="${it.ls.length}">${esc(it.cod)}</td>
      <td style="font-weight:600" rowspan="${it.ls.length}">${esc(it.ins.nombre)}</td>
      <td style="max-width:200px" rowspan="${it.ls.length}"><span style="font-size:10.5px;color:var(--gold2)">${esc(it.prods.join(', ') || '—')}</span></td>
      <td class="num" style="font-weight:700" rowspan="${it.ls.length}">${fmt(it.total, 2)} ${esc(it.ins.um)}</td>` : ''}
      <td class="mono" style="font-size:10.5px">${esc(l.lote || '—')}</td>
      <td class="num">${fmt(l.cantidad, 2)}</td>
      <td class="tc mono" style="font-size:11px">${fmtVenc(l.vencimiento)}</td>
      <td style="font-size:12px">${esc(l.ubicacion || '—')}</td>
      <td class="tc">${abiertoPill} ${vencPill} ${revPill}</td>
      <td class="tc" style="white-space:nowrap">
        <button class="btn btn-g btn-sm" onclick="editLote('${esc(l.id)}')" title="Editar / ajustar / transferir">✏</button>
        <button class="btn btn-g btn-sm" onclick="abrirRevalida('${esc(l.id)}')" title="Cargar reválida (PDF)">📄</button>
      </td>
    </tr>`;
  }).join('')).join('');
  document.getElementById('stk-empty').style.display = items.length ? 'none' : 'block';
  renderPag('pag-stock', items.length, STK_PER, stkPage, p => { stkPage = p; renderStock(); });
}

// ── Alta / edición de lote ──
function mlNombre() {
  const cod = document.getElementById('ml-cod').value.trim().toUpperCase();
  document.getElementById('ml-nombre').value = DB.insumos[cod]?.nombre || '';
}
function editLote(id) {
  const l = id ? DB.lotes[id] : null;
  document.getElementById('ml-title').textContent = l ? '✏ Editar lote' : '+ Ingreso manual de stock';
  document.getElementById('ml-id').value = l?.id || '';
  document.getElementById('ml-cod').value = l?.codigo || '';
  document.getElementById('ml-cod').disabled = !!l;
  mlNombre();
  document.getElementById('ml-cant').value = l?.cantidad ?? '';
  document.getElementById('ml-lote').value = l?.lote || '';
  document.getElementById('ml-venc').value = l?.vencimiento || '';
  document.getElementById('ml-ubic').value = l?.ubicacion || '';
  document.getElementById('ml-prov').value = l?.proveedor || '';
  document.getElementById('ml-abierto').checked = !!l?.abierto;
  document.getElementById('ml-ref').value = '';
  document.getElementById('ml-del').style.display = l ? '' : 'none';
  openM('m-lote');
}
function guardarLote() {
  const id = document.getElementById('ml-id').value;
  const cod = document.getElementById('ml-cod').value.trim().toUpperCase();
  if (!cod || !DB.insumos[cod]) { toast('Insumo inexistente — creálo primero en el Maestro', '⚠', 3500); return; }
  const cant = parseFloat(document.getElementById('ml-cant').value) || 0;
  const ref = document.getElementById('ml-ref').value.trim();
  const nuevo = {
    codigo: cod,
    cantidad: Math.round(cant * 1000) / 1000,
    lote: document.getElementById('ml-lote').value.trim(),
    vencimiento: document.getElementById('ml-venc').value || '',
    ubicacion: document.getElementById('ml-ubic').value.trim(),
    proveedor: document.getElementById('ml-prov').value.trim(),
    abierto: document.getElementById('ml-abierto').checked,
  };
  if (!id) {
    if (cant <= 0) { toast('Ingresá la cantidad', '⚠'); return; }
    const nid = uid();
    putRec('lotes', nid, { id: nid, ...nuevo, fecha: hoyISO() });
    registrarMov('entrada', cod, nuevo.cantidad, '', nuevo.ubicacion, ref || 'Ingreso manual');
    toast('Stock ingresado · ' + cod);
  } else {
    const prev = DB.lotes[id];
    putRec('lotes', id, { ...prev, ...nuevo });
    const dCant = Math.round((nuevo.cantidad - (prev.cantidad || 0)) * 1000) / 1000;
    if (Math.abs(dCant) > 0.0005)
      registrarMov('ajuste', cod, dCant, '', '', ref || `Ajuste lote ${prev.lote || '—'}`);
    if ((prev.ubicacion || '') !== nuevo.ubicacion)
      registrarMov('transferencia', cod, nuevo.cantidad, prev.ubicacion || '—', nuevo.ubicacion || '—', ref || `Lote ${prev.lote || '—'}`);
    toast('Lote actualizado · ' + cod);
  }
  closeM('m-lote'); renderStock();
}
function borrarLote() {
  const id = document.getElementById('ml-id').value;
  const l = DB.lotes[id];
  if (!l || !confirm(`¿Eliminar el lote ${l.lote || '—'} de ${l.codigo}? Se registrará la salida.`)) return;
  registrarMov('salida', l.codigo, -(l.cantidad || 0), l.ubicacion || '—', '', 'Lote eliminado');
  delRec('lotes', id);
  closeM('m-lote'); renderStock(); toast('Lote eliminado', '🗑');
}

// ── Posiciones ──
function abrirPosiciones() {
  document.getElementById('mp-lista').value = posicionesLista().join('\n');
  openM('m-posiciones');
}
function guardarPosiciones() {
  const lista = document.getElementById('mp-lista').value.split('\n').map(s => s.trim()).filter(Boolean);
  putRec('config', 'posiciones', { id: 'posiciones', lista });
  const sel = document.getElementById('f-stk-ubic');
  if (sel) sel.innerHTML = '<option value="">Todas las ubicaciones</option>';
  closeM('m-posiciones'); renderStock(); toast('Posiciones guardadas');
}

// ── Reválidas: PDF → nueva fecha de vencimiento ──
function abrirRevalida(loteId) {
  const l = DB.lotes[loteId]; if (!l) return;
  document.getElementById('mr-lote-id').value = loteId;
  document.getElementById('mr-sub').textContent = `· ${l.codigo} · lote ${l.lote || '—'} · vence ${fmtVenc(l.vencimiento)}`;
  document.getElementById('mr-file').value = '';
  document.getElementById('mr-venc').value = '';
  document.getElementById('mr-status').textContent = '';
  openM('m-revalida');
}
function _parseFechas(texto) {
  const out = [];
  const meses = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12,
    ene:1, feb:2, mar:3, abr:4, may:5, jun:6, jul:7, ago:8, sep:9, oct:10, nov:11, dic:12 };
  let m;
  const re1 = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g;             // dd/mm/yyyy
  while ((m = re1.exec(texto))) {
    let [_, d, mo, y] = m; d = +d; mo = +mo; y = +y; if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y > 2020 && y < 2040)
      out.push({ iso: `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`, pos: m.index });
  }
  const re2 = /(\d{4})-(\d{2})-(\d{2})/g;                                // yyyy-mm-dd
  while ((m = re2.exec(texto))) {
    const y = +m[1]; if (y > 2020 && y < 2040) out.push({ iso: m[0], pos: m.index });
  }
  const re3 = new RegExp('(\\d{1,2})?\\s*(?:de\\s+)?(' + Object.keys(meses).join('|') + ')\\.?\\s*(?:de\\s+)?(\\d{4})', 'gi');
  while ((m = re3.exec(texto))) {
    const d = +(m[1] || 1), mo = meses[m[2].toLowerCase()], y = +m[3];
    if (y > 2020 && y < 2040) out.push({ iso: `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`, pos: m.index });
  }
  return out;
}
async function procesarRevalidaPDF() {
  const file = document.getElementById('mr-file').files[0];
  const st = document.getElementById('mr-status');
  if (!file) return;
  st.textContent = '⟳ Leyendo el PDF…';
  try {
    if (typeof pdfjsLib !== 'undefined')
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let texto = '';
    for (let p = 1; p <= Math.min(pdf.numPages, 4); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      texto += tc.items.map(i => i.str).join(' ') + '\n';
    }
    const fechas = _parseFechas(texto);
    if (!fechas.length) { st.textContent = '⚠ No encontré fechas en el PDF — cargala a mano.'; return; }
    // preferir fechas cercanas a palabras clave; si no, la más lejana en el futuro
    const kw = /(venc|vto|reval|reanalisis|reanálisis|valido hasta|válido hasta|expira|expiry|best before)/gi;
    const kwPos = []; let k;
    while ((k = kw.exec(texto))) kwPos.push(k.index);
    let candidata = null;
    if (kwPos.length) {
      let best = 1e12;
      fechas.forEach(f => kwPos.forEach(p => { const d = Math.abs(f.pos - p); if (d < best && d < 220) { best = d; candidata = f; } }));
    }
    if (!candidata) candidata = fechas.reduce((a, b) => (b.iso > a.iso ? b : a));
    document.getElementById('mr-venc').value = candidata.iso;
    st.innerHTML = `✓ Fecha detectada: <b>${fmtVenc(candidata.iso)}</b> — confirmá o corregí.`;
  } catch (e) {
    console.error(e);
    st.textContent = '⚠ No pude leer el PDF (' + (e.message || e) + ') — cargá la fecha a mano.';
  }
}
function guardarRevalida() {
  const id = document.getElementById('mr-lote-id').value;
  const l = DB.lotes[id]; if (!l) return;
  const venc = document.getElementById('mr-venc').value;
  if (!venc) { toast('Falta la nueva fecha de vencimiento', '⚠'); return; }
  const file = document.getElementById('mr-file').files[0];
  putRec('lotes', id, { ...l, vencimiento: venc,
    revalida: { archivo: file?.name || '', fechaCarga: hoyISO(), vencAnterior: l.vencimiento || '' } });
  // guardar el PDF aparte en la nube (no bloquea)
  if (file && SB) {
    const fr = new FileReader();
    fr.onload = () => SB.from(PYC_SB_TABLE).upsert({ key: 'pyc_rev_' + id,
      value: { nombre: file.name, data: fr.result, fecha: hoyISO() },
      update_at: new Date().toISOString() }, { onConflict: 'key' }).then(() => {});
    fr.readAsDataURL(file);
  }
  closeM('m-revalida'); renderStock();
  toast(`Reválida aplicada · vence ${fmtVenc(venc)}`, '📄', 3500);
}

// ═══════════════ HISTORIAL DE MOVIMIENTOS ═══════════════
let histPage = 1;
const HIST_PER = 30;
function renderHistorial() {
  const ft = document.getElementById('f-hist-tipo')?.value || '';
  const q = norm(document.getElementById('s-hist')?.value || '');
  const data = allRecs('movimientos')
    .filter(mv => (!ft || mv.tipo === ft) &&
      (!q || norm(mv.codigo).includes(q) || norm(mv.nombre).includes(q) || norm(mv.ref).includes(q)))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const all = allRecs('movimientos');
  document.getElementById('hist-kpis').innerHTML = [
    ['Movimientos', all.length, 'var(--gold)'],
    ['Entradas', all.filter(x => x.tipo === 'entrada').length, 'var(--green)'],
    ['Salidas', all.filter(x => x.tipo === 'salida').length, 'var(--red)'],
    ['Ajustes', all.filter(x => x.tipo === 'ajuste').length, 'var(--blue)'],
    ['Transferencias', all.filter(x => x.tipo === 'transferencia').length, 'var(--gold2)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');
  const TIPO = {
    entrada: '<span class="pill pill-green">↑ entrada</span>',
    salida: '<span class="pill pill-red">↓ salida</span>',
    ajuste: '<span class="pill" style="background:var(--blue-dim);color:var(--blue);border:1px solid rgba(74,127,212,.3)">⟳ ajuste</span>',
    transferencia: '<span class="pill pill-mp">↔ transfer</span>',
  };
  const start = (histPage - 1) * HIST_PER;
  document.getElementById('tbl-hist').innerHTML = data.slice(start, start + HIST_PER).map(mv => `
    <tr>
      <td class="mono" style="font-size:10.5px">${esc((mv.fecha || '').slice(0, 16).replace('T', ' '))}</td>
      <td class="tc">${TIPO[mv.tipo] || esc(mv.tipo)}</td>
      <td class="mono">${esc(mv.codigo)}</td>
      <td>${esc(mv.nombre)}</td>
      <td class="num" style="color:${(mv.cantidad || 0) >= 0 ? 'var(--green)' : 'var(--red)'}">${(mv.cantidad || 0) >= 0 ? '+' : ''}${fmt(mv.cantidad, 3)}</td>
      <td style="font-size:12px">${esc(mv.desde || '—')}</td>
      <td style="font-size:12px">${esc(mv.hacia || '—')}</td>
      <td style="font-size:12px;color:var(--text2)">${esc(mv.ref || '—')}</td>
    </tr>`).join('');
  document.getElementById('hist-empty').style.display = data.length ? 'none' : 'block';
  renderPag('pag-hist', data.length, HIST_PER, histPage, p => { histPage = p; renderHistorial(); });
}

// ═══════════════ CALCULADORA MRP ═══════════════
function renderCalc() {
  const sel = document.getElementById('calc-prod');
  if (sel.options.length <= 1) {
    allRecs('productos').sort((a, b) => a.codigo.localeCompare(b.codigo))
      .forEach(p => sel.innerHTML += `<option value="${esc(p.codigo)}">${esc(p.codigo)} — ${esc(p.nombre)}</option>`);
  }
  const cod = sel.value;
  const qty = parseFloat(document.getElementById('calc-qty').value) || 0;
  const incNutra = document.getElementById('calc-nutratec').checked;
  const tbl = document.getElementById('tbl-calc');
  const kp = document.getElementById('calc-kpis');
  const empty = document.getElementById('calc-empty');
  const p = DB.productos[cod];
  if (!p || !qty) { tbl.innerHTML = ''; kp.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const factor = qty / (p.loteMin || 1);
  const stockDe = c => lotesVivos().filter(l => l.codigo === c && (incNutra || !(l.ubicacion || '').includes('Nutratec')))
    .reduce((s, l) => s + (l.cantidad || 0), 0);

  let ok = 0, faltan = 0, costoUSD = 0, costoARS = 0;
  const filas = (p.insumos || []).map(ins => {
    const nec = Math.round(ins.cantidad * factor * 1000) / 1000;
    const disp = Math.round(stockDe(ins.codigo) * 1000) / 1000;
    const diff = Math.round((disp - nec) * 1000) / 1000;
    const comprar = diff < 0 ? -diff : 0;
    if (diff >= 0) ok++; else faltan++;
    const im = DB.insumos[ins.codigo];
    let costo = '';
    if (comprar > 0 && im?.precio > 0) {
      const c = comprar * im.precio;
      if ((im.moneda || 'USD') === 'ARS') { costoARS += c; costo = '$ ' + fmt(c, 0); }
      else { costoUSD += c; costo = 'USD ' + fmt(c, 2); }
    }
    return `<tr>
      <td class="mono">${esc(ins.codigo)}</td>
      <td style="font-weight:600">${esc(ins.nombre)}</td>
      <td class="num">${fmt(nec, 3)} ${esc(ins.um || '')}</td>
      <td class="num">${fmt(disp, 3)}</td>
      <td class="num" style="color:${diff >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:700">${diff >= 0 ? '+' : ''}${fmt(diff, 3)}</td>
      <td class="num">${comprar > 0 ? fmt(comprar, 3) : '—'}</td>
      <td class="num">${costo || '—'}</td>
    </tr>`;
  });
  tbl.innerHTML = filas.join('');
  const batches = factor === Math.floor(factor) ? factor : factor.toFixed(2);
  kp.innerHTML = [
    ['Batches', `${batches} <span style="font-size:13px;color:var(--text3)">(lote mín. ${fmt(p.loteMin, 0)})</span>`, 'var(--gold)'],
    ['Insumos OK', ok, 'var(--green)'],
    ['Faltantes', faltan, faltan ? 'var(--red)' : 'var(--green)'],
    ['Costo faltante', (costoUSD ? 'USD ' + fmt(costoUSD, 0) : '') + (costoUSD && costoARS ? ' + ' : '') + (costoARS ? '$ ' + fmt(costoARS, 0) : '') || '—', 'var(--gold2)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v" style="font-size:22px">${v}</div></div>`).join('');
}

// ═══════════════ ÓRDENES DE COMPRA (Fase 3) ═══════════════
let ocPage = 1;
const OC_PER = 20;

function _ocNextNro() {
  const y = new Date().getFullYear();
  let max = 0;
  allRecs('ocs').forEach(o => {
    const m = /OC-(\d+)/.exec(o.nro || '');
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return `OC-${String(max + 1).padStart(4, '0')}-${y}`;
}
function _ocTotal(o) {
  return (o.items || []).reduce((s, it) => s + (it.cantidad || 0) * (it.precio || 0), 0);
}
function _ocPedido(o) { return (o.items || []).reduce((s, it) => s + (it.cantidad || 0), 0); }
function _ocRecibido(o) { return (o.items || []).reduce((s, it) => s + (it.recibido || 0), 0); }
const _sym = m => m === 'ARS' ? '$ ' : 'USD ';

function confirmarOC(id) {
  const o = DB.ocs[id];
  if (!o || o.estado !== 'borrador') return;
  if (!confirm(`¿Confirmar la ${o.nro} a ${o.proveedor}? Pasa a Pendiente (en firme).`)) return;
  putRec('ocs', id, { ...o, estado: 'pendiente' });
  renderOCs(); renderPropBorradores();
  toast(`✓ ${o.nro} confirmada — pasó a Órdenes de Compra (en firme)`, '🧾', 4000);
}
function renderOCs() {
  const q = norm(document.getElementById('s-ocs')?.value || '');
  const fp = document.getElementById('f-oc-prov')?.value || '';
  const fe = document.getElementById('f-oc-estado')?.value || '';
  const fpg = document.getElementById('f-oc-pago')?.value || '';
  const hoy = hoyISO();

  // poblar filtro proveedores + datalists
  const provSel = document.getElementById('f-oc-prov');
  if (provSel && provSel.options.length <= 1)
    allRecs('proveedores').map(p => p.nombre).sort().forEach(n => provSel.innerHTML += `<option value="${esc(n)}">${esc(n)}</option>`);
  const dlp = document.getElementById('dl-provs');
  if (dlp && !dlp.children.length)
    allRecs('proveedores').map(p => p.nombre).sort().forEach(n => dlp.innerHTML += `<option value="${esc(n)}">`);

  const data = allRecs('ocs').filter(o => {
    if (fp && o.proveedor !== fp) return false;
    if (fe && o.estado !== fe) return false;
    if (!fe && o.estado === 'borrador') return false; // borradores viven en OCs Propuestas
    if (fpg === 'pagada' && !o.factura?.pagada) return false;
    if (fpg === 'impaga' && o.factura?.pagada) return false;
    if (fpg === 'vencida' && !(o.factura && !o.factura.pagada && o.factura.vencPago && o.factura.vencPago < hoy)) return false;
    if (q) {
      const hay = norm(o.nro).includes(q) || norm(o.proveedor).includes(q)
        || (o.items || []).some(it => norm(it.codigo).includes(q) || norm(it.descripcion).includes(q));
      if (!hay) return false;
    }
    return true;
  }).sort((a, b) => (b.nro || '').localeCompare(a.nro || ''));

  const all = allRecs('ocs');
  const pendientes = all.filter(o => o.estado === 'pendiente').length;
  const borradores = all.filter(o => o.estado === 'borrador').length;
  const porPagar = all.filter(o => o.factura && !o.factura.pagada);
  const pagoVencido = porPagar.filter(o => o.factura.vencPago && o.factura.vencPago < hoy).length;
  document.getElementById('oc-kpis').innerHTML = [
    ['OCs', all.length, 'var(--gold)'],
    ...(borradores ? [['Borradores (MRP)', borradores, 'var(--gold2)']] : []),
    ['Pendientes de entrega', pendientes, 'var(--orange)'],
    ['Facturas por pagar', porPagar.length, 'var(--blue)'],
    ['Pago vencido', pagoVencido, pagoVencido ? 'var(--red)' : 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');

  const start = (ocPage - 1) * OC_PER;
  document.getElementById('tbl-ocs').innerHTML = data.slice(start, start + OC_PER).map(o => {
    const tot = _ocTotal(o);
    const ped = _ocPedido(o), rec = _ocRecibido(o);
    const items = (o.items || []).map(it => it.descripcion || it.codigo).join(', ');
    const itemsShort = items.length > 58 ? items.slice(0, 56) + '…' : items;
    const estadoPill = o.estado === 'entregada'
      ? '<span class="pill pill-green">✓ entregada</span>'
      : o.estado === 'borrador'
        ? '<span class="pill pill-mp">📝 borrador</span>'
        : '<span class="pill" style="background:var(--orange-dim);color:var(--orange);border:1px solid rgba(249,115,22,.3)">⏳ pendiente</span>';
    const recTxt = rec > 0 && o.estado !== 'entregada'
      ? `<span class="mono" style="font-size:10.5px">${fmt(rec, 1)}/${fmt(ped, 1)}<br><span style="color:var(--orange)">faltan ${fmt(ped - rec, 1)}</span></span>`
      : (o.estado === 'entregada' ? `<span class="mono" style="font-size:10.5px;color:var(--green)">${fmt(rec, 1)}/${fmt(ped, 1)}</span>` : '<span style="color:var(--text3)">—</span>');
    let factPill = `<button class="btn btn-g btn-sm" onclick="event.stopPropagation();abrirFactura('${esc(o.id)}')">＋ factura</button>`;
    if (o.factura) {
      const vencida = !o.factura.pagada && o.factura.vencPago && o.factura.vencPago < hoy;
      factPill = o.factura.pagada
        ? '<span class="pill pill-green">✓ pagada</span>'
        : `<span class="pill ${vencida ? 'pill-red' : 'pill-mp'}" title="${esc(o.factura.archivo || '')}">${vencida ? '⚠ ' : '💳 '}${fmtVenc(o.factura.vencPago) || 's/fecha'}</span>`;
      factPill = `<span class="clickable" onclick="event.stopPropagation();abrirFactura('${esc(o.id)}')" style="cursor:pointer">${factPill}</span>`;
    }
    const accRec = o.estado === 'borrador'
      ? `<button class="btn btn-p btn-sm" onclick="event.stopPropagation();confirmarOC('${esc(o.id)}')">✓ Confirmar</button>`
      : o.estado !== 'entregada'
        ? `<button class="btn btn-p btn-sm" onclick="event.stopPropagation();abrirRecepcion('${esc(o.id)}')">📥 Recepcionar</button>` : '';
    return `<tr class="clickable" onclick="editOC('${esc(o.id)}')">
      <td><span class="mono" style="color:var(--gold2);font-weight:700;font-size:11.5px">${esc(o.nro)}</span><br><span class="mono" style="font-size:9.5px;color:var(--text3)">${esc(o.fecha || '')}</span></td>
      <td style="font-weight:600">${esc(o.proveedor)}</td>
      <td style="font-size:12.5px;max-width:240px">${esc(itemsShort)}<br><span class="mono" style="font-size:9.5px;color:var(--text3)">${(o.items || []).length} ítem(s)</span></td>
      <td class="num">${tot > 0 ? _sym(o.moneda) + fmt(tot, 2) : '—'}</td>
      <td class="tc">${recTxt}</td>
      <td class="tc">${estadoPill}</td>
      <td class="tc">${factPill}</td>
      <td class="tc" style="white-space:nowrap">${accRec}
        <button class="btn btn-g btn-sm" onclick="event.stopPropagation();exportarOCPDF('${esc(o.id)}')" title="Ver / imprimir OC">📄</button>
      </td>
    </tr>`;
  }).join('');
  document.getElementById('oc-empty').style.display = data.length ? 'none' : 'block';
  renderPag('pag-ocs', data.length, OC_PER, ocPage, p => { ocPage = p; renderOCs(); });
}

// ── Alta / edición de OC ──
function _moItemRow(it = {}) {
  const st = 'width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--text);outline:none';
  return `<tr>
    <td style="padding:5px 6px"><input type="text" class="mo-cod" list="dl-insumos" value="${esc(it.codigo || '')}" placeholder="MP-0000" style="${st};font-family:var(--mono);font-size:11px;text-transform:uppercase" oninput="moAutoCod(this)"></td>
    <td style="padding:5px 6px"><input type="text" class="mo-desc" list="dl-insumos-desc" value="${esc(it.descripcion || '')}" placeholder="o buscá por descripción…" style="${st};font-size:13px" oninput="moAutoDesc(this)"></td>
    <td style="padding:5px 6px"><input type="number" class="mo-cant" value="${it.cantidad ?? ''}" step="0.001" min="0" style="${st};text-align:right;font-family:var(--mono);font-size:12px" oninput="moRecalc()"></td>
    <td style="padding:5px 6px"><input type="text" class="mo-um" value="${esc(it.um || 'kg')}" style="${st};text-align:center;font-family:var(--mono);font-size:11px"></td>
    <td style="padding:5px 6px"><input type="number" class="mo-precio" value="${it.precio ?? ''}" step="0.01" min="0" style="${st};text-align:right;font-family:var(--mono);font-size:12px" oninput="moRecalc()"></td>
    <td class="num mo-sub" style="padding:5px 8px;color:var(--text2)">—</td>
    <td style="padding:5px 4px;text-align:center"><button onclick="this.closest('tr').remove();moRecalc()" style="background:none;border:none;color:var(--text3);cursor:pointer">✕</button></td>
  </tr>`;
}
function moAddItem(it) {
  document.getElementById('mo-items').insertAdjacentHTML('beforeend', _moItemRow(it || {}));
}
function moAutoCod(inp) {
  const cod = inp.value.trim().toUpperCase();
  const i = DB.insumos[cod]; if (!i) return;
  const tr = inp.closest('tr');
  const d = tr.querySelector('.mo-desc'); if (d && !d.value) d.value = i.nombre;
  const u = tr.querySelector('.mo-um'); if (u) u.value = i.um || 'kg';
  const p = tr.querySelector('.mo-precio'); if (p && !p.value && i.precio > 0) { p.value = i.precio; moRecalc(); }
  const prov = document.getElementById('mo-prov'); if (prov && !prov.value && i.proveedor) prov.value = i.proveedor;
}
function moAutoDesc(inp) {
  const d = norm(inp.value);
  if (d.length < 3) return;
  const hit = allRecs('insumos').find(i => norm(i.nombre) === d);
  if (!hit) return;
  const tr = inp.closest('tr');
  tr.querySelector('.mo-cod').value = hit.codigo;
  moAutoCod(tr.querySelector('.mo-cod'));
}
function moRecalc() {
  const mon = document.getElementById('mo-moneda').value;
  const tc = parseFloat(document.getElementById('mo-tc').value) || 0;
  let total = 0;
  document.querySelectorAll('#mo-items tr').forEach(tr => {
    const c = parseFloat(tr.querySelector('.mo-cant')?.value) || 0;
    const p = parseFloat(tr.querySelector('.mo-precio')?.value) || 0;
    const s = c * p; total += s;
    tr.querySelector('.mo-sub').textContent = s > 0 ? _sym(mon) + fmt(s, 2) : '—';
  });
  const el = document.getElementById('mo-total');
  if (total > 0) {
    el.style.display = '';
    let extra = '';
    if (tc > 0) extra = mon === 'ARS' ? ` <span style="color:var(--text3)">≈ USD ${fmt(total / tc, 2)}</span>` : ` <span style="color:var(--text3)">≈ $ ${fmt(total * tc, 0)} ARS</span>`;
    el.innerHTML = `<b style="color:var(--gold2)">Total: ${_sym(mon)}${fmt(total, 2)}</b>${extra}`;
  } else el.style.display = 'none';
}
function editOC(id) {
  window._ocNuevaBorrador = false;
  const o = id ? DB.ocs[id] : null;
  document.getElementById('mo-title').textContent = o ? '✏ ' + o.nro : '+ Nueva Orden de Compra';
  document.getElementById('mo-id').value = o?.id || '';
  document.getElementById('mo-prov').value = o?.proveedor || '';
  document.getElementById('mo-fecha').value = o?.fecha || hoyISO();
  document.getElementById('mo-condpago').value = o?.condPago || '';
  document.getElementById('mo-moneda').value = o?.moneda || 'USD';
  document.getElementById('mo-tc').value = o?.tc || '';
  document.getElementById('mo-lt').value = o?.leadTime || '';
  document.getElementById('mo-obs').value = o?.obs || '';
  document.getElementById('mo-del').style.display = o ? '' : 'none';
  _ocModalBotones(o?.estado === 'borrador');
  const body = document.getElementById('mo-items');
  body.innerHTML = '';
  (o?.items?.length ? o.items : [{}]).forEach(it => moAddItem(it));
  // datalist de descripciones
  const dld = document.getElementById('dl-insumos-desc');
  if (dld && !dld.children.length)
    allRecs('insumos').filter(i => i.nombre).sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(i => dld.innerHTML += `<option value="${esc(i.nombre)}" label="${esc(i.nombre)} — ${esc(i.codigo)}">`);
  moRecalc();
  openM('m-oc');
}
function guardarOC(enFirme = true) {
  const id = document.getElementById('mo-id').value || uid();
  const prev = DB.ocs[id];
  const eraBorrador = prev ? prev.estado === 'borrador' : !!window._ocNuevaBorrador;
  const prov = document.getElementById('mo-prov').value.trim();
  if (!prov) { toast('Falta el proveedor', '⚠'); return; }
  const items = [];
  document.querySelectorAll('#mo-items tr').forEach(tr => {
    const codigo = tr.querySelector('.mo-cod').value.trim().toUpperCase();
    const descripcion = tr.querySelector('.mo-desc').value.trim();
    const cantidad = parseFloat(tr.querySelector('.mo-cant').value) || 0;
    if (!codigo && !descripcion) return;
    const prevIt = (prev?.items || []).find(x => x.codigo === codigo);
    items.push({ codigo, descripcion, cantidad,
      um: tr.querySelector('.mo-um').value.trim() || 'kg',
      precio: parseFloat(tr.querySelector('.mo-precio').value) || 0,
      recibido: prevIt?.recibido || 0 });
  });
  if (!items.length) { toast('Agregá al menos un insumo', '⚠'); return; }
  putRec('ocs', id, {
    ...(prev || {}), id, nro: prev?.nro || _ocNextNro(), proveedor: prov,
    fecha: document.getElementById('mo-fecha').value || hoyISO(),
    condPago: document.getElementById('mo-condpago').value.trim(),
    moneda: document.getElementById('mo-moneda').value,
    tc: parseFloat(document.getElementById('mo-tc').value) || null,
    leadTime: parseInt(document.getElementById('mo-lt').value, 10) || null,
    obs: document.getElementById('mo-obs').value.trim(),
    items, estado: eraBorrador ? (enFirme ? 'pendiente' : 'borrador') : (prev?.estado || 'pendiente'), _deleted: false,
  });
  window._ocNuevaBorrador = false;
  closeM('m-oc'); renderOCs(); renderPropBorradores();
  const nro = prev?.nro || DB.ocs[id].nro;
  if (eraBorrador && enFirme) toast(`✓ ${nro} en firme — pasó a Órdenes de Compra`, '🧾', 4200);
  else if (eraBorrador) toast(`📝 Borrador ${nro} guardado — sigue en OCs Propuestas`, '💾', 3800);
  else toast('OC guardada · ' + nro);
}
function borrarOC() {
  const id = document.getElementById('mo-id').value;
  const o = DB.ocs[id];
  if (!o || !confirm(`¿Eliminar la ${o.nro}?`)) return;
  delRec('ocs', id);
  closeM('m-oc'); renderOCs(); toast('OC eliminada', '🗑');
}

// ── Recepción integrada ──
function abrirRecepcion(id) {
  const o = DB.ocs[id];
  if (o && o.estado === 'borrador') { toast('Es un borrador: confirmala antes de recepcionar', '📝', 3500); return; } if (!o) return;
  document.getElementById('mrx-oc').value = id;
  document.getElementById('mrx-sub').textContent = `· ${o.nro} · ${o.proveedor}`;
  const st = 'width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:6px 8px;color:var(--text);outline:none';
  document.getElementById('mrx-items').innerHTML = (o.items || []).map((it, i) => {
    const saldo = Math.max(0, (it.cantidad || 0) - (it.recibido || 0));
    return `<tr>
      <td><span class="mono" style="font-size:10.5px;color:var(--text2)">${esc(it.codigo)}</span><br>${esc(it.descripcion || '')}</td>
      <td class="num">${fmt(it.cantidad, 2)} ${esc(it.um)}</td>
      <td class="num" style="color:${(it.recibido || 0) > 0 ? 'var(--green)' : 'var(--text3)'}">${fmt(it.recibido || 0, 2)}</td>
      <td style="padding:5px 6px"><input type="number" id="mrx-cant-${i}" value="${saldo > 0 ? saldo : ''}" step="0.001" min="0" style="${st};text-align:right;font-family:var(--mono);font-size:12px;width:90px"></td>
      <td style="padding:5px 6px"><input type="text" id="mrx-lote-${i}" placeholder="Lote" style="${st};font-family:var(--mono);font-size:11px;width:120px"></td>
      <td style="padding:5px 6px"><input type="date" id="mrx-venc-${i}" style="${st};font-family:var(--mono);font-size:11px;width:130px"></td>
      <td style="padding:5px 6px"><input type="text" id="mrx-ubic-${i}" list="dl-posiciones" placeholder="MP60…" style="${st};font-size:12px;width:100px"></td>
    </tr>`;
  }).join('');
  openM('m-recepcion');
}
function confirmarRecepcion() {
  const id = document.getElementById('mrx-oc').value;
  const o = DB.ocs[id]; if (!o) return;
  let algo = false;
  const items = (o.items || []).map((it, i) => {
    const cant = parseFloat(document.getElementById('mrx-cant-' + i)?.value) || 0;
    if (cant <= 0) return it;
    algo = true;
    const lote = (document.getElementById('mrx-lote-' + i)?.value || '').trim();
    const venc = document.getElementById('mrx-venc-' + i)?.value || '';
    const ubic = (document.getElementById('mrx-ubic-' + i)?.value || '').trim();
    // crear lote de stock
    const nid = uid();
    putRec('lotes', nid, { id: nid, codigo: it.codigo, cantidad: Math.round(cant * 1000) / 1000,
      lote, vencimiento: venc, ubicacion: ubic, abierto: false, proveedor: o.proveedor, fecha: hoyISO() });
    registrarMov('entrada', it.codigo, cant, o.proveedor, ubic, `${o.nro} · lote ${lote || '—'}`);
    return { ...it, recibido: Math.round(((it.recibido || 0) + cant) * 1000) / 1000 };
  });
  if (!algo) { toast('Ingresá al menos una cantidad', '⚠'); return; }
  const completa = items.every(it => (it.recibido || 0) >= (it.cantidad || 0) - 0.0005);
  putRec('ocs', id, { ...o, items, estado: completa ? 'entregada' : 'pendiente' });
  closeM('m-recepcion'); renderOCs();
  toast(completa ? `✓ ${o.nro} entregada completa — stock actualizado` : `Recepción parcial registrada · ${o.nro} sigue pendiente`, '📥', 4000);
}

// ── Factura con vencimiento de pago desde el PDF ──
function abrirFactura(id) {
  const o = DB.ocs[id]; if (!o) return;
  document.getElementById('mf2-oc').value = id;
  document.getElementById('mf2-sub').textContent = `· ${o.nro} · ${o.proveedor}`;
  document.getElementById('mf2-file').value = '';
  document.getElementById('mf2-venc').value = o.factura?.vencPago || '';
  document.getElementById('mf2-pagada').checked = !!o.factura?.pagada;
  document.getElementById('mf2-status').textContent = o.factura ? `Factura cargada: ${o.factura.archivo || '—'}` : '';
  openM('m-factura');
}
async function procesarFacturaPDF() {
  const file = document.getElementById('mf2-file').files[0];
  const st = document.getElementById('mf2-status');
  if (!file) return;
  st.textContent = '⟳ Leyendo la factura…';
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let texto = '';
    for (let p = 1; p <= Math.min(pdf.numPages, 3); p++) {
      const page = await pdf.getPage(p);
      const tc = await page.getTextContent();
      texto += tc.items.map(i => i.str).join(' ') + '\n';
    }
    const fechas = _parseFechas(texto);
    if (!fechas.length) { st.textContent = '⚠ No encontré fechas — cargala a mano.'; return; }
    const kw = /(vencimiento|vto\.?|venc\.?|fecha de pago|pagar hasta|due date)/gi;
    const kwPos = []; let k;
    while ((k = kw.exec(texto))) kwPos.push(k.index);
    let cand = null;
    if (kwPos.length) {
      let best = 1e12;
      fechas.forEach(f => kwPos.forEach(p => { const d = Math.abs(f.pos - p); if (d < best && d < 160) { best = d; cand = f; } }));
    }
    if (!cand) cand = fechas.reduce((a, b) => (b.iso > a.iso ? b : a));
    document.getElementById('mf2-venc').value = cand.iso;
    st.innerHTML = `✓ Vencimiento de pago detectado: <b>${fmtVenc(cand.iso)}</b> — confirmá o corregí.`;
  } catch (e) {
    console.error(e);
    st.textContent = '⚠ No pude leer el PDF — cargá la fecha a mano.';
  }
}
function guardarFactura() {
  const id = document.getElementById('mf2-oc').value;
  const o = DB.ocs[id]; if (!o) return;
  const venc = document.getElementById('mf2-venc').value;
  const file = document.getElementById('mf2-file').files[0];
  putRec('ocs', id, { ...o, factura: {
    archivo: file?.name || o.factura?.archivo || '',
    vencPago: venc || '', pagada: document.getElementById('mf2-pagada').checked,
    fechaCarga: o.factura?.fechaCarga || hoyISO() } });
  if (file && SB) {
    const fr = new FileReader();
    fr.onload = () => SB.from(PYC_SB_TABLE).upsert({ key: 'pyc_fac_' + id,
      value: { nombre: file.name, data: fr.result, fecha: hoyISO() },
      update_at: new Date().toISOString() }, { onConflict: 'key' }).then(() => {});
    fr.readAsDataURL(file);
  }
  closeM('m-factura'); renderOCs();
  toast(venc ? `Factura guardada · pagar antes del ${fmtVenc(venc)}` : 'Factura guardada', '💳', 3500);
}

// ── PDF de la OC (jsPDF, barra dorada) ──
function exportarOCPDF(id) {
  try {
    const o = DB.ocs[id]; if (!o) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const ML = 18, CW = 210 - 36;
    let y = 18;
    pdf.setFillColor(201, 168, 76); pdf.rect(ML, y, CW, 11, 'F');
    pdf.setTextColor(26, 26, 26); pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8); pdf.text('THE FINE COMPANY', ML + 3, y + 4.2);
    pdf.setFontSize(14); pdf.text('ORDEN DE COMPRA · ' + o.nro, ML + 3, y + 9);
    y += 18;
    pdf.setFontSize(10); pdf.setTextColor(60, 60, 60);
    const datos = [
      ['Proveedor', o.proveedor], ['Fecha', fmtVenc(o.fecha)],
      ['Condición de pago', o.condPago || '—'], ['Lead time', o.leadTime ? o.leadTime + ' días' : '—'],
      ['Estado', o.estado === 'entregada' ? 'Entregada' : o.estado === 'borrador' ? 'Borrador' : 'Pendiente'],
    ];
    datos.forEach(([k, v]) => {
      pdf.setFont('helvetica', 'bold'); pdf.text(k + ':', ML, y);
      pdf.setFont('helvetica', 'normal'); pdf.text(String(v), ML + 42, y); y += 6;
    });
    y += 3;
    pdf.setFillColor(77, 77, 77); pdf.rect(ML, y, CW, 7, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
    pdf.text('INSUMOS', ML + 2, y + 4.8); y += 7;
    pdf.setTextColor(120, 120, 120); pdf.setFontSize(8);
    pdf.text('CÓDIGO', ML + 2, y + 4); pdf.text('DESCRIPCIÓN', ML + 28, y + 4);
    pdf.text('CANT.', ML + 110, y + 4); pdf.text('PRECIO', ML + 132, y + 4); pdf.text('SUBTOTAL', ML + 152, y + 4);
    y += 6; pdf.setDrawColor(220, 220, 220); pdf.line(ML, y, ML + CW, y);
    pdf.setTextColor(40, 40, 40); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5);
    (o.items || []).forEach(it => {
      if (y > 265) { pdf.addPage(); y = 18; }
      y += 5.4;
      pdf.text(String(it.codigo || ''), ML + 2, y);
      pdf.text(pdf.splitTextToSize(String(it.descripcion || ''), 78)[0], ML + 28, y);
      pdf.text(fmt(it.cantidad, 2) + ' ' + (it.um || ''), ML + 110, y);
      pdf.text(it.precio > 0 ? fmt(it.precio, 2) : '—', ML + 132, y);
      pdf.text(it.precio > 0 ? _sym(o.moneda) + fmt((it.cantidad || 0) * it.precio, 2) : '—', ML + 152, y);
    });
    y += 8;
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
    pdf.text('TOTAL: ' + _sym(o.moneda) + fmt(_ocTotal(o), 2), ML + CW - 60, y);
    if (o.tc) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120, 120, 120);
      const t = _ocTotal(o);
      pdf.text(o.moneda === 'ARS' ? `≈ USD ${fmt(t / o.tc, 2)} (TC $${fmt(o.tc, 0)})` : `≈ $ ${fmt(t * o.tc, 0)} ARS (TC $${fmt(o.tc, 0)})`, ML + CW - 60, y + 5); }
    if (o.obs) { y += 14; pdf.setFontSize(8.5); pdf.setTextColor(90, 90, 90);
      pdf.text('Observaciones: ' + pdf.splitTextToSize(o.obs, CW - 30)[0], ML, y); }
    y = Math.max(y + 24, 250);
    pdf.setDrawColor(150, 150, 150);
    pdf.line(ML, y, ML + 65, y); pdf.line(ML + CW - 65, y, ML + CW, y);
    pdf.setTextColor(70, 70, 70); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text('Autorizado por', ML, y + 5); pdf.text('Recibido por proveedor', ML + CW - 65, y + 5);
    pdf.save(o.nro + '.pdf');
    toast('PDF generado · ' + o.nro, '📄');
  } catch (e) { toast('Error al generar PDF: ' + (e.message || e), '⚠', 4500); console.error(e); }
}

// ═══════════════ ÓRDENES A FAZÓN (Fase 4) ═══════════════
let ofPage = 1;
const OF_PER = 20;
const OF_ESTADOS = {
  borrador: ['var(--text3)', 'borrador'],
  despachada: ['var(--gold)', 'despachada'],
  produccion: ['var(--blue)', 'en producción'],
  recibida: ['var(--green)', 'recibida'],
};
function _ofPill(e) {
  const [c, l] = OF_ESTADOS[e] || ['var(--text2)', e];
  return `<span class="pill" style="background:${c}22;color:${c};border:1px solid ${c}55">${l}</span>`;
}
function _ofNext() {
  let max = 0;
  allRecs('ofs').forEach(o => { const m = /OF-(\d+)/.exec(o.nro || ''); if (m) max = Math.max(max, +m[1]); });
  return 'OF-' + String(max + 1).padStart(4, '0');
}
// Orden de consumo: abiertos primero, después FEFO (vencimiento más próximo), después ingreso
function _ordenLotes(a, b) {
  if ((b.abierto ? 1 : 0) !== (a.abierto ? 1 : 0)) return (b.abierto ? 1 : 0) - (a.abierto ? 1 : 0);
  const va = a.vencimiento || '9999', vb = b.vencimiento || '9999';
  if (va !== vb) return va < vb ? -1 : 1;
  return (a.fecha || '').localeCompare(b.fecha || '');
}
function _lotesDisponibles(cod) {
  return lotesVivos().filter(l => l.codigo === cod && !(l.ubicacion || '').includes('Nutratec')).sort(_ordenLotes);
}
function _planEnvio(cod, cantidad) {
  const plan = []; let rest = Math.round(cantidad * 1000) / 1000;
  for (const l of _lotesDisponibles(cod)) {
    if (rest <= 0) break;
    const toma = Math.min(l.cantidad, rest);
    plan.push({ loteId: l.id, lote: l.lote, vencimiento: l.vencimiento, abierto: l.abierto, ubicacion: l.ubicacion, toma: Math.round(toma * 1000) / 1000 });
    rest = Math.round((rest - toma) * 1000) / 1000;
  }
  return { plan, faltante: rest > 0.0005 ? rest : 0 };
}
function _explotarOF(productos) {
  const uso = {}, map = {};
  productos.forEach(p => {
    const prod = DB.productos[p.cod]; if (!prod) return;
    const f = p.cantidad / (prod.loteMin || 1);
    (prod.insumos || []).forEach(ins => {
      if (!ins.codigo || !ins.cantidad) return;
      if (!map[ins.codigo]) map[ins.codigo] = { codigo: ins.codigo, nombre: ins.nombre,
        tipo: String(ins.codigo).startsWith('PK') ? 'PK' : 'MP', um: ins.um || 'kg', requerido: 0, productos: [] };
      map[ins.codigo].requerido = Math.round((map[ins.codigo].requerido + ins.cantidad * f) * 1000) / 1000;
      if (!map[ins.codigo].productos.includes(prod.nombre)) map[ins.codigo].productos.push(prod.nombre);
    });
  });
  return Object.values(map).map(l => ({ ...l, aEnviar: l.requerido, lotes: [] }));
}

function renderOFs() {
  const fe = document.getElementById('f-of-estado')?.value || '';
  const q = norm(document.getElementById('s-ofs')?.value || '');
  const data = allRecs('ofs').filter(o => {
    if (fe && o.estado !== fe) return false;
    if (q && !(norm(o.nro).includes(q) || (o.productos || []).some(p => norm(p.nombre).includes(q) || norm(p.cod).includes(q)))) return false;
    return true;
  }).sort((a, b) => (b.nro || '').localeCompare(a.nro || ''));

  const all = allRecs('ofs');
  const activas = all.filter(o => o.estado !== 'recibida').length;
  const enProd = all.filter(o => o.estado === 'produccion').length;
  const pendIngreso = all.filter(o => o.estado === 'despachada' || o.estado === 'produccion')
    .reduce((s, o) => s + (o.productos || []).reduce((x, p) => x + (p.cantidad || 0), 0), 0);
  const enNutraKg = lotesVivos().filter(l => (l.ubicacion || '').includes('Nutratec')).reduce((s, l) => s + l.cantidad, 0);
  document.getElementById('of-kpis').innerHTML = [
    ['Órdenes activas', activas, 'var(--gold)'],
    ['En producción', enProd, 'var(--blue)'],
    ['Unid. pendiente ingreso', fmt(pendIngreso, 0), 'var(--orange)'],
    ['Stock en Nutratec', fmt(enNutraKg, 1) + ' kg', 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v" style="font-size:23px">${v}</div></div>`).join('');

  const start = (ofPage - 1) * OF_PER;
  document.getElementById('tbl-ofs').innerHTML = data.slice(start, start + OF_PER).map(o => {
    const prods = o.productos || [];
    const totU = prods.reduce((s, p) => s + (p.cantidad || 0), 0);
    let sub = prods.map(p => `${p.nombre} ×${fmt(p.cantidad, 0)}`).join(' · ');
    if (sub.length > 66) sub = sub.slice(0, 64) + '…';
    const desp = o.fechaDespacho ? fmtVenc(o.fechaDespacho.slice(0, 10)) : '—';
    const b = (fn, txt, cls) => `<button class="btn ${cls} btn-sm" onclick="event.stopPropagation();${fn}">${txt}</button>`;
    let acc = b(`exportarOFPDF('${esc(o.id)}')`, '📄', 'btn-g');
    if (o.estado === 'borrador') acc += b(`abrirDespachoOF('${esc(o.id)}')`, '🚚 Despachar', 'btn-p') + b(`eliminarOF('${esc(o.id)}')`, '✕', 'btn-r');
    else if (o.estado === 'despachada') acc += b(`marcarProduccionOF('${esc(o.id)}')`, '⚙ En producción', 'btn-g') + b(`abrirRecepcionOF('${esc(o.id)}')`, '📥 Ingresar PT', 'btn-p');
    else if (o.estado === 'produccion') acc += b(`abrirRecepcionOF('${esc(o.id)}')`, '📥 Ingresar PT', 'btn-p');
    else acc += `<span class="mono" style="font-size:10px;color:var(--text3)">✓ ${(o.recepciones || []).length} prod</span>`;
    return `<tr>
      <td><span class="mono" style="color:var(--gold2);font-weight:700;font-size:11.5px">${esc(o.nro)}</span><br><span class="mono" style="font-size:9.5px;color:var(--text3)">${esc((o.fechaCreacion || '').slice(0, 10))}</span></td>
      <td style="max-width:280px">${prods.length === 1 ? esc(prods[0].nombre) : prods.length + ' productos'}<br><span style="font-size:11px;color:var(--text3)">${esc(sub)} · ${esc(o.fazon || 'Nutratec')}</span></td>
      <td class="num">${fmt(totU, 0)} u</td>
      <td class="tc">${_ofPill(o.estado)}</td>
      <td class="tc mono" style="font-size:11px">${desp}</td>
      <td class="tc" style="white-space:nowrap">${acc}</td>
    </tr>`;
  }).join('');
  document.getElementById('of-empty').style.display = data.length ? 'none' : 'block';
  renderPag('pag-ofs', data.length, OF_PER, ofPage, p => { ofPage = p; renderOFs(); });
}

// ── Nueva OF ──
function _ofnRow() {
  const st = 'background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:8px 10px;color:var(--text);outline:none;font-family:var(--font)';
  const opts = allRecs('productos').sort((a, b) => a.codigo.localeCompare(b.codigo))
    .map(p => `<option value="${esc(p.codigo)}">${esc(p.codigo)} — ${esc(p.nombre)}</option>`).join('');
  return `<div class="ofn-row" style="display:flex;gap:8px;margin-bottom:8px">
    <select class="ofn-cod" onchange="ofnPreview()" style="${st};flex:1"><option value="">— Producto —</option>${opts}</select>
    <input type="number" class="ofn-qty" placeholder="Cantidad" oninput="ofnPreview()" style="${st};width:120px;font-family:var(--mono)">
    <button class="btn btn-g btn-sm" onclick="this.closest('.ofn-row').remove();ofnPreview()" style="color:var(--red)">✕</button>
  </div>`;
}
function ofnAddProd() { document.getElementById('ofn-prods').insertAdjacentHTML('beforeend', _ofnRow()); }
function nuevaOF() {
  document.getElementById('ofn-fazon').value = 'Nutratec';
  document.getElementById('ofn-prods').innerHTML = '';
  ofnAddProd();
  document.getElementById('ofn-preview').innerHTML = '';
  openM('m-of-nueva');
}
function _ofnLeer() {
  const prods = [];
  document.querySelectorAll('#ofn-prods .ofn-row').forEach(r => {
    const cod = r.querySelector('.ofn-cod').value;
    const qty = parseFloat(r.querySelector('.ofn-qty').value) || 0;
    if (cod && qty > 0) prods.push({ cod, nombre: DB.productos[cod]?.nombre || cod, cantidad: qty, loteMin: DB.productos[cod]?.loteMin });
  });
  return prods;
}
function ofnPreview() {
  const prods = _ofnLeer();
  const box = document.getElementById('ofn-preview');
  if (!prods.length) { box.innerHTML = ''; return; }
  const lineas = _explotarOF(prods);
  const filas = lineas.map(l => {
    const { faltante } = _planEnvio(l.codigo, l.requerido);
    return `<tr>
      <td class="mono" style="font-size:10.5px">${esc(l.codigo)}</td><td>${esc(l.nombre)}</td>
      <td class="num">${fmt(l.requerido, 3)} ${esc(l.um)}</td>
      <td style="font-size:10.5px;color:var(--gold2)">${esc(l.productos.join(', '))}</td>
      <td class="tc">${faltante ? `<span class="pill pill-red">faltan ${fmt(faltante, 2)}</span>` : '<span class="pill pill-green">ok</span>'}</td>
    </tr>`;
  }).join('');
  box.innerHTML = `<div style="font-size:12px;color:var(--text2);margin-bottom:6px"><b>${prods.length}</b> producto(s) · <b>${lineas.length}</b> insumos consolidados</div>
    <div class="tbl-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th class="tr">Cant. total</th><th>Lo consumen</th><th class="tc">Stock</th></tr></thead><tbody>${filas}</tbody></table></div>`;
}
function guardarOF() {
  const prods = _ofnLeer();
  if (!prods.length) { toast('Agregá al menos un producto con cantidad', '⚠'); return; }
  const lineas = _explotarOF(prods);
  if (!lineas.length) { toast('Esos productos no tienen fórmula', '⚠'); return; }
  const id = uid();
  putRec('ofs', id, { id, nro: _ofNext(), fazon: document.getElementById('ofn-fazon').value.trim() || 'Nutratec',
    productos: prods, lineas, estado: 'borrador', fechaCreacion: new Date().toISOString(),
    fechaDespacho: null, recepciones: [] });
  closeM('m-of-nueva'); renderOFs(); toast('Orden creada · ' + DB.ofs[id].nro, '📋');
}
function eliminarOF(id) {
  const o = DB.ofs[id];
  if (!o || o.estado !== 'borrador') { toast('Solo se eliminan borradores', '⚠'); return; }
  if (!confirm('¿Eliminar la ' + o.nro + '?')) return;
  delRec('ofs', id); renderOFs(); toast('Orden eliminada', '🗑');
}

// ── Despacho: transfiere lotes a "Nutratec" (abiertos → FEFO) ──
function abrirDespachoOF(id) {
  const o = DB.ofs[id]; if (!o) return;
  document.getElementById('ofd-id').value = id;
  document.getElementById('ofd-sub').textContent = `· ${o.nro} · ${(o.productos || []).map(p => p.nombre).join(', ').slice(0, 60)}`;
  const st = 'background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:5px 8px;color:var(--text);outline:none;font-family:var(--mono);font-size:12px';
  const filas = (o.lineas || []).map((l, i) => {
    const { plan, faltante } = _planEnvio(l.codigo, l.aEnviar || l.requerido);
    const planHtml = plan.map(p =>
      `<span class="pill ${p.abierto ? '' : 'pill-ins'}" style="${p.abierto ? 'background:var(--gold-dim);color:var(--gold2);border:1px solid rgba(201,168,76,.4)' : ''};margin:1px" title="${esc(p.ubicacion || '')}">${esc(p.lote || 's/l')} × ${fmt(p.toma, 2)}${p.abierto ? ' 🔓' : ''}${p.vencimiento ? ' · ' + fmtVenc(p.vencimiento) : ''}</span>`).join(' ')
      + (faltante ? ` <span class="pill pill-red">faltan ${fmt(faltante, 2)}</span>` : '');
    return `<tr>
      <td><span class="mono" style="font-size:10px;color:var(--text2)">${esc(l.codigo)}</span><br>${esc(l.nombre)}<br><span style="font-size:10px;color:var(--gold2)">usan: ${esc((l.productos || []).join(', '))}</span></td>
      <td class="num" style="color:var(--text3)">${fmt(l.requerido, 3)}</td>
      <td style="padding:5px"><input type="number" id="ofd-env-${i}" value="${l.aEnviar ?? l.requerido}" step="0.001" min="0" style="${st};width:90px;text-align:right" oninput="ofdReplan(${i})"></td>
      <td id="ofd-plan-${i}" style="font-size:10px;max-width:340px">${planHtml}</td>
    </tr>`;
  }).join('');
  document.getElementById('ofd-body').innerHTML = `<table><thead><tr>
    <th>Insumo</th><th class="tr">Requerido</th><th class="tr">A enviar</th><th>Plan de lotes (abiertos 🔓 → FEFO)</th>
  </tr></thead><tbody>${filas}</tbody></table>`;
  openM('m-of-desp');
}
function ofdReplan(i) {
  const id = document.getElementById('ofd-id').value;
  const o = DB.ofs[id]; if (!o) return;
  const l = o.lineas[i];
  const env = parseFloat(document.getElementById('ofd-env-' + i).value) || 0;
  const { plan, faltante } = _planEnvio(l.codigo, env);
  const html = plan.map(p =>
    `<span class="pill ${p.abierto ? '' : 'pill-ins'}" style="${p.abierto ? 'background:var(--gold-dim);color:var(--gold2);border:1px solid rgba(201,168,76,.4)' : ''};margin:1px">${esc(p.lote || 's/l')} × ${fmt(p.toma, 2)}${p.abierto ? ' 🔓' : ''}${p.vencimiento ? ' · ' + fmtVenc(p.vencimiento) : ''}</span>`).join(' ')
    + (faltante ? ` <span class="pill pill-red">faltan ${fmt(faltante, 2)}</span>` : '');
  document.getElementById('ofd-plan-' + i).innerHTML = html;
}
function confirmarDespachoOF() {
  const id = document.getElementById('ofd-id').value;
  const o = DB.ofs[id]; if (!o) return;
  const lineas = o.lineas.map((l, i) => {
    const env = parseFloat(document.getElementById('ofd-env-' + i)?.value) || 0;
    if (env <= 0) return { ...l, aEnviar: 0, lotes: [] };
    const { plan } = _planEnvio(l.codigo, env);
    const usados = [];
    plan.forEach(p => {
      const src = DB.lotes[p.loteId]; if (!src) return;
      // restar del lote origen
      putRec('lotes', p.loteId, { ...src, cantidad: Math.round((src.cantidad - p.toma) * 1000) / 1000 });
      // crear/acumular lote espejo en Nutratec
      const nid = uid();
      putRec('lotes', nid, { id: nid, codigo: l.codigo, lote: src.lote, cantidad: p.toma,
        vencimiento: src.vencimiento, ubicacion: 'Nutratec', abierto: src.abierto,
        proveedor: src.proveedor, fecha: hoyISO(), origenLoteId: p.loteId, ofId: id });
      usados.push({ lote: src.lote, cantidad: p.toma, vencimiento: src.vencimiento });
      registrarMov('transferencia', l.codigo, p.toma, src.ubicacion || 'Depósito', 'Nutratec', `${o.nro} · lote ${src.lote || '—'}`);
    });
    return { ...l, aEnviar: env, lotes: usados };
  });
  putRec('ofs', id, { ...o, lineas, estado: 'despachada', fechaDespacho: new Date().toISOString() });
  closeM('m-of-desp'); renderOFs();
  toast(`🚚 ${o.nro} despachada — insumos transferidos a Nutratec`, '✓', 4000);
}
function marcarProduccionOF(id) {
  const o = DB.ofs[id]; if (!o) return;
  putRec('ofs', id, { ...o, estado: 'produccion' });
  renderOFs(); toast(o.nro + ' en producción', '⚙');
}

// ── Recepción de PT: consume BOM × producido desde Nutratec ──
function abrirRecepcionOF(id) {
  const o = DB.ofs[id]; if (!o) return;
  document.getElementById('ofr-id').value = id;
  document.getElementById('ofr-sub').textContent = '· ' + o.nro;
  const st = 'width:100%;background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:7px 9px;color:var(--text);outline:none';
  document.getElementById('ofr-body').innerHTML = (o.productos || []).map((p, i) => `
    <div style="border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:10px">
      <div style="font-weight:600;margin-bottom:8px">${esc(p.nombre)} <span class="mono" style="font-size:10px;color:var(--text3)">${esc(p.cod)} · plan ${fmt(p.cantidad, 0)} u</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
        <div class="fl"><label>Cantidad producida</label><input type="number" id="ofr-cant-${i}" value="${p.cantidad}" min="0" style="${st};font-family:var(--mono)"></div>
        <div class="fl"><label>Lote (Nutratec)</label><input type="text" id="ofr-lote-${i}" placeholder="Ej: 11062611" style="${st};font-family:var(--mono)"></div>
        <div class="fl"><label>Vencimiento</label><input type="date" id="ofr-venc-${i}" style="${st};font-family:var(--mono)"></div>
      </div>
    </div>`).join('');
  openM('m-of-rec');
}
function confirmarRecepcionOF() {
  const id = document.getElementById('ofr-id').value;
  const o = DB.ofs[id]; if (!o) return;
  const recs = []; let algo = false;
  (o.productos || []).forEach((p, i) => {
    const cant = parseFloat(document.getElementById('ofr-cant-' + i)?.value) || 0;
    if (cant <= 0) return;
    algo = true;
    recs.push({ cod: p.cod, nombre: p.nombre, cantidad: cant,
      lote: (document.getElementById('ofr-lote-' + i)?.value || '').trim(),
      vencimiento: document.getElementById('ofr-venc-' + i)?.value || '', fecha: new Date().toISOString() });
    // consumir de Nutratec: fórmula × cantidad producida, FEFO dentro de Nutratec
    const prod = DB.productos[p.cod]; if (!prod) return;
    const f = cant / (prod.loteMin || 1);
    (prod.insumos || []).forEach(ins => {
      if (!ins.codigo || !ins.cantidad) return;
      let rest = Math.round(ins.cantidad * f * 1000) / 1000;
      const enNutra = lotesVivos().filter(l => l.codigo === ins.codigo && (l.ubicacion || '').includes('Nutratec')).sort(_ordenLotes);
      let consumido = 0;
      for (const l of enNutra) {
        if (rest <= 0) break;
        const toma = Math.min(l.cantidad, rest);
        putRec('lotes', l.id, { ...l, cantidad: Math.round((l.cantidad - toma) * 1000) / 1000 });
        rest = Math.round((rest - toma) * 1000) / 1000;
        consumido = Math.round((consumido + toma) * 1000) / 1000;
      }
      if (consumido > 0)
        registrarMov('salida', ins.codigo, -consumido, 'Nutratec', '', `${o.nro} · producción ${p.nombre} ×${fmt(cant, 0)}`);
    });
  });
  if (!algo) { toast('Ingresá al menos una cantidad producida', '⚠'); return; }
  putRec('ofs', id, { ...o, recepciones: [...(o.recepciones || []), ...recs], estado: 'recibida', fechaRecepcion: new Date().toISOString() });
  closeM('m-of-rec'); renderOFs();
  const totU = recs.reduce((s, r) => s + r.cantidad, 0);
  toast(`📥 Ingresadas ${fmt(totU, 0)} u · insumos consumidos de Nutratec`, '✓', 4500);
}

// ── PDF de la OF (A4 horizontal) ──
function exportarOFPDF(id) {
  try {
    const o = DB.ofs[id]; if (!o) return;
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const ML = 14, CW = 297 - 28;
    let y = 14;
    const X = { cod: ML + 1, ins: ML + 20, cant: ML + 80, lote: ML + 108, venc: ML + 158, prod: ML + 184 };
    pdf.setFillColor(201, 168, 76); pdf.rect(ML, y, CW, 10, 'F');
    pdf.setTextColor(26, 26, 26); pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8); pdf.text('THE FINE COMPANY', ML + 3, y + 4);
    pdf.setFontSize(14); pdf.text('ORDEN DE PRODUCCIÓN A FAZÓN · ' + o.nro, ML + 3, y + 8.5);
    y += 15;
    pdf.setTextColor(60, 60, 60); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
    [['Fazón', o.fazon || 'Nutratec'],
     ['Productos', (o.productos || []).map(p => `${p.nombre} ×${fmt(p.cantidad, 0)} u`).join('   |   ')],
     ['Estado', (OF_ESTADOS[o.estado] || ['', o.estado])[1]],
     ['Fecha', new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })],
    ].forEach(([k, v]) => {
      pdf.setFont('helvetica', 'bold'); pdf.text(k + ':', ML, y);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(String(v), CW - 40);
      pdf.text(lines, ML + 30, y); y += 5.5 * lines.length;
    });
    y += 2;
    const header = () => {
      pdf.setTextColor(120, 120, 120); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7.5);
      pdf.text('CÓDIGO', X.cod, y + 4); pdf.text('INSUMO', X.ins, y + 4);
      pdf.text('CANT. ENVIADA', X.cant, y + 4); pdf.text('LOTE', X.lote, y + 4);
      pdf.text('VENCE', X.venc, y + 4); pdf.text('PRODUCTOS QUE LO CONSUMEN', X.prod, y + 4);
      y += 6; pdf.setDrawColor(220, 220, 220); pdf.line(ML, y, ML + CW, y);
      pdf.setTextColor(40, 40, 40); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8);
    };
    const tabla = (titulo, arr) => {
      if (!arr.length) return;
      if (y > 176) { pdf.addPage(); y = 14; }
      pdf.setFillColor(77, 77, 77); pdf.rect(ML, y, CW, 7, 'F');
      pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9);
      pdf.text(titulo, ML + 2, y + 4.8); y += 7;
      header();
      arr.forEach(l => {
        if (y > 190) { pdf.addPage(); y = 14; header(); }
        y += 5;
        const usar = o.estado !== 'borrador';
        const loteStr = (l.lotes && l.lotes.length) ? l.lotes.map(u => u.lote || 's/l').join(' + ') : '—';
        const vencStr = (l.lotes && l.lotes.length) ? (l.lotes.map(u => fmtVenc(u.vencimiento)).filter(v => v !== '—').join(' / ') || '—') : '—';
        pdf.setTextColor(90, 90, 90); pdf.text(String(l.codigo), X.cod, y);
        pdf.setTextColor(30, 30, 30); pdf.text(pdf.splitTextToSize(String(l.nombre), X.cant - X.ins - 2)[0], X.ins, y);
        pdf.text(fmt(usar ? l.aEnviar : l.requerido, 3) + ' ' + (l.um || ''), X.cant, y);
        pdf.text(pdf.splitTextToSize(loteStr, X.venc - X.lote - 2)[0], X.lote, y);
        pdf.text(pdf.splitTextToSize(vencStr, X.prod - X.venc - 2)[0], X.venc, y);
        pdf.setTextColor(110, 110, 110); pdf.text(pdf.splitTextToSize((l.productos || []).join(', '), ML + CW - X.prod)[0], X.prod, y);
      });
      y += 4;
    };
    tabla('MATERIAS PRIMAS · NÚCLEOS', (o.lineas || []).filter(l => l.tipo === 'MP'));
    tabla('EMPAQUE · PACKAGING', (o.lineas || []).filter(l => l.tipo === 'PK'));
    if (y > 172) { pdf.addPage(); y = 14; }
    y += 16;
    pdf.setDrawColor(150, 150, 150);
    pdf.line(ML, y, ML + 80, y); pdf.line(ML + CW - 80, y, ML + CW, y);
    pdf.setTextColor(70, 70, 70); pdf.setFontSize(9); pdf.setFont('helvetica', 'normal');
    pdf.text('Despachó — The Fine Company', ML, y + 5);
    pdf.text('Recibió — ' + (o.fazon || 'Nutratec'), ML + CW - 80, y + 5);
    pdf.save(o.nro + '.pdf');
    toast('PDF generado · ' + o.nro, '📄');
  } catch (e) { toast('Error al generar PDF: ' + (e.message || e), '⚠', 4500); console.error(e); }
}

// ═══════════════ PLANIFICACIÓN (Fase 5) ═══════════════
const MPS_H = 9;
function mesesHorizonte(n = MPS_H) {
  const out = []; const d = new Date();
  for (let i = 0; i < n; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    out.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}
const mesCorto = m => {
  const N = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return N[parseInt(m.slice(5), 10) - 1] + ' ' + m.slice(2, 4);
};
function prodsPlan() {
  return allRecs('productos').map(p => ({ ...p, sku: p.skuCore || p.codigo }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
const F = (sku, mes) => DB.forecast[`${sku}|${mes}`]?.unidades || 0;
const stockPT = sku => DB.stockpt[sku]?.unidades || 0;
function pendIngresoPT(cod) {
  return allRecs('ofs').filter(o => o.estado === 'despachada' || o.estado === 'produccion')
    .reduce((s, o) => s + (o.productos || []).filter(p => p.cod === cod).reduce((x, p) => x + (p.cantidad || 0), 0), 0);
}
// Plan por producto: 9 meses de {mes,F,ini,prop,fin,obj,cobIni,cobFin,manual}
function calcMPS(p) {
  const meses = mesesHorizonte();
  const pol = p.politicaDias || 45;
  const lm = p.loteMin || 1;
  let ini = stockPT(p.sku) + pendIngresoPT(p.codigo);
  return meses.map((mes, i) => {
    const dem = F(p.sku, mes);
    const demSig = F(p.sku, meses[i + 1] || mes) || dem;
    const obj = Math.round((demSig / 30) * pol);
    const ov = DB.mps[`${p.codigo}|${mes}`];
    let prop;
    if (ov && !ov._deleted) prop = ov.cantidad;
    else {
      const necesito = Math.max(0, obj + dem - ini);
      prop = necesito > 0 ? Math.ceil(necesito / lm) * lm : 0;
    }
    const fin = Math.round(ini + prop - dem);
    // cobertura en días: al inicio (vs demanda del mes) y al fin (vs demanda del mes siguiente),
    // después de que llega lo planificado
    const cobIni = dem > 0 ? Math.round(ini / (dem / 30)) : null;
    const cobFin = demSig > 0 ? Math.round(fin / (demSig / 30)) : null;
    const row = { mes, F: dem, ini: Math.round(ini), prop, fin, obj, cobIni, cobFin, manual: !!(ov && !ov._deleted), pol };
    ini = fin;
    return row;
  });
}
// Pill de cobertura vs política del producto
function _cobPill(dias, pol) {
  if (dias == null) return '<span class="cob cob-n">—</span>';
  const txt = dias > 360 ? '+360d' : (dias < 0 ? '0d' : dias + 'd');
  if (dias < pol * 0.5) return `<span class="cob cob-r">${txt}</span>`;
  if (dias < pol) return `<span class="cob cob-y">${txt}</span>`;
  return `<span class="cob cob-g">${txt}</span>`;
}

// ── FORECAST ──
function renderForecast() {
  const prods = prodsPlan();
  const meses = mesesHorizonte();
  document.getElementById('fc-head').innerHTML = `<tr><th>Producto</th><th class="tc" style="background:var(--gold-dim)">Stock PT hoy</th>${meses.map(m => `<th class="tc">${mesCorto(m)}</th>`).join('')}</tr>`;
  const inp = 'width:64px;background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:4px 5px;color:var(--text);font-family:var(--mono);font-size:11px;text-align:right;outline:none';
  document.getElementById('tbl-forecast').innerHTML = prods.map(p => `
    <tr>
      <td><span style="font-weight:600">${esc(p.nombre)}</span><br><span class="mono" style="font-size:9.5px;color:var(--gold2)">${esc(p.sku)}</span></td>
      <td class="tc" style="background:var(--gold-dim)"><input type="number" min="0" style="${inp}" value="${stockPT(p.sku) || ''}" onchange="setStockPT('${esc(p.sku)}',this.value)"></td>
      ${meses.map(m => `<td class="tc"><input type="number" min="0" style="${inp}" value="${F(p.sku, m) || ''}" onchange="setForecast('${esc(p.sku)}','${m}',this.value)"></td>`).join('')}
    </tr>`).join('');
  const totF = prods.reduce((s, p) => s + meses.reduce((x, m) => x + F(p.sku, m), 0), 0);
  const totPT = prods.reduce((s, p) => s + stockPT(p.sku), 0);
  document.getElementById('fc-kpis').innerHTML = [
    ['Productos', prods.length, 'var(--gold)'],
    ['Forecast total (9m)', fmt(totF, 0) + ' u', 'var(--blue)'],
    ['Stock PT actual', fmt(totPT, 0) + ' u', 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v" style="font-size:23px">${v}</div></div>`).join('');
  document.getElementById('fc-empty').style.display = prods.length ? 'none' : 'block';
}
function setForecast(sku, mes, val) {
  const u = parseFloat(val) || 0;
  putRec('forecast', `${sku}|${mes}`, { id: `${sku}|${mes}`, sku, mes, unidades: u });
  renderForecast();
}
function setStockPT(sku, val) {
  putRec('stockpt', sku, { id: sku, sku, unidades: parseFloat(val) || 0, fecha: hoyISO() });
  renderForecast();
}
function importarForecastCSV() {
  const file = document.getElementById('fc-file').files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const sep = fr.result.includes(';') && !fr.result.includes(',') ? ';' : ',';
      const rows = fr.result.split(/\r?\n/).map(r => r.split(sep).map(c => c.trim().replace(/^"|"$/g, ''))).filter(r => r.length > 1);
      if (!rows.length) { toast('CSV vacío', '⚠'); return; }
      const head = rows[0].map(h => norm(h));
      let n = 0;
      const mesDe = s => { const m = /(\d{4})[-\/](\d{1,2})/.exec(s); return m ? `${m[1]}-${String(+m[2]).padStart(2, '0')}` : null; };
      const esMesHead = head.map(h => mesDe(h));
      if (esMesHead.filter(Boolean).length >= 2) {
        // formato ancho: sku, mes1, mes2…
        rows.slice(1).forEach(r => {
          const sku = (r[0] || '').toUpperCase(); if (!sku) return;
          head.forEach((h, ci) => {
            const mes = esMesHead[ci]; if (!mes) return;
            const u = parseFloat(r[ci]) || 0;
            putRec('forecast', `${sku}|${mes}`, { id: `${sku}|${mes}`, sku, mes, unidades: u }); n++;
          });
        });
      } else {
        // formato largo: sku, mes, unidades (con o sin encabezado)
        rows.forEach(r => {
          const sku = (r[0] || '').toUpperCase();
          const mes = mesDe(r[1] || '');
          if (!sku || !mes) return;
          const u = parseFloat(r[2]) || 0;
          putRec('forecast', `${sku}|${mes}`, { id: `${sku}|${mes}`, sku, mes, unidades: u }); n++;
        });
      }
      renderForecast(); toast(`Forecast importado · ${n} celdas`, '📥', 3500);
    } catch (e) { toast('No pude leer el CSV: ' + (e.message || e), '⚠', 4000); }
  };
  fr.readAsText(file);
}

// ── MPS · matriz estilo Excel: filas = productos, bloques de columnas por mes ──
function renderMPS() {
  const prods = prodsPlan();
  const meses = mesesHorizonte();
  const conDatos = prods.filter(p => meses.some(m => F(p.sku, m) > 0) || stockPT(p.sku) > 0);
  document.getElementById('mps-empty').style.display = conDatos.length ? 'none' : 'block';
  const inp = 'width:58px;background:var(--bg2);border:1px solid var(--border);border-radius:4px;padding:3px 4px;color:var(--text);font-family:var(--mono);font-size:11px;text-align:right;outline:none';
  let prod3m = 0, bajoCob = 0;

  const head1 = `<tr><th class="sticky" rowspan="2" style="min-width:190px;vertical-align:bottom">Producto</th>
    ${meses.map(m => `<th colspan="6" class="tc mps-mes" style="color:var(--gold2);font-size:9.5px">${mesCorto(m)}</th>`).join('')}</tr>`;
  const head2 = `<tr>${meses.map(() => `
    <th class="tc mps-mes" title="Cobertura en días al inicio del mes">Cob. ini</th>
    <th class="tr" title="Stock al 1º del mes">Stock 1º</th>
    <th class="tr">Fcst</th>
    <th class="tr" style="color:var(--gold2)">Plan ✏</th>
    <th class="tc" title="Batches productivos (plan ÷ lote mínimo)">Batches</th>
    <th class="tc" title="Cobertura en días al fin del mes, con el plan ya ingresado">Cob. fin</th>`).join('')}</tr>`;

  const filas = conDatos.map(p => {
    const plan = calcMPS(p);
    prod3m += plan.slice(0, 3).reduce((s, r) => s + r.prop, 0);
    if (plan[0] && plan[0].cobFin != null && plan[0].cobFin < (p.politicaDias || 45)) bajoCob++;
    const pend = pendIngresoPT(p.codigo);
    const celdas = plan.map(r => `
      <td class="tc mps-mes">${_cobPill(r.cobIni, r.pol)}</td>
      <td class="num" style="font-size:11px;color:var(--text2)">${fmt(r.ini, 0)}</td>
      <td class="num" style="font-size:11px">${r.F ? fmt(r.F, 0) : '—'}</td>
      <td class="tr"><input type="number" min="0" step="1" style="${inp};${r.manual ? 'border-color:var(--gold);background:var(--gold-dim);font-weight:700' : ''}" value="${r.prop || ''}" onchange="setMPS('${esc(p.codigo)}','${r.mes}',this.value)" title="${r.prop && p.loteMin ? ((r.prop / p.loteMin === Math.floor(r.prop / p.loteMin)) ? (r.prop / p.loteMin) + ' batch(es) de ' + fmt(p.loteMin, 0) : (r.prop / p.loteMin).toFixed(2) + ' batches') : ''}"></td>
      <td class="tc mono" style="font-size:11px;color:var(--gold2);font-weight:700">${r.prop > 0 ? ((r.prop / (p.loteMin || 1)) % 1 === 0 ? (r.prop / (p.loteMin || 1)) + '×' : (r.prop / (p.loteMin || 1)).toFixed(2) + '×') : '—'}</td>
      <td class="tc">${_cobPill(r.cobFin, r.pol)}</td>`).join('');
    return `<tr>
      <td class="sticky"><span style="font-weight:600">${esc(p.nombre)}</span> <span class="mono" style="font-size:9px;color:var(--gold2)">${esc(p.sku)}</span><br>
        <span class="mono" style="font-size:9px;color:var(--text3)">batch ${fmt(p.loteMin, 0)} · pol. ${p.politicaDias || 45}d${pend ? ' · +' + fmt(pend, 0) + ' en fazón' : ''}</span></td>
      ${celdas}</tr>`;
  }).join('');

  document.getElementById('mps-body').innerHTML =
    `<div class="tbl-wrap" style="overflow-x:auto"><table class="mps-tbl" style="min-width:${190 + meses.length * 345}px">
      <thead>${head1}${head2}</thead><tbody>${filas}</tbody></table></div>
     <div style="font-size:11px;color:var(--text3);margin-top:8px">Cob. = días de cobertura vs política de cada producto: <span class="cob cob-r">rojo &lt; 50%</span> <span class="cob cob-y">amarillo &lt; política</span> <span class="cob cob-g">verde ≥ política</span> · "Cob. fin" ya incluye el plan del mes ingresado.</div>`;

  document.getElementById('mps-kpis').innerHTML = [
    ['Productos planificados', conDatos.length, 'var(--gold)'],
    ['A producir próx. 3 meses', fmt(prod3m, 0) + ' u', 'var(--blue)'],
    ['Bajo política a fin de mes', bajoCob, bajoCob ? 'var(--red)' : 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v" style="font-size:23px">${v}</div></div>`).join('');
}
function setMPS(cod, mes, val) {
  // Lo que edita la usuaria QUEDA — borrar la celda = 0 (sin producción ese mes).
  // Para volver a la propuesta automática: botón "↺ Recalcular todo".
  const v = parseFloat(val);
  const lm = DB.productos[cod]?.loteMin || 1;
  let snap = (isNaN(v) || v <= 0) ? 0 : Math.ceil(v / lm) * lm;
  if (!isNaN(v) && snap !== v && snap > 0)
    toast(`Ajustado a ${snap / lm} batch(es) de ${fmt(lm, 0)} = ${fmt(snap, 0)} u`, '📦', 3200);
  if (snap === 0)
    toast('Plan en 0 para ese mes — "↺ Recalcular todo" vuelve a la propuesta automática', '✏', 3500);
  putRec('mps', `${cod}|${mes}`, { id: `${cod}|${mes}`, cod, mes, cantidad: snap, manual: true });
  renderMPS();
}
function mpsLimpiarOverrides() {
  if (!confirm('¿Volver todas las celdas a la propuesta automática?')) return;
  allRecs('mps').forEach(r => delRec('mps', r.id));
  renderMPS(); toast('Plan recalculado', '↺');
}

// ── Necesidades de insumos según el plan (para Propuestas y Semáforo) ──
// Acepta un número (primeros N meses) o un array de meses puntuales ['2026-07',…]
function necesidadesPlan(sel) {
  const meses = Array.isArray(sel) ? sel : mesesHorizonte().slice(0, sel);
  const nec = {};   // codigo → {total, porMes:{mes:qty}, nombre, um}
  prodsPlan().forEach(p => {
    const plan = calcMPS(p);
    plan.filter(r => meses.includes(r.mes)).forEach(r => {
      if (!r.prop) return;
      const f = r.prop / (p.loteMin || 1);
      (p.insumos || []).forEach(ins => {
        if (!ins.codigo || !ins.cantidad) return;
        if (!nec[ins.codigo]) nec[ins.codigo] = { codigo: ins.codigo, nombre: ins.nombre, um: ins.um || 'kg', total: 0, porMes: {} };
        const q = ins.cantidad * f;
        nec[ins.codigo].total += q;
        nec[ins.codigo].porMes[r.mes] = (nec[ins.codigo].porMes[r.mes] || 0) + q;
      });
    });
  });
  Object.values(nec).forEach(n => { n.total = Math.round(n.total * 1000) / 1000; });
  return { nec, meses };
}
function pipelineOC(cod) {
  return allRecs('ocs').filter(o => o.estado !== 'entregada')
    .reduce((s, o) => s + (o.items || []).filter(it => it.codigo === cod)
      .reduce((x, it) => x + Math.max(0, (it.cantidad || 0) - (it.recibido || 0)), 0), 0);
}
function stockTotalIns(cod) {
  return lotesVivos().filter(l => l.codigo === cod).reduce((s, l) => s + l.cantidad, 0);
}
function provSugerido(cod) {
  const ins = DB.insumos[cod];
  if (ins?.proveedor) return { nombre: ins.proveedor, precio: ins.precio, moneda: ins.moneda };
  // buscar en catálogos el más barato
  let mejor = null;
  allRecs('proveedores').forEach(p => (p.insumos || []).forEach(i => {
    if (norm(i.insumo) === norm(ins?.nombre || '') && i.precio > 0)
      if (!mejor || i.precio < mejor.precio) mejor = { nombre: p.nombre, precio: i.precio, moneda: i.moneda || 'USD' };
  }));
  return mejor || { nombre: '', precio: null, moneda: 'USD' };
}

// ── OCS PROPUESTAS ──
function togglePanelMeses(e) {
  e?.stopPropagation();
  const p = document.getElementById('prop-meses-panel');
  p.style.display = p.style.display === 'none' ? '' : 'none';
}
document.addEventListener('click', e => {
  const p = document.getElementById('prop-meses-panel');
  if (p && p.style.display !== 'none' && !p.contains(e.target) && e.target.id !== 'prop-meses-btn') p.style.display = 'none';
});
function _mesesPanelInit() {
  const p = document.getElementById('prop-meses-panel');
  if (!p || p.dataset.ready) return;
  p.dataset.ready = '1';
  p.innerHTML = `<div style="display:flex;gap:8px;margin-bottom:8px">
      <button class="btn btn-g btn-sm" onclick="_mesesTodos(true)">todos</button>
      <button class="btn btn-g btn-sm" onclick="_mesesTodos(false)">ninguno</button></div>` +
    mesesHorizonte().map(m => `<label style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13.5px;cursor:pointer">
      <input type="checkbox" class="prop-mes" value="${m}" checked onchange="_mesesLabel()"> ${mesCorto(m)}</label>`).join('');
}
function _mesesTodos(v) {
  document.querySelectorAll('.prop-mes').forEach(c => c.checked = v);
  _mesesLabel();
}
function _mesesLabel() {
  const sel = _mesesSel();
  const btn = document.getElementById('prop-meses-btn');
  if (btn) btn.textContent = `🗓 Meses (${sel.length}/${mesesHorizonte().length}): ${sel.length ? sel.map(mesCorto).join(', ').slice(0, 34) + (sel.length > 4 ? '…' : '') : 'ninguno'} ▾`;
}
let _mrpSel = null; // última corrida
function correrMRP() {
  _mrpSel = _mesesSel();
  if (!_mrpSel.length) { toast('Tildá al menos un mes', '⚠'); return; }
  renderPropuestas();
  const n = (window._propFilas || []).length;
  toast(n ? `▶ MRP corrido · ${n} insumo(s) a comprar en ${_mrpSel.length} mes(es)` : '▶ MRP corrido · nada que comprar ✓', '🧮', 4000);
}
function _mesesSel() {
  return [...document.querySelectorAll('.prop-mes:checked')].map(c => c.value);
}
function renderPropBorradores() {
  const el = document.getElementById('prop-borradores');
  if (!el) return;
  const bs = allRecs('ocs').filter(o => o.estado === 'borrador')
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!bs.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="sh" style="margin-bottom:10px"><div class="sh-title" style="font-size:17px">📝 Borradores por confirmar <small>· ${bs.length} OC(s) — editá y confirmá para pasarlas a Órdenes de Compra</small></div></div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>N°</th><th>Proveedor</th><th>Ítems</th><th class="tr">Total</th><th class="tc" style="width:280px"></th></tr></thead>
      <tbody>${bs.map(o => {
        const tot = _ocTotal(o);
        const its = (o.items || []).map(it => it.descripcion || it.codigo).join(', ');
        return `<tr>
          <td><span class="mono" style="color:var(--gold2);font-weight:700;font-size:11.5px">${esc(o.nro)}</span></td>
          <td style="font-weight:600">${esc(o.proveedor)}</td>
          <td style="font-size:12.5px;max-width:300px">${esc(its.length > 64 ? its.slice(0, 62) + '…' : its)}<br><span class="mono" style="font-size:9.5px;color:var(--text3)">${(o.items || []).length} ítem(s)</span></td>
          <td class="num">${tot > 0 ? _sym(o.moneda) + fmt(tot, 2) : '—'}</td>
          <td class="tc" style="white-space:nowrap">
            <button class="btn btn-g btn-sm" onclick="editOC('${esc(o.id)}')">✏ Editar</button>
            <button class="btn btn-p btn-sm" onclick="confirmarOC('${esc(o.id)}')">✓ Confirmar</button>
            <button class="btn btn-r btn-sm" onclick="eliminarBorrador('${esc(o.id)}')">🗑</button>
          </td></tr>`;
      }).join('')}</tbody></table></div>`;
}
function eliminarBorrador(id) {
  const o = DB.ocs[id];
  if (!o) return;
  if (!confirm(`¿Eliminar el borrador ${o.nro} (${o.proveedor})?`)) return;
  delRec('ocs', id);
  renderPropBorradores(); renderOCs();
  toast(`🗑 Borrador ${o.nro} eliminado`);
}
function renderPropuestas() {
  _mesesPanelInit();
  _mesesLabel();
  renderPropBorradores();
  if (!_mrpSel) {
    document.getElementById('tbl-prop').innerHTML = '';
    document.getElementById('prop-kpis').innerHTML = '';
    document.getElementById('prop-empty-ico').textContent = '▶';
    document.getElementById('prop-empty-t').textContent = 'MRP sin correr';
    document.getElementById('prop-empty-s').textContent = 'Elegí los meses a explosionar y tocá "▶ Correr MRP".';
    document.getElementById('prop-empty').style.display = 'block';
    return;
  }
  document.getElementById('prop-empty-ico').textContent = '✓';
  document.getElementById('prop-empty-t').textContent = 'Nada que comprar';
  document.getElementById('prop-empty-s').textContent = 'El stock y las OCs pendientes cubren el plan de los meses elegidos.';
  const sel = _mrpSel;
  const { nec } = necesidadesPlan(sel);
  const filas = Object.values(nec).map(n => {
    const stk = stockTotalIns(n.codigo);
    const pipe = pipelineOC(n.codigo);
    const falt = Math.round(Math.max(0, n.total - stk - pipe) * 1000) / 1000;
    // mes crítico: primer mes donde acumulado supera stock+pipe
    let acum = 0, mesCrit = '';
    for (const [mes, q] of Object.entries(n.porMes).sort()) {
      acum += q;
      if (acum > stk + pipe + 0.0005) { mesCrit = mes; break; }
    }
    return { ...n, stk, pipe, falt, mesCrit };
  }).filter(f => f.falt > 0.0005).sort((a, b) => (a.mesCrit || '9999').localeCompare(b.mesCrit || '9999'));

  let costoUSD = 0, costoARS = 0;
  const html = filas.map(f => {
    const sug = provSugerido(f.codigo);
    let costo = '—';
    if (sug.precio > 0) {
      const c = f.falt * sug.precio;
      if ((sug.moneda || 'USD') === 'ARS') { costoARS += c; costo = '$ ' + fmt(c, 0); }
      else { costoUSD += c; costo = 'USD ' + fmt(c, 0); }
    }
    return `<tr>
      <td class="mono">${esc(f.codigo)}</td>
      <td style="font-weight:600">${esc(f.nombre)}</td>
      <td class="num">${fmt(f.total, 2)} ${esc(f.um)}</td>
      <td class="num">${fmt(f.stk, 2)}</td>
      <td class="num" style="color:${f.pipe > 0 ? 'var(--blue)' : 'var(--text3)'}">${f.pipe > 0 ? fmt(f.pipe, 2) : '—'}</td>
      <td class="num" style="color:var(--red);font-weight:700">${fmt(f.falt, 2)}</td>
      <td class="tc mono" style="font-size:10.5px">${f.mesCrit ? mesCorto(f.mesCrit) : '—'}</td>
      <td style="font-size:12.5px">${esc(sug.nombre || '—')}</td>
      <td class="num">${costo}</td>
      <td class="tc"><button class="btn btn-p btn-sm" onclick="crearOCDesdeProp('${esc(f.codigo)}',${f.falt})">+ OC</button></td>
    </tr>`;
  }).join('');
  document.getElementById('tbl-prop').innerHTML = html;
  document.getElementById('prop-empty').style.display = filas.length ? 'none' : 'block';
  document.getElementById('prop-kpis').innerHTML = [
    ['Insumos a comprar', filas.length, filas.length ? 'var(--red)' : 'var(--green)'],
    ['Costo estimado', ((costoUSD ? 'USD ' + fmt(costoUSD, 0) : '') + (costoUSD && costoARS ? ' + ' : '') + (costoARS ? '$ ' + fmt(costoARS, 0) : '')) || '—', 'var(--gold2)'],
    ['Con proveedor sugerido', filas.filter(f => provSugerido(f.codigo).nombre).length + '/' + filas.length, 'var(--blue)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v" style="font-size:22px">${v}</div></div>`).join('');
  window._propFilas = filas;
}
function _ocModalBotones(esBorrador) {
  const bb = document.getElementById('mo-btn-borrador');
  const bg = document.getElementById('mo-btn-guardar');
  if (bb) bb.style.display = esBorrador ? '' : 'none';
  if (bg) bg.textContent = esBorrador ? '✓ Generar OC en firme' : 'Guardar OC';
}
function crearOCDesdeProp(cod, falt) {
  const ins = DB.insumos[cod];
  const sug = provSugerido(cod);
  editOC('');
  window._ocNuevaBorrador = true; // desde Propuestas: nace como borrador
  _ocModalBotones(true);
  document.getElementById('mo-title').textContent = '📝 Nueva OC (borrador desde MRP)';
  document.getElementById('mo-prov').value = sug.nombre || '';
  document.getElementById('mo-moneda').value = sug.moneda || ins?.moneda || 'USD';
  const tr = document.querySelector('#mo-items tr');
  tr.querySelector('.mo-cod').value = cod;
  tr.querySelector('.mo-desc').value = ins?.nombre || '';
  tr.querySelector('.mo-um').value = ins?.um || 'kg';
  tr.querySelector('.mo-cant').value = Math.ceil(falt);
  if (sug.precio > 0) tr.querySelector('.mo-precio').value = sug.precio;
  moRecalc();
}
let _genOCsGrupos = null;
function _agruparPropPorProv() {
  const filas = window._propFilas || [];
  const grupos = {};
  filas.forEach(f => {
    const sug = provSugerido(f.codigo);
    const nombre = sug.nombre || '(sin proveedor)';
    const k = norm(nombre); // agrupa sin distinguir mayúsculas/acentos: "BASEL" y "Basel" = 1 OC
    (grupos[k] ||= { nombre, moneda: sug.moneda || 'USD', items: [] }).items.push({ f, sug });
  });
  return grupos;
}
function crearOCsPropuestas() {
  const filas = window._propFilas || [];
  if (!filas.length) { toast('No hay faltantes para generar OCs', '✓'); return; }
  const grupos = _genOCsGrupos = _agruparPropPorProv();
  const provs = Object.entries(grupos);
  // resumen: una tarjeta por proveedor con sus ítems y subtotal
  document.getElementById('gen-ocs-resumen').innerHTML =
    `<div style="font-size:13px;color:var(--text2);margin-bottom:12px">Se crearán <b style="color:var(--gold2)">${provs.length} OC(s)</b> con <b>${filas.length} ítem(s)</b> en total:</div>` +
    provs.map(([, g]) => {
      const sub = g.items.reduce((s, { f, sug }) => s + Math.ceil(f.falt) * (sug.precio || 0), 0);
      return `<div style="border:1px solid var(--border);border-radius:8px;padding:11px 14px;margin-bottom:10px;background:var(--bg2)">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:7px">
          <div style="font-weight:600;font-size:15px">🏬 ${esc(g.nombre)}</div>
          <div class="mono" style="font-size:11px;color:var(--text3)">${g.items.length} ítem(s)${sub > 0 ? ' · ' + (g.moneda === 'USD' ? 'USD ' : '$ ') + fmt(sub, 0) : ''}</div>
        </div>
        ${g.items.map(({ f, sug }) => `<div style="display:flex;justify-content:space-between;font-size:12.5px;padding:2px 0;color:var(--text2)">
          <span>${esc(f.nombre)} <span class="mono" style="font-size:10px;color:var(--text3)">${esc(f.codigo)}</span></span>
          <span class="mono" style="font-size:11px">${fmt(Math.ceil(f.falt), 0)} ${esc(f.um || '')}</span></div>`).join('')}
      </div>`;
    }).join('');
  openM('m-gen-ocs');
}
function confirmarGenOCs() {
  const grupos = _genOCsGrupos;
  if (!grupos) return;
  let n = 0;
  Object.values(grupos).forEach((g) => {
    const id = uid();
    putRec('ocs', id, { id, nro: _ocNextNro(), proveedor: g.nombre, fecha: hoyISO(),
      condPago: '', moneda: g.moneda, tc: null, leadTime: null,
      obs: 'Generada desde OCs Propuestas (MRP)',
      items: g.items.map(({ f, sug }) => ({ codigo: f.codigo, descripcion: f.nombre, um: f.um,
        cantidad: Math.ceil(f.falt), precio: sug.precio || 0, recibido: 0 })),
      estado: 'borrador' });
    n++;
  });
  _genOCsGrupos = null;
  closeM('m-gen-ocs');
  renderPropuestas();
  toast(`⚡ ${n} OC(s) creadas en BORRADOR — editalas y confirmalas en Órdenes de Compra`, '📝', 5000);
}

// ── SEMÁFORO ──
function _semPill(dias) {
  if (dias == null) return '<span class="pill pill-ins">⚪ s/dem</span>';
  if (dias < 15) return `<span class="pill pill-red">🔴 ${dias < 0 ? 'sin stock' : Math.round(dias) + 'd'}</span>`;
  if (dias <= 45) return `<span class="pill" style="background:var(--yellow-dim);color:var(--yellow);border:1px solid rgba(184,150,12,.35)">🟡 ${Math.round(dias)}d</span>`;
  return `<span class="pill pill-green">🟢 ${dias > 365 ? '+1a' : Math.round(dias) + 'd'}</span>`;
}
let semPage = 1;
// color de un valor de días: r/y/g, null = sin demanda
function _semColor(d) { return d == null ? null : d < 15 ? 'r' : d <= 45 ? 'y' : 'g'; }
function renderSemaforo() {
  const q = norm(document.getElementById('s-sem')?.value || '');
  const soloCrit = document.getElementById('sem-criticos')?.checked;
  const { nec, meses } = necesidadesPlan(4);
  ['sem-m1', 'sem-m2', 'sem-m3'].forEach((id, i) => {
    const el = document.getElementById(id);
    if (el && meses[i + 1]) el.textContent = mesCorto(meses[i + 1]);
  });
  // filtro por mes: opciones = Hoy + los 3 meses de la vista
  const selMes = document.getElementById('f-sem-mes');
  if (selMes && !selMes.options.length) {
    selMes.innerHTML = '<option value="">Todos los meses</option>' +
      meses.map((m, i) => `<option value="${i}">${i === 0 ? 'Hoy (' + mesCorto(m) + ')' : mesCorto(m)}</option>`).join('');
  }
  const fMes = selMes?.value ?? '';
  const fColor = document.getElementById('f-sem-color')?.value || '';
  const filas = Object.values(nec).map(n => {
    const stk = stockTotalIns(n.codigo);
    const pipe = pipelineOC(n.codigo);
    // simulación: stock corre mes a mes contra necesidades (pipe entra en m0)
    let s = stk + pipe;
    const dias = meses.map((mes, i) => {
      const need = n.porMes[mes] || 0;
      const demandaDiaria = (n.porMes[meses[i]] || n.porMes[meses[i + 1]] || 0) / 30;
      const d = demandaDiaria > 0 ? s / demandaDiaria : null;
      s = s - need;
      return d;
    });
    const critico = dias.some(d => d != null && d < 15);
    return { ...n, stk, pipe, dias, critico };
  }).filter(f => (!q || norm(f.codigo).includes(q) || norm(f.nombre).includes(q)) && (!soloCrit || f.critico))
    .filter(f => {
      if (!fColor && fMes === '') return true;
      const colores = f.dias.map(_semColor);
      if (fMes !== '') return fColor ? colores[+fMes] === fColor : colores[+fMes] != null;
      return colores.includes(fColor); // color en cualquier mes de la vista
    })
    .sort((a, b) => {
      const da = a.dias.find(d => d != null) ?? 1e9, db = b.dias.find(d => d != null) ?? 1e9;
      return da - db;
    });
  const all = Object.values(nec);
  const criticos = filas.filter(f => f.critico).length;
  document.getElementById('sem-kpis').innerHTML = [
    ['Insumos con demanda', all.length, 'var(--gold)'],
    ['Críticos (<15 días)', criticos, criticos ? 'var(--red)' : 'var(--green)'],
  ].map(([l, v, c]) => `<div class="kpi"><div class="kpi-acc" style="background:${c}"></div><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div></div>`).join('');
  const PER = 30;
  const start = (semPage - 1) * PER;
  document.getElementById('tbl-sem').innerHTML = filas.slice(start, start + PER).map(f => `
    <tr>
      <td class="mono">${esc(f.codigo)}</td>
      <td style="font-weight:600">${esc(f.nombre)}</td>
      <td class="num">${fmt(f.stk, 2)} ${esc(f.um)}</td>
      <td class="num" style="color:${f.pipe > 0 ? 'var(--blue)' : 'var(--text3)'}">${f.pipe > 0 ? fmt(f.pipe, 2) : '—'}</td>
      ${f.dias.map(d => `<td class="tc">${_semPill(d)}</td>`).join('')}
    </tr>`).join('');
  document.getElementById('sem-empty').style.display = filas.length ? 'none' : 'block';
  renderPag('pag-sem', filas.length, PER, semPage, p => { semPage = p; renderSemaforo(); });
}

// ── Arranque ──
window.addEventListener('load', async () => {
  restaurarNav();
  await initStore();
  go('minsumos');
});
