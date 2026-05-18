/* ═══════════════════════════════════════════════════════════════
   COMBAK — sync.js
   Autenticación MSAL con redirect flow
   Almacenamiento: OneDrive AppFolder (carpeta privada por app)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const MSAL_CONFIG = {
  auth: {
    clientId:    "565d0505-b12e-45b6-a20d-52c1425f641f",
    authority:   "https://login.microsoftonline.com/consumers",
    redirectUri: "https://dcm1852.github.io/combak/",
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation:          "localStorage",
    storeAuthStateInCookie: true,
  },
  system: {
    loggerOptions:     { logLevel: 0 },
    allowNativeBroker: false,
  }
};

const SCOPES        = ["User.Read", "Files.ReadWrite.AppFolder"];
const ONEDRIVE_FILE = "datos.json";
const SYNC_DEBOUNCE_MS = 4000;

let msalInstance   = null;
let currentAccount = null;
let syncTimer      = null;
let isSyncing      = false;
let lastSyncTime   = null;
let syncEnabled    = false;

// ── Inicializar MSAL ──────────────────────────────────────────
async function initMSAL() {
  if (typeof msal === 'undefined') {
    console.warn('MSAL no cargado');
    mostrarPantallaLogin();
    return false;
  }
  try {
    msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);
    await msalInstance.initialize();

    // Siempre llamar handleRedirectPromise al iniciar
    // Esto captura el token cuando Microsoft redirige de vuelta
    const response = await msalInstance.handleRedirectPromise();

    if (response && response.account) {
      // Login exitoso — venimos de redirect de Microsoft
      currentAccount = response.account;
      msalInstance.setActiveAccount(currentAccount);
      syncEnabled = true;
      await onLoginSuccess();
    } else {
      // Verificar si ya hay sesión activa guardada
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        msalInstance.setActiveAccount(currentAccount);
        syncEnabled = true;
        await onLoginSuccess();
      } else {
        // No hay sesión — mostrar pantalla de login
        mostrarPantallaLogin();
      }
    }
    return true;
  } catch (e) {
    console.error('Error iniciando MSAL:', e);
    mostrarPantallaLogin();
    return false;
  }
}

// ── Pantalla de bienvenida / login ────────────────────────────
function mostrarPantallaLogin() {
  // Ocultar toda la app y mostrar pantalla de login
  document.getElementById('main').style.display    = 'none';
  document.getElementById('sidebar').style.display = 'none';
  document.getElementById('bottom-nav').style.display = 'none';

  // Crear pantalla de login si no existe
  if (document.getElementById('login-screen')) return;

  const screen = document.createElement('div');
  screen.id = 'login-screen';
  screen.innerHTML = `
    <div class="login-wrap">
      <div class="login-card">

        <div class="login-logo">
          <svg width="64" height="64" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" fill="none" stroke="#c8a96e" stroke-width=".8" opacity=".35"/>
            <circle cx="11" cy="11" r="8" fill="none" stroke="#c8a96e" stroke-width="1.4"
              stroke-dasharray="19 31" stroke-dashoffset="-4" stroke-linecap="round"/>
            <circle cx="11" cy="11" r="4" fill="none" stroke="white" stroke-width=".6" opacity=".2"/>
            <circle cx="11" cy="11" r="1.8" fill="white"/>
            <circle cx="19" cy="11" r="1.3" fill="#c8a96e"/>
          </svg>
        </div>

        <h1 class="login-titulo">combak</h1>
        <p class="login-sub">Control de finanzas personales</p>

        <div class="login-features">
          <div class="login-feature">
            <span class="login-feature-icon">▣</span>
            <span>Cuentas, gastos e ingresos</span>
          </div>
          <div class="login-feature">
            <span class="login-feature-icon">◎</span>
            <span>Presupuestos y metas de ahorro</span>
          </div>
          <div class="login-feature">
            <span class="login-feature-icon">△</span>
            <span>Inversiones y rendimientos</span>
          </div>
          <div class="login-feature">
            <span class="login-feature-icon">◷</span>
            <span>Ingresos programados</span>
          </div>
        </div>

        <button class="login-btn-microsoft" id="btn-login-microsoft">
          <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Iniciar sesión con Microsoft
        </button>

        <p class="login-privacidad">
          Tus datos se guardan únicamente en tu propio OneDrive.<br>
          Combak no tiene acceso a ningún otro archivo.
        </p>

      </div>
    </div>

    <style>
      #login-screen {
        position: fixed;
        inset: 0;
        background: var(--indigo);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        padding: 24px;
      }
      .login-wrap {
        width: 100%;
        max-width: 400px;
      }
      .login-card {
        background: var(--surface);
        border-radius: 20px;
        padding: 40px 32px;
        text-align: center;
        box-shadow: 0 24px 64px rgba(0,0,0,.3);
      }
      .login-logo {
        margin-bottom: 16px;
        display: flex;
        justify-content: center;
      }
      .login-titulo {
        font-family: Georgia, serif;
        font-size: 2rem;
        font-weight: 700;
        color: var(--indigo);
        letter-spacing: -.03em;
        margin-bottom: 6px;
      }
      .login-sub {
        font-size: .88rem;
        color: var(--text-3);
        margin-bottom: 28px;
      }
      .login-features {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 32px;
        text-align: left;
      }
      .login-feature {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: .88rem;
        color: var(--text-2);
      }
      .login-feature-icon {
        width: 28px;
        height: 28px;
        background: var(--surface-2);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: .85rem;
        color: var(--gold);
        flex-shrink: 0;
      }
      .login-btn-microsoft {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 14px 20px;
        background: var(--indigo);
        color: white;
        border: none;
        border-radius: 12px;
        font-size: .95rem;
        font-weight: 700;
        cursor: pointer;
        font-family: var(--font-sans);
        transition: background .18s ease;
        margin-bottom: 16px;
      }
      .login-btn-microsoft:hover { background: var(--indigo-2); }
      .login-privacidad {
        font-size: .72rem;
        color: var(--text-3);
        line-height: 1.6;
      }
    </style>
  `;
  document.body.appendChild(screen);

  document.getElementById('btn-login-microsoft').addEventListener('click', loginOneDrive);
}

function ocultarPantallaLogin() {
  const screen = document.getElementById('login-screen');
  if (screen) screen.remove();
  document.getElementById('main').style.display    = '';
  document.getElementById('sidebar').style.display = '';
  document.getElementById('bottom-nav').style.display = '';
}

// ── Login — redirect flow ─────────────────────────────────────
async function loginOneDrive() {
  if (!msalInstance) { return; }
  try {
    await msalInstance.loginRedirect({
      scopes: SCOPES,
      prompt: "select_account",
    });
    // La página se redirige aquí — el código siguiente no se ejecuta
  } catch (e) {
    console.error('Error en login:', e);
  }
}

// ── Logout ────────────────────────────────────────────────────
async function logoutOneDrive() {
  if (!msalInstance || !currentAccount) return;
  syncEnabled    = false;
  currentAccount = null;
  updateSyncStatus('disconnected');
  try {
    await msalInstance.logoutRedirect({
      postLogoutRedirectUri: "https://dcm1852.github.io/combak/",
    });
  } catch (e) {
    console.error('Error en logout:', e);
    mostrarPantallaLogin();
  }
}

// ── Token ─────────────────────────────────────────────────────
async function getAccessToken() {
  if (!msalInstance || !currentAccount) return null;
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes:  SCOPES,
      account: currentAccount,
    });
    return response.accessToken;
  } catch (e) {
    // Token expirado — redirigir a login
    console.warn('Token expirado, redirigiendo a login...');
    await msalInstance.acquireTokenRedirect({ scopes: SCOPES });
    return null;
  }
}

// ── Graph ─────────────────────────────────────────────────────
async function graphRequest(method, endpoint, body = null) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sin token de acceso');
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, opts);
  if (res.status === 404) return null;
  if (!res.ok) { const err = await res.text(); throw new Error(`Graph error ${res.status}: ${err}`); }
  if (res.status === 204) return null;
  return res.json();
}

// ── OneDrive AppFolder ────────────────────────────────────────
async function uploadToOneDrive(content) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sin token');
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
  const res  = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${ONEDRIVE_FILE}:/content`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: blob,
    }
  );
  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return res.json();
}

async function downloadFromOneDrive() {
  const token = await getAccessToken();
  if (!token) return null;
  const meta = await graphRequest('GET', `/me/drive/special/approot:/${ONEDRIVE_FILE}`);
  if (!meta) return null;
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${ONEDRIVE_FILE}:/content`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

// ── Reconciliación ────────────────────────────────────────────
function reconcileData(local, remote) {
  if (!remote) return local;
  if (!local)  return remote;
  const merged = { ...local };
  const collections = ['cuentas','movimientos','presupuestos','metas','categorias','inversiones','programados'];
  for (const col of collections) {
    const map = {};
    for (const item of (local[col]  || [])) map[item.id] = { ...item };
    for (const item of (remote[col] || [])) {
      const lt = new Date(map[item.id]?.updatedAt || 0).getTime();
      const rt = new Date(item.updatedAt || 0).getTime();
      if (!map[item.id] || rt > lt) map[item.id] = item;
    }
    merged[col] = Object.values(map);
  }
  if (remote.config && local.config) {
    const lt = new Date(local.config.updatedAt  || 0).getTime();
    const rt = new Date(remote.config.updatedAt || 0).getTime();
    merged.config = rt > lt ? remote.config : local.config;
  }
  merged.lastSync = new Date().toISOString();
  return merged;
}

// ── Datos locales ─────────────────────────────────────────────
function getLocalData() {
  return {
    config:       DB.get('mf_config',       {}),
    cuentas:      DB.get('mf_cuentas',      []),
    movimientos:  DB.get('mf_movimientos',  []),
    presupuestos: DB.get('mf_presupuestos', []),
    metas:        DB.get('mf_metas',        []),
    categorias:   DB.get('mf_categorias',   []),
    inversiones:  DB.get('mf_inversiones',  []),
    programados:  DB.get('mf_programados',  []),
    lastSync:     DB.get('mf_lastSync',     null),
  };
}

function applyMergedData(data) {
  if (data.config)       DB.set('mf_config',       data.config);
  if (data.cuentas)      DB.set('mf_cuentas',      data.cuentas);
  if (data.movimientos)  DB.set('mf_movimientos',  data.movimientos);
  if (data.presupuestos) DB.set('mf_presupuestos', data.presupuestos);
  if (data.metas)        DB.set('mf_metas',        data.metas);
  if (data.categorias)   DB.set('mf_categorias',   data.categorias);
  if (data.inversiones)  DB.set('mf_inversiones',  data.inversiones);
  if (data.programados)  DB.set('mf_programados',  data.programados);
  if (data.lastSync)     DB.set('mf_lastSync',     data.lastSync);
}

// ── Sync ──────────────────────────────────────────────────────
async function syncNow(silent = false) {
  if (!syncEnabled || !currentAccount || isSyncing) return;
  isSyncing = true;
  updateSyncStatus('syncing');
  try {
    const remote = await downloadFromOneDrive();
    const local  = getLocalData();
    const merged = reconcileData(local, remote);
    applyMergedData(merged);
    await uploadToOneDrive(merged);
    lastSyncTime = new Date();
    DB.set('mf_lastSync', lastSyncTime.toISOString());
    updateSyncStatus('synced');
    if (!silent) toast('Sincronizado con OneDrive ✓');
    if (typeof renderView === 'function') renderView(currentView);
  } catch (e) {
    console.error('Error sincronizando:', e);
    updateSyncStatus('error');
    if (!silent) toast('Error al sincronizar: ' + e.message);
  } finally {
    isSyncing = false;
  }
}

function scheduleSync() {
  if (!syncEnabled) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(true), SYNC_DEBOUNCE_MS);
  updateSyncStatus('pending');
}

// ── UI ────────────────────────────────────────────────────────
function updateSyncStatus(status) {
  const el    = document.getElementById('sync-status');
  const btnC  = document.getElementById('btn-sync-onedrive');
  const btnN  = document.getElementById('btn-sync-now');

  const states = {
    disconnected: { text: '● Sin conexión OneDrive',  color: 'rgba(255,255,255,.3)' },
    pending:      { text: '○ Guardando...',            color: 'rgba(255,255,255,.5)' },
    syncing:      { text: '↻ Sincronizando...',        color: '#f0c040' },
    synced:       { text: '● OneDrive sincronizado',   color: '#4caf8a' },
    error:        { text: '● Error de sincronización', color: '#e57373' },
  };
  const s = states[status] || states.disconnected;
  if (el) { el.textContent = s.text; el.style.color = s.color; }

  if (btnC) {
    if (status === 'disconnected' || status === 'error') {
      btnC.textContent = 'Conectar OneDrive';
      btnC.onclick = loginOneDrive;
    } else {
      btnC.textContent = 'Cerrar sesión';
      btnC.onclick = logoutOneDrive;
    }
  }
  if (btnN) btnN.style.display = ['synced','pending','syncing'].includes(status) ? 'block' : 'none';
  updateUserInfo();
}

function updateUserInfo() {
  const el = document.getElementById('onedrive-user-info');
  if (!el) return;
  if (currentAccount) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--green-bg);border-radius:var(--radius-sm);border:1px solid var(--green)">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--green);color:white;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">
          ${(currentAccount.name||currentAccount.username||'?').slice(0,1).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:600;font-size:.85rem">${currentAccount.name||'Usuario'}</div>
          <div style="font-size:.72rem;color:var(--text-3)">${currentAccount.username||''}</div>
        </div>
      </div>
      ${lastSyncTime ? `<div style="font-size:.72rem;color:var(--text-3);margin-top:6px;text-align:right">Última sync: ${lastSyncTime.toLocaleTimeString('es-MX')}</div>` : ''}`;
  } else {
    el.innerHTML = `<div style="font-size:.82rem;color:var(--text-3)">No conectado.</div>`;
  }
}

// ── Post-login ────────────────────────────────────────────────
async function onLoginSuccess() {
  ocultarPantallaLogin();
  updateSyncStatus('syncing');
  toast(`Bienvenido, ${currentAccount.name || 'usuario'} ✓`);
  await syncNow(true);
  setInterval(() => syncNow(true), 5 * 60 * 1000);
}

// ── API pública ───────────────────────────────────────────────
window.CombakSync = {
  init:         initMSAL,
  login:        loginOneDrive,
  logout:       logoutOneDrive,
  syncNow:      () => syncNow(false),
  scheduleSync: scheduleSync,
  isConnected:  () => syncEnabled && !!currentAccount,
  getUser:      () => currentAccount,
};
