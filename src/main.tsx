import { createRoot } from "react-dom/client";
import "./index.css";

// Clean up cache-busting parameter added by hardRefresh() or stale-build detection.
// This runs early so the ?_gv=... doesn't persist in the URL bar or browser history.
// The inline script in index.html also strips it, but this is a safety net.
try {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_gv')) {
    url.searchParams.delete('_gv');
    window.history.replaceState(null, '', url.toString());
  }
} catch {
  // URL manipulation failed — ignore
}

// Augment window for cross-script communication with index.html inline scripts
declare global {
  interface Window {
    __versionCheck?: Promise<{ buildTime?: string } | null>;
    __HTML_BUILD_TIME__?: string;
    __guildReactMounted?: boolean;
    __guildAppFailed?: boolean;
    __guildSetStatus?: (msg: string) => void;
  }
}

// Update the loading status text on the loading screen.
// Shows progress to the user so they know the app isn't frozen.
function setStatus(msg: string) {
  if (typeof window.__guildSetStatus === 'function') {
    window.__guildSetStatus(msg);
  }
}

// Show error on the loading screen if React fails to mount.
// Without this, the static "Loading the realm..." stays visible forever.
function showMountError(error: unknown) {
  window.__guildAppFailed = true;
  const root = document.getElementById("root");
  if (!root) return;

  const msg = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : '';
  console.error('[Guild Life] Failed to mount React app:', error);

  root.innerHTML = `
    <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1f170a;color:#e8dcc8;font-family:serif;text-align:center;padding:2rem;">
      <h1 style="font-size:2rem;margin-bottom:1rem;color:#d4a537;">Guild Life Adventures</h1>
      <p style="font-size:1.1rem;color:#c44;margin-bottom:0.5rem;">Failed to load the realm</p>
      <p style="font-size:0.85rem;opacity:0.7;max-width:600px;word-break:break-word;">${msg}</p>
      ${stack ? `<pre style="font-size:0.7rem;opacity:0.5;max-width:600px;overflow:auto;text-align:left;margin-top:1rem;">${stack}</pre>` : ''}
      <button onclick="try{var u=new URL(location.href);u.searchParams.set('_gv',Date.now());location.replace(u.toString())}catch(e){location.reload()}" style="margin-top:1.5rem;padding:0.5rem 1.5rem;background:#d4a537;color:#1f170a;border:none;border-radius:4px;cursor:pointer;font-size:1rem;">Reload</button>
    </div>
  `;
}

// Dynamic import of App — catches module-level failures in the entire
// component tree (store, hooks, audio singletons, data modules).
// Static imports (like `import App from "./App"`) execute during module
// resolution BEFORE any try-catch can run, so errors are invisible.
// Dynamic import() converts them to catchable rejected promises.
async function mount() {
  try {
    setStatus('Loading game modules...');
    console.log('[Guild Life] Loading app modules...');
    const { default: App } = await import("./App.tsx");
    setStatus('Starting game...');
    console.log('[Guild Life] Mounting React app...');
    const root = document.getElementById("root");
    if (!root) {
      throw new Error('Root element not found');
    }
    createRoot(root).render(<App />);
    // Signal to the fallback script that React has mounted successfully.
    // This prevents the "Clear Cache & Reload" button from appearing
    // after React is already running.
    window.__guildReactMounted = true;
    console.log('[Guild Life] React render() called successfully');
  } catch (error) {
    showMountError(error);
  }
}

// Safety timeout: if mount() hangs (import never resolves, module evaluation hangs),
// signal failure so the watchdog and fallback button can act.
const mountTimeout = setTimeout(() => {
  if (!window.__guildReactMounted && !window.__guildAppFailed) {
    console.error('[Guild Life] Mount timeout — module import may have hung');
    window.__guildAppFailed = true;
  }
}, 15000);

mount().finally(() => clearTimeout(mountTimeout));
