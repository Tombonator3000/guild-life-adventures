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

// Dynamic import of App — catches module-level failures in the entire
// component tree (store, hooks, audio singletons, data modules).
// Static imports (like `import App from "./App"`) execute during module
// resolution BEFORE any try-catch can run, so errors are invisible.
// Dynamic import() converts them to catchable rejected promises.
async function mount() {
  try {
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
