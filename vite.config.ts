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
      const versionData = { buildTime };
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
      registerType: "autoUpdate",
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
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024, // 15 MB (game-board.jpeg is ~10 MB)
        // ===== CRITICAL FIX: DO NOT PRECACHE JS OR CSS =====
        // JS/CSS files are content-hashed by Vite (e.g., index-abc123.js).
        // The browser's HTTP cache handles them correctly using the hash.
        // When JS/CSS are in the SW precache, deploys create a race condition:
        //   1. New SW activates (skipWaiting + clientsClaim)
        //   2. New SW cleans up old precache entries (cleanupOutdatedCaches)
        //   3. But browser may still have old HTML referencing old chunk hashes
        //   4. Old chunks are gone from precache → 404 → "Loading the realm..." forever
        // By only precaching static assets (images, fonts, icons), the SW provides
        // offline-capable media while JS/CSS always come fresh from the network.
        // Only precache PWA icons — NOT the 300+ game images (40 MB).
        // Images, audio, and NPC portraits are cached on-demand via CacheFirst
        // runtime caching below. This makes SW install near-instant.
        globPatterns: ["pwa-*.png", "favicon.ico"],
        globIgnores: ["**/version.json"], // Never precache — fetched with no-store for update detection
        cleanupOutdatedCaches: true, // Remove old precache entries when new SW activates
        // Don't serve cached HTML for navigation — always fetch fresh from network
        // This prevents stale index.html from being served after GitHub Pages deployments
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          // JS/CSS: NetworkFirst — always try network, fall back to cache only when offline.
          // This prevents stale JS chunks from being served after a new deployment.
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "js-css-cache",
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
              networkTimeoutSeconds: 5, // Fall back to cache after 5s if network hangs
            },
          },
          {
            urlPattern: /\.(?:mp3)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "music-cache",
              expiration: {
                maxEntries: 100, // All music + ambient + SFX files
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:jpg|jpeg|png|svg|webp)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 500, // All game images cached on demand
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
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
