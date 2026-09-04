#!/usr/bin/env node
/**
 * export-tech-ontology.mjs — build the Studio exhibit's data file.
 *
 * Reads the Tech Ontology JSON-LD read-only and writes the slice that ships
 * with the exhibit:
 *
 *   public/studio/tech-ontology/app/data/ontology.json
 *
 * The exhibit is a concept demo, not the whole graph. It carries two subtrees
 * and nothing else:
 *
 *   concept:chip                           what gets built, by category
 *   activity:hardware-engineering-process   how it gets built, step by step
 *
 * Each root keeps every descendant reachable through `parent`, and is then
 * re-rooted: its own `parent` is stripped so the two trees stand side by side
 * as the top level of the viewer. No ancestors, no one-hop neighbours, no
 * Specification, equipment or material nodes come along. An edge survives only
 * when both of its endpoints are inside the slice; qualifier objects on an
 * edge member are preserved intact.
 *
 * The published slice is English-only and carries no maintainer metadata:
 * every `zh` label, every field whose text is not English, and the contributor
 * and licence fields are removed on the way out. A small override table
 * rewrites labels that would read as bare acronyms to a stranger; the source
 * file is never modified.
 *
 * Usage (from the site root):
 *   node scripts/studio/export-tech-ontology.mjs <path/to/ontology-<version>.jsonld>
 *
 * With no argument the script looks for the source next to the site checkout;
 * the source lives outside this repository and its location is never
 * hard-coded here.
 *
 * The roots are configurable: pass --roots=id1,id2 to slice somewhere else.
 */

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const OUT_FILE = path.join(ROOT, "public", "studio", "tech-ontology", "app", "data", "ontology.json");

/** The subtrees the exhibit shows. Override with --roots=a,b. */
const DEFAULT_ROOTS = ["concept:chip", "activity:hardware-engineering-process"];

/** Types the viewer never builds elements for. */
const UNRENDERED_TYPES = new Set(["Metric", "Measurement", "Specification"]);

// CJK unified ideographs, CJK symbols and kana, halfwidth/fullwidth forms.
// Written as code points so this file itself stays plain ASCII.
const CJK_RANGES = [
  [0x4e00, 0x9fff],
  [0x3000, 0x30ff],
  [0xff00, 0xffef],
];

function hasCJK(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    for (const [lo, hi] of CJK_RANGES) if (code >= lo && code <= hi) return true;
  }
  return false;
}

// Fields that only serve the source project's maintenance workflow.
//
// `quote` and `rationale` are long verbatim excerpts from third-party filings
// and vendor pages, kept in the source as sourcing evidence. The viewer shows
// only the number of references, never their contents, so the excerpts would
// ship as unread bulk; the citation itself (title, publisher, url) stays.
const DROP_NODE_FIELDS = new Set(["contributors", "quote", "rationale"]);
const DROP_META_FIELDS = new Set([
  "license",
  "contributors",
  "extension_hooks",
  "changelog_ref",
  // Describes a level-0 module hierarchy the re-rooted slice no longer has.
  "level_definitions",
]);

/**
 * Labels rewritten for a reader who does not work in the industry.
 *
 * The rule: no node may be named by an acronym alone. An acronym is fine when
 * the words are there too, in either order. Applied here rather than in the
 * source, which is read-only, and printed at the end of every run so the list
 * stays auditable.
 */
const LABEL_OVERRIDES = {
  "activity:cmp": "Chemical Mechanical Polishing (CMP)",
  // x86, Arm and RISC-V are the names of instruction sets, so they stay; the
  // trailing CPU is the part that would leave a stranger stacking acronyms.
  "concept:arm-cpu": "Arm Processor",
  "concept:risc-v-cpu": "RISC-V Processor",
  "concept:x86-cpu": "x86 Processor",
  "activity:mask-making": "Photomask Making",
  "activity:rtl-design": "RTL Design (Register-Transfer Level)",
  "concept:2d-nand": "2D (Planar) NAND",
  "concept:3d-nand": "3D (Stacked) NAND",
  "concept:data-converter": "Data Converter (Analog-to-Digital / Digital-to-Analog)",
  "concept:emmc-controller": "eMMC (Embedded MultiMediaCard) Controller",
  "concept:gan-hemt": "Gallium Nitride HEMT (High-Electron-Mobility Transistor)",
  "concept:hbm3": "High Bandwidth Memory 3 (HBM3)",
  "concept:hbm3e": "High Bandwidth Memory 3E (HBM3e)",
  "concept:hbm4": "High Bandwidth Memory 4 (HBM4)",
  "concept:hdd-controller": "Hard Disk Drive (HDD) Controller",
  "concept:inp-photonic-ic": "Indium Phosphide Photonic Integrated Circuit (InP PIC)",
  "concept:interconnect-ic": "Interconnect Chip",
  "concept:mems": "MEMS Sensor (Micro-Electro-Mechanical System)",
  "concept:optical-dsp": "Optical DSP (Digital Signal Processor)",
  "concept:pa-gaas-hbt": "Gallium Arsenide HBT (Heterojunction Bipolar Transistor) Power Amplifier",
  "concept:pa-gan-hemt": "Gallium Nitride HEMT (High-Electron-Mobility Transistor) Power Amplifier",
  "concept:photonic-ic": "Photonic Integrated Circuit (PIC)",
  "concept:power-mosfet": "Power MOSFET (Metal-Oxide-Semiconductor Field-Effect Transistor)",
  "concept:rf-filter": "Radio-Frequency Filter",
  "concept:rf-front-end": "Radio-Frequency Front-End",
  "concept:rf-switch": "Radio-Frequency Switch",
  "concept:rf-transceiver": "Radio-Frequency Transceiver",
  "concept:sic-mosfet": "Silicon Carbide (SiC) Power MOSFET",
  "concept:silicon-photonic-ic": "Silicon Photonic Integrated Circuit (SiPh)",
  "concept:ssd-controller": "Solid-State Drive (SSD) Controller",
  "concept:tfln-photonic-ic": "Thin-Film Lithium Niobate (TFLN) Photonic Integrated Circuit",
  "concept:ufs-controller": "UFS (Universal Flash Storage) Controller",
};

// ---------------------------------------------------------------------------
// input
// ---------------------------------------------------------------------------

function resolveInput() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  if (positional[0]) return path.resolve(positional[0]);

  const fromEnv = process.env.TECH_ONTOLOGY_SCHEMA;
  if (fromEnv) return path.resolve(fromEnv);

  const candidates = [path.join(ROOT, "schema"), path.join(ROOT, "..", "tech-ontology", "schema")];
  for (const dir of candidates) {
    const file = newestSchemaIn(dir);
    if (file) return file;
  }

  fail(
    "No source ontology found.\n" +
      "  Usage: node scripts/studio/export-tech-ontology.mjs <path/to/ontology-<version>.jsonld>\n" +
      "  (or set TECH_ONTOLOGY_SCHEMA to that path)",
  );
  return "";
}

/** The highest-numbered ontology file in `dir`, or null if there is none. */
function newestSchemaIn(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return null;
  }
  const matches = names.filter((name) => /^ontology-v.+\.jsonld$/.test(name)).sort();
  return matches.length > 0 ? path.join(dir, matches[matches.length - 1]) : null;
}

function resolveRoots() {
  const flag = process.argv.slice(2).find((a) => a.startsWith("--roots="));
  if (!flag) return DEFAULT_ROOTS.slice();
  const ids = flag
    .slice("--roots=".length)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) fail("--roots= was given but listed no node ids");
  return ids;
}

function fail(message) {
  console.error("export-tech-ontology: " + message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// scrubbing
// ---------------------------------------------------------------------------

/** Strip every non-English string from a value, recursively. */
function scrub(value) {
  if (typeof value === "string") return hasCJK(value) ? undefined : value;
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      const cleaned = scrub(item);
      if (cleaned !== undefined) out.push(cleaned);
    }
    return out;
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, raw] of Object.entries(value)) {
      if (DROP_NODE_FIELDS.has(key)) continue;
      if (key === "zh") continue;
      const cleaned = scrub(raw);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

/** A { en, zh } language map reduced to { en }. */
function englishOnly(field) {
  if (!field || typeof field !== "object") return field;
  const out = {};
  if (typeof field.en === "string") out.en = field.en;
  return out;
}

// ---------------------------------------------------------------------------
// graph walking
// ---------------------------------------------------------------------------

const parentOf = (node) => {
  const p = Array.isArray(node.parent) ? node.parent[0] : node.parent;
  return typeof p === "string" ? p : null;
};

const edgeTarget = (member) =>
  member !== null && typeof member === "object" ? member.target : member;

function main() {
  const inputPath = resolveInput();
  const roots = resolveRoots();
  let stats;
  try {
    stats = statSync(inputPath);
  } catch {
    fail(`cannot read ${inputPath}`);
  }

  const source = JSON.parse(readFileSync(inputPath, "utf8"));
  const graph = Array.isArray(source["@graph"]) ? source["@graph"] : [];
  const metaNodes = graph.filter((n) => n["@type"] === "OntologyMeta");
  if (metaNodes.length !== 1) fail(`expected exactly one OntologyMeta node, found ${metaNodes.length}`);
  const meta = metaNodes[0];

  const allEdgeTypes = meta.edge_types.slice();
  const byId = new Map(graph.map((n) => [n["@id"], n]));

  for (const id of roots) if (!byId.has(id)) fail(`root ${id} is not present in the source graph`);

  // --- 1. the two subtrees --------------------------------------------------
  const ancestryCache = new Map();
  function ancestors(id) {
    if (ancestryCache.has(id)) return ancestryCache.get(id);
    const chain = [];
    let cur = byId.get(id);
    let guard = 32;
    while (cur && guard-- > 0) {
      const pid = parentOf(cur);
      if (!pid || !byId.has(pid)) break;
      chain.push(pid);
      cur = byId.get(pid);
    }
    ancestryCache.set(id, chain);
    return chain;
  }

  const rootSet = new Set(roots);
  const included = new Set();
  const subtreeOf = new Map(); // node id -> which root it belongs to
  for (const node of graph) {
    const id = node["@id"];
    if (rootSet.has(id)) {
      included.add(id);
      subtreeOf.set(id, id);
      continue;
    }
    const owner = ancestors(id).find((a) => rootSet.has(a));
    if (owner) {
      included.add(id);
      subtreeOf.set(id, owner);
    }
  }

  // --- 2. build the output graph -------------------------------------------
  const outNodes = [];
  const relabelled = [];
  let droppedEdges = 0;
  const edgeCounts = Object.fromEntries(allEdgeTypes.map((e) => [e, 0]));
  const droppedByType = Object.fromEntries(allEdgeTypes.map((e) => [e, 0]));

  for (const node of graph) {
    const id = node["@id"];
    if (!included.has(id)) continue;

    const out = scrub(node);
    if (node.label) out.label = englishOnly(node.label);
    if (node.description) out.description = englishOnly(node.description);

    if (LABEL_OVERRIDES[id] && out.label?.en !== LABEL_OVERRIDES[id]) {
      relabelled.push({ id, from: out.label?.en ?? "", to: LABEL_OVERRIDES[id] });
      out.label = { en: LABEL_OVERRIDES[id] };
    }

    // Re-root: a root of the slice has no parent inside it.
    if (rootSet.has(id)) delete out.parent;

    for (const etype of allEdgeTypes) {
      const members = node[etype];
      if (!Array.isArray(members)) continue;
      const kept = [];
      for (const member of members) {
        const target = edgeTarget(member);
        if (!included.has(target)) {
          droppedEdges += 1;
          droppedByType[etype] += 1;
          continue;
        }
        kept.push(typeof member === "object" && member !== null ? scrub(member) : member);
        edgeCounts[etype] += 1;
      }
      if (kept.length > 0) out[etype] = kept;
      else delete out[etype];
    }

    outNodes.push(out);
  }

  // Only edge types that actually occur ship, so the legend lists nothing dead.
  const survivingEdgeTypes = allEdgeTypes.filter((e) => edgeCounts[e] > 0);

  // --- 3. OntologyMeta ------------------------------------------------------
  const outMeta = {};
  for (const [key, value] of Object.entries(meta)) {
    if (DROP_META_FIELDS.has(key)) continue;
    outMeta[key] = value;
  }
  outMeta.name = englishOnly(meta.name);

  const labelOf = (id) => outNodes.find((n) => n["@id"] === id)?.label ?? { en: id };
  // Concept roots drive the module palette; every other plane is a stratum root.
  outMeta.top_modules = roots
    .filter((id) => byId.get(id)["@type"] === "Concept")
    .map((id) => ({ id, label: labelOf(id) }));
  outMeta.stratum_roots = roots
    .filter((id) => byId.get(id)["@type"] !== "Concept")
    .map((id) => ({ id, label: labelOf(id), stratum: byId.get(id)["@type"] }));

  outMeta.edge_types = survivingEdgeTypes;
  outMeta.edge_type_definitions = Object.fromEntries(
    survivingEdgeTypes.map((etype) => {
      const def = meta.edge_type_definitions[etype];
      return [etype, { label: englishOnly(def.label), symmetric: def.symmetric }];
    }),
  );
  const scrubbedMeta = scrub(outMeta);

  const outContext = {};
  for (const [key, value] of Object.entries(source["@context"] ?? {})) {
    if (DROP_NODE_FIELDS.has(key)) continue;
    outContext[key] = value;
  }

  const output = { "@context": outContext, "@graph": [scrubbedMeta, ...outNodes] };

  // --- 4. invariants --------------------------------------------------------
  const problems = [];
  const outById = new Map(output["@graph"].map((n) => [n["@id"], n]));

  const metaCount = output["@graph"].filter((n) => n["@type"] === "OntologyMeta").length;
  if (metaCount !== 1) problems.push(`expected exactly one OntologyMeta node, got ${metaCount}`);

  let parentless = 0;
  for (const node of outNodes) {
    const pid = parentOf(node);
    if (!pid) parentless += 1;
    else if (!outById.has(pid)) problems.push(`dangling parent: ${node["@id"]} -> ${pid}`);

    for (const etype of allEdgeTypes) {
      const members = node[etype];
      if (!Array.isArray(members)) continue;
      for (const member of members) {
        const target = edgeTarget(member);
        if (!outById.has(target)) problems.push(`dangling ${etype}: ${node["@id"]} -> ${target}`);
      }
    }

    if (typeof node.label?.en !== "string") problems.push(`missing label.en: ${node["@id"]}`);
    if (UNRENDERED_TYPES.has(node["@type"])) {
      problems.push(`${node["@id"]} has type ${node["@type"]}, which the viewer does not render`);
    }
  }

  if (parentless !== roots.length) {
    problems.push(`expected ${roots.length} parentless roots, got ${parentless}`);
  }
  for (const id of roots) {
    if (!outById.has(id)) problems.push(`root missing from output: ${id}`);
    else if (outById.get(id).parent !== undefined) problems.push(`root not re-rooted: ${id}`);
  }
  const declaredRoots = [
    ...scrubbedMeta.top_modules.map((m) => m.id),
    ...scrubbedMeta.stratum_roots.map((r) => r.id),
  ];
  if (declaredRoots.length !== roots.length || declaredRoots.some((id) => !rootSet.has(id))) {
    problems.push(
      `OntologyMeta roots ${JSON.stringify(declaredRoots)} do not match ${JSON.stringify(roots)}`,
    );
  }

  const serialised = JSON.stringify(output, null, 1);
  if (hasCJK(serialised)) problems.push("output still contains non-English text");
  if (/"contributors"/.test(serialised)) problems.push("output still contains a contributors field");

  if (problems.length > 0) {
    console.error("export-tech-ontology: invariant check failed");
    for (const p of problems.slice(0, 25)) console.error("  - " + p);
    if (problems.length > 25) console.error(`  ... and ${problems.length - 25} more`);
    process.exit(1);
  }

  mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, serialised + "\n", "utf8");

  // --- 5. report ------------------------------------------------------------
  const nodesByType = {};
  for (const node of outNodes) nodesByType[node["@type"]] = (nodesByType[node["@type"]] ?? 0) + 1;

  console.log(`source   ${inputPath}`);
  console.log(`         ${graph.length} nodes, ${fmtBytes(stats.size)}`);
  console.log(`roots    ${roots.join(", ")}`);
  console.log("");
  console.log("subtree sizes");
  for (const id of roots) {
    const n = [...subtreeOf.values()].filter((owner) => owner === id).length;
    console.log(`  ${id.padEnd(38)} ${String(n).padStart(4)} nodes`);
  }
  console.log("");
  console.log("nodes by @type");
  for (const type of Object.keys(nodesByType).sort()) {
    console.log(`  ${type.padEnd(15)} ${String(nodesByType[type]).padStart(4)}`);
  }
  console.log(`  ${"OntologyMeta".padEnd(15)} ${String(1).padStart(4)}`);
  console.log(`  ${"total".padEnd(15)} ${String(outNodes.length + 1).padStart(4)}`);
  console.log("");
  console.log("edges by type");
  let totalEdges = 0;
  for (const etype of allEdgeTypes) {
    totalEdges += edgeCounts[etype];
    const mark = edgeCounts[etype] > 0 ? "kept   " : "gone   ";
    const note = droppedByType[etype] > 0 ? `  (${droppedByType[etype]} left the slice)` : "";
    console.log(`  ${etype.padEnd(17)} ${String(edgeCounts[etype]).padStart(4)}  ${mark}${note}`);
  }
  console.log(`  ${"total".padEnd(17)} ${String(totalEdges).padStart(4)}`);
  console.log(`  surviving types: ${survivingEdgeTypes.join(", ")}`);
  console.log("");
  console.log(`edges dropped (endpoint outside the slice)  ${droppedEdges}`);
  console.log("");
  console.log(`labels rewritten for a general reader: ${relabelled.length}`);
  for (const r of relabelled) console.log(`  ${r.id.padEnd(38)} ${r.from}  ->  ${r.to}`);
  console.log("");
  console.log(
    `wrote ${path.relative(ROOT, OUT_FILE).split(path.sep).join("/")}  ` +
      `${fmtBytes(Buffer.byteLength(serialised) + 1)}`,
  );
}

function fmtBytes(n) {
  return n >= 1024 * 1024 ? (n / 1024 / 1024).toFixed(2) + " MB" : (n / 1024).toFixed(1) + " KB";
}

main();
