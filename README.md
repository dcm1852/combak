# Mis Finanzas — PWA de Finanzas Personales

## ¿Cómo correr la app localmente?

Necesitas un servidor HTTP local (no funciona abriendo el archivo directamente por el service worker).

### Opción A — Python (recomendado)
```bash
cd mis-finanzas/
python3 -m http.server 8080
# Abre http://localhost:8080 en tu navegador
```

### Opción B — Node.js
```bash
npx serve .
```

### Opción C — VS Code
Instala la extensión "Live Server" y haz clic en "Go Live".

---

## ¿Cómo instalar como app en cada plataforma?

### Android (Samsung / Chrome)
1. Abre la app en Chrome
2. Toca los 3 puntos (**⋮**) arriba a la derecha
3. Toca **"Agregar a pantalla de inicio"** o **"Instalar app"**
4. Confirma — aparecerá el ícono en tu pantalla de inicio

### iOS (Safari)
1. Abre la app en Safari
2. Toca el botón de compartir (**□↑**)
3. Desliza hacia abajo y toca **"Agregar a pantalla de inicio"**
4. Nómbrala y toca **"Agregar"**

### macOS (Chrome o Edge)
1. Abre la app en Chrome o Edge
2. En la barra de dirección, toca el ícono **⊕** o **instalar**
3. O ve al menú (**⋮**) → **"Instalar Mis Finanzas"**

### Windows (Chrome o Edge)
1. Abre la app
2. En la barra de dirección aparece un ícono de instalación
3. Haz clic en él y confirma

---

## Estructura de archivos

```
mis-finanzas/
├── index.html        — Estructura principal de la app
├── app.js            — Toda la lógica (vanilla JS, sin frameworks)
├── style.css         — Estilos (diseño minimalista)
├── manifest.json     — Configuración PWA
├── service-worker.js — Cache offline
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

---

## Fase 2 — Sincronización OneDrive (próximamente)

Para la Fase 2, necesitarás registrar la app en Azure:

1. Ve a [portal.azure.com](https://portal.azure.com) (gratis con cuenta Microsoft)
2. Busca **"App registrations"** → **"New registration"**
3. Nombre: `Mis Finanzas`
4. Tipos de cuenta: `Accounts in any organizational directory and personal Microsoft accounts`
5. Redirect URI: `Single-page application (SPA)` → `http://localhost:8080`
6. En **"API permissions"**, agrega:
   - `Files.ReadWrite` (OneDrive)
   - `User.Read`
7. Copia el **Application (client) ID**
8. En `app.js`, pégalo en: `const MSAL_CLIENT_ID = "TU_ID_AQUI"`

---

## Datos

- Todos los datos se guardan localmente en `localStorage`
- Sin backend, sin cuenta requerida, sin suscripción
- Exportar CSV: Configuración → "Exportar CSV"
