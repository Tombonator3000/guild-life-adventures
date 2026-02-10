# Guild Life Adventures — Electron Desktop Build Guide

Complete step-by-step guide for compiling Guild Life Adventures into a standalone desktop application and distributing it on itch.io (and later Steam). This document covers everything from initial setup to publishing updates.

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Project Setup](#phase-1-project-setup)
4. [Phase 2: Electron Main Process](#phase-2-electron-main-process)
5. [Phase 3: Preload Script](#phase-3-preload-script)
6. [Phase 4: Electron Vite Config](#phase-4-electron-vite-config)
7. [Phase 5: Package.json Changes](#phase-5-packagejson-changes)
8. [Phase 6: Runtime Electron Detection](#phase-6-runtime-electron-detection)
9. [Phase 7: Build & Test Locally](#phase-7-build--test-locally)
10. [Phase 8: itch.io Distribution](#phase-8-itchio-distribution)
11. [Phase 9: Updating the App](#phase-9-updating-the-app)
12. [Phase 10: GitHub Actions CI/CD](#phase-10-github-actions-cicd)
13. [Phase 11: Steam Integration (Future)](#phase-11-steam-integration-future)
14. [Folder Structure After Setup](#folder-structure-after-setup)
15. [What Changes in the React App](#what-changes-in-the-react-app)
16. [Troubleshooting](#troubleshooting)
17. [Reference Links](#reference-links)

---

## Stack Overview

| Component | Library | Version | Purpose |
|-----------|---------|---------|---------|
| **Desktop shell** | `electron` | 40.x | Chromium M144 + Node.js — runs the game as a native window |
| **Build tool** | `electron-vite` | 5.x | Vite integration for Electron (triple config: main/preload/renderer, HMR) |
| **Packager** | `electron-builder` | 26.x | Creates installers: .exe (Windows), .dmg (macOS), .AppImage/.deb (Linux) |
| **Steamworks** | `steamworks.js` | 0.4.x | Steam achievements, overlay, cloud saves (Phase 11, optional) |

**Why Electron?**
- Full Chromium = PeerJS/WebRTC multiplayer works perfectly on all platforms
- Web Audio, localStorage, Zustand, Tailwind, shadcn/ui — all work unchanged
- Steam Overlay compatible (with workaround flags)
- Proven: Game Dev Tycoon, Curious Expedition, Screeps all ship on Electron
- The existing React app needs ZERO changes

---

## Prerequisites

Before starting, make sure you have:

- **Bun** (already installed — used as package manager)
- **Node.js 20+** (Electron requires Node.js at build time)
- **Git** (already set up)
- **Windows/Linux/macOS machine** for building native targets

Platform-specific build requirements:
- **Windows builds**: Can be built on Windows natively, or on Linux/macOS via Wine
- **Linux builds**: Can be built on any platform
- **macOS builds**: **Must be built on macOS** (Apple code signing requires it)

---

## Phase 1: Project Setup

### 1.1 Install Electron dependencies

```bash
bun add -D electron electron-vite electron-builder @types/electron
```

This adds ~150 MB to `node_modules` (Electron includes a full Chromium binary). This is dev-only — not shipped in the final web build.

### 1.2 Create the electron directory structure

```bash
mkdir -p electron/main electron/preload
```

### 1.3 Add to .gitignore

Add these lines to `.gitignore` if not already present:

```gitignore
# Electron build output
out/
release/
dist-electron/
```

---

## Phase 2: Electron Main Process

Create `electron/main/index.ts` — this is the "backend" of the Electron app. It creates the window and loads the game.

```ts
import { app, BrowserWindow, shell } from 'electron'
import path from 'path'

// Disable hardware acceleration issues on some systems
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 600,
    fullscreenable: true,
    autoHideMenuBar: true,            // Hide menu bar (Alt shows it)
    title: 'Guild Life Adventures',
    icon: path.join(__dirname, '../../public/pwa-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,         // Security: isolate renderer from Node.js
      nodeIntegration: false,         // Security: no Node.js in renderer
      webSecurity: true,              // Security: enforce same-origin
    },
  })

  // Dev mode: load Vite dev server with HMR
  // Production: load the built index.html
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Open external links in the system browser (not inside Electron)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // F11 toggles fullscreen
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F11') {
      mainWindow?.setFullScreen(!mainWindow.isFullScreen())
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// App lifecycle
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  // On macOS, apps stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

### What this does

- Creates a 1280x720 window (resizable, fullscreen-capable)
- Loads the Vite dev server in development, built HTML in production
- Opens external links in the system browser
- F11 for fullscreen toggle
- Hides the menu bar for a cleaner game experience
- Security: contextIsolation + no nodeIntegration

---

## Phase 3: Preload Script

Create `electron/preload/index.ts` — this is the secure bridge between Electron (Node.js) and the React app (browser).

```ts
import { contextBridge, ipcRenderer } from 'electron'

// Expose a minimal API to the renderer (React app)
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform detection
  isElectron: true,
  platform: process.platform,        // 'win32' | 'darwin' | 'linux'

  // App version (from package.json)
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Window controls (optional, for custom title bar)
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  toggleFullscreen: () => ipcRenderer.send('window-toggle-fullscreen'),
})
```

Then add the corresponding handlers in `electron/main/index.ts` (add after `createWindow()`):

```ts
import { ipcMain } from 'electron'

// IPC handlers for preload bridge
ipcMain.handle('get-version', () => app.getVersion())
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())
ipcMain.on('window-toggle-fullscreen', () => {
  mainWindow?.setFullScreen(!mainWindow?.isFullScreen())
})
```

---

## Phase 4: Electron Vite Config

Create `electron.vite.config.ts` in the project root. This configures the triple-build: main process, preload script, and renderer (React app).

```ts
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  // Main process (Node.js)
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'electron/main/index.ts',
      },
    },
  },

  // Preload script (bridge)
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: 'electron/preload/index.ts',
      },
    },
  },

  // Renderer (React app — reuses existing src/)
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: 'index.html',
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  },
})
```

**Important**: The existing `vite.config.ts` stays as-is for web builds (GitHub Pages, Lovable, PWA). `electron.vite.config.ts` is only used when building the desktop version. Both coexist without conflict.

---

## Phase 5: Package.json Changes

### 5.1 Add the `main` entry point

Add this top-level field to `package.json`:

```json
"main": "./out/main/index.js"
```

### 5.2 Add Electron scripts

Add these to the `scripts` section:

```json
"dev:electron": "electron-vite dev",
"build:electron": "electron-vite build",
"build:win": "electron-vite build && electron-builder --win",
"build:mac": "electron-vite build && electron-builder --mac",
"build:linux": "electron-vite build && electron-builder --linux",
"build:all": "electron-vite build && electron-builder --win --mac --linux"
```

### 5.3 Add electron-builder config

Add this top-level `build` section to `package.json`:

```json
"build": {
  "appId": "com.guildlife.adventures",
  "productName": "Guild Life Adventures",
  "artifactName": "${productName}-${version}-${os}-${arch}.${ext}",
  "directories": {
    "output": "release"
  },
  "files": [
    "out/**/*"
  ],
  "extraResources": [
    {
      "from": "public/music",
      "to": "music"
    },
    {
      "from": "public/ambient",
      "to": "ambient"
    },
    {
      "from": "public/sfx",
      "to": "sfx"
    },
    {
      "from": "public/npcs",
      "to": "npcs"
    }
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "zip",
        "arch": ["x64"]
      }
    ],
    "icon": "public/pwa-512x512.png"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "deleteAppDataOnUninstall": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "mac": {
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "public/pwa-512x512.png",
    "category": "public.app-category.games"
  },
  "linux": {
    "target": [
      {
        "target": "AppImage",
        "arch": ["x64"]
      },
      {
        "target": "deb",
        "arch": ["x64"]
      }
    ],
    "icon": "public/pwa-512x512.png",
    "category": "Game",
    "synopsis": "Fantasy life simulation game",
    "description": "Compete to achieve victory in Wealth, Happiness, Education, and Career in a medieval fantasy setting."
  }
}
```

### 5.4 Set the version

Set or update the `version` field in package.json to your release version:

```json
"version": "1.0.0"
```

This version appears in the installer filename and the app's About info.

---

## Phase 6: Runtime Electron Detection

Add a TypeScript declaration so the React app can detect Electron. Create or add to `src/types/electron.d.ts`:

```ts
interface ElectronAPI {
  isElectron: boolean
  platform: 'win32' | 'darwin' | 'linux'
  getVersion: () => Promise<string>
  minimize: () => void
  maximize: () => void
  close: () => void
  toggleFullscreen: () => void
}

interface Window {
  electronAPI?: ElectronAPI
}
```

Then in any React component:

```ts
// Check if running in Electron
const isElectron = window.electronAPI?.isElectron ?? false

// Use it to conditionally render
{!isElectron && <PWAInstallButton />}    // Hide PWA button in desktop app
{isElectron && <DesktopFullscreenBtn />}  // Show desktop-only controls
```

### Recommended conditional UI changes

| Feature | Web (browser) | Electron (desktop) |
|---------|--------------|-------------------|
| PWA install button | Show | **Hide** |
| "Download app" prompt | Show | **Hide** |
| F11 fullscreen hint | Hide | **Show** |
| Version display | Hide | **Show** (via `electronAPI.getVersion()`) |
| External links | Open in same tab | **Open in system browser** (handled by main process) |

---

## Phase 7: Build & Test Locally

### 7.1 Development mode (with Hot Module Replacement)

```bash
bun run dev:electron
```

This starts the Vite dev server AND opens Electron pointing at it. Code changes in `src/` hot-reload instantly inside the Electron window. This is the same dev experience as `bun run dev` but inside a native window.

### 7.2 Build for your current platform

```bash
# Windows
bun run build:win

# Linux
bun run build:linux

# macOS
bun run build:mac
```

The output goes to `release/`:

| Platform | Output |
|----------|--------|
| Windows | `release/Guild Life Adventures-1.0.0-win-x64.exe` (NSIS installer) + `.zip` |
| Linux | `release/Guild Life Adventures-1.0.0-linux-x64.AppImage` + `.deb` |
| macOS | `release/Guild Life Adventures-1.0.0-mac-x64.dmg` |

### 7.3 Test checklist

Run through these after building:

- [ ] App launches and shows the title screen
- [ ] Music plays (Web Audio)
- [ ] Sound effects work
- [ ] Start a single-player game — verify all locations work
- [ ] Save/load game (localStorage still works in Electron)
- [ ] Open Settings — verify all options work
- [ ] Test fullscreen (F11)
- [ ] Test multiplayer: create a room, join from a browser
- [ ] Test window resize and minimum size
- [ ] Test close/reopen — saves persist
- [ ] External links open in system browser (not inside the game window)

---

## Phase 8: itch.io Distribution

### 8.1 Create your itch.io account and game page

1. Go to [itch.io](https://itch.io) and create an account
2. Go to [itch.io/game/new](https://itch.io/game/new)
3. Fill in:
   - **Title**: Guild Life Adventures
   - **Kind of project**: Downloadable
   - **Classification**: Game
   - **Pricing**: You choose — free, paid, or pay-what-you-want
   - **Uploads**: Leave empty for now (we'll use butler)
   - **Genre**: Simulation, Strategy, RPG
   - **Tags**: fantasy, life-sim, multiplayer, pixel-art, medieval
4. Set **Visibility** to "Draft" for now
5. Save

### 8.2 Install Butler CLI

Butler is itch.io's command-line tool for pushing builds. It handles compression, delta patches, and versioning.

**Linux:**
```bash
curl -L -o butler.zip https://broth.itch.zone/butler/linux-amd64/LATEST/archive/default
unzip butler.zip -d ~/.local/bin
chmod +x ~/.local/bin/butler
butler login
```

**Windows (PowerShell):**
```powershell
Invoke-WebRequest -Uri https://broth.itch.zone/butler/windows-amd64/LATEST/archive/default -OutFile butler.zip
Expand-Archive butler.zip -DestinationPath $env:USERPROFILE\butler
$env:PATH += ";$env:USERPROFILE\butler"
butler login
```

**macOS:**
```bash
curl -L -o butler.zip https://broth.itch.zone/butler/darwin-amd64/LATEST/archive/default
unzip butler.zip -d /usr/local/bin
chmod +x /usr/local/bin/butler
butler login
```

`butler login` opens a browser window for authentication. You only need to do this once.

### 8.3 Build and push

```bash
# Build all platforms you can build on your machine
bun run build:win      # On Windows or Linux with Wine
bun run build:linux    # On Linux

# Push to itch.io
# Format: butler push <directory> <user>/<game>:<channel>
butler push "release/win-unpacked" your-username/guild-life-adventures:windows
butler push "release/linux-unpacked" your-username/guild-life-adventures:linux

# Or push the installer files directly:
butler push "release/Guild Life Adventures-1.0.0-win-x64.exe" your-username/guild-life-adventures:windows-installer
butler push "release/Guild Life Adventures-1.0.0-linux-x64.AppImage" your-username/guild-life-adventures:linux-appimage
```

**Channel naming convention:**
| Channel name | What it contains |
|-------------|-----------------|
| `windows` | Windows unpacked directory (or .zip) |
| `windows-installer` | Windows NSIS .exe installer |
| `linux` | Linux unpacked directory |
| `linux-appimage` | Linux .AppImage file |
| `mac` | macOS .app or .dmg |

### 8.4 Version tagging

```bash
butler push "release/win-unpacked" your-username/guild-life-adventures:windows --userversion 1.0.0
```

Butler tracks versions automatically (each push increments a build number), but `--userversion` lets you set a human-readable version string.

### 8.5 Verify on itch.io

1. Go to your game's edit page on itch.io
2. Check "Uploads" section — butler creates entries automatically
3. Download and test on a clean machine
4. When ready, set **Visibility** to "Public"

### 8.6 How itch.io auto-updates work

- **itch.io desktop app users**: Get automatic delta updates. Butler calculates binary diffs — only changed bytes are downloaded. Users see "Update available" in the itch app.
- **Direct download users**: Must re-download manually. No in-app auto-update.
- **The itch.io app handles everything** — you just push new builds with butler.

---

## Phase 9: Updating the App

### 9.1 Workflow for releasing updates

```bash
# 1. Make your code changes in src/ as usual
# 2. Update version in package.json
#    "version": "1.1.0"

# 3. Build
bun run build:win
bun run build:linux

# 4. Push to itch.io (butler calculates delta — fast!)
butler push "release/win-unpacked" your-username/guild-life-adventures:windows --userversion 1.1.0
butler push "release/linux-unpacked" your-username/guild-life-adventures:linux --userversion 1.1.0

# 5. Optional: tag in git
git tag v1.1.0
git push origin v1.1.0
```

### 9.2 Delta updates via Butler

Butler is smart about updates:
- First push: uploads the full build (~150-200 MB)
- Subsequent pushes: uploads only changed bytes (typically 1-10 MB for code changes)
- Users with the itch.io desktop app download only the delta
- Direct download users get the full build

### 9.3 In-app update notification (optional)

If you want to notify direct-download users about updates, you can check the itch.io API:

```ts
// Optional: check for updates on app start
async function checkForUpdates(currentVersion: string) {
  try {
    const res = await fetch('https://itch.io/api/1/x/wharf/latest?game_id=YOUR_GAME_ID&channel_name=windows')
    const data = await res.json()
    if (data.latest !== currentVersion) {
      // Show "Update available" notification in-game
    }
  } catch {
    // Offline or API error — silently ignore
  }
}
```

### 9.4 electron-updater (for direct distribution, NOT itch.io)

If you distribute directly (own website, GitHub Releases), you can use `electron-updater` for silent auto-updates:

```bash
bun add electron-updater
```

In `electron/main/index.ts`:

```ts
import { autoUpdater } from 'electron-updater'

// Only check for updates in packaged (production) builds
if (app.isPackaged) {
  app.whenReady().then(() => {
    autoUpdater.checkForUpdatesAndNotify()
  })
}

// Listen for update events
autoUpdater.on('update-available', (info) => {
  // Notify the renderer that an update is downloading
  mainWindow?.webContents.send('update-available', info.version)
})

autoUpdater.on('update-downloaded', (info) => {
  // Prompt user to restart
  mainWindow?.webContents.send('update-downloaded', info.version)
})
```

Configure the publish target in `package.json` `build` section:

```json
"publish": {
  "provider": "github",
  "owner": "Tombonator3000",
  "repo": "guild-life-adventures"
}
```

**How it works:**
1. electron-builder generates `latest.yml` alongside your build artifacts
2. `autoUpdater.checkForUpdatesAndNotify()` fetches `latest.yml` from GitHub Releases
3. If a newer version exists, it downloads in the background
4. When complete, prompts the user to restart

**Limitations:**
- macOS auto-updates **require** code signing ($99/year Apple Developer Program)
- Windows works without signing but triggers SmartScreen warning
- Linux AppImage does not support auto-update — users must re-download

---

## Phase 10: GitHub Actions CI/CD

Automate building for all platforms on every tagged release.

Create `.github/workflows/build-electron.yml`:

```yaml
name: Build Desktop App

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            build-cmd: build:linux
          - os: windows-latest
            build-cmd: build:win
          # Uncomment when you have macOS code signing:
          # - os: macos-latest
          #   build-cmd: build:mac

    runs-on: ${{ matrix.os }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install

      - name: Build Electron app
        run: bun run ${{ matrix.build-cmd }}

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: release-${{ matrix.os }}
          path: |
            release/*.exe
            release/*.zip
            release/*.AppImage
            release/*.deb
            release/*.dmg
          if-no-files-found: warn

  # Automatically push to itch.io after build
  publish-itch:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download Windows build
        uses: actions/download-artifact@v4
        with:
          name: release-windows-latest
          path: release-win

      - name: Download Linux build
        uses: actions/download-artifact@v4
        with:
          name: release-ubuntu-latest
          path: release-linux

      - name: Push to itch.io
        uses: josephbmanley/butler-publish-itchio-action@master
        env:
          BUTLER_CREDENTIALS: ${{ secrets.BUTLER_API_KEY }}
          CHANNEL: windows
          ITCH_GAME: guild-life-adventures
          ITCH_USER: your-username
          PACKAGE: release-win

      - name: Push Linux to itch.io
        uses: josephbmanley/butler-publish-itchio-action@master
        env:
          BUTLER_CREDENTIALS: ${{ secrets.BUTLER_API_KEY }}
          CHANNEL: linux
          ITCH_GAME: guild-life-adventures
          ITCH_USER: your-username
          PACKAGE: release-linux
```

### Setting up the itch.io API key

1. Go to [itch.io/user/settings/api-keys](https://itch.io/user/settings/api-keys)
2. Generate a new API key
3. In your GitHub repo: Settings > Secrets > Actions > New secret
4. Name: `BUTLER_API_KEY`, Value: your API key

### Triggering a release

```bash
# After all changes are committed:
git tag v1.0.0
git push origin v1.0.0
# GitHub Actions automatically builds + pushes to itch.io
```

---

## Phase 11: Steam Integration (Future)

This is optional and can be done after the itch.io release is working.

### 11.1 Prerequisites

1. Register at [partner.steamgames.com](https://partner.steamgames.com)
2. Pay $100 Steam Direct fee (recoupable after $1,000 revenue)
3. Complete tax/bank/identity verification
4. Wait 30 days (first-time developer waiting period)

### 11.2 Add steamworks.js

```bash
bun add steamworks.js
```

### 11.3 Modify electron/main/index.ts

```ts
import { init, electronEnableSteamOverlay } from 'steamworks.js'

// --- STEAM SETUP (add before createWindow) ---

// Required for Steam overlay to render
app.commandLine.appendSwitch('in-process-gpu')
app.commandLine.appendSwitch('disable-direct-composition')

// Enable Steam overlay (must be before BrowserWindow creation)
electronEnableSteamOverlay()

// Initialize Steamworks (480 = Spacewar test app ID during development)
let steamClient: ReturnType<typeof init> | null = null
try {
  steamClient = init(480)  // Replace 480 with your real App ID
  console.log('Steam initialized. User:', steamClient.localplayer.getName())
} catch (e) {
  console.warn('Steam not available (running outside Steam?):', e)
  // Game continues to work without Steam
}
```

### 11.4 Steam overlay on static screens

Steam overlay needs constant screen repaints. Since Guild Life Adventures has animations, this mostly works. For fully static screens (title, settings), add a transparent repaint canvas:

```ts
// In a React component shown on static screens:
useEffect(() => {
  if (!window.electronAPI?.isElectron) return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;opacity:0.001'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  let raf: number
  const tick = () => { ctx.clearRect(0, 0, 1, 1); raf = requestAnimationFrame(tick) }
  tick()
  return () => { cancelAnimationFrame(raf); canvas.remove() }
}, [])
```

### 11.5 Upload to Steam

```bash
# Use steamcmd (NOT the Steam GUI uploader — it breaks macOS symlinks)
steamcmd +login your_steam_username +run_app_build app_build.vdf +quit
```

### 11.6 Steam store timeline

| Step | Duration |
|------|----------|
| Pay $100 fee | Instant |
| Identity/tax/bank verification | 1-5 days |
| 30-day waiting period | 30 days |
| Create "Coming Soon" store page | 1-2 hours |
| Store page review | 3-7 business days |
| Mandatory "Coming Soon" period | 14+ days |
| Build review | 3-7 business days |
| **Total minimum** | **~6-8 weeks** |

---

## Folder Structure After Setup

```
guild-life-adventures/
├── electron/                          # NEW — Electron-specific code
│   ├── main/
│   │   └── index.ts                   # Main process (window, IPC, Steam)
│   └── preload/
│       └── index.ts                   # Context bridge (secure API exposure)
│
├── src/                               # UNCHANGED — existing React app
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── network/
│   ├── store/
│   ├── types/
│   │   └── electron.d.ts             # NEW — TypeScript declarations for window.electronAPI
│   └── ...
│
├── public/                            # UNCHANGED — static assets
│   ├── music/
│   ├── ambient/
│   ├── sfx/
│   ├── npcs/
│   └── pwa-512x512.png              # Used as app icon
│
├── electron.vite.config.ts            # NEW — Electron build config
├── vite.config.ts                     # KEEP — web builds (GitHub Pages, PWA)
├── package.json                       # MODIFIED — add electron scripts + build config
├── .gitignore                         # MODIFIED — add out/ and release/
│
├── out/                               # GENERATED by electron-vite build
│   ├── main/index.js
│   ├── preload/index.js
│   └── renderer/                      # Built React app
│       ├── index.html
│       └── assets/
│
└── release/                           # GENERATED by electron-builder
    ├── Guild Life Adventures-1.0.0-win-x64.exe
    ├── Guild Life Adventures-1.0.0-win-x64.zip
    ├── Guild Life Adventures-1.0.0-linux-x64.AppImage
    ├── Guild Life Adventures-1.0.0-linux-x64.deb
    └── Guild Life Adventures-1.0.0-mac-x64.dmg
```

---

## What Changes in the React App

**Answer: Nothing.**

The existing React app works completely unchanged because Electron IS Chromium. Everything in `src/` — React, Zustand, Tailwind, shadcn/ui, PeerJS, Web Audio, localStorage — runs identically.

The only optional changes are:
1. `src/types/electron.d.ts` — TypeScript declarations for the preload API
2. Conditional UI: hide PWA install button, show version number
3. These are additive — the web version continues to work as before

Both build systems coexist:
- `bun run dev` / `bun run build` — web version (Vite + PWA)
- `bun run dev:electron` / `bun run build:win` — desktop version (Electron)

---

## Troubleshooting

### Build fails with "Cannot find module 'electron'"

Make sure electron is installed as a devDependency:
```bash
bun add -D electron
```

### White screen on launch

Check the developer console (Ctrl+Shift+I in the Electron window). Common causes:
- Wrong path in `mainWindow.loadFile()` — check that `out/renderer/index.html` exists
- Missing assets — check that `extraResources` in electron-builder config is correct

### "electron-vite: command not found"

Use `npx electron-vite` or add to PATH. Or ensure it's in devDependencies and run via `bun run dev:electron`.

### NSIS installer fails to build on Linux

Install Wine:
```bash
# Ubuntu/Debian
sudo apt install wine64
# Or use the Docker image:
docker run --rm -v $(pwd):/project -w /project electronuserland/builder:wine bash -c "npm ci && npx electron-builder --win"
```

### AppImage won't launch on Linux

Make it executable:
```bash
chmod +x "Guild Life Adventures-1.0.0-linux-x64.AppImage"
./Guild\ Life\ Adventures-1.0.0-linux-x64.AppImage
```

### Multiplayer doesn't work in Electron

It should work identically to the browser version. If not:
- Check that `webSecurity: true` is set (not `false`)
- PeerJS uses WebRTC which needs internet access — verify network connectivity
- Firewall rules may need to allow the Electron app

### Game assets (music, images) not found in production build

Check `extraResources` in the electron-builder config. Audio files in `public/music/` etc. need to be copied. Alternatively, Vite bundles assets referenced in the code — only external assets need `extraResources`.

### macOS: "App is damaged and can't be opened"

This means the app is not code-signed. Either:
1. Sign it with an Apple Developer ID ($99/year)
2. Tell users to bypass Gatekeeper: `xattr -cr "Guild Life Adventures.app"`

---

## Reference Links

| Resource | URL |
|----------|-----|
| electron-vite documentation | https://electron-vite.org |
| electron-builder documentation | https://www.electron.build |
| Electron documentation | https://www.electronjs.org/docs |
| itch.io Butler documentation | https://itch.io/docs/butler |
| itch.io game creation | https://itch.io/game/new |
| steamworks.js | https://github.com/ceifa/steamworks.js |
| Steamworks partner program | https://partner.steamgames.com |
| Apple Developer Program | https://developer.apple.com/programs |
| Microsoft Trusted Signing | https://azure.microsoft.com/en-us/products/trusted-signing |

---

*Created: 2026-02-10*
*Stack: Electron 40 + electron-vite 5.0 + electron-builder 26.7*
*Primary distribution: itch.io (butler CLI)*
*Future: Steam (steamworks.js)*
