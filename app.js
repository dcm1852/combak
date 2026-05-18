/* ═══════════════════════════════════════════════════════════════
   COMBAK — app.js  v4  (auditoría completa)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const CATEGORIAS_DEFAULT = [
  { id: 'c1',  nombre: 'Alimentación',    tipo: 'gasto',   color: '#e74c3c', icono: '' },
  { id: 'c2',  nombre: 'Transporte',      tipo: 'gasto',   color: '#e67e22', icono: '' },
  { id: 'c3',  nombre: 'Renta/Hipoteca',  tipo: 'gasto',   color: '#8e44ad', icono: '' },
  { id: 'c4',  nombre: 'Servicios',       tipo: 'gasto',   color: '#2980b9', icono: '' },
  { id: 'c5',  nombre: 'Salud',           tipo: 'gasto',   color: '#27ae60', icono: '' },
  { id: 'c6',  nombre: 'Entretenimiento', tipo: 'gasto',   color: '#f39c12', icono: '' },
  { id: 'c7',  nombre: 'Ropa',            tipo: 'gasto',   color: '#e91e63', icono: '' },
  { id: 'c8',  nombre: 'Educación',       tipo: 'gasto',   color: '#00bcd4', icono: '' },
  { id: 'c9',  nombre: 'Restaurantes',    tipo: 'gasto',   color: '#ff5722', icono: '' },
  { id: 'c10', nombre: 'Suscripciones',   tipo: 'gasto',   color: '#9c27b0', icono: '' },
  { id: 'c11', nombre: 'Emergencias',     tipo: 'gasto',   color: '#f44336', icono: '' },
  { id: 'c12', nombre: 'Otros gastos',    tipo: 'gasto',   color: '#607d8b', icono: '' },
  { id: 'c13', nombre: 'Salario',         tipo: 'ingreso', color: '#1a6b45', icono: '' },
  { id: 'c14', nombre: 'Freelance',       tipo: 'ingreso', color: '#2e7d32', icono: '' },
  { id: 'c15', nombre: 'Negocio',         tipo: 'ingreso', color: '#388e3c', icono: '' },
  { id: 'c16', nombre: 'Rendimientos',    tipo: 'ingreso', color: '#43a047', icono: '' },
  { id: 'c17', nombre: 'Regalo',          tipo: 'ingreso', color: '#66bb6a', icono: '' },
  { id: 'c18', nombre: 'Bono',            tipo: 'ingreso', color: '#81c784', icono: '' },
  { id: 'c19', nombre: 'Otros ingresos',  tipo: 'ingreso', color: '#a5d6a7', icono: '' },
];

// ── DB ────────────────────────────────────────────────────────
const DB = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v)   => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { toast('Error al guardar datos'); } }
};

function getConfig()        { return DB.get('mf_config', { nombre: 'Combak', divisa: 'MXN' }); }
function setConfig(v)       { DB.set('mf_config', v); }
function getCuentas()       { return DB.get('mf_cuentas', []); }
function setCuentas(v)      { DB.set('mf_cuentas', v);      scheduleSync(); }
function getMovimientos()   { return DB.get('mf_movimientos', []); }
function setMovimientos(v)  { DB.set('mf_movimientos', v);  scheduleSync(); }
function getPresupuestos()  { return DB.get('mf_presupuestos', []); }
function setPresupuestos(v) { DB.set('mf_presupuestos', v); scheduleSync(); }
function getMetas()         { return DB.get('mf_metas', []); }
function setMetas(v)        { DB.set('mf_metas', v);        scheduleSync(); }
function getCategorias()    { return DB.get('mf_categorias', CATEGORIAS_DEFAULT); }
function setCategorias(v)   { DB.set('mf_categorias', v);   scheduleSync(); }
function getInversiones()   { return DB.get('mf_inversiones', []); }
function setInversiones(v)  { DB.set('mf_inversiones', v);  scheduleSync(); }
function getProgramados()   { return DB.get('mf_programados', []); }
function setProgramados(v)  { DB.set('mf_programados', v);  scheduleSync(); }

function scheduleSync() {
  if (window.CombakSync?.isConnected()) window.CombakSync.scheduleSync();
}

// ── Utilidades ────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function getBankLogo(nombre) {
  if (!nombre) return null;
  const n = nombre.toLowerCase();
  const map = {
    'bbva': 'https://logo.clearbit.com/bbva.com',
    'santander': 'https://logo.clearbit.com/santander.com',
    'banamex': 'https://logo.clearbit.com/banamex.com',
    'citibanamex': 'https://logo.clearbit.com/banamex.com',
    'hsbc': 'https://logo.clearbit.com/hsbc.com',
    'banorte': 'https://logo.clearbit.com/banorte.com',
    'scotiabank': 'https://logo.clearbit.com/scotiabank.com',
    'inbursa': 'https://logo.clearbit.com/inbursa.com',
    'hey': 'https://logo.clearbit.com/heybanco.com',
    'nu ': 'https://logo.clearbit.com/nu.com.mx',
    'nubank': 'https://logo.clearbit.com/nu.com.mx',
    'spin': 'https://logo.clearbit.com/spin.com.mx',
    'mercado': 'https://logo.clearbit.com/mercadopago.com',
  };
  for (const [key, url] of Object.entries(map)) {
    if (n.includes(key)) return url;
  }
  return null;
}

function renderBankIcon(nombre, size = 36) {
  const logo = getBankLogo(nombre);
  const initials = (nombre || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (logo) {
    return `<img src="${logo}" alt="${esc(nombre)}"
      style="width:${size * 0.7}px;height:${size * 0.7}px;object-fit:contain;display:block"
      onerror="this.parentElement.innerHTML='<span style=\\'font-size:.65rem;font-weight:700;color:var(--text-2)\\'>${initials}</span>'"
    />`;
  }
  return `<span style="font-size:.65rem;font-weight:700;color:var(--text-2)">${initials}</span>`;
}

const fmt = (n) => {
  const cfg = getConfig();
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: cfg.divisa || 'MXN', minimumFractionDigits: 2 }).format(n || 0);
};
const fmtFecha = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};
const today = () => new Date().toISOString().slice(0, 10);
const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

function toast(msg, dur = 2200) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), dur);
}

// ── Períodos ──────────────────────────────────────────────────
const PERIODOS = {
  mes:    () => { const d = new Date(); d.setDate(1); return { desde: d.toISOString().slice(0,10), hasta: today() }; },
  semana: () => { const d = new Date(); d.setDate(d.getDate()-6); return { desde: d.toISOString().slice(0,10), hasta: today() }; },
  anio:   () => { const d = new Date(); d.setMonth(0,1); return { desde: d.toISOString().slice(0,10), hasta: today() }; },
};

let currentPeriod = 'mes';
function getPeriodo() { return PERIODOS[currentPeriod](); }
function movsEnPeriodo(movs, periodo) {
  const { desde, hasta } = periodo;
  return movs.filter(m => m.fecha >= desde && m.fecha <= hasta);
}

function calcSaldoCuenta(cuentaId) {
  const movs = getMovimientos();
  const cuenta = getCuentas().find(c => c.id === cuentaId);
  let saldo = parseFloat(cuenta?.saldoInicial) || 0;
  movs.forEach(m => {
    if (m.tipo === 'Ingreso'     && m.cuentaId === cuentaId) saldo += parseFloat(m.monto) || 0;
    if (m.tipo === 'Gasto'       && m.cuentaId === cuentaId) saldo -= parseFloat(m.monto) || 0;
    if (m.tipo === 'Inversión'   && m.cuentaId === cuentaId) saldo -= parseFloat(m.monto) || 0;
    if (m.tipo === 'Rendimiento' && m.cuentaId === cuentaId) saldo += parseFloat(m.monto) || 0;
    if (m.tipo === 'Transferencia') {
      if (m.cuentaId        === cuentaId) saldo -= parseFloat(m.monto) || 0;
      if (m.cuentaDestinoId === cuentaId) saldo += parseFloat(m.monto) || 0;
    }
  });
  return saldo;
}

function getColorCategoria(nombre) {
  const cat = getCategorias().find(c => c.nombre === nombre);
  return cat ? cat.color : '#607d8b';
}

// ── Navegación ────────────────────────────────────────────────
let currentView = 'dashboard';

const VIEW_TITLES = {
  dashboard: 'Dashboard', movimientos: 'Movimientos',
  cuentas: 'Cuentas', presupuestos: 'Presupuestos',
  flujo: 'Flujo', inversiones: 'Inversiones',
  programados: 'Ingresos programados', config: 'Configuración'
};

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bnav-item').forEach(a => a.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(a => a.classList.add('active'));
  document.getElementById('view-title').textContent = VIEW_TITLES[view] || view;
  currentView = view;
  closeSidebar();
  renderView(view);
}

// FIX #1 — renderView refresca TODAS las vistas afectadas cuando hay cambios de datos
function renderView(view) {
  const renders = {
    dashboard:    renderDashboard,
    movimientos:  renderMovimientos,
    cuentas:      renderCuentas,
    presupuestos: renderPresupuestos,
    flujo:        renderFlujo,
    inversiones:  renderInversiones,
    programados:  renderProgramados,
    config:       renderConfig,
  };
  if (renders[view]) renders[view]();
}

// Refresca todas las vistas que dependen de movimientos (llamar tras guardar/editar/eliminar)
function refreshAll() {
  renderView(currentView);
  // Si no estamos en dashboard, refrescar datos del dashboard en background
  // para que estén listos al volver (sin re-renderizar el DOM)
}

// ── Sidebar ───────────────────────────────────────────────────
function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('visible'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('visible'); }

// ── Modal ─────────────────────────────────────────────────────
function openModal(title, bodyHTML, onReady) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
  if (onReady) onReady();
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-body').innerHTML = '';
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const periodo   = getPeriodo();
  const movs      = getMovimientos();
  const enPeriodo = movsEnPeriodo(movs, periodo);

  const ingresos = enPeriodo.filter(m => m.tipo === 'Ingreso').reduce((s,m) => s + parseFloat(m.monto), 0);
  const gastos   = enPeriodo.filter(m => m.tipo === 'Gasto').reduce((s,m) => s + parseFloat(m.monto), 0);
  const balance  = ingresos - gastos;

  document.getElementById('kpi-ingresos').textContent = fmt(ingresos);
  document.getElementById('kpi-gastos').textContent   = fmt(gastos);
  document.getElementById('kpi-balance').textContent  = fmt(balance);
  const sub = document.getElementById('kpi-balance-sub');
  sub.textContent = ingresos > 0 ? `${Math.round((gastos/ingresos)*100)}% de ingresos gastado` : '';

  // Cuentas
  const cuentas = getCuentas().filter(c => !c.archivada);
  const elCuentas = document.getElementById('dash-cuentas');
  elCuentas.innerHTML = !cuentas.length
    ? `<div class="empty-state"><div class="empty-state-icon">▣</div>Agrega tu primera cuenta en Cuentas</div>`
    : cuentas.map(c => {
        const saldo = calcSaldoCuenta(c.id);
        return `<div class="cuenta-dash-card" onclick="navigateTo('cuentas')">
          <div class="cuenta-dash-info">
            <div class="cuenta-dash-icon" style="overflow:hidden">${renderBankIcon(c.nombre, 36)}</div>
            <div><div class="cuenta-dash-nombre">${esc(c.nombre)}</div><div class="cuenta-dash-tipo">${esc(c.tipo)}</div></div>
          </div>
          <div class="cuenta-dash-saldo ${saldo<0?'negativo':''}">${fmt(saldo)}</div>
        </div>`;
      }).join('');

  // Presupuestos
  const presups   = getPresupuestos();
  const movsMes   = movsEnPeriodo(movs, PERIODOS.mes());
  const elPresup  = document.getElementById('dash-presupuestos');
  elPresup.innerHTML = !presups.length
    ? `<div class="empty-state"><div class="empty-state-icon">◎</div>Sin presupuestos configurados</div>`
    : presups.slice(0,4).map(p => {
        const gastado = movsMes.filter(m => m.tipo==='Gasto' && m.categoria===p.categoria).reduce((s,m)=>s+parseFloat(m.monto),0);
        const pct   = p.limite>0 ? Math.min((gastado/p.limite)*100,100) : 0;
        const clase = pct>=100 ? 'excede' : pct>=80 ? 'alerta' : 'ok';
        const estado= pct>=100 ? 'Excedido' : pct>=80 ? 'Al límite' : 'OK';
        return `<div class="presup-dash-item">
          <div class="presup-dash-row">
            <span class="presup-dash-nombre">${esc(p.categoria)}</span>
            <span class="presup-dash-montos">${fmt(gastado)} / ${fmt(p.limite)}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ${clase}" style="width:${pct}%"></div></div>
          <div class="presup-dash-estado ${clase==='ok'?'text-green':clase==='alerta'?'text-amber':'text-red'}">${estado}</div>
        </div>`;
      }).join('');

  // Alertas de ingresos programados — FIX: limpiar antes de insertar
  const existingAlert = document.getElementById('dash-alertas-prog');
  if (existingAlert) existingAlert.remove();

  const progs  = getProgramados().filter(p => !p.archivado);
  const hoy2   = today();
  const proximos = progs.filter(p => {
    const prox = proximaFecha(p);
    if (!prox) return false;
    const diff = diasEntre(hoy2, prox);
    const yaChecked = (p.historial||[]).find(h => h.fecha===prox && h.estado==='recibido');
    return diff <= 3 && !yaChecked;
  });
  if (proximos.length) {
    const alertDiv = document.createElement('div');
    alertDiv.id = 'dash-alertas-prog';
    alertDiv.style = 'margin-bottom:8px';
    alertDiv.innerHTML = proximos.slice(0,2).map(p => {
      const prox = proximaFecha(p);
      const diff = diasEntre(hoy2, prox);
      const label = diff<0 ? `Vencido hace ${Math.abs(diff)}d` : diff===0 ? 'Hoy' : `En ${diff}d`;
      return `<div class="alerta-programado ${diff<0?'vencido':diff===0?'hoy':'proximo'}" style="margin-bottom:6px;cursor:pointer" onclick="navigateTo('programados')">
        <div class="alerta-icon">${diff<0?'!':'◷'}</div>
        <div class="alerta-info"><div class="alerta-nombre">${esc(p.nombre)}</div><div class="alerta-detalle">${label}</div></div>
        <div class="alerta-monto">${fmt(p.monto)}</div>
      </div>`;
    }).join('');
    elPresup.parentNode.insertBefore(alertDiv, elPresup);
  }

  // Top categorías
  const catMap = {};
  enPeriodo.filter(m => m.tipo==='Gasto').forEach(m => { catMap[m.categoria]=(catMap[m.categoria]||0)+parseFloat(m.monto); });
  const cats   = Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCat = cats[0]?.[1] || 1;
  const elCats = document.getElementById('dash-categorias');
  elCats.innerHTML = !cats.length
    ? `<div class="empty-state"><div class="empty-state-icon">≋</div>Sin gastos en este período</div>`
    : cats.map(([nombre, monto]) => {
        const color = getColorCategoria(nombre);
        return `<div class="cat-dash-row">
          <div class="cat-dash-dot" style="background:${color}"></div>
          <span class="cat-dash-nombre">${esc(nombre)}</span>
          <div class="cat-dash-bar-wrap"><div class="cat-dash-bar" style="width:${(monto/maxCat)*100}%;background:${color}"></div></div>
          <span class="cat-dash-monto">${fmt(monto)}</span>
        </div>`;
      }).join('');

  // Últimos movimientos
  const ultimos = [...movs].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0,5);
  const elUltimos = document.getElementById('dash-ultimos');
  elUltimos.innerHTML = !ultimos.length
    ? `<div class="empty-state"><div class="empty-state-icon">↕</div>Sin movimientos aún. Toca ＋ para agregar.</div>`
    : ultimos.map(m => renderMovCard(m)).join('');
}

// ── MOVIMIENTOS ───────────────────────────────────────────────
function renderMovimientos() {
  poblarFiltros();
  filtrarYMostrarMovs();
}

function poblarFiltros() {
  const cuentas = getCuentas();
  const cats    = getCategorias();
  const selC = document.getElementById('filtro-cuenta');
  const selCat = document.getElementById('filtro-cat');
  const cur_c = selC.value, cur_cat = selCat.value;
  selC.innerHTML   = '<option value="">Todas las cuentas</option>' +
    cuentas.map(c => `<option value="${c.id}" ${cur_c===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('');
  selCat.innerHTML = '<option value="">Todas las categorías</option>' +
    cats.map(c => `<option value="${c.nombre}" ${cur_cat===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('');
}

function filtrarYMostrarMovs() {
  let movs = [...getMovimientos()];
  const buscar    = document.getElementById('buscar-mov')?.value.toLowerCase() || '';
  const filTipo   = document.getElementById('filtro-tipo')?.value || '';
  const filCuenta = document.getElementById('filtro-cuenta')?.value || '';
  const filCat    = document.getElementById('filtro-cat')?.value || '';

  if (buscar)    movs = movs.filter(m => (m.categoria||'').toLowerCase().includes(buscar)||(m.notas||'').toLowerCase().includes(buscar)||(m.destinatario||'').toLowerCase().includes(buscar));
  if (filTipo)   movs = movs.filter(m => m.tipo===filTipo);
  if (filCuenta) movs = movs.filter(m => m.cuentaId===filCuenta||m.cuentaDestinoId===filCuenta);
  if (filCat)    movs = movs.filter(m => m.categoria===filCat);
  movs.sort((a,b) => b.fecha.localeCompare(a.fecha) || b.updatedAt.localeCompare(a.updatedAt));

  const el = document.getElementById('lista-movimientos');
  el.innerHTML = !movs.length
    ? `<div class="empty-state"><div class="empty-state-icon">◉</div>Sin resultados</div>`
    : movs.map(m => renderMovCard(m)).join('');
}

function renderMovCard(m) {
  const cuentas   = getCuentas();
  const cuenta    = cuentas.find(c => c.id === m.cuentaId);
  const tipoClass = m.tipo.toLowerCase().replace('ó','o').replace('é','e');
  const icono = { Gasto:'−', Ingreso:'+', Transferencia:'⇄', 'Inversión':'◇', Rendimiento:'↗' }[m.tipo] || '•';
  const signo = (m.tipo==='Gasto'||m.tipo==='Inversión') ? '-' : (m.tipo==='Ingreso'||m.tipo==='Rendimiento') ? '+' : '';
  const detalle = [fmtFecha(m.fecha), cuenta?.nombre, m.notas].filter(Boolean).join(' · ');
  return `<div class="mov-card" onclick="verMovimiento('${m.id}')">
    <div class="mov-icon ${tipoClass}">${icono}</div>
    <div class="mov-info">
      <div class="mov-categoria">${esc(m.categoria||m.tipo)}</div>
      <div class="mov-detalle">${esc(detalle)}</div>
    </div>
    <div class="mov-monto ${tipoClass}">${signo}${fmt(m.monto)}</div>
  </div>`;
}

function verMovimiento(id) {
  const m = getMovimientos().find(x => x.id===id);
  if (!m) return;
  const cuentas  = getCuentas();
  const cuenta   = cuentas.find(c => c.id===m.cuentaId);
  const cuentaDest = cuentas.find(c => c.id===m.cuentaDestinoId);
  openModal(`${m.categoria||m.tipo}`, `
    <div class="form-group">
      <div style="display:grid;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span class="tag tag-${m.tipo.toLowerCase().replace('ó','o')}">${m.tipo}</span>
          <span class="font-serif" style="font-size:1.6rem">${fmt(m.monto)}</span>
        </div>
        <div class="divider"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.88rem">
          <div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">FECHA</div>${fmtFecha(m.fecha)}</div>
          <div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">CUENTA</div>${esc(cuenta?.nombre||'-')}</div>
          <div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">CATEGORÍA</div>${esc(m.categoria||'-')}</div>
          ${cuentaDest?`<div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">DESTINO</div>${esc(cuentaDest.nombre)}</div>`:''}
          ${m.destinatario?`<div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">PROVEEDOR</div>${esc(m.destinatario)}</div>`:''}
          ${m.recurrencia&&m.recurrencia!=='No'?`<div><div class="text-muted" style="font-size:.72rem;margin-bottom:2px">RECURRENCIA</div>${esc(m.recurrencia)}</div>`:''}
        </div>
        ${m.notas?`<div class="divider"></div><div style="font-size:.88rem"><span class="text-muted" style="font-size:.72rem">NOTAS</span><br>${esc(m.notas)}</div>`:''}
        <div class="divider"></div>
        <div style="display:flex;gap:8px">
          <button class="btn-outline" style="flex:1" onclick="editarMovimiento('${m.id}')">✏ Editar</button>
          <button class="btn-danger"  style="flex:1" onclick="eliminarMovimiento('${m.id}')">✕ Eliminar</button>
        </div>
      </div>
    </div>`);
}

// ── CUENTAS ───────────────────────────────────────────────────
function renderCuentas() {
  const cuentas    = getCuentas().filter(c => !c.archivada);
  const patrimonio = cuentas.reduce((s,c) => s + calcSaldoCuenta(c.id), 0);
  document.getElementById('patrimonio-total').textContent = fmt(patrimonio);
  const el = document.getElementById('lista-cuentas');
  el.innerHTML = !cuentas.length
    ? `<div class="empty-state"><div class="empty-state-icon">▣</div>Sin cuentas. Agrega la primera.</div>`
    : cuentas.map(c => {
        const saldo = calcSaldoCuenta(c.id);
        return `<div class="cuenta-card">
          <div class="cuenta-card-header">
            <div class="cuenta-card-left">
              <div class="cuenta-card-icon" style="overflow:hidden">${renderBankIcon(c.nombre,42)}</div>
              <div><div class="cuenta-card-nombre">${esc(c.nombre)}</div><div class="cuenta-card-tipo">${esc(c.tipo)} · ${esc(c.divisa||'MXN')}</div></div>
            </div>
            <div class="cuenta-card-saldo ${saldo<0?'negativo':''}">${fmt(saldo)}</div>
          </div>
          <div class="cuenta-card-footer">
            <button class="btn-cuenta-action" onclick="editarCuenta('${c.id}')">✏ Editar</button>
            <button class="btn-cuenta-action" onclick="historialCuenta('${c.id}')">≡ Historial</button>
            <button class="btn-cuenta-action" onclick="archivarCuenta('${c.id}')">◻ Archivar</button>
          </div>
        </div>`;
      }).join('');
}

function historialCuenta(id) {
  const cuenta = getCuentas().find(c => c.id===id);
  if (!cuenta) return;
  const movs = getMovimientos().filter(m => m.cuentaId===id||m.cuentaDestinoId===id)
               .sort((a,b) => b.fecha.localeCompare(a.fecha));
  openModal(`Historial: ${cuenta.nombre}`, `
    <div style="font-size:.88rem;color:var(--text-2);margin-bottom:12px">
      Saldo actual: <strong style="color:var(--text)">${fmt(calcSaldoCuenta(id))}</strong>
    </div>
    ${!movs.length ? '<div class="empty-state">Sin movimientos</div>' :
      movs.map(m => {
        const esDestino = m.cuentaDestinoId===id && m.tipo==='Transferencia';
        const signo = (m.tipo==='Ingreso'||m.tipo==='Rendimiento'||esDestino) ? '+' : '-';
        const color = signo==='+' ? 'var(--green)' : 'var(--red)';
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600">${esc(m.categoria||m.tipo)}</div>
            <div style="font-size:.75rem;color:var(--text-3)">${fmtFecha(m.fecha)} · ${esc(m.notas||'')}</div>
          </div>
          <div style="font-weight:700;color:${color}">${signo}${fmt(m.monto)}</div>
        </div>`;
      }).join('')}`);
}

function archivarCuenta(id) {
  if (!confirm('¿Archivar esta cuenta?')) return;
  setCuentas(getCuentas().map(c => c.id===id ? {...c, archivada:true} : c));
  renderCuentas(); toast('Cuenta archivada');
}

// ── PRESUPUESTOS ──────────────────────────────────────────────
function renderPresupuestos() { renderListaPresupuestos(); renderListaMetas(); }

function renderListaPresupuestos() {
  const presups = getPresupuestos();
  const movsMes = movsEnPeriodo(getMovimientos(), PERIODOS.mes());
  const el = document.getElementById('lista-presupuestos');
  el.innerHTML = !presups.length
    ? `<div class="empty-state"><div class="empty-state-icon">◎</div>Sin presupuestos. Crea el primero.</div>`
    : presups.map(p => {
        const gastado = movsMes.filter(m=>m.tipo==='Gasto'&&m.categoria===p.categoria).reduce((s,m)=>s+parseFloat(m.monto),0);
        const pct   = p.limite>0 ? Math.min((gastado/p.limite)*100,100) : 0;
        const clase = pct>=100?'excede':pct>=80?'alerta':'ok';
        const estado= pct>=100?'Excedido':pct>=80?'Al límite':'OK';
        const color = clase==='ok'?'var(--green)':clase==='alerta'?'var(--amber)':'var(--red)';
        return `<div class="presup-card">
          <div class="presup-card-header">
            <div><div class="presup-card-nombre">${esc(p.categoria)}</div>
              <div style="font-size:.8rem;color:var(--text-2);margin-top:2px">${fmt(gastado)} de ${fmt(p.limite)}</div></div>
            <div class="presup-card-actions">
              <button class="btn-icon" onclick="editarPresupuesto('${p.id}')">✏</button>
              <button class="btn-icon danger" onclick="eliminarPresupuesto('${p.id}')">✕</button>
            </div>
          </div>
          <div class="progress-bar"><div class="progress-fill ${clase}" style="width:${pct.toFixed(1)}%"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
            <span style="font-size:.75rem;color:${color};font-weight:600">${estado}</span>
            <span style="font-size:.75rem;color:var(--text-3)">${fmt(Math.max(0,p.limite-gastado))} restante</span>
          </div>
        </div>`;
      }).join('');
}

function renderListaMetas() {
  const metas = getMetas();
  const el = document.getElementById('lista-metas');
  el.innerHTML = !metas.length
    ? `<div class="empty-state"><div class="empty-state-icon">◎</div>Sin metas. Crea la primera.</div>`
    : metas.map(m => {
        const pct   = m.objetivo>0 ? Math.min((m.avance/m.objetivo)*100,100) : 0;
        return `<div class="meta-card">
          <div class="meta-card-header">
            <div><div class="meta-card-nombre">${esc(m.nombre)}</div>
              ${m.fechaLimite?`<div style="font-size:.75rem;color:var(--text-3)">Fecha: ${fmtFecha(m.fechaLimite)}</div>`:''}
            </div>
            <div class="presup-card-actions">
              <button class="btn-icon" onclick="editarMeta('${m.id}')">✏</button>
              <button class="btn-icon danger" onclick="eliminarMeta('${m.id}')">✕</button>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:.85rem">
            <span class="text-green font-serif">${fmt(m.avance)}</span>
            <span style="color:var(--text-3)">de ${fmt(m.objetivo)}</span>
          </div>
          <div class="progress-bar"><div class="progress-fill ok" style="width:${pct.toFixed(1)}%"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:.75rem;color:var(--text-3)">
            <span>${pct.toFixed(0)}% completado</span>
            <span>${fmt(Math.max(0,m.objetivo-m.avance))} restante</span>
          </div>
        </div>`;
      }).join('');
}

// ── FLUJO — FIX #2: selector de período ──────────────────────
let flujoModo = 'mensual'; // mensual | trimestral | semestral | semanal

function renderFlujo() {
  // Asegurarnos de que el selector existe
  const wrap = document.getElementById('view-flujo');
  if (!wrap.querySelector('.flujo-periodo-selector')) {
    const sel = document.createElement('div');
    sel.className = 'flujo-periodo-selector';
    sel.style = 'display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap';
    sel.innerHTML = `
      <button class="period-btn ${flujoModo==='semanal'?'active':''}"   data-flujo="semanal">Semanal</button>
      <button class="period-btn ${flujoModo==='mensual'?'active':''}"   data-flujo="mensual">Mensual</button>
      <button class="period-btn ${flujoModo==='trimestral'?'active':''}" data-flujo="trimestral">Trimestral</button>
      <button class="period-btn ${flujoModo==='semestral'?'active':''}" data-flujo="semestral">Semestral</button>`;
    wrap.querySelector('.flujo-wrap').before(sel);
    sel.querySelectorAll('[data-flujo]').forEach(btn => {
      btn.addEventListener('click', () => {
        flujoModo = btn.dataset.flujo;
        sel.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        buildFlujoTable();
      });
    });
  } else {
    // Sincronizar estado del selector
    wrap.querySelectorAll('[data-flujo]').forEach(b => {
      b.classList.toggle('active', b.dataset.flujo === flujoModo);
    });
  }
  buildFlujoTable();
}

function buildFlujoTable() {
  const movs = getMovimientos();
  const cols  = getFlujoColumnas();
  const cats  = getCategorias();
  const catsGasto   = cats.filter(c => c.tipo==='gasto');
  const catsIngreso = cats.filter(c => c.tipo==='ingreso');

  function sumaEnCol(cat, col, tipo) {
    return movs.filter(m => {
      const d = new Date(m.fecha+'T12:00:00');
      return m.tipo===tipo && m.categoria===cat && col.test(d);
    }).reduce((s,m)=>s+parseFloat(m.monto),0);
  }

  function totalesTipo(tipo) {
    return cols.map(col =>
      movs.filter(m => { const d=new Date(m.fecha+'T12:00:00'); return m.tipo===tipo && col.test(d); })
          .reduce((s,m)=>s+parseFloat(m.monto),0)
    );
  }

  function buildRows(catList, tipo) {
    return catList.map(cat => {
      const vals = cols.map(col => sumaEnCol(cat.nombre, col, tipo));
      if (vals.every(v=>v===0)) return '';
      return `<tr class="${tipo==='Gasto'?'fila-gasto':'fila-ingreso'}">
        <td>${esc(cat.nombre)}</td>
        ${vals.map(v => `<td>${v?fmt(v):'-'}</td>`).join('')}
      </tr>`;
    }).join('');
  }

  const totG = totalesTipo('Gasto');
  const totI = totalesTipo('Ingreso');

  const tabla = document.getElementById('tabla-flujo');
  tabla.innerHTML = `
    <thead><tr>
      <th>Categoría</th>
      ${cols.map(c=>`<th>${c.label}</th>`).join('')}
    </tr></thead>
    <tbody>
      <tr class="fila-section"><td colspan="${cols.length+1}">INGRESOS</td></tr>
      ${buildRows(catsIngreso,'Ingreso')}
      <tr class="fila-total fila-ingreso">
        <td>Total ingresos</td>${totI.map(v=>`<td>${fmt(v)}</td>`).join('')}
      </tr>
      <tr class="fila-section"><td colspan="${cols.length+1}">GASTOS</td></tr>
      ${buildRows(catsGasto,'Gasto')}
      <tr class="fila-total fila-gasto">
        <td>Total gastos</td>${totG.map(v=>`<td>${fmt(v)}</td>`).join('')}
      </tr>
      <tr class="fila-balance">
        <td>Balance neto</td>
        ${cols.map((_,i)=>{const b=totI[i]-totG[i];return `<td class="${b>=0?'positivo':'negativo'}">${fmt(b)}</td>`;}).join('')}
      </tr>
    </tbody>`;
}

function getFlujoColumnas() {
  const now = new Date();
  if (flujoModo === 'mensual') {
    return Array.from({length:6}, (_,i) => {
      const d = new Date(now.getFullYear(), now.getMonth()-5+i, 1);
      const mes = d.getMonth(), anio = d.getFullYear();
      return {
        label: d.toLocaleDateString('es-MX',{month:'short',year:'2-digit'}).toUpperCase(),
        test: (dt) => dt.getMonth()===mes && dt.getFullYear()===anio
      };
    });
  }
  if (flujoModo === 'trimestral') {
    return Array.from({length:4}, (_,i) => {
      const mesInicio = now.getMonth() - 11 + i*3;
      const d = new Date(now.getFullYear(), mesInicio, 1);
      const q = Math.floor(d.getMonth()/3);
      const anio = d.getFullYear();
      return {
        label: `T${q+1} ${anio}`,
        test: (dt) => Math.floor(dt.getMonth()/3)===q && dt.getFullYear()===anio
      };
    });
  }
  if (flujoModo === 'semestral') {
    return Array.from({length:4}, (_,i) => {
      const mesInicio = now.getMonth() - 17 + i*6;
      const d = new Date(now.getFullYear(), mesInicio, 1);
      const sem = Math.floor(d.getMonth()/6);
      const anio = d.getFullYear();
      return {
        label: `S${sem+1} ${anio}`,
        test: (dt) => Math.floor(dt.getMonth()/6)===sem && dt.getFullYear()===anio
      };
    });
  }
  if (flujoModo === 'semanal') {
    return Array.from({length:6}, (_,i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - 35 + i*7);
      const ini = new Date(d); ini.setHours(0,0,0,0);
      const fin = new Date(ini); fin.setDate(fin.getDate()+6); fin.setHours(23,59,59,999);
      const label = `${ini.getDate()}/${ini.getMonth()+1}`;
      return { label, test: (dt) => dt>=ini && dt<=fin };
    });
  }
  return [];
}

// ── INVERSIONES — FIX #4 y #5 ────────────────────────────────
function renderInversiones() {
  const invs = getInversiones();
  const el = document.getElementById('lista-inversiones');
  el.innerHTML = !invs.length
    ? `<div class="empty-state"><div class="empty-state-icon">△</div>Sin inversiones registradas</div>`
    : invs.map(inv => {
        const roi = inv.capital>0 ? ((inv.rendimientos/inv.capital)*100).toFixed(1) : 0;
        return `<div class="inv-card">
          <div class="inv-card-header">
            <div class="inv-card-nombre">${esc(inv.nombre)}</div>
            <div class="inv-card-roi ${inv.rendimientos<0?'negativo':''}">ROI ${roi}%</div>
          </div>
          <div class="inv-card-stats">
            <div class="inv-stat"><strong>${fmt(inv.capital)}</strong>Capital</div>
            <div class="inv-stat"><strong class="text-green">${fmt(inv.rendimientos)}</strong>Rendimientos</div>
            <div class="inv-stat"><strong>${fmt(inv.capital+inv.rendimientos)}</strong>Total</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn-cuenta-action" onclick="editarInversion('${inv.id}')">✏ Editar</button>
            <button class="btn-cuenta-action" onclick="registrarRendimiento('${inv.id}')">↗ Rendimiento</button>
            <button class="btn-cuenta-action" onclick="eliminarInversion('${inv.id}')">✕ Eliminar</button>
          </div>
        </div>`;
      }).join('');
}

// Registrar rendimiento como movimiento real
window.registrarRendimiento = function(id) {
  const inv = getInversiones().find(i => i.id===id);
  if (!inv) return;
  const cuentas = getCuentas().filter(c => !c.archivada);
  openModal('Registrar rendimiento', `
    <div style="margin-bottom:14px;font-size:.88rem;color:var(--text-2)">
      Inversión: <strong>${esc(inv.nombre)}</strong><br>
      Capital actual: <strong>${fmt(inv.capital)}</strong> · Rendimientos acumulados: <strong>${fmt(inv.rendimientos)}</strong>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label>Monto del rendimiento</label>
        <input type="number" id="rend-monto" class="input-field" placeholder="0.00" step="0.01" />
      </div>
      <div class="form-group">
        <label>Fecha</label>
        <input type="date" id="rend-fecha" class="input-field" value="${today()}" />
      </div>
    </div>
    <div class="form-group">
      <label>Cuenta de depósito (opcional)</label>
      <select id="rend-cuenta" class="input-field">
        <option value="">— No mover a cuenta —</option>
        ${cuentas.map(c=>`<option value="${c.id}">${esc(c.nombre)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Notas</label>
      <input type="text" id="rend-notas" class="input-field" placeholder="Intereses CETES, dividendos..." />
    </div>
    <button class="btn-primary btn-full" onclick="guardarRendimiento('${id}')">↗ Registrar rendimiento</button>
  `);
};

window.guardarRendimiento = function(invId) {
  const monto  = parseFloat(document.getElementById('rend-monto').value);
  const fecha  = document.getElementById('rend-fecha').value;
  const cuentaId = document.getElementById('rend-cuenta').value;
  const notas  = document.getElementById('rend-notas').value.trim();
  if (!monto||monto<=0) { toast('Ingresa el monto'); return; }

  const now = new Date().toISOString();

  // Actualizar rendimientos acumulados en la inversión
  const invs = getInversiones();
  const idx  = invs.findIndex(i => i.id===invId);
  if (idx>-1) {
    invs[idx].rendimientos = (parseFloat(invs[idx].rendimientos)||0) + monto;
    invs[idx].updatedAt = now;
  }
  setInversiones(invs);

  // Crear movimiento de Rendimiento (FIX #4 — aparece en Flujo e Ingresos)
  const movs = getMovimientos();
  movs.push({
    id: uid(),
    monto,
    fecha,
    tipo: 'Rendimiento',
    categoria: 'Rendimientos',
    cuentaId: cuentaId || '',
    cuentaDestinoId: '',
    tipoCambio: 1,
    destinatario: invs[idx]?.nombre || '',
    notas: notas || `Rendimiento: ${invs[idx]?.nombre||'inversión'}`,
    recurrencia: 'No',
    inversionId: invId,
    createdAt: now,
    updatedAt: now,
  });
  setMovimientos(movs);

  closeModal();
  toast('Rendimiento registrado ↗');
  renderInversiones();
};

// ── CALCULADORA — FIX #3: capitalización configurable + tabla anual ──
function calcularInversion() {
  const capital  = parseFloat(document.getElementById('calc-capital').value) || 0;
  const tasaAnual= parseFloat(document.getElementById('calc-tasa').value) || 0;
  const plazo    = parseInt(document.getElementById('calc-plazo').value) || 0;
  const aporte   = parseFloat(document.getElementById('calc-aporte').value) || 0;
  const cap      = parseInt(document.getElementById('calc-capitalizacion')?.value || '12');

  if (!capital||!tasaAnual||!plazo) { toast('Completa capital, tasa y plazo'); return; }

  const tasaPeriodo = (tasaAnual/100) / cap;
  const periodosPorAnio = cap;
  const totalPeriodos   = plazo * periodosPorAnio;
  // Fórmula de interés compuesto con aportaciones periódicas
  // Aporte mensual → convertir al período de capitalización
  const aportePeriodo = aporte * (12 / cap);

  let total = capital;
  const resAnual = [];
  for (let p = 0; p < totalPeriodos; p++) {
    total = total*(1+tasaPeriodo) + aportePeriodo;
    if ((p+1) % periodosPorAnio === 0) {
      const anioNum = (p+1)/periodosPorAnio;
      const aportesAcum = aportePeriodo * periodosPorAnio * anioNum;
      resAnual.push({ anio: anioNum, total, rendimientos: total - capital - aportesAcum });
    }
  }

  const aportacionesTotal = aportePeriodo * totalPeriodos;
  const rendimientos      = total - capital - aportacionesTotal;
  const roiTotal = capital+aportacionesTotal > 0 ? (rendimientos/(capital+aportacionesTotal)*100).toFixed(1) : 0;

  const capLabels = { 1:'Anual', 2:'Semestral', 4:'Trimestral', 12:'Mensual', 365:'Diaria' };
  const capLabel  = capLabels[cap] || `${cap}x/año`;

  const el = document.getElementById('calc-resultado');
  el.classList.add('visible');
  el.innerHTML = `
    <div class="calc-total">${fmt(total)}</div>
    <div class="calc-sub">Valor final en ${plazo} año${plazo>1?'s':''} · Capitalización ${capLabel}</div>
    <div class="divider" style="border-color:rgba(255,255,255,.15);margin:12px 0"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.82rem;margin-bottom:14px">
      <div><div style="opacity:.6">Capital inicial</div><strong>${fmt(capital)}</strong></div>
      <div><div style="opacity:.6">Aportaciones</div><strong>${fmt(aportacionesTotal)}</strong></div>
      <div><div style="opacity:.6">Rendimientos</div><strong style="color:var(--gold)">${fmt(rendimientos)}</strong></div>
      <div><div style="opacity:.6">ROI total</div><strong style="color:var(--gold)">${roiTotal}%</strong></div>
    </div>
    ${resAnual.length > 0 ? `
    <div style="font-size:.72rem;font-weight:700;letter-spacing:.08em;opacity:.5;margin-bottom:6px">PROYECCIÓN ANUAL</div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:.78rem">
      <thead><tr>
        <th style="text-align:left;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.15);opacity:.6">Año</th>
        <th style="text-align:right;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.15);opacity:.6">Total</th>
        <th style="text-align:right;padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.15);opacity:.6">Rendimiento</th>
      </tr></thead>
      <tbody>${resAnual.map(r=>`
        <tr>
          <td style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08)">Año ${r.anio}</td>
          <td style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;font-family:var(--font-serif)">${fmt(r.total)}</td>
          <td style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right;color:var(--gold);font-family:var(--font-serif)">+${fmt(r.rendimientos)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>` : ''}`;
}

// ── PROGRAMADOS ───────────────────────────────────────────────
function renderProgramados() {
  const progs = getProgramados();
  const hoy   = today();

  const totalEsperado = progs.filter(p=>!p.archivado).reduce((s,p)=>s+parseFloat(p.monto),0);
  document.getElementById('programados-total').textContent = fmt(totalEsperado);

  const alertasEl = document.getElementById('alertas-programados');
  const alertas = [];
  progs.filter(p=>!p.archivado).forEach(p => {
    const proxima = proximaFecha(p);
    if (!proxima) return;
    const diff = diasEntre(hoy, proxima);
    if ((p.historial||[]).find(h=>h.fecha===proxima&&h.estado==='recibido')) return;
    if (diff<0)      alertas.push({prog:p, proxima, diff, tipo:'vencido'});
    else if (diff===0) alertas.push({prog:p, proxima, diff, tipo:'hoy'});
    else if (diff<=3)  alertas.push({prog:p, proxima, diff, tipo:'proximo'});
  });

  alertasEl.innerHTML = !alertas.length ? '' : alertas.map(({prog, proxima, diff, tipo}) => {
    const icono = tipo==='vencido'?'!':tipo==='hoy'?'○':'◷';
    const label = tipo==='vencido' ? `Vencido hace ${Math.abs(diff)}d` : tipo==='hoy' ? 'Esperado hoy' : `En ${diff}d`;
    return `<div class="alerta-programado ${tipo}">
      <div class="alerta-icon">${icono}</div>
      <div class="alerta-info">
        <div class="alerta-nombre">${esc(prog.nombre)}</div>
        <div class="alerta-detalle">${label} · ${esc(prog.categoria)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div class="alerta-monto">${fmt(prog.monto)}</div>
        <div style="display:flex;gap:6px">
          <button class="btn-check recibido" onclick="marcarProgramado('${prog.id}','${proxima}','recibido')">Recibido</button>
          <button class="btn-check no-recibido" onclick="marcarProgramado('${prog.id}','${proxima}','no-recibido')">No recibido</button>
        </div>
      </div>
    </div>`;
  }).join('');

  const el = document.getElementById('lista-programados');
  const activos = progs.filter(p=>!p.archivado);
  el.innerHTML = !activos.length
    ? `<div class="empty-state"><div class="empty-state-icon">◷</div>Sin ingresos programados.</div>`
    : activos.map(p => {
        const historial = (p.historial||[]).slice(-6).reverse();
        const proxima   = proximaFecha(p);
        return `<div class="programado-card">
          <div class="programado-card-header">
            <div>
              <div class="programado-card-nombre">${esc(p.nombre)}</div>
              <div style="font-size:.75rem;color:var(--text-3);margin-top:2px">${esc(p.categoria)} · ${esc(p.recurrencia)}</div>
            </div>
            <div style="text-align:right">
              <div class="programado-card-monto">${fmt(p.monto)}</div>
              <div style="font-size:.72rem;color:var(--text-3);margin-top:2px">Próximo: ${fmtFecha(proxima)}</div>
            </div>
          </div>
          <div class="programado-card-meta">
            <div class="programado-meta-item"><strong>${esc(p.cuenta||'-')}</strong>Cuenta</div>
            <div class="programado-meta-item"><strong>${esc(p.diaEsperado||'-')}</strong>Día esperado</div>
            <div class="programado-meta-item"><strong>${p.historial?.length||0}</strong>Registros</div>
          </div>
          ${historial.length ? `<div class="historial-check">${historial.map(h=>`
            <div class="check-item">
              <span class="check-badge ${h.estado==='recibido'?'ok':h.estado==='no-recibido'?'no':'pen'}">
                ${h.estado==='recibido'?'Recibido':h.estado==='no-recibido'?'No recibido':'Pendiente'}
              </span>
              <span style="color:var(--text-2)">${fmtFecha(h.fecha)}</span>
            </div>`).join('')}</div>` : ''}
          <div style="display:flex;gap:8px;margin-top:10px">
            <button class="btn-cuenta-action" onclick="editarProgramado('${p.id}')">✏ Editar</button>
            <button class="btn-cuenta-action" onclick="archivarProgramado('${p.id}')">◻ Archivar</button>
          </div>
        </div>`;
      }).join('');
}

// ── Utilidades programados ────────────────────────────────────
function diasEntre(desde, hasta) {
  const d1 = new Date(desde+'T12:00:00'), d2 = new Date(hasta+'T12:00:00');
  return Math.round((d2-d1)/(1000*60*60*24));
}

function proximaFecha(prog) {
  const hoy = new Date();
  const dia = parseInt(prog.diaEsperado) || 1;
  if (prog.recurrencia==='Mensual'||prog.recurrencia==='Quincenal') {
    let fecha = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
    if (prog.recurrencia==='Quincenal') {
      const dia2   = Math.min(dia+15, 28);
      const fecha2 = new Date(hoy.getFullYear(), hoy.getMonth(), dia2);
      const cutoff = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()-5);
      if (fecha<cutoff) fecha = fecha2<cutoff ? new Date(hoy.getFullYear(), hoy.getMonth()+1, dia) : fecha2;
    } else {
      if (fecha < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()-5))
        fecha = new Date(hoy.getFullYear(), hoy.getMonth()+1, dia);
    }
    return fecha.toISOString().slice(0,10);
  }
  if (prog.recurrencia==='Semanal') {
    const d = new Date(hoy);
    d.setDate(d.getDate() + ((7-d.getDay()+dia)%7||7));
    return d.toISOString().slice(0,10);
  }
  if (prog.recurrencia==='Anual') {
    let fecha = new Date(hoy.getFullYear(), (parseInt(prog.mesEsperado)||1)-1, dia);
    if (fecha < hoy) fecha.setFullYear(fecha.getFullYear()+1);
    return fecha.toISOString().slice(0,10);
  }
  return prog.fechaEsperada || null;
}

window.marcarProgramado = function(id, fecha, estado) {
  const progs = getProgramados();
  const idx   = progs.findIndex(p=>p.id===id);
  if (idx<0) return;
  if (!progs[idx].historial) progs[idx].historial = [];
  const existIdx = progs[idx].historial.findIndex(h=>h.fecha===fecha);
  const entry = { fecha, estado, timestamp: new Date().toISOString() };
  if (existIdx>-1) progs[idx].historial[existIdx]=entry; else progs[idx].historial.push(entry);
  progs[idx].updatedAt = new Date().toISOString();
  setProgramados(progs);

  if (estado==='recibido') {
    const prog   = progs[idx];
    const cuentas= getCuentas();
    const cuenta = cuentas.find(c=>c.nombre===prog.cuenta);
    const movs   = getMovimientos();
    movs.push({ id:uid(), monto:parseFloat(prog.monto), fecha, tipo:'Ingreso',
      categoria: prog.categoria||'Salario', cuentaId: cuenta?.id||'',
      cuentaDestinoId:'', tipoCambio:1, destinatario: prog.nombre,
      notas:`Ingreso programado: ${prog.nombre}`, recurrencia: prog.recurrencia,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    setMovimientos(movs);
    toast('Marcado como recibido — ingreso registrado');
  } else {
    toast('Marcado como no recibido');
  }
  renderProgramados();
};

function abrirNuevoProgramado(editId) {
  const prog   = editId ? getProgramados().find(p=>p.id===editId) : null;
  const cuentas= getCuentas().filter(c=>!c.archivada);
  const cats   = getCategorias().filter(c=>c.tipo==='ingreso');
  openModal(prog?'Editar ingreso programado':'Nuevo ingreso programado', `
    <div class="form-group"><label>Nombre</label>
      <input type="text" id="pg-nombre" class="input-field" placeholder="Salario, Renta, Freelance..." value="${esc(prog?.nombre||'')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Monto esperado</label>
        <input type="number" id="pg-monto" class="input-field" placeholder="0.00" step="0.01" value="${prog?.monto||''}" /></div>
      <div class="form-group"><label>Categoría</label>
        <select id="pg-cat" class="input-field">
          ${cats.map(c=>`<option ${prog?.categoria===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Recurrencia</label>
        <select id="pg-rec" class="input-field">
          ${['Mensual','Quincenal','Semanal','Anual','Fecha fija'].map(r=>
            `<option value="${r}" ${(prog?.recurrencia||'Mensual')===r?'selected':''}>${r}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Día esperado del mes</label>
        <input type="number" id="pg-dia" class="input-field" placeholder="15" min="1" max="31" value="${prog?.diaEsperado||''}" /></div>
    </div>
    <div class="form-group"><label>Cuenta de destino</label>
      <select id="pg-cuenta" class="input-field">
        <option value="">— Seleccionar —</option>
        ${cuentas.map(c=>`<option value="${esc(c.nombre)}" ${prog?.cuenta===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('')}
      </select></div>
    <button class="btn-primary btn-full" onclick="guardarProgramado('${editId||''}')">
      ${prog?'Guardar cambios':'Crear ingreso programado'}</button>`);
}

window.guardarProgramado = function(editId) {
  const nombre = document.getElementById('pg-nombre').value.trim();
  const monto  = parseFloat(document.getElementById('pg-monto').value)||0;
  const cat    = document.getElementById('pg-cat').value;
  const rec    = document.getElementById('pg-rec').value;
  const dia    = document.getElementById('pg-dia').value.trim();
  const cuenta = document.getElementById('pg-cuenta').value;
  if (!nombre) { toast('Escribe el nombre'); return; }
  if (!monto)  { toast('Ingresa el monto'); return; }
  const progs = getProgramados();
  const now   = new Date().toISOString();
  if (editId) {
    const idx = progs.findIndex(p=>p.id===editId);
    if (idx>-1) progs[idx]={...progs[idx], nombre, monto, categoria:cat, recurrencia:rec, diaEsperado:dia, cuenta, updatedAt:now};
  } else {
    progs.push({ id:uid(), nombre, monto, categoria:cat, recurrencia:rec, diaEsperado:dia, cuenta, historial:[], archivado:false, createdAt:now, updatedAt:now });
  }
  setProgramados(progs); closeModal(); toast(editId?'Actualizado':'Ingreso programado creado'); renderProgramados();
};

window.editarProgramado   = (id) => abrirNuevoProgramado(id);
window.archivarProgramado = (id) => {
  if (!confirm('¿Archivar?')) return;
  setProgramados(getProgramados().map(p=>p.id===id?{...p,archivado:true}:p));
  toast('Archivado'); renderProgramados();
};

// ── CONFIG ────────────────────────────────────────────────────
function renderConfig() {
  const cfg = getConfig();
  document.getElementById('config-nombre').value = cfg.nombre||'Combak';
  document.getElementById('config-divisa').value = cfg.divisa||'MXN';
  const cats = getCategorias();
  document.getElementById('lista-categorias-config').innerHTML = cats.map(c=>
    `<div class="cat-config-item">
      <div class="cat-color-dot" style="background:${c.color}"></div>
      <span class="cat-config-nombre">${esc(c.nombre)}</span>
      <span class="cat-config-tipo">${c.tipo==='gasto'?'Gasto':'Ingreso'}</span>
      <button class="btn-icon" onclick="editarCategoria('${c.id}')">✏</button>
      <button class="btn-icon danger" onclick="eliminarCategoria('${c.id}')">✕</button>
    </div>`).join('');
}

// ── MODALES CRUD ──────────────────────────────────────────────
function abrirNuevoMovimiento(preId) {
  const cuentas = getCuentas().filter(c=>!c.archivada);
  if (!cuentas.length) { toast('Primero agrega una cuenta'); navigateTo('cuentas'); return; }
  const cats = getCategorias();
  const catG = cats.filter(c=>c.tipo==='gasto');
  const catI = cats.filter(c=>c.tipo==='ingreso');
  const mov  = preId ? getMovimientos().find(m=>m.id===preId) : null;

  openModal(mov?'Editar movimiento':'Nuevo movimiento', `
    <div class="tipo-selector">
      <button class="tipo-btn gasto ${!mov||mov.tipo==='Gasto'?'selected':''}" data-tipo="Gasto" onclick="selTipo(this)">− Gasto</button>
      <button class="tipo-btn ingreso ${mov?.tipo==='Ingreso'?'selected':''}" data-tipo="Ingreso" onclick="selTipo(this)">+ Ingreso</button>
      <button class="tipo-btn transferencia ${mov?.tipo==='Transferencia'?'selected':''}" data-tipo="Transferencia" onclick="selTipo(this)">⇄ Transferencia</button>
      <button class="tipo-btn inversion ${mov?.tipo==='Inversión'?'selected':''}" data-tipo="Inversión" onclick="selTipo(this)">◇ Inversión</button>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Monto</label>
        <input type="number" id="f-monto" class="input-field" placeholder="0.00" step="0.01" min="0" value="${mov?.monto||''}" /></div>
      <div class="form-group"><label>Fecha</label>
        <input type="date" id="f-fecha" class="input-field" value="${mov?.fecha||today()}" /></div>
    </div>
    <div class="form-group" id="grupo-cat"><label>Categoría</label>
      <select id="f-cat" class="input-field">
        <optgroup label="Gastos">${catG.map(c=>`<option value="${esc(c.nombre)}" ${mov?.categoria===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('')}</optgroup>
        <optgroup label="Ingresos">${catI.map(c=>`<option value="${esc(c.nombre)}" ${mov?.categoria===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('')}</optgroup>
      </select></div>
    <div class="form-group"><label>Cuenta</label>
      <select id="f-cuenta" class="input-field">
        ${cuentas.map(c=>`<option value="${c.id}" ${mov?.cuentaId===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('')}
      </select></div>
    <div class="form-group hidden" id="grupo-destino"><label>Cuenta destino</label>
      <select id="f-destino" class="input-field">
        ${cuentas.map(c=>`<option value="${c.id}" ${mov?.cuentaDestinoId===c.id?'selected':''}>${esc(c.nombre)}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Destinatario / Proveedor <span style="font-weight:400;color:var(--text-3)">(opcional)</span></label>
      <input type="text" id="f-dest-text" class="input-field" placeholder="..." value="${esc(mov?.destinatario||'')}" /></div>
    <div class="form-group"><label>Notas <span style="font-weight:400;color:var(--text-3)">(opcional)</span></label>
      <input type="text" id="f-notas" class="input-field" placeholder="..." value="${esc(mov?.notas||'')}" /></div>
    <div class="form-group"><label>Recurrencia</label>
      <select id="f-rec" class="input-field">
        ${['No','Diario','Semanal','Quincenal','Mensual','Bimestral','Anual'].map(r=>
          `<option value="${r}" ${(mov?.recurrencia||'No')===r?'selected':''}>${r}</option>`).join('')}
      </select></div>
    <button class="btn-primary btn-full" onclick="guardarMovimiento('${mov?.id||''}')">
      ${mov?'Guardar cambios':'Registrar movimiento'}</button>
  `, () => actualizarFormularioTipo(mov?.tipo||'Gasto'));
}

window.selTipo = function(btn) {
  document.querySelectorAll('.tipo-btn').forEach(b=>b.classList.remove('selected'));
  btn.classList.add('selected');
  actualizarFormularioTipo(btn.dataset.tipo);
};
function actualizarFormularioTipo(tipo) {
  document.getElementById('grupo-cat')?.classList.toggle('hidden', tipo==='Transferencia');
  document.getElementById('grupo-destino')?.classList.toggle('hidden', tipo!=='Transferencia');
}

window.guardarMovimiento = function(editId) {
  const monto  = parseFloat(document.getElementById('f-monto').value);
  const fecha  = document.getElementById('f-fecha').value;
  const tipo   = document.querySelector('.tipo-btn.selected')?.dataset.tipo || 'Gasto';
  const cat    = document.getElementById('f-cat')?.value || tipo;
  const cuentaId = document.getElementById('f-cuenta').value;
  const cuentaDestinoId = document.getElementById('f-destino')?.value||'';
  const destinatario = document.getElementById('f-dest-text').value.trim();
  const notas  = document.getElementById('f-notas').value.trim();
  const recurrencia = document.getElementById('f-rec').value;

  if (!monto||monto<=0) { document.getElementById('f-monto').classList.add('error'); toast('Ingresa un monto válido'); return; }
  if (!fecha)  { toast('Selecciona una fecha'); return; }
  if (!cuentaId) { toast('Selecciona una cuenta'); return; }
  if (tipo==='Transferencia'&&cuentaId===cuentaDestinoId) { toast('Las cuentas deben ser diferentes'); return; }

  const now  = new Date().toISOString();
  const movs = getMovimientos();

  if (editId) {
    const idx = movs.findIndex(m=>m.id===editId);
    if (idx>-1) movs[idx]={...movs[idx], monto, fecha, tipo,
      categoria: tipo==='Transferencia'?'Transferencia':cat,
      cuentaId, cuentaDestinoId: tipo==='Transferencia'?cuentaDestinoId:'',
      destinatario, notas, recurrencia, updatedAt:now};
  } else {
    movs.push({ id:uid(), monto, fecha, tipo,
      categoria: tipo==='Transferencia'?'Transferencia':cat,
      cuentaId, cuentaDestinoId: tipo==='Transferencia'?cuentaDestinoId:'',
      tipoCambio:1, destinatario, notas, recurrencia, createdAt:now, updatedAt:now });
  }

  setMovimientos(movs);
  closeModal();
  toast(editId?'Movimiento actualizado':'Movimiento registrado');
  // FIX #1 — refrescar vista actual (incluye flujo si estaba ahí)
  renderView(currentView);
};

window.editarMovimiento = (id) => { closeModal(); abrirNuevoMovimiento(id); };
window.eliminarMovimiento = (id) => {
  if (!confirm('¿Eliminar este movimiento?')) return;
  setMovimientos(getMovimientos().filter(m=>m.id!==id));
  closeModal(); toast('Movimiento eliminado'); renderView(currentView);
};

// Cuenta
function abrirNuevaCuenta(editId) {
  const c = editId ? getCuentas().find(x=>x.id===editId) : null;
  openModal(c?'Editar cuenta':'Nueva cuenta', `
    <div class="form-group"><label>Nombre</label>
      <input type="text" id="c-nombre" class="input-field" placeholder="BBVA Nómina, Efectivo..." value="${esc(c?.nombre||'')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label>
        <select id="c-tipo" class="input-field">
          ${['Débito','Crédito','Efectivo','Inversión','Wallet'].map(t=>`<option ${c?.tipo===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Divisa</label>
        <select id="c-divisa" class="input-field">
          ${['MXN','USD','EUR'].map(d=>`<option ${(c?.divisa||'MXN')===d?'selected':''}>${d}</option>`).join('')}
        </select></div>
    </div>
    <div class="form-group"><label>Saldo inicial</label>
      <input type="number" id="c-saldo" class="input-field" placeholder="0.00" step="0.01" value="${c?.saldoInicial??''}" /></div>
    <button class="btn-primary btn-full" onclick="guardarCuenta('${editId||''}')">
      ${c?'Guardar':'Crear cuenta'}</button>`);
}
window.guardarCuenta = function(editId) {
  const nombre = document.getElementById('c-nombre').value.trim();
  const tipo   = document.getElementById('c-tipo').value;
  const divisa = document.getElementById('c-divisa').value;
  const saldo  = parseFloat(document.getElementById('c-saldo').value)||0;
  if (!nombre) { document.getElementById('c-nombre').classList.add('error'); toast('Escribe el nombre'); return; }
  const cuentas = getCuentas();
  const now = new Date().toISOString();
  if (editId) { const i=cuentas.findIndex(c=>c.id===editId); if(i>-1) cuentas[i]={...cuentas[i],nombre,tipo,divisa,saldoInicial:saldo,updatedAt:now}; }
  else cuentas.push({id:uid(),nombre,tipo,divisa,saldoInicial:saldo,archivada:false,createdAt:now,updatedAt:now});
  setCuentas(cuentas); closeModal(); toast(editId?'Cuenta actualizada':'Cuenta creada'); renderCuentas();
};
window.editarCuenta = (id) => abrirNuevaCuenta(id);

// Presupuesto
function abrirNuevoPresupuesto(editId) {
  const p    = editId ? getPresupuestos().find(x=>x.id===editId) : null;
  const cats = getCategorias().filter(c=>c.tipo==='gasto');
  openModal(p?'Editar presupuesto':'Nuevo presupuesto', `
    <div class="form-group"><label>Categoría</label>
      <select id="p-cat" class="input-field">
        ${cats.map(c=>`<option ${p?.categoria===c.nombre?'selected':''}>${esc(c.nombre)}</option>`).join('')}
      </select></div>
    <div class="form-group"><label>Límite mensual</label>
      <input type="number" id="p-limite" class="input-field" placeholder="0.00" step="0.01" value="${p?.limite||''}" /></div>
    <button class="btn-primary btn-full" onclick="guardarPresupuesto('${editId||''}')">
      ${p?'Guardar':'Crear presupuesto'}</button>`);
}
window.guardarPresupuesto = function(editId) {
  const cat    = document.getElementById('p-cat').value;
  const limite = parseFloat(document.getElementById('p-limite').value);
  if (!limite||limite<=0) { toast('Ingresa un límite válido'); return; }
  const presups = getPresupuestos(); const now = new Date().toISOString();
  if (editId) { const i=presups.findIndex(p=>p.id===editId); if(i>-1) presups[i]={...presups[i],categoria:cat,limite,updatedAt:now}; }
  else { if(presups.find(p=>p.categoria===cat)){toast('Ya existe para esa categoría');return;} presups.push({id:uid(),categoria:cat,limite,createdAt:now,updatedAt:now}); }
  setPresupuestos(presups); closeModal(); toast('Presupuesto guardado'); renderListaPresupuestos();
};
window.editarPresupuesto  = (id) => abrirNuevoPresupuesto(id);
window.eliminarPresupuesto= (id) => { if(!confirm('¿Eliminar?'))return; setPresupuestos(getPresupuestos().filter(p=>p.id!==id)); toast('Eliminado'); renderListaPresupuestos(); };

// Meta
function abrirNuevaMeta(editId) {
  const m = editId ? getMetas().find(x=>x.id===editId) : null;
  openModal(m?'Editar meta':'Nueva meta de ahorro', `
    <div class="form-group"><label>Nombre</label>
      <input type="text" id="m-nombre" class="input-field" placeholder="Fondo de emergencia, Vacaciones..." value="${esc(m?.nombre||'')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Objetivo</label>
        <input type="number" id="m-objetivo" class="input-field" placeholder="0.00" value="${m?.objetivo||''}" step="0.01" /></div>
      <div class="form-group"><label>Avance actual</label>
        <input type="number" id="m-avance" class="input-field" placeholder="0.00" value="${m?.avance||''}" step="0.01" /></div>
    </div>
    <div class="form-group"><label>Fecha límite <span style="font-weight:400;color:var(--text-3)">(opcional)</span></label>
      <input type="date" id="m-fecha" class="input-field" value="${m?.fechaLimite||''}" /></div>
    <button class="btn-primary btn-full" onclick="guardarMeta('${editId||''}')">
      ${m?'Guardar':'Crear meta'}</button>`);
}
window.guardarMeta = function(editId) {
  const nombre    = document.getElementById('m-nombre').value.trim();
  const objetivo  = parseFloat(document.getElementById('m-objetivo').value)||0;
  const avance    = parseFloat(document.getElementById('m-avance').value)||0;
  const fechaLimite = document.getElementById('m-fecha').value;
  if (!nombre)   { toast('Escribe el nombre'); return; }
  if (!objetivo) { toast('Ingresa el objetivo'); return; }
  const metas = getMetas(); const now = new Date().toISOString();
  if (editId) { const i=metas.findIndex(m=>m.id===editId); if(i>-1) metas[i]={...metas[i],nombre,objetivo,avance,fechaLimite,updatedAt:now}; }
  else metas.push({id:uid(),nombre,objetivo,avance,fechaLimite,createdAt:now,updatedAt:now});
  setMetas(metas); closeModal(); toast('Meta guardada'); renderListaMetas();
};
window.editarMeta  = (id) => abrirNuevaMeta(id);
window.eliminarMeta= (id) => { if(!confirm('¿Eliminar?'))return; setMetas(getMetas().filter(m=>m.id!==id)); toast('Eliminada'); renderListaMetas(); };

// Inversión
function abrirNuevaInversion(editId) {
  const inv = editId ? getInversiones().find(x=>x.id===editId) : null;
  openModal(inv?'Editar inversión':'Nueva inversión', `
    <div class="form-group"><label>Nombre</label>
      <input type="text" id="i-nombre" class="input-field" placeholder="CETES, Fondo, Acciones..." value="${esc(inv?.nombre||'')}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Capital invertido</label>
        <input type="number" id="i-capital" class="input-field" placeholder="0.00" step="0.01" value="${inv?.capital||''}" /></div>
      <div class="form-group"><label>Rendimientos acumulados</label>
        <input type="number" id="i-rend" class="input-field" placeholder="0.00" step="0.01" value="${inv?.rendimientos||''}" /></div>
    </div>
    <div class="form-group"><label>Fecha de inicio</label>
      <input type="date" id="i-fecha" class="input-field" value="${inv?.fechaInicio||today()}" /></div>
    <div class="form-group" style="font-size:.82rem;color:var(--text-2);background:var(--blue-bg);border-radius:var(--radius-sm);padding:10px 12px">
      Al guardar se creará automáticamente un movimiento de tipo Inversión en tus registros.
    </div>
    <button class="btn-primary btn-full" onclick="guardarInversion('${editId||''}')">
      ${inv?'Guardar':'Agregar inversión'}</button>`);
}

window.guardarInversion = function(editId) {
  const nombre     = document.getElementById('i-nombre').value.trim();
  const capital    = parseFloat(document.getElementById('i-capital').value)||0;
  const rendimientos = parseFloat(document.getElementById('i-rend').value)||0;
  const fechaInicio = document.getElementById('i-fecha').value;
  if (!nombre)  { toast('Escribe el nombre'); return; }
  if (!capital) { toast('Ingresa el capital'); return; }
  const invs = getInversiones(); const now = new Date().toISOString();

  let invId;
  if (editId) {
    const idx = invs.findIndex(i=>i.id===editId);
    if (idx>-1) { invs[idx]={...invs[idx],nombre,capital,rendimientos,fechaInicio,updatedAt:now}; invId=editId; }
  } else {
    invId = uid();
    invs.push({id:invId,nombre,capital,rendimientos,fechaInicio,createdAt:now,updatedAt:now});

    // FIX #4 — crear movimiento de Inversión para que aparezca en Flujo y Movimientos
    const movs = getMovimientos();
    movs.push({
      id: uid(), monto: capital, fecha: fechaInicio, tipo: 'Inversión',
      categoria: 'Inversión', cuentaId: '', cuentaDestinoId: '', tipoCambio: 1,
      destinatario: nombre, notas: `Inversión: ${nombre}`,
      recurrencia: 'No', inversionId: invId, createdAt: now, updatedAt: now
    });
    setMovimientos(movs);

    // Si hay rendimientos iniciales, también registrarlos
    if (rendimientos > 0) {
      const movs2 = getMovimientos();
      movs2.push({
        id: uid(), monto: rendimientos, fecha: fechaInicio, tipo: 'Rendimiento',
        categoria: 'Rendimientos', cuentaId: '', cuentaDestinoId: '', tipoCambio: 1,
        destinatario: nombre, notas: `Rendimientos iniciales: ${nombre}`,
        recurrencia: 'No', inversionId: invId, createdAt: now, updatedAt: now
      });
      setMovimientos(movs2);
    }
  }

  setInversiones(invs); closeModal(); toast(editId?'Inversión actualizada':'Inversión registrada');
  renderInversiones();
};
window.editarInversion  = (id) => abrirNuevaInversion(id);
window.eliminarInversion= (id) => {
  if (!confirm('¿Eliminar inversión?')) return;
  setInversiones(getInversiones().filter(i=>i.id!==id));
  toast('Inversión eliminada'); renderInversiones();
};

// Categorías
function abrirNuevaCategoria(editId) {
  const c = editId ? getCategorias().find(x=>x.id===editId) : null;
  openModal(c?'Editar categoría':'Nueva categoría', `
    <div class="form-group"><label>Nombre</label>
      <input type="text" id="cat-nombre" class="input-field" value="${esc(c?.nombre||'')}" placeholder="Nombre..." /></div>
    <div class="form-row">
      <div class="form-group"><label>Tipo</label>
        <select id="cat-tipo" class="input-field">
          <option value="gasto" ${c?.tipo==='gasto'?'selected':''}>Gasto</option>
          <option value="ingreso" ${c?.tipo==='ingreso'?'selected':''}>Ingreso</option>
        </select></div>
      <div class="form-group"><label>Color</label>
        <input type="color" id="cat-color" class="input-field" value="${c?.color||'#607d8b'}" style="height:42px;padding:4px" /></div>
    </div>
    <button class="btn-primary btn-full" onclick="guardarCategoria('${editId||''}')">
      ${c?'Guardar':'Crear categoría'}</button>`);
}
window.guardarCategoria = function(editId) {
  const nombre = document.getElementById('cat-nombre').value.trim();
  const tipo   = document.getElementById('cat-tipo').value;
  const color  = document.getElementById('cat-color').value;
  if (!nombre) { toast('Escribe el nombre'); return; }
  const cats = getCategorias(); const now = new Date().toISOString();
  if (editId) { const i=cats.findIndex(c=>c.id===editId); if(i>-1) cats[i]={...cats[i],nombre,tipo,color,updatedAt:now}; }
  else cats.push({id:uid(),nombre,tipo,icono:'',color,createdAt:now,updatedAt:now});
  setCategorias(cats); closeModal(); toast('Categoría guardada'); renderConfig();
};
window.editarCategoria  = (id) => abrirNuevaCategoria(id);
window.eliminarCategoria= (id) => { if(!confirm('¿Eliminar?'))return; setCategorias(getCategorias().filter(c=>c.id!==id)); toast('Eliminada'); renderConfig(); };

// ── CSV / Limpiar ─────────────────────────────────────────────
function exportarCSV() {
  const movs   = getMovimientos();
  const cuentas= getCuentas();
  const headers= ['Fecha','Tipo','Categoría','Cuenta','Monto','Destinatario','Notas','Recurrencia'];
  const rows   = movs.map(m => {
    const cuenta = cuentas.find(c=>c.id===m.cuentaId);
    return [m.fecha,m.tipo,m.categoria,cuenta?.nombre||'',m.monto,m.destinatario||'',m.notas||'',m.recurrencia||''];
  });
  const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download='combak.csv'; a.click();
  URL.revokeObjectURL(url); toast('CSV descargado');
}

function limpiarDatos() {
  if (!confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
  if (!confirm('¿Confirmas? Se perderán todas tus cuentas, movimientos y configuración.')) return;
  ['mf_config','mf_cuentas','mf_movimientos','mf_presupuestos','mf_metas','mf_categorias','mf_inversiones','mf_programados']
    .forEach(k=>localStorage.removeItem(k));
  toast('Datos borrados'); location.reload();
}

// ── Botón + inteligente ───────────────────────────────────────
function accionPrincipal() {
  const acciones = {
    dashboard:    () => abrirNuevoMovimiento(),
    movimientos:  () => abrirNuevoMovimiento(),
    cuentas:      () => abrirNuevaCuenta(),
    presupuestos: () => {
      const tab = document.querySelector('#view-presupuestos .tab-btn.active');
      tab?.dataset.tab==='metas-list' ? abrirNuevaMeta() : abrirNuevoPresupuesto();
    },
    flujo:       () => abrirNuevoMovimiento(),
    programados: () => abrirNuevoProgramado(),
    inversiones: () => {
      const tab = document.querySelector('#view-inversiones .tab-btn.active');
      tab?.dataset.tab==='inv-calc' ? calcularInversion() : abrirNuevaInversion();
    },
    config: () => abrirNuevaCategoria(),
  };
  (acciones[currentView]||acciones.dashboard)();
}

// ── INIT ──────────────────────────────────────────────────────
function init() {
  const cfg = getConfig();
  document.getElementById('app-name').textContent    = cfg.nombre||'Combak';
  document.querySelector('.brand-name').textContent  = cfg.nombre||'Combak';
  document.title = cfg.nombre||'Combak';

  // Overlay sidebar
  const overlay = document.createElement('div');
  overlay.id = 'sidebar-overlay'; document.body.appendChild(overlay);
  overlay.addEventListener('click', closeSidebar);

  // Agregar selector de capitalización a la calculadora (FIX #3)
  const calcCard = document.querySelector('.calc-card');
  if (calcCard) {
    const grpAporte = calcCard.querySelector('#calc-aporte')?.closest('.form-group');
    if (grpAporte) {
      const grpCap = document.createElement('div');
      grpCap.className = 'form-group';
      grpCap.innerHTML = `<label>Capitalización</label>
        <select id="calc-capitalizacion" class="input-field">
          <option value="12">Mensual (12x/año)</option>
          <option value="4">Trimestral (4x/año)</option>
          <option value="2">Semestral (2x/año)</option>
          <option value="1">Anual (1x/año)</option>
          <option value="365">Diaria (365x/año)</option>
        </select>`;
      grpAporte.after(grpCap);
    }
  }

  // Navegación
  document.querySelectorAll('[data-view]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.view); });
  });

  document.getElementById('menu-btn').addEventListener('click', openSidebar);
  document.getElementById('add-btn').addEventListener('click', accionPrincipal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target===document.getElementById('modal-overlay')) closeModal();
  });

  // Period selector dashboard
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentPeriod = btn.dataset.period;
      renderDashboard();
    });
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const parent = btn.closest('section');
      parent?.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      parent?.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
      document.getElementById(btn.dataset.tab)?.classList.add('active');
    });
  });

  // Filtros movimientos
  ['buscar-mov','filtro-tipo','filtro-cuenta','filtro-cat'].forEach(id => {
    document.getElementById(id)?.addEventListener('input',  filtrarYMostrarMovs);
    document.getElementById(id)?.addEventListener('change', filtrarYMostrarMovs);
  });

  // Botones secciones
  document.getElementById('btn-nueva-cuenta')?.addEventListener('click',       ()=>abrirNuevaCuenta());
  document.getElementById('btn-nuevo-presupuesto')?.addEventListener('click',  ()=>abrirNuevoPresupuesto());
  document.getElementById('btn-nueva-meta')?.addEventListener('click',         ()=>abrirNuevaMeta());
  document.getElementById('btn-nueva-inversion')?.addEventListener('click',    ()=>abrirNuevaInversion());
  document.getElementById('btn-nuevo-programado')?.addEventListener('click',   ()=>abrirNuevoProgramado());
  document.getElementById('btn-nueva-categoria')?.addEventListener('click',    ()=>abrirNuevaCategoria());
  document.getElementById('btn-calcular')?.addEventListener('click',           calcularInversion);
  document.getElementById('btn-exportar')?.addEventListener('click',           exportarCSV);
  document.getElementById('btn-limpiar')?.addEventListener('click',            limpiarDatos);

  document.getElementById('btn-guardar-config')?.addEventListener('click', () => {
    const cfg = getConfig();
    cfg.nombre = document.getElementById('config-nombre').value.trim()||'Combak';
    cfg.divisa = document.getElementById('config-divisa').value;
    setConfig(cfg);
    document.getElementById('app-name').textContent   = cfg.nombre;
    document.querySelector('.brand-name').textContent = cfg.nombre;
    document.title = cfg.nombre;
    toast('Configuración guardada');
  });

  renderDashboard();

  // OneDrive
  if (window.CombakSync) {
    window.CombakSync.init().then(() => {
      const btnSync = document.getElementById('btn-sync-onedrive');
      if (btnSync) btnSync.addEventListener('click', () => {
        window.CombakSync.isConnected() ? (window.CombakSync.logout(), document.getElementById('btn-sync-now').style.display='none') : window.CombakSync.login();
      });
      const btnNow = document.getElementById('btn-sync-now');
      if (btnNow) {
        btnNow.addEventListener('click', ()=>window.CombakSync.syncNow());
        if (window.CombakSync.isConnected()) btnNow.style.display='block';
      }
    });
  }

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

document.addEventListener('DOMContentLoaded', init);
