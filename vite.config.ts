// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Load all (non VITE_-prefixed) env vars into process.env so server routes
// (e.g. the email webhook) can read SUPABASE_SERVICE_ROLE_KEY and LOVABLE_API_KEY.
// These are NOT exposed to the client bundle.
const serverEnv = loadEnv(process.env.NODE_ENV ?? "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

const entitiesDir = path.resolve(process.cwd(), "node_modules/entities");

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        // Pin every entities import to the hoisted v4.5.0 copy. Nested v6/v7
        // copies (via cheerio/parse5) removed ./lib/decode.js and break the
        // React Email renderer during SSR.
        "entities/lib/decode.js": path.join(entitiesDir, "lib/decode.js"),
        "entities/lib/encode.js": path.join(entitiesDir, "lib/encode.js"),
        entities: entitiesDir,
      },
    },
  },
});
