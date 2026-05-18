/* ═══════════════════════════════════════════════════════════════
   COMBAK — sync.js
   Sincronización con OneDrive usando AppFolder (carpeta privada)
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const MSAL_CONFIG = {
  auth: {
    clientId:    "565d0505-b12e-45b6-a20d-52c1425f641f",
    authority:   "https://login.microsoftonline.com/consumers",
    redirectUri: "https://dcm1852.github.io/combak/",
  },
  cache: {
    cacheLocation:          "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: { logLevel: 0 }
  }
};

// AppFolder: carpeta privada de la app en OneDrive
// El usuario NO puede ver otros archivos, la app tampoco puede ver el resto de OneDrive
const SCOPES       = ["User.Read", "Files.ReadWrite.AppFolder"];
const ONEDRIVE_FILE = "datos.json"; // se guarda en /Aplicaciones/Combak/datos.json
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
    return false;
  }
  try {
    msalInstance = new msal.PublicClientApplication(MSAL_CONFIG);
    await msalInstance.initialize();

    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      currentAccount = response.account;
      msalInstance.setActiveAccount(currentAccount);
      syncEnabled = true;
      await onLoginSuccess();
    } else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        msalInstance.setActiveAccount(currentAccount);
        syncEnabled = true;
        await onLoginSuccess();
      } else {
        updateSyncStatus('disconnected');
      }
    }
    return true;
  } catch (e) {
    console.error('Error iniciando MSAL:', e);
    updateSyncStatus('disconnected');
    return false;
  }
}

// ── Login ─────────────────────────────────────────────────────
async function loginOneDrive() {
  if (!msalInstance) { toast('Error: MSAL no inicializado'); return; }
  try {
    try {
      const response = await msalInstance.loginPopup({
        scopes: SCOPES,
        prompt: "select_account",
      });
      currentAccount = response.account;
      msalInstance.setActiveAccount(currentAccount);
      syncEnabled = true;
      await onLoginSuccess();
    } catch (popupError) {
      if (popupError.errorCode === 'popup_window_error' ||
          popupError.errorCode === 'empty_window_error') {
        await msalInstance.loginRedirect({ scopes: SCOPES });
      } else {
        throw popupError;
      }
    }
  } catch (e) {
    console.error('Error en login:', e);
    if (e.errorCode === 'user_cancelled') {
      toast('Login cancelado');
    } else {
      toast('Error al conectar con OneDrive: ' + (e.message || e.errorCode || ''));
    }
  }
}

// ── Logout ────────────────────────────────────────────────────
async function logoutOneDrive() {
  if (!msalInstance || !currentAccount) return;
  try {
    syncEnabled    = false;
    currentAccount = null;
    updateSyncStatus('disconnected');
    await msalInstance.logoutPopup({
      account: msalInstance.getActiveAccount(),
      mainWindowRedirectUri: window.location.href,
    });
  } catch (e) {
    msalInstance.setActiveAccount(null);
    updateSyncStatus('disconnected');
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
    try {
      const response = await msalInstance.acquireTokenPopup({ scopes: SCOPES });
      return response.accessToken;
    } catch (e2) {
      console.error('No se pudo obtener token:', e2);
      syncEnabled = false;
      updateSyncStatus('error');
      return null;
    }
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

// ── Subir a AppFolder ─────────────────────────────────────────
// La carpeta AppFolder es /Aplicaciones/Combak/ en el OneDrive del usuario
// El usuario NO ve el resto de OneDrive desde la app
async function uploadToOneDrive(content) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sin token');
  const json = JSON.stringify(content, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const res  = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${ONEDRIVE_FILE}:/content`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: blob,
    }
  );
  if (!res.ok) throw new Error(`Upload error: ${res.status}`);
  return res.json();
}

// ── Descargar de AppFolder ────────────────────────────────────
async function downloadFromOneDrive() {
  const token = await getAccessToken();
  if (!token) return null;
  // Verificar si existe
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
    const localArr  = local[col]  || [];
    const remoteArr = remote[col] || [];
    const map = {};
    for (const item of localArr)  map[item.id] = { ...item };
    for (const remoteItem of remoteArr) {
      const localItem = map[remoteItem.id];
      if (!localItem) {
        map[remoteItem.id] = remoteItem;
      } else {
        const lt = new Date(localItem.updatedAt  || 0).getTime();
        const rt = new Date(remoteItem.updatedAt || 0).getTime();
        if (rt > lt) map[remoteItem.id] = remoteItem;
      }
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

// ── Sync principal ────────────────────────────────────────────
async function syncNow(silent = false) {
  if (!syncEnabled || !currentAccount || isSyncing) return;
  isSyncing = true;
  updateSyncStatus('syncing');
  try {
    const remoteData = await downloadFromOneDrive();
    const localData  = getLocalData();
    const merged     = reconcileData(localData, remoteData);
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

// ── UI de estado ──────────────────────────────────────────────
function updateSyncStatus(status) {
  const el       = document.getElementById('sync-status');
  const btnConfig= document.getElementById('btn-sync-onedrive');
  const btnNow   = document.getElementById('btn-sync-now');

  const states = {
    disconnected: { text: '● Sin conexión OneDrive',  color: 'rgba(255,255,255,.3)' },
    pending:      { text: '○ Guardando...',            color: 'rgba(255,255,255,.5)' },
    syncing:      { text: '↻ Sincronizando...',        color: '#f0c040' },
    synced:       { text: '● OneDrive sincronizado',   color: '#4caf8a' },
    error:        { text: '● Error de sincronización', color: '#e57373' },
  };

  const s = states[status] || states.disconnected;
  if (el) { el.textContent = s.text; el.style.color = s.color; }

  if (btnConfig) {
    if (status === 'disconnected' || status === 'error') {
      btnConfig.textContent = 'Conectar OneDrive';
      btnConfig.onclick = loginOneDrive;
    } else {
      btnConfig.textContent = 'Desconectar OneDrive';
      btnConfig.onclick = logoutOneDrive;
    }
  }

  if (btnNow) {
    btnNow.style.display = (status === 'synced' || status === 'pending' || status === 'syncing') ? 'block' : 'none';
  }

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
    el.innerHTML = `<div style="font-size:.82rem;color:var(--text-3)">No conectado. Tus datos se guardan solo en este dispositivo.</div>`;
  }
}

// ── Post-login ────────────────────────────────────────────────
async function onLoginSuccess() {
  updateSyncStatus('syncing');
  toast(`Bienvenido, ${currentAccount.name || 'usuario'} ✓`);
  await syncNow(true);
  // Sync automático cada 5 minutos
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
