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
};
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (!pg) return;
  pg.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  document.getElementById('tb-title').innerHTML = `${TITLES[id] || id} <span>· Fine Planificación y Compras</span>`;
  const renders = { minsumos: renderInsumos, mproveedores: renderProveedores, mproductos: renderProductos,
    stock: renderStock, historial: renderHistorial, calculadora: renderCalc };
  renders[id]?.();
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

// ── Arranque ──
window.addEventListener('load', async () => {
  await initStore();
  go('minsumos');
});
