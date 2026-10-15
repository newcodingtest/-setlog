import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig(({ mode }) => {
  const address = new URL(
    loadEnv(mode, process.cwd(), "VITE_").VITE_SITE_URL ||
      "https://setlog.duckdns.org",
  );
  if (
    !["https:", "http:"].includes(address.protocol) ||
    address.pathname !== "/" ||
    address.search ||
    address.hash ||
    address.username ||
    address.password
  )
    throw new Error(
      "VITE_SITE_URL은 경로 없는 http/https 사이트 주소여야 합니다.",
    );
  const siteUrl = address.origin;
  return {
    plugins: [
      {
        name: "setlog-share-metadata",
        transformIndexHtml: (html) =>
          html.replaceAll("__SETLOG_SITE_URL__", siteUrl),
      },
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["icons/*.png"],
        manifest: {
          name: "SetLog · 셋로그",
          short_name: "SetLog",
          description: "모든 세트가 성장의 기록이 된다.",
          lang: "ko",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#101311",
          theme_color: "#101311",
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "/icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
          navigateFallback: "index.html",
        },
      }),
    ],
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      include: ["tests/**/*.test.{ts,tsx}"],
      restoreMocks: true,
    },
  };
});
