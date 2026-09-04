import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { unified } from "@astrojs/markdown-remark";
import tailwindcss from "@tailwindcss/vite";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

export default defineConfig({
  site: "https://zhuochengzhang.com",

  // Windows browsers often resolve localhost to 127.0.0.1 (IPv4). Vite's
  // default bind is [::1] only, which makes Chrome hang on that address.
  server: {
    host: "127.0.0.1",
    port: 4321,
  },

  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
  },

  // The 2026-08-26 information architecture folded About into the homepage and
  // Experience into the Research page, and renamed Writing to Essays. GitHub
  // Pages cannot issue a real 301, so Astro emits a meta-refresh stub with a
  // canonical link for each of these — the same pattern as the older /posts/
  // redirect pages.
  // Trailing-slash form only: Astro normalises `/about` and `/about/` to the
  // same route, and declaring both collides.
  redirects: {
    "/about/": "/",
    "/experience/": "/research/",
    "/writing/": "/essays/",
    "/projects/": "/studio/",
  },

  // The sitemap is generated from the real route list at build time. The
  // hand-written `public/sitemap-*.xml` it replaces had gone stale — five URLs
  // on the old github.io host, against sixteen live pages.
  // Excluded: the meta-refresh redirect stubs declared above (they are not
  // destinations), and the `/app/` shells inside `/studio/`, which are the
  // embedded interactive programs rather than pages to land on.
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !/\/(about|experience|writing|projects|post|posts)\//.test(page) &&
        !page.includes("/app/"),
    }),
  ],

  // Local-dev inspector only — not site chrome. Off so first-screen
  // optical alignment is not judged against a floating bar.
  devToolbar: { enabled: false },

  vite: {
    plugins: [tailwindcss()],
  },
});
