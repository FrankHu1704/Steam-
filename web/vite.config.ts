import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/apple-touch-icon.png"],
      manifest: {
        name: "PagaJá — Pagamentos para Moçambique",
        short_name: "PagaJá",
        description:
          "Aceite M-Pesa, e-Mola, mKesh, Visa/Mastercard e PayFast, com painel para gerir produtos, saques e vendas.",
        theme_color: "#0A1628",
        background_color: "#0A1628",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Firebase Auth / Functions calls and the public checkout page must
        // always hit the network, never be served from a stale SW cache.
        navigateFallbackDenylist: [/^\/pay\//],
        runtimeCaching: [],
      },
    }),
  ],
});
