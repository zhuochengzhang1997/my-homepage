/**
 * The manifest of Open Graph cards.
 *
 * Single source of truth, shared by two consumers:
 *   - scripts/generate-og.mjs renders each entry to public/og/<file>.png
 *   - src/pages/writing/[slug].astro checks whether a per-essay card exists
 *
 * Adding an essay: add an entry here, run `npm run og`, commit the PNG.
 */
export const OG_CARDS = [
  {
    file: "default",
    eyebrow: "Semiconductors × AI agents",
    title: "Zhuocheng Zhang",
    subtitle:
      "Building systems to shorten semiconductor engineering cycles without weakening engineering judgment.",
  },
  {
    file: "research",
    eyebrow: "Research",
    title: "Agentic workflows for semiconductor engineering",
    subtitle:
      "The tools, physical constraints, and evidence trails engineers need to verify an agent's work.",
  },
  {
    file: "essays",
    eyebrow: "Essays",
    title: "Analysis of AI and engineering workflows",
    subtitle: "The systems required to make AI useful, verifiable, and governable.",
  },
  {
    file: "publications",
    eyebrow: "Publications",
    title: "Device physics, fabrication, and reliability",
    subtitle:
      "Peer-reviewed work on oxide-semiconductor devices, reliability, and characterization.",
  },
  {
    file: "essay-the-workflow-layer",
    eyebrow: "Industry analysis",
    title: "The Workflow Layer: Where AI Can Change Semiconductor Engineering",
    subtitle:
      "The bottleneck is not generating more engineering output. It is shortening the path from new evidence to a decision engineers can trust.",
  },
];

/** File stems that generate-og.mjs has been told to produce. */
export const OG_CARD_FILES = OG_CARDS.map((card) => card.file);
