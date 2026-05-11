/* ═══════════════════════════════════════════════════════════════
   COMBAK — sync.js
   Fase 2: Autenticación MSAL + Sincronización OneDrive
   
   SEGURIDAD:
   - Client ID es público por diseño en SPAs (estándar OAuth2 PKCE)
   - Nunca hay Client Secret en el frontend
   - Tokens se guardan en sessionStorage, no localStorage
   - Scope mínimo: solo Files.ReadWrite para /combak/ en OneDrive personal
   - PKCE (Proof Key for Code Exchange) activado por defecto en MSAL
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ── Configuración MSAL ────────────────────────────────────────
const MSAL_CONFIG = {
  auth: {
    clientId:    "565d0505-b12e-45b6-a20d-52c1425f641f",
    authority:   "https://login.microsoftonline.com/consumers", // Solo cuentas personales Microsoft
    redirectUri: window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/'),
  },
  cache: {
    cacheLocation:        "sessionStorage", // Más seguro que localStorage
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: 0, // Silent en producción
    }
  }
};

// Scopes mínimos necesarios — principio de mínimo privilegio
const SCOPES = [
  "User.Read",           // Solo para mostrar nombre/foto del usuario
  "Files.ReadWrite",     // Leer y escribir archivos en OneDrive del usuario
];

const ONEDRIVE_PATH = "/combak/datos.json"; // Ruta en OneDrive del usuario
const SYNC_DEBOUNCE_MS = 4000; // Esperar 4s después del último cambio antes de sincronizar

// ── Estado del módulo ─────────────────────────────────────────
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

    // Manejar redirect de vuelta después del login
    const response = await msalInstance.handleRedirectPromise();
    if (response) {
      currentAccount = response.account;
      msalInstance.setActiveAccount(currentAccount);
      syncEnabled = true;
      await onLoginSuccess();
    } else {
      // Verificar si ya hay sesión activa
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        currentAccount = accounts[0];
        msalInstance.setActiveAccount(currentAccount);
        syncEnabled = true;
        await onLoginSuccess();
      }
    }
    return true;
  } catch (e) {
    console.error('Error iniciando MSAL:', e);
    return false;
  }
}

// ── Login ─────────────────────────────────────────────────────
async function loginOneDrive() {
  if (!msalInstance) { toast('Error: MSAL no inicializado'); return; }
  try {
    // Popup primero (mejor UX en mobile), fallback a redirect
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
      // Si el popup falla (bloqueado en algunos navegadores), usar redirect
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
      toast('Error al conectar con OneDrive');
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
    // Fallback silencioso
    msalInstance.setActiveAccount(null);
    updateSyncStatus('disconnected');
  }
}

// ── Obtener token de acceso ───────────────────────────────────
async function getAccessToken() {
  if (!msalInstance || !currentAccount) return null;
  try {
    const response = await msalInstance.acquireTokenSilent({
      scopes:  SCOPES,
      account: currentAccount,
    });
    return response.accessToken;
  } catch (e) {
    // Token expirado — refrescar con popup
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

// ── Llamadas a Microsoft Graph ────────────────────────────────
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

  if (res.status === 404) return null; // Archivo no existe aún
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Graph error ${res.status}: ${err}`);
  }
  if (res.status === 204) return null; // No content
  return res.json();
}

// Subir/actualizar archivo en OneDrive (PUT)
async function uploadToOneDrive(content) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sin token');

  const json = JSON.stringify(content, null, 2);
  const blob = new Blob([json], { type: 'application/json' });

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:${ONEDRIVE_PATH}:/content`,
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

// Descargar archivo de OneDrive
async function downloadFromOneDrive() {
  const token = await getAccessToken();
  if (!token) return null;

  // Primero verificar si existe
  const meta = await graphRequest('GET', `/me/drive/root:${ONEDRIVE_PATH}`);
  if (!meta) return null;

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/root:${ONEDRIVE_PATH}:/content`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!res.ok) return null;
  return res.json();
}

// ── Reconciliación (merge) ────────────────────────────────────
// Gana el registro con updatedAt más reciente
function reconcileData(local, remote) {
  if (!remote) return local;
  if (!local)  return remote;

  const merged = { ...local };
  const collections = ['cuentas','movimientos','presupuestos','metas','categorias','inversiones','programados'];

  for (const col of collections) {
    const localArr  = local[col]  || [];
    const remoteArr = remote[col] || [];
    const map = {};

    // Indexar locales por ID
    for (const item of localArr) {
      map[item.id] = { ...item };
    }

    // Merge con remotos — gana el más reciente
    for (const remoteItem of remoteArr) {
      const localItem = map[remoteItem.id];
      if (!localItem) {
        map[remoteItem.id] = remoteItem; // Nuevo en remoto
      } else {
        const localTs  = new Date(localItem.updatedAt  || 0).getTime();
        const remoteTs = new Date(remoteItem.updatedAt || 0).getTime();
        if (remoteTs > localTs) {
          map[remoteItem.id] = remoteItem; // Remoto más reciente
        }
      }
    }

    merged[col] = Object.values(map);
  }

  // Config: gana el más reciente
  if (remote.config && local.config) {
    const lt = new Date(local.config.updatedAt  || 0).getTime();
    const rt = new Date(remote.config.updatedAt || 0).getTime();
    merged.config = rt > lt ? remote.config : local.config;
  }

  merged.lastSync = new Date().toISOString();
  return merged;
}

// ── Leer datos locales como objeto ───────────────────────────
function getLocalData() {
  return {
    config:       DB.get('mf_config',       {}),
    cuentas:      DB.get('mf_cuentas',      []),
    movimientos:  DB.get('mf_movimientos',  []),
    presupuestos: DB.get('mf_presupuestos', []),
    metas:        DB.get('mf_metas',        []),
    categorias:   DB.get('mf_categorias',   []),
    inversiones:  DB.get('mf_inversiones',  []),
    lastSync:     DB.get('mf_lastSync',     null),
  };
}

// ── Escribir datos mergeados a localStorage ───────────────────
function applyMergedData(data) {
  if (data.config)       DB.set('mf_config',       data.config);
  if (data.cuentas)      DB.set('mf_cuentas',      data.cuentas);
  if (data.movimientos)  DB.set('mf_movimientos',  data.movimientos);
  if (data.presupuestos) DB.set('mf_presupuestos', data.presupuestos);
  if (data.metas)        DB.set('mf_metas',        data.metas);
  if (data.categorias)   DB.set('mf_categorias',   data.categorias);
  if (data.inversiones)  DB.set('mf_inversiones',  data.inversiones);
  if (data.lastSync)     DB.set('mf_lastSync',     data.lastSync);
}

// ── Sincronización principal ──────────────────────────────────
async function syncNow(silent = false) {
  if (!syncEnabled || !currentAccount || isSyncing) return;

  isSyncing = true;
  updateSyncStatus('syncing');

  try {
    // 1. Descargar datos de OneDrive
    const remoteData = await downloadFromOneDrive();

    // 2. Leer datos locales
    const localData = getLocalData();

    // 3. Reconciliar
    const merged = reconcileData(localData, remoteData);

    // 4. Aplicar localmente
    applyMergedData(merged);

    // 5. Subir resultado a OneDrive
    await uploadToOneDrive(merged);

    lastSyncTime = new Date();
    DB.set('mf_lastSync', lastSyncTime.toISOString());

    updateSyncStatus('synced');
    if (!silent) toast('Sincronizado con OneDrive');

    // Refrescar la vista actual
    if (typeof renderView === 'function') renderView(currentView);

  } catch (e) {
    console.error('Error sincronizando:', e);
    updateSyncStatus('error');
    if (!silent) toast('Error al sincronizar');
  } finally {
    isSyncing = false;
  }
}

// ── Sync con debounce (llamar después de cada cambio) ─────────
function scheduleSync() {
  if (!syncEnabled) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(true), SYNC_DEBOUNCE_MS);
  updateSyncStatus('pending');
}

// ── UI de estado ──────────────────────────────────────────────
function updateSyncStatus(status) {
  const el = document.getElementById('sync-status');
  const btnConfig = document.getElementById('btn-sync-onedrive');

  const states = {
    disconnected: { text: '● Sin conexión OneDrive',  color: 'rgba(255,255,255,.3)' },
    pending:      { text: '○ Guardando...',            color: 'rgba(255,255,255,.5)' },
    syncing:      { text: '↻ Sincronizando...',        color: '#f0c040' },
    synced:       { text: '● OneDrive sincronizado',   color: '#4caf8a' },
    error:        { text: '● Error de sincronización', color: '#e57373' },
  };

  const s = states[status] || states.disconnected;
  if (el) { el.textContent = s.text; el.style.color = s.color; }

  // Actualizar botón en config si existe
  if (btnConfig) {
    if (status === 'disconnected') {
      btnConfig.textContent = 'Conectar OneDrive';
      btnConfig.onclick = loginOneDrive;
    } else {
      btnConfig.textContent = 'Desconectar OneDrive';
      btnConfig.onclick = logoutOneDrive;
    }
  }

  // Actualizar info de usuario en config
  updateUserInfo();
}

function updateUserInfo() {
  const el = document.getElementById('onedrive-user-info');
  if (!el) return;
  if (currentAccount) {
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--green-bg);border-radius:var(--radius-sm);border:1px solid var(--green)">
        <div style="width:32px;height:32px;border-radius:50%;background:var(--green);color:white;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700">
          ${(currentAccount.name || currentAccount.username || '?').slice(0,1).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:600;font-size:.85rem">${currentAccount.name || 'Usuario'}</div>
          <div style="font-size:.72rem;color:var(--text-3)">${currentAccount.username || ''}</div>
        </div>
      </div>`;
    if (lastSyncTime) {
      el.innerHTML += `<div style="font-size:.72rem;color:var(--text-3);margin-top:6px;text-align:right">
        Última sync: ${lastSyncTime.toLocaleTimeString('es-MX')}
      </div>`;
    }
  } else {
    el.innerHTML = `<div style="font-size:.82rem;color:var(--text-3)">
      No conectado. Tus datos se guardan solo en este dispositivo.
    </div>`;
  }
}

// ── Callback post-login ───────────────────────────────────────
async function onLoginSuccess() {
  updateSyncStatus('syncing');
  toast(`Bienvenido, ${currentAccount.name || 'usuario'}`);

  // Sync inicial al conectar
  await syncNow(true);

  // Configurar sync automático cada 5 minutos (por si hay otro dispositivo)
  setInterval(() => syncNow(true), 5 * 60 * 1000);
}

// ── Exportar funciones públicas ───────────────────────────────
window.CombakSync = {
  init:         initMSAL,
  login:        loginOneDrive,
  logout:       logoutOneDrive,
  syncNow:      () => syncNow(false),
  scheduleSync: scheduleSync,
  isConnected:  () => syncEnabled && !!currentAccount,
  getUser:      () => currentAccount,
};
