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
      // Inject build time into HTML as a global variable.
      // Used by the inline stale-build detection script.
      return [
        {
          tag: 'script',
          children: `window.__HTML_BUILD_TIME__="${buildTime}";`,
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
      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon.svg",
        "music/*.mp3",
        "ambient/*.mp3",
        "sfx/*.mp3",
        "npcs/*.jpg",
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
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        globIgnores: ["**/version.json"], // Never precache — fetched with no-store for update detection
        cleanupOutdatedCaches: true, // Remove old precache entries when new SW activates
        // Don't serve cached HTML for navigation — always fetch fresh from network
        // This prevents stale index.html from being served after GitHub Pages deployments
        navigateFallback: null,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\.(?:mp3)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "music-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:jpg|jpeg|png|svg)$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 50,
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
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
