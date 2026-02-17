import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { writeFileSync, mkdirSync } from "fs";
import { VitePWA } from "vite-plugin-pwa";

// Detect deploy target: "github" for GitHub Pages, default for Lovable/local
const deployTarget = process.env.DEPLOY_TARGET || "lovable";
const basePath = deployTarget === "github" ? "/guild-life-adventures/" : "/";

// Shared build timestamp — used in both __BUILD_TIME__ define and version.json
const buildTime = new Date().toISOString();

// Shared state between versionJsonPlugin and deferModulePlugin.
// deferModulePlugin extracts the entry + CSS URLs during transformIndexHtml (order: 'post'),
// and versionJsonPlugin writes them to version.json in closeBundle().
// This allows the inline stale-build detection script to hot-swap to fresh modules
// directly from version.json instead of reloading (which may serve stale cached HTML).
let extractedEntry: string | null = null;
let extractedCss: string[] = [];

/**
 * Generates version.json in the output directory AND injects __HTML_BUILD_TIME__
 * into index.html at build time.
 *
 * version.json: fetched by the client with cache: 'no-store' to detect
 * new deployments even when the service worker serves stale assets.
 *
 * __HTML_BUILD_TIME__: embedded in index.html inline script so that the
 * stale-build detection can run BEFORE any module script loads. This is the
 * critical defense layer — if module scripts fail to load (stale cache → 404),
 * the inline script still detects the mismatch and auto-reloads.
 */
function versionJsonPlugin(): PluginOption {
  let outDir = "dist";
  return {
    name: "version-json",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml() {
      // Inject build time AND base path into HTML as global variables.
      // Used by the inline stale-build detection script.
      // __HTML_BASE__ is critical: without it, the inline script fetches
      // version.json from '/' instead of the correct base path (e.g.
      // '/guild-life-adventures/' on GitHub Pages), causing the stale-build
      // detection to always 404 and never detect stale HTML.
      return [
        {
          tag: 'script',
          children: `window.__HTML_BUILD_TIME__="${buildTime}";window.__HTML_BASE__=${JSON.stringify(basePath)};`,
          injectTo: 'head',
        },
      ];
    },
    closeBundle() {
      // Include entry + CSS URLs so stale-build detection can hot-swap
      // to fresh modules without reloading (reload may serve same stale HTML).
      const versionData: Record<string, unknown> = { buildTime };
      if (extractedEntry) versionData.entry = extractedEntry;
      if (extractedCss.length > 0) versionData.css = extractedCss;
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        path.join(outDir, "version.json"),
        JSON.stringify(versionData),
      );
    },
  };
}

/**
 * Defers the entry module script loading until AFTER the stale-build check passes.
 *
 * Without this plugin, Vite outputs <script type="module" src="..."> directly in HTML.
 * The browser starts fetching the module immediately — even while the inline stale-build
 * check is running. If the HTML is stale (from browser HTTP cache), the module URL
 * references non-existent content-hashed chunks → 404 → "Loading the realm..." forever.
 *
 * This plugin removes the module script tag and stores its URL in window.__ENTRY__.
 * The inline stale-check script in index.html then injects the module dynamically
 * ONLY after confirming the HTML is fresh (or timing out). This eliminates the race
 * condition that caused the recurring loading freeze.
 *
 * Only applies to production builds — development mode keeps the original script tag.
 */
function deferModulePlugin(): PluginOption {
  return {
    name: 'defer-module-load',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        // Find the entry point module script tag that Vite generates
        // Format: <script type="module" crossorigin src="/assets/index-abc123.js"></script>
        const scriptMatch = html.match(
          /<script\s+type="module"\s+crossorigin\s+src="([^"]+)"\s*><\/script>/
        );
        if (!scriptMatch) return html; // No match — return unchanged (safe degradation)

        const entrySrc = scriptMatch[1];

        // Share entry URL with versionJsonPlugin for inclusion in version.json.
        // This allows stale-build detection to hot-swap to the fresh entry module
        // directly from version.json instead of reloading.
        extractedEntry = entrySrc;

        // Extract CSS URLs for version.json (stale HTML may reference 404'd CSS)
        const cssUrls: string[] = [];
        const cssRegex = /<link\s+rel="stylesheet"\s+crossorigin\s+href="([^"]+)"\s*\/?>/g;
        let cssMatch;
        while ((cssMatch = cssRegex.exec(html)) !== null) {
          cssUrls.push(cssMatch[1]);
        }
        extractedCss = cssUrls;

        // Remove the module script tag — inline script will load it after version check
        html = html.replace(scriptMatch[0], '');

        // Also remove modulepreload links to prevent wasted 404 fetches on stale builds
        const preloads: string[] = [];
        html = html.replace(
          /<link\s+rel="modulepreload"\s+crossorigin\s+href="([^"]+)"\s*\/?>/g,
          (_match: string, href: string) => {
            preloads.push(href);
            return '';
          }
        );

        // Inject entry URL and preload URLs as globals
        const script = `<script>window.__ENTRY__=${JSON.stringify(entrySrc)};window.__PRELOADS__=${JSON.stringify(preloads)};</script>`;
        html = html.replace('</head>', script + '\n</head>');

        return html;
      }
    }
  };
}

// Lovable-tagger is optional — only available in Lovable dev environment
let lovableTaggerPlugin: PluginOption | null = null;
try {
  const { componentTagger } = await import("lovable-tagger");
  lovableTaggerPlugin = componentTagger();
} catch {
  // Not available (e.g., GitHub CI or non-Lovable dev) — skip silently
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
  },
  base: basePath,
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && lovableTaggerPlugin,
    VitePWA({
      // CRITICAL FIX (2026-02-17): Self-destroying SW on ALL platforms.
      // The SW has caused 15+ startup failures (BUG-001) across deployments:
      // - Stale runtime cache serving old JS chunks via NetworkFirst
      // - registration.unregister() doesn't stop SW controlling current page
      // - Race conditions between SW cleanup and version.json fetch
      // - controllerchange reload loops from skipWaiting/clientsClaim
      // The SW's caching adds marginal value (game requires network anyway)
      // but creates catastrophic failure modes. Self-destroying on ALL platforms
      // eliminates the SW as a failure vector entirely.
      selfDestroying: true,
      registerType: 'prompt',
      // Only precache essential PWA icons. All other assets (music, images, SFX)
      // are cached on-demand via runtimeCaching rules below. This reduces SW install
      // from 40 MB / 322 entries to <1 MB / ~12 entries, preventing the scenario where
      // a long SW install + skipWaiting causes a mid-visit controller swap.
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon.svg",
      ],
      manifest: {
        name: "Guild Life Adventures",
        short_name: "Guild Life",
        description:
          "A fantasy life simulation game inspired by Jones in the Fast Lane. Compete to achieve victory in Wealth, Happiness, Education, and Career!",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "landscape",
        scope: basePath,
        start_url: basePath,
        categories: ["games", "entertainment"],
        icons: [
          {
            src: "pwa-72x72.png",
            sizes: "72x72",
            type: "image/png",
          },
          {
            src: "pwa-96x96.png",
            sizes: "96x96",
            type: "image/png",
          },
          {
            src: "pwa-128x128.png",
            sizes: "128x128",
            type: "image/png",
          },
          {
            src: "pwa-144x144.png",
            sizes: "144x144",
            type: "image/png",
          },
          {
            src: "pwa-152x152.png",
            sizes: "152x152",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-384x384.png",
            sizes: "384x384",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // With selfDestroying: true, the SW immediately unregisters itself and
        // clears all caches on install. These settings are minimal since the SW
        // won't actually serve any requests.
        globPatterns: [],
        globIgnores: ["**/*"],
        navigateFallback: null,
        skipWaiting: false,
        clientsClaim: false,
        // No runtime caching — SW self-destructs before it can cache anything.
        runtimeCaching: [],
      },
    }),
    versionJsonPlugin(),
    deferModulePlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
