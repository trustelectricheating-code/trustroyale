import { defineConfig } from "vite";

const productionHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default defineConfig({
  server: { headers: productionHeaders },
  preview: { headers: productionHeaders },
  build: {
    assetsDir: "build",
    rollupOptions: {
      input: {
        game: new URL("index.html", import.meta.url).pathname,
        assets: new URL("assets.html", import.meta.url).pathname,
        admin: new URL("admin.html", import.meta.url).pathname,
      },
    },
  },
});
