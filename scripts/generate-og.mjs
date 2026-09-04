/**
 * Open Graph card generator.
 *
 * Design decision (2026-08-26): the site takes no new runtime dependency for
 * social cards. This script composes each card as an SVG using the warm-glass
 * tokens from src/styles/global.css and rasterises it with `sharp`, which is
 * already present as an Astro transitive dependency. The resulting PNGs are
 * committed under public/og/, so `astro build` never runs this script and never
 * depends on sharp being installed.
 *
 * Run it by hand after adding or renaming a page or an essay:
 *
 *   npm run og
 *
 * Then commit the regenerated files in public/og/.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { OG_CARDS } from "./og-cards.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "og");

const WIDTH = 1200;
const HEIGHT = 630;

// Tokens mirrored from src/styles/global.css.
const CANVAS = "#f7f1ea";
const CANVAS_SOFT = "#fbf7f2";
const INK = "#201b18";
const INK_SOFT = "#3f3733";
const ACCENT = "#a56f59";
const SAND = "#ead9cc";
const BLUSH = "#d9b7a5";
const STONE = "#a9a0ae";
const DEEP_STONE = "#655f72";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const escapeXml = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Greedy word wrap using an average glyph-width estimate. Serif display type at
 * these sizes averages a little over half the em, which is close enough for a
 * fixed-size card.
 */
const wrap = (text, maxWidth, fontSize, widthRatio = 0.52) => {
  const charBudget = Math.max(8, Math.floor(maxWidth / (fontSize * widthRatio)));
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > charBudget && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }

  if (line) lines.push(line);
  return lines;
};

const card = ({ eyebrow, title, subtitle, footer }) => {
  const margin = 88;
  const contentWidth = WIDTH - margin * 2;

  const titleSize = title.length > 58 ? 58 : title.length > 34 ? 70 : 88;
  const titleLines = wrap(title, contentWidth, titleSize).slice(0, 4);
  const subtitleLines = subtitle ? wrap(subtitle, contentWidth - 40, 27, 0.5).slice(0, 3) : [];

  let y = 232;
  const titleLeading = Math.round(titleSize * 1.1);
  const titleMarkup = titleLines
    .map((line) => {
      const node = `<text x="${margin}" y="${y}" font-family="${SERIF}" font-size="${titleSize}" fill="${INK}">${escapeXml(line)}</text>`;
      y += titleLeading;
      return node;
    })
    .join("\n      ");

  let subtitleY = y + 18;
  const subtitleMarkup = subtitleLines
    .map((line) => {
      const node = `<text x="${margin}" y="${subtitleY}" font-family="${SANS}" font-size="27" fill="${INK_SOFT}">${escapeXml(line)}</text>`;
      subtitleY += 40;
      return node;
    })
    .join("\n      ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
      <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${CANVAS_SOFT}"/>
        <stop offset="100%" stop-color="${CANVAS}"/>
      </linearGradient>
      <radialGradient id="blushGlow" cx="14%" cy="8%" r="62%">
        <stop offset="0%" stop-color="#efcbbe" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#efcbbe" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="stoneGlow" cx="88%" cy="22%" r="58%">
        <stop offset="0%" stop-color="#c8c1d3" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#c8c1d3" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="${ACCENT}" stop-opacity="0.85"/>
        <stop offset="100%" stop-color="${ACCENT}" stop-opacity="0"/>
      </linearGradient>
      <clipPath id="frame"><rect width="${WIDTH}" height="${HEIGHT}"/></clipPath>
    </defs>

    <g clip-path="url(#frame)">
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ground)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#blushGlow)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#stoneGlow)"/>

      <g opacity="0.9">
        <path d="M-60 560 C 220 470, 520 470, 760 528 C 940 572, 1120 560, 1260 512 L1260 700 L-60 700Z" fill="${SAND}"/>
        <path d="M-60 606 C 240 528, 560 528, 800 578 C 980 616, 1140 606, 1260 566 L1260 700 L-60 700Z" fill="${BLUSH}"/>
        <path d="M-60 650 C 260 592, 580 592, 830 634 C 1010 664, 1150 656, 1260 626 L1260 700 L-60 700Z" fill="${STONE}"/>
        <path d="M-60 686 C 280 646, 620 646, 880 678 C 1040 698, 1160 694, 1260 674 L1260 700 L-60 700Z" fill="${DEEP_STONE}"/>
      </g>

      <g opacity="0.34" stroke="${ACCENT}" stroke-width="1">
        <circle cx="1062" cy="140" r="112" fill="none" opacity="0.35"/>
        <circle cx="1062" cy="140" r="74" fill="none" opacity="0.28"/>
        <circle cx="1062" cy="140" r="36" fill="none" opacity="0.22"/>
        <line x1="950" y1="140" x2="1174" y2="140" opacity="0.2"/>
        <line x1="1062" y1="28" x2="1062" y2="252" opacity="0.2"/>
      </g>

      <rect x="${margin}" y="96" width="150" height="3" fill="url(#rule)"/>
      <text x="${margin}" y="146" font-family="${SANS}" font-size="24" letter-spacing="4.6" fill="${ACCENT}" font-weight="700">${escapeXml(eyebrow.toUpperCase())}</text>

      ${titleMarkup}
      ${subtitleMarkup}

      <text x="${margin}" y="${HEIGHT - 46}" font-family="${SANS}" font-size="25" font-weight="700" fill="${INK}">${escapeXml(footer)}</text>
    </g>
  </svg>`;
};

const run = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  for (const entry of OG_CARDS) {
    const svg = card({ ...entry, footer: entry.footer ?? "zhuochengzhang.com" });
    const target = path.join(OUT_DIR, `${entry.file}.png`);

    await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toFile(target);

    await writeFile(path.join(OUT_DIR, `${entry.file}.svg`), svg, "utf8");
    console.log(`og: wrote ${path.relative(ROOT, target)}`);
  }
};

await run();
