import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        game: new URL("index.html", import.meta.url).pathname,
        assets: new URL("assets.html", import.meta.url).pathname,
        admin: new URL("admin.html", import.meta.url).pathname,
      },
    },
  },
});
