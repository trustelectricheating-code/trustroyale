import { readFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

// `pnpm dev` only: serve /api/session, /api/spin and /api/lead from the real handlers against a throwaway
// in-memory PGlite database, so the game can be played locally without Vercel or Neon.
function localApi(): Plugin {
  return {
    name: "local-api",
    apply: "serve",
    configureServer(server) {
      process.env.SESSION_SECRET ||= "local-dev-session-secret-not-for-production";
      process.env.IP_HASH_SALT ||= "local-dev-ip-salt";
      process.env.DAILY_SESSIONS_PER_IP ||= "0";
      const ready = (async () => {
        const { PGlite } = await import("@electric-sql/pglite");
        const database = new PGlite();
        await database.exec(await readFile(new URL("db/migrations/001_init.sql", import.meta.url), "utf8"));
        const query = async (text: string, params: unknown[] = []) => (await database.query(text, params)).rows;
        const { createSessionHandler } = await server.ssrLoadModule("/api/session.ts");
        const { createSpinHandler } = await server.ssrLoadModule("/api/spin.ts");
        const { createLeadHandler } = await server.ssrLoadModule("/api/lead.ts");
        return { "/api/session": createSessionHandler({ query }), "/api/spin": createSpinHandler({ query }), "/api/lead": createLeadHandler({ query }) };
      })();
      server.middlewares.use(async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        const handler = (await ready)[url.pathname as "/api/session" | "/api/spin" | "/api/lead"];
        if (!handler) return next();
        // Phones on the LAN use plain http, where browsers drop Secure cookies.
        const setHeader = response.setHeader.bind(response);
        response.setHeader = (name, value) => setHeader(name, name.toLowerCase() === "set-cookie" ? String(value).replace("; Secure", "") : value);
        const chunks: Uint8Array[] = [];
        for await (const chunk of request) chunks.push(Uint8Array.from(chunk));
        const text = Buffer.concat(chunks).toString("utf8");
        let parsed: unknown;
        try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = undefined; }
        await handler(Object.assign(request, { query: Object.fromEntries(url.searchParams), body: parsed }), response);
      });
    },
  };
}

const productionHeaders = {
  "Content-Security-Policy": "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export default defineConfig({
  plugins: [localApi()],
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
