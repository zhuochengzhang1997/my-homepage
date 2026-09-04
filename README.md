# zhuochengzhang.com

Personal academic homepage of Zhuocheng Zhang. Built with
[Astro](https://astro.build), deployed on Cloudflare Pages.

## Requirements

- Node.js `24.11.1` (see `.nvmrc`)
- npm `11.6.2`

## Commands

```bash
npm install      # install dependencies
npm run dev      # local dev server on http://127.0.0.1:4321
npm run check    # type and content-collection check
npm run build    # production build into dist/
npm run preview  # serve the production build locally
npm run og       # regenerate the Open Graph cards in public/og/
```

## Layout

```
src/
├── assets/      # images imported by components (optimized at build time)
├── components/  # Astro components
├── content/     # YAML and Markdown content collections
├── layouts/     # page shells
├── pages/       # routes
├── scripts/     # client-side TypeScript
└── styles/      # global CSS and Tailwind entry
public/          # copied verbatim into the build — fonts, OG cards, studio apps
scripts/         # build-time tooling (OG generation, photo import)
```

Content lives in `src/content/` as typed collections; the schemas are in
`src/content.config.ts`. Adding a publication, essay or photograph means adding
a file there — no component changes needed.

## Deployment

Cloudflare Pages builds `main` on every push:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | from `.nvmrc` (`24.11.1`) |

The sitemap is generated at build time from the live route list, so it stays
correct as pages are added.
