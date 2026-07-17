// ═══ Fine Planificación y Compras — app (Fase 1: Maestros) ═══

// ── Helpers ──
const fmt = (n, dec = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('es-AR', { maximumFractionDigits: dec });
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
};
function go(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pg = document.getElementById('page-' + id);
  if (!pg) return;
  pg.classList.add('active');
  document.querySelector(`.nav-item[data-page="${id}"]`)?.classList.add('active');
  document.getElementById('tb-title').innerHTML = `${TITLES[id] || id} <span>· Fine Planificación y Compras</span>`;
  const renders = { minsumos: renderInsumos, mproveedores: renderProveedores, mproductos: renderProductos };
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
function insumosFiltrados() {
  const q = (document.getElementById('s-insumos')?.value || '').toLowerCase();
  const ft = document.getElementById('f-ins-tipo')?.value || '';
  return allRecs('insumos')
    .filter(i => (!ft || i.tipo === ft) &&
      (!q || i.codigo.toLowerCase().includes(q) || (i.nombre || '').toLowerCase().includes(q) || (i.proveedor || '').toLowerCase().includes(q)))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}
function renderInsumos() {
  const data = insumosFiltrados();
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
  document.getElementById('tbl-insumos').innerHTML = slice.map(i => `
    <tr class="clickable" onclick="editInsumo('${esc(i.codigo)}')">
      <td class="mono">${esc(i.codigo)}</td>
      <td style="font-weight:600">${esc(i.nombre)}</td>
      <td class="tc"><span class="pill pill-${i.tipo.toLowerCase()}">${i.tipo}</span></td>
      <td class="tc mono">${esc(i.um)}</td>
      <td class="num">${i.precio > 0 ? (i.moneda === 'ARS' ? '$ ' : 'USD ') + fmt(i.precio) : '—'}</td>
      <td>${esc(i.proveedor || '—')}</td>
      <td class="tc mono" style="font-size:10px;color:var(--text3)">${esc((i.fechaPrecio || '').slice(0, 10)) || '—'}</td>
    </tr>`).join('');
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
  const q = (document.getElementById('s-provs')?.value || '').toLowerCase();
  // Busca por proveedor O por insumo del catálogo: si matchea un insumo,
  // muestra el proveedor con los insumos encontrados y su precio.
  const data = allRecs('proveedores').map(p => {
    const matchProv = !q || (p.nombre || '').toLowerCase().includes(q) || (p.contacto || '').toLowerCase().includes(q);
    const matchIns = q ? (p.insumos || []).filter(i => (i.insumo || '').toLowerCase().includes(q)) : [];
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
  const q = (document.getElementById('s-prods')?.value || '').toLowerCase();
  const data = allRecs('productos')
    .filter(p => !q || p.codigo.toLowerCase().includes(q) || (p.nombre || '').toLowerCase().includes(q) || (p.skuCore || '').toLowerCase().includes(q))
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

// ── Arranque ──
window.addEventListener('load', async () => {
  await initStore();
  go('minsumos');
});
