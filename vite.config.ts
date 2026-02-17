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
 * Generates version.json in the output directory at build time.
 * Fetched by useAppUpdate to detect new deployments and show update banner.
 */
function versionJsonPlugin(): PluginOption {
  let outDir = "dist";
  return {
    name: "version-json",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(
        path.join(outDir, "version.json"),
        JSON.stringify({ buildTime }),
      );
    },
  };
}

/**
 * Adds onerror handler to Vite's entry module script tag.
 * If the entry JS file 404s (stale HTML after deployment), the user sees
 * an immediate error message instead of the loading screen hanging forever.
 */
function scriptErrorPlugin(): PluginOption {
  return {
    name: 'script-onerror',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html: string) {
        return html.replace(
          /<script type="module" crossorigin src="([^"]+)">/,
          '<script type="module" crossorigin src="$1" onerror="__guildShowError(\'Failed to load game files — please reload.\')">'
        );
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
      selfDestroying: true,
      registerType: 'prompt',
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
        globPatterns: [],
        globIgnores: ["**/*"],
        navigateFallback: null,
        skipWaiting: false,
        clientsClaim: false,
        runtimeCaching: [],
      },
    }),
    versionJsonPlugin(),
    scriptErrorPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
