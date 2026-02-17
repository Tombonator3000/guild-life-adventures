import { createRoot } from "react-dom/client";
import "./index.css";

// Clean up cache-busting parameter added by hardRefresh() or stale-build detection.
// This runs early so the ?_gv=... doesn't persist in the URL bar or browser history.
try {
  const url = new URL(window.location.href);
  if (url.searchParams.has('_gv')) {
    url.searchParams.delete('_gv');
    window.history.replaceState(null, '', url.toString());
  }
} catch {
  // URL manipulation failed — ignore
}

declare global {
  interface Window {
    __guildReactMounted?: boolean;
  }
}

// Dynamic import of App — catches module-level failures in the entire
// component tree (store, hooks, audio singletons, data modules).
// Static imports execute during module resolution BEFORE any try-catch
// can run, so errors are invisible. Dynamic import() converts them to
// catchable rejected promises.
async function mount() {
  try {
    const { default: App } = await import("./App.tsx");
    const root = document.getElementById("root");
    if (!root) throw new Error('Root element not found');
    createRoot(root).render(<App />);
    // Signal to the fallback script that React has mounted successfully.
    // This prevents the "Reload" button from appearing after React is running.
    window.__guildReactMounted = true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Guild Life] Mount failed:', error);
    const root = document.getElementById("root");
    if (root) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1f170a;color:#e8dcc8;font-family:serif;text-align:center;padding:2rem;">
          <h1 style="font-size:2rem;margin-bottom:1rem;color:#d4a537;">Guild Life Adventures</h1>
          <p style="font-size:1.1rem;color:#c44;margin-bottom:0.5rem;">Failed to load the realm</p>
          <p style="font-size:0.85rem;opacity:0.7;max-width:600px;word-break:break-word;">${msg}</p>
          <button onclick="location.reload()" style="margin-top:1.5rem;padding:0.5rem 1.5rem;background:#d4a537;color:#1f170a;border:none;border-radius:4px;cursor:pointer;font-size:1rem;">Reload</button>
        </div>
      `;
    }
  }
}

mount();
