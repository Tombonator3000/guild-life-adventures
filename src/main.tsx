import { createRoot } from "react-dom/client";
import "./index.css";

// Show error on the loading screen if React fails to mount.
// Without this, the static "Loading the realm..." stays visible forever.
function showMountError(error: unknown) {
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
      <button onclick="location.reload()" style="margin-top:1.5rem;padding:0.5rem 1.5rem;background:#d4a537;color:#1f170a;border:none;border-radius:4px;cursor:pointer;font-size:1rem;">Reload</button>
    </div>
  `;
}

/**
 * Pre-mount staleness check: fetch version.json BEFORE loading any app modules.
 * If the running HTML was served from browser HTTP cache (GitHub Pages caches HTML
 * for ~10 min), its JS chunk references may have stale hashes that no longer exist
 * on the server. Detecting this BEFORE importing App.tsx prevents silent module
 * loading failures that leave "Loading the realm..." visible forever.
 *
 * Returns true if the page is stale and a hard refresh was triggered.
 */
async function checkStaleBuild(): Promise<boolean> {
  // Skip in development (no __BUILD_TIME__ or no version.json)
  if (typeof __BUILD_TIME__ === 'undefined') return false;

  try {
    const base = import.meta.env.BASE_URL || '/';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const resp = await fetch(`${base}version.json?_=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return false;
    const data = await resp.json();

    if (data.buildTime && data.buildTime !== __BUILD_TIME__) {
      console.warn('[Guild Life] Stale build detected — clearing cache and reloading.',
        { running: __BUILD_TIME__, server: data.buildTime });

      // Unregister SWs + clear caches + wait for completion before reload
      try {
        const regs = await navigator.serviceWorker?.getRegistrations() ?? [];
        await Promise.all(regs.map(r => r.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      } catch { /* ignore — reload regardless */ }

      // Small delay to ensure cache operations complete before reload
      await new Promise(r => setTimeout(r, 100));
      window.location.reload();
      return true; // Page will reload
    }
  } catch {
    // Network error or timeout — proceed with mount (better than hanging)
    console.log('[Guild Life] Version check skipped (network unavailable)');
  }
  return false;
}

// Dynamic import of App — catches module-level failures in the entire
// component tree (store, hooks, audio singletons, data modules).
// Static imports (like `import App from "./App"`) execute during module
// resolution BEFORE any try-catch can run, so errors are invisible.
// Dynamic import() converts them to catchable rejected promises.
async function mount() {
  try {
    // Check for stale build BEFORE loading any app modules.
    // If HTML is from browser cache but server has newer build, reload now.
    console.log('[Guild Life] Checking build freshness...');
    const isStale = await checkStaleBuild();
    if (isStale) return; // Page is reloading

    console.log('[Guild Life] Loading app modules...');
    const { default: App } = await import("./App.tsx");
    console.log('[Guild Life] Mounting React app...');
    createRoot(document.getElementById("root")!).render(<App />);
    console.log('[Guild Life] React render() called successfully');
  } catch (error) {
    showMountError(error);
  }
}

mount();
