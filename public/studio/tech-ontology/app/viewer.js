"use strict";

// =======================================================================
// =======================================================================
const SCHEMA_URL = "./data/ontology.json";

// Readers who ask their system for less motion get none: expand / collapse and
// the re-layouts that follow jump straight to their final positions instead of
// animating. Matches the reduced-motion block in styles.css.
const ANIMATE = !(
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches
);

// Label legibility. Cytoscape paints a label at font-size x zoom CSS pixels, so
// a fit that zooms well out is what makes small type look soft rather than the
// renderer. Type is sized by depth, and after the opening fit the zoom is
// floored so that even the smallest step still lands at MIN_RENDERED_LABEL_PX.
const LABEL_FONT_BY_LEVEL = [20, 19, 17, 15, 14, 13];
const SMALLEST_LABEL_PX = Math.min.apply(null, LABEL_FONT_BY_LEVEL);
const MIN_RENDERED_LABEL_PX = 12;

// =======================================================================
// =======================================================================
// This snapshot ships two subtrees: the chip taxonomy on the Concept plane and
// the hardware engineering process on the Activity plane. Amber reads as the
// physical artefact, neutral stone as the process that makes it. Palette
// entries for planes that are out of scope here are not carried over; the
// consistency check below tolerates a data file that declares fewer roots than
// the palette knows, so a narrower slice never warns.
const MODULE_COLORS = {
  "concept:chip":  "#fef3c7"   // Tailwind amber-100 (physical / industrial)
};
const MODULE_STROKE = {
  "concept:chip":  "#d97706"   // Tailwind amber-600
};
const STRATUM_ROOT_COLORS = {
  "activity:hardware-engineering-process": "#f5f5f4"   // Tailwind stone-100
};
const STRATUM_ROOT_STROKE = {
  "activity:hardware-engineering-process": "#57534e"   // Tailwind stone-600
};
const FALLBACK_FILL   = "#e7e5e4";
const FALLBACK_STROKE = "#78716c";   // Tailwind stone-500

const SPEC_FILL   = "#cffafe";   // Tailwind cyan-100
const SPEC_STROKE = "#0e7490";   // Tailwind cyan-700

const EDGE_STYLES = {
  // ---- mereology (blue family) ----
  composes:        { color: "#2563eb", dash: null,    symmetric: false, flip: false },
  subprocess_of:   { color: "#60a5fa", dash: [6, 3],  symmetric: false, flip: false },
  // ---- dependency (amber-yellow family) ----
  depends_on:      { color: "#d97706", dash: null,    symmetric: false, flip: true  },
  uses_tool:       { color: "#f59e0b", dash: [4, 2],  symmetric: false, flip: false },
  consumes_input:  { color: "#ca8a04", dash: [8, 2],  symmetric: false, flip: false },
  // ---- lifecycle (emerald-green family) ----
  produces:        { color: "#059669", dash: null,    symmetric: false, flip: false },
  implements:      { color: "#15803d", dash: [6, 3],  symmetric: false, flip: false },
  constrains:      { color: "#dc2626", dash: null,    symmetric: false, flip: false },  // red-600
  // ---- evolution (fuchsia-pink-purple-violet family) ----
  co_evolves_with: { color: "#c026d3", dash: [3, 3],  symmetric: true,  flip: false },
  alternative_to:  { color: "#ec4899", dash: [2, 4],  symmetric: true,  flip: false },
  succeeds:        { color: "#9333ea", dash: [10, 4], symmetric: false, flip: true  },
  precedes:        { color: "#8b5cf6", dash: null,    symmetric: false, flip: false }
};

// =======================================================================
// =======================================================================
const VOCAB_KEY = {
  governance: {
    "single-vendor": "vocab.governance.singleVendor",
    "vendor-pair":   "vocab.governance.vendorPair",
    "consortium":    "vocab.governance.consortium",
    "sdo":           "vocab.governance.sdo",
    "foundation":    "vocab.governance.foundation",
    "multi-body":    "vocab.governance.multiBody"
  },
  openness: {
    "royalty-free": "vocab.openness.royaltyFree",
    "licensed":     "vocab.openness.licensed",
    "proprietary":  "vocab.openness.proprietary"
  },
  stewardship: {
    "hosted":           "vocab.stewardship.hosted",
    "vendor-stewarded": "vocab.stewardship.vendorStewarded"
  }
};
function vocabLabel(kind, value) {
  const key = VOCAB_KEY[kind] && VOCAB_KEY[kind][value];
  return key ? t(key) : "";
}

// =======================================================================
//
// =======================================================================

function edgeStyleProp(field, fallback) {
  return (ele) => {
    const s = EDGE_STYLES[ele.data("etype")];
    const v = s ? s[field] : undefined;
    return (v === undefined || v === null) ? fallback : v;
  };
}

const edgeStyleLineStyle = (ele) => (EDGE_STYLES[ele.data("etype")]?.dash ? "dashed" : "solid");

const edgeStyleTargetArrow = (ele) => (EDGE_STYLES[ele.data("etype")]?.symmetric ? "none" : "triangle");

const parallelEdgeControlPoint = (ele) => {
  const parallels = ele.parallelEdges()
    .filter(e => !e.hasClass("edge-aggregated-hidden") && !e.hasClass("filter-hidden"));
  if (parallels.length <= 1) return 30;
  const sorted = parallels.toArray().sort((a, b) => a.id().localeCompare(b.id()));
  const idx = sorted.findIndex(e => e.id() === ele.id());
  const sign = idx % 2 === 0 ? 1 : -1;
  const magnitude = 30 + 30 * Math.floor(idx / 2);
  return sign * magnitude;
};

function edgeStyleSvg(et) {
  const style = EDGE_STYLES[et];
  if (!style) return "";
  const dashAttr = style.dash ? ` stroke-dasharray="${style.dash.join(',')}"` : "";
  const lineX2 = style.symmetric ? "24" : "19";
  const arrow = style.symmetric ? "" :
    `<polygon points="19,1 23,4 19,7" fill="${style.color}" />`;
  return `<svg class="tb-edge-svg" viewBox="0 0 24 8" aria-hidden="true">`
    + `<line x1="0" y1="4" x2="${lineX2}" y2="4" stroke="${style.color}" stroke-width="1.8"${dashAttr}/>`
    + arrow
    + `</svg>`;
}

// =======================================================================
// =======================================================================
let MODULE_LABEL_MAP = {};
let MODULE_SHORT_MAP = {};
let STRATUM_ROOT_LABEL_MAP = {};
let STRATUM_ROOT_SHORT_MAP = {};
let EDGE_TYPE_LABEL_MAP = {};
let EDGE_TYPES = [];
// The roots of the slice, in declaration order: what the graph opens on.
let ROOT_IDS = [];

function initFromSchemaMeta(meta) {
  if (!meta) throw new Error("initFromSchemaMeta: OntologyMeta is null/undefined");

  if (!Array.isArray(meta.top_modules)) {
    throw new Error("OntologyMeta.top_modules missing or invalid (expected array, ADR-0029 D1)");
  }
  if (!Array.isArray(meta.stratum_roots)) {
    throw new Error("OntologyMeta.stratum_roots missing or invalid (expected array, ADR-0029 D1)");
  }
  if (!Array.isArray(meta.edge_types)) {
    throw new Error("OntologyMeta.edge_types missing or invalid (expected array)");
  }
  if (!meta.edge_type_definitions || typeof meta.edge_type_definitions !== "object") {
    throw new Error("OntologyMeta.edge_type_definitions missing or invalid (expected object, ADR-0029 D1)");
  }

  // Derived lookup tables.
  // fullLabel joins the primary label with the alternate one; this snapshot
  // carries a single language, so the separator is omitted when there is
  // nothing on the other side of it.
  const fullLabel = (field, fallback) => {
    const primary = I18N.pick(field, fallback);
    const other = I18N.pickOther(field);
    return other ? `${primary} · ${other}` : primary;
  };

  MODULE_LABEL_MAP = Object.fromEntries(
    meta.top_modules.map(m => [m.id, fullLabel(m.label, m.id)])
  );
  MODULE_SHORT_MAP = Object.fromEntries(
    meta.top_modules.map(m => [m.id, I18N.pick(m.label, m.id)])
  );
  STRATUM_ROOT_LABEL_MAP = Object.fromEntries(
    meta.stratum_roots.map(r => [r.id, fullLabel(r.label, r.id)])
  );
  STRATUM_ROOT_SHORT_MAP = Object.fromEntries(
    meta.stratum_roots.map(r => [r.id, I18N.pick(r.label, r.id)])
  );
  EDGE_TYPE_LABEL_MAP = Object.fromEntries(
    Object.entries(meta.edge_type_definitions).map(([etype, def]) => [etype, fullLabel(def.label, etype)])
  );
  EDGE_TYPES = meta.edge_types.slice();
  ROOT_IDS = [...meta.top_modules.map(m => m.id), ...meta.stratum_roots.map(r => r.id)];

  // The data file is a slice, so it legitimately declares fewer roots and edge
  // types than the viewer has paint for. What must never happen is the reverse:
  // something in the data that the viewer cannot colour or draw. So the check
  // is containment, not equality.
  const missing = (declared, known) => declared.filter(id => !known.has(id));

  const unpaintedModules = missing(meta.top_modules.map(m => m.id), new Set(Object.keys(MODULE_COLORS)));
  if (unpaintedModules.length > 0) {
    console.warn("data declares Concept roots the viewer has no palette for",
      { missing: unpaintedModules, known: Object.keys(MODULE_COLORS) });
  }
  const unpaintedRoots = missing(meta.stratum_roots.map(r => r.id), new Set(Object.keys(STRATUM_ROOT_COLORS)));
  if (unpaintedRoots.length > 0) {
    console.warn("data declares stratum roots the viewer has no palette for",
      { missing: unpaintedRoots, known: Object.keys(STRATUM_ROOT_COLORS) });
  }
  const unstyledEdges = missing(meta.edge_types, new Set(Object.keys(EDGE_STYLES)));
  if (unstyledEdges.length > 0) {
    console.warn("data declares edge types the viewer has no style for",
      { missing: unstyledEdges, known: Object.keys(EDGE_STYLES) });
  }
}

// =======================================================================
// =======================================================================
//
let STATE = {
  // Edge type is the only filter the exhibit offers; the legend is its control.
  filter: {
    edges: new Set()
  },
  schemaById: null,
  schemaEdges: null,
  currentSidebarNodeId: null,

  pin:   { nodeId: null },
  focus: { nodeId: null, neighborIds: new Set() }
};

const Actions = {
  FILTER_EDGES_INIT_FROM_TYPES: 'FILTER_EDGES_INIT_FROM_TYPES',     // payload: { edgeTypes: string[] }
  FILTER_EDGE_TYPE_TOGGLE:      'FILTER_EDGE_TYPE_TOGGLE',          // payload: { value, on }
  // schema load
  SCHEMA_BY_ID_SET:             'SCHEMA_BY_ID_SET',                 // payload: { byId: Map }
  SCHEMA_EDGES_SET:             'SCHEMA_EDGES_SET',                 // payload: { edges: Array }
  // pin
  PIN_SET:                      'PIN_SET',                          // payload: { nodeId }
  PIN_CLEAR:                    'PIN_CLEAR',
  // focus
  FOCUS_SET:                    'FOCUS_SET',                        // payload: { nodeId, neighborIds: Set }
  FOCUS_CLEAR:                  'FOCUS_CLEAR',
  // sidebar
  SIDEBAR_NODE_SET:             'SIDEBAR_NODE_SET',                 // payload: { nodeId }
  SIDEBAR_NODE_CLEAR:           'SIDEBAR_NODE_CLEAR'
};

function reducer(state, action) {
  switch (action.type) {
    // ---- filter init ----
    case Actions.FILTER_EDGES_INIT_FROM_TYPES: {
      const edges = new Set(action.edgeTypes);
      return { ...state, filter: { ...state.filter, edges } };
    }
    case Actions.FILTER_EDGE_TYPE_TOGGLE: {
      const edges = new Set(state.filter.edges);
      if (action.on) edges.add(action.value); else edges.delete(action.value);
      return { ...state, filter: { ...state.filter, edges } };
    }
    // ---- schema load ----
    case Actions.SCHEMA_BY_ID_SET: {
      return { ...state, schemaById: action.byId };
    }
    case Actions.SCHEMA_EDGES_SET: {
      return { ...state, schemaEdges: action.edges };
    }
    // ---- pin ----
    case Actions.PIN_SET: {
      return { ...state, pin: { nodeId: action.nodeId } };
    }
    case Actions.PIN_CLEAR: {
      return { ...state, pin: { nodeId: null } };
    }
    // ---- focus ----
    case Actions.FOCUS_SET: {
      return { ...state, focus: { nodeId: action.nodeId, neighborIds: new Set(action.neighborIds) } };
    }
    case Actions.FOCUS_CLEAR: {
      return { ...state, focus: { nodeId: null, neighborIds: new Set() } };
    }
    // ---- sidebar ----
    case Actions.SIDEBAR_NODE_SET: {
      return { ...state, currentSidebarNodeId: action.nodeId };
    }
    case Actions.SIDEBAR_NODE_CLEAR: {
      return { ...state, currentSidebarNodeId: null };
    }
    default:
      console.warn('[reducer] Unknown action type:', action && action.type);
      return state;
  }
}

function dispatch(action) {
  STATE = reducer(STATE, action);
}

// =======================================================================
// =======================================================================
window.addEventListener("DOMContentLoaded", () => {
  I18N.applyI18n();
  loadAndRender().catch(err => {
    console.error(err);
    showStatus(t("status.loadRenderFailed") + " " + err.message, "error");
  });
});

let _statusFadeTimer = null;
function showStatus(msg, level) {
  const el = document.getElementById("status");
  if (_statusFadeTimer) { clearTimeout(_statusFadeTimer); _statusFadeTimer = null; }
  const lv = level || "info";
  el.className = lv;
  el.textContent = msg;
  if (lv === "info") {
    _statusFadeTimer = setTimeout(() => {
      el.classList.add("fading");
      setTimeout(() => {
        if (el.classList.contains("fading")) el.className = "";
      }, 700);
    }, 5000);
  }
}

// =======================================================================
// =======================================================================
async function loadAndRender() {
  const resp = await fetch(SCHEMA_URL);
  if (!resp.ok) throw new Error("HTTP " + resp.status + " on " + SCHEMA_URL);
  const raw = await resp.json();
  const graph = raw["@graph"] || [];

  const meta = graph.find(n => n["@type"] === "OntologyMeta");
  if (!meta) throw new Error(t("error.metaMissing") + " (ADR-0029 D1)");
  initFromSchemaMeta(meta);
  dispatch({ type: Actions.FILTER_EDGES_INIT_FROM_TYPES, edgeTypes: EDGE_TYPES });

  const keepTypes = new Set(["Concept", "Activity", "Specification"]);
  const nodes = graph.filter(n => keepTypes.has(n["@type"]));

  const byId = new Map(nodes.map(n => [n["@id"], n]));
  dispatch({ type: Actions.SCHEMA_BY_ID_SET, byId });
  // The root of a node's tree: climb parents until one has none inside the
  // slice. Keyed on the parent chain rather than on level === 0, because a
  // re-rooted slice starts partway down the original hierarchy and no node in
  // it carries level 0.
  function resolveRoot(node) {
    let cur = node;
    let guard = 20;
    while (guard-- > 0) {
      const pid = Array.isArray(cur.parent) ? cur.parent[0] : cur.parent;
      const next = pid ? byId.get(pid) : null;
      if (!next) return cur["@id"];
      cur = next;
    }
    return cur["@id"];
  }

  const cyNodes = nodes.map(n => {
    const rootId = resolveRoot(n);
    let moduleId = null, stratumRootId = null;
    if (rootId) {
      if (rootId.startsWith("concept:")) moduleId = rootId;
      else if (rootId.startsWith("activity:")) stratumRootId = rootId;
      else if (rootId.startsWith("spec:")) stratumRootId = rootId;
    }
    const parentId = (() => {
      const p = Array.isArray(n.parent) ? n.parent[0] : n.parent;
      return p && byId.has(p) ? p : undefined;
    })();
    return {
      group: "nodes",
      data: {
        id: n["@id"],
        label: I18N.pick(n.label, n["@id"]),
        atype: n["@type"],
        level: n.level ?? null,
        status: n.status ?? null,
        moduleId: moduleId,
        stratumRootId: stratumRootId,
        parent: parentId,
        raw: n
      }
    };
  });

  const symPairs = new Set();
  const cyEdgeDedup = new Set();
  const cyEdges = [];
  const schemaEdgesAll = [];
  let edgeCounter = 0;
  for (const n of nodes) {
    for (const etype of EDGE_TYPES) {
      const targets = n[etype];
      if (!Array.isArray(targets)) continue;
      const style = EDGE_STYLES[etype];
      for (const member of targets) {
        const isQualified = member !== null && typeof member === "object";
        const tgt = isQualified ? member.target : member;
        const layering = isQualified ? (member.layering ?? null) : null;
        const fabricDomain = isQualified ? (member.fabric_domain ?? null) : null;
        if (!byId.has(tgt)) continue;
        let src = n["@id"], dst = tgt;
        if (style.symmetric) {
          const key = [etype, ...[src, dst].sort()].join("|");
          if (symPairs.has(key)) continue;
          symPairs.add(key);
        }
        if (style.flip) { const t = src; src = dst; dst = t; }
        schemaEdgesAll.push({ src, tgt: dst, etype, layering, fabric_domain: fabricDomain });
        const dedupKey = `${etype}|${src}|${dst}`;
        if (cyEdgeDedup.has(dedupKey)) continue;
        cyEdgeDedup.add(dedupKey);
        cyEdges.push({
          group: "edges",
          data: {
            id: "e" + (edgeCounter++),
            source: src,
            target: dst,
            etype: etype,
            layering: layering,
            fabric_domain: fabricDomain
          }
        });
      }
    }
  }
  dispatch({ type: Actions.SCHEMA_EDGES_SET, edges: schemaEdgesAll });

  renderCytoscape(cyNodes, cyEdges);
}

// =======================================================================
// =======================================================================
function renderCytoscape(cyNodes, cyEdges) {

  if (typeof window.cytoscapeExpandCollapse === "function") {
    cytoscape.use(window.cytoscapeExpandCollapse);
  } else {
    throw new Error("cytoscapeExpandCollapse global: " + t("error.libExpandCollapse"));
  }
  if (typeof window.cytoscapeFcose === "function") {
    cytoscape.use(window.cytoscapeFcose);
  } else {
    throw new Error("cytoscapeFcose global: " + t("error.libFcose"));
  }

  const cy = cytoscape({
    container: document.getElementById("cy"),
    elements: { nodes: cyNodes, edges: cyEdges },
    wheelSensitivity: 0.2,
    boxSelectionEnabled: false,
    // Crisp text: never rasterise the graph to a low-resolution texture while
    // panning, never smear it while it moves, and render at the display's own
    // device pixel ratio.
    textureOnViewport: false,
    motionBlur: false,
    pixelRatio: "auto",

    style: [
      {
        selector: "node",
        style: {
          "shape": "round-rectangle",
          "background-color": (ele) => {
            const m = ele.data("moduleId");
            if (m && MODULE_COLORS[m]) return MODULE_COLORS[m];
            const s = ele.data("stratumRootId");
            if (s && STRATUM_ROOT_COLORS[s]) return STRATUM_ROOT_COLORS[s];
            return FALLBACK_FILL;
          },
          "background-opacity": 0.85,
          "border-color":  (ele) => {
            const m = ele.data("moduleId");
            if (m && MODULE_STROKE[m]) return MODULE_STROKE[m];
            const s = ele.data("stratumRootId");
            if (s && STRATUM_ROOT_STROKE[s]) return STRATUM_ROOT_STROKE[s];
            return FALLBACK_STROKE;
          },
          "border-width": 1.5,
          "border-style": "solid",
          "label": "data(label)",
          "color": "#222",
          "font-size": (ele) => {
            const lv = ele.data("level") ?? 0;
            return LABEL_FONT_BY_LEVEL[Math.min(Math.max(lv, 0), LABEL_FONT_BY_LEVEL.length - 1)];
          },
          "font-weight": (ele) => {
            const lv = ele.data("level") ?? 0;
            return lv <= 2 ? "bold" : "normal";
          },
          "font-family": "Archivo, system-ui, sans-serif",
          "text-valign": "center",
          "text-halign": "center",
          "text-wrap": "wrap",
          "text-max-width": 180,
          "text-opacity": 1,
          "padding": "10px",
          "width":  "label",
          "height": "label",
          "min-width":  72,
          "min-height": 30
        }
      },

      {
        selector: 'node[atype = "Activity"]',
        style: {
          "border-style": "dashed"
        }
      },

      {
        selector: 'node[atype = "Specification"]',
        style: {
          "shape": "round-hexagon",
          "background-color": SPEC_FILL,
          "border-color": SPEC_STROKE,
          "border-style": "solid"
        }
      },

      {
        selector: 'node[status = "provisional"]',
        style: {
          "border-style": "dashed",
          "border-width": 2.5
        }
      },

      {
        selector: "node:parent",
        style: {
          "background-opacity": 0.6,
          "border-width": 3.5,
          "border-color": (ele) => {
            const m = ele.data("moduleId");
            if (m && MODULE_STROKE[m]) return MODULE_STROKE[m];
            const s = ele.data("stratumRootId");
            if (s && STRATUM_ROOT_STROKE[s]) return STRATUM_ROOT_STROKE[s];
            return FALLBACK_STROKE;
          },
          "text-valign": "top",
          "text-halign": "center",
          "text-margin-y": 14,
          "padding-top":    "26px",
          "padding-left":   "12px",
          "padding-right":  "12px",
          "padding-bottom": "12px",
          "min-width":  80,
          "min-height": 40
        }
      },

      {
        selector: 'node:parent[atype = "Activity"]',
        style: {
          "border-style": "dashed"
        }
      },

      {
        selector: 'node:parent[atype = "Specification"]',
        style: {
          "shape": "round-rectangle"
        }
      },

      {
        selector: "node.cy-expand-collapse-collapsed-node",
        style: {
          "background-opacity": 0.85,
          "border-width": 1.5,
          "text-valign": "center",
          "text-halign": "center",
          "text-margin-y": 0,
          "padding": "8px"
        }
      },

      {
        // Dimming recedes the body of a node, never its name. Fading the whole
        // element (the old opacity: 0.15) left neighbouring labels unreadable
        // while one node was in focus, which is the moment a reader most wants
        // to read them.
        selector: "node.dimmed",
        style: {
          "background-opacity": 0.18,
          "border-opacity": 0.3,
          "color": "#6b6b6b",
          "text-opacity": 1,
          "events": "no"
        }
      },
      {
        selector: "node.focus-target",
        style: {
          "border-width": 5,
          "border-color": "#FF6B35",
          "border-style": "solid",
          "opacity": 1,
          "events": "yes",
          "z-index": 10
        }
      },

      {
        selector: "edge",
        style: {
          "width": 1.6,
          "line-color":         edgeStyleProp("color", "#888"),
          "target-arrow-color": edgeStyleProp("color", "#888"),
          "source-arrow-color": edgeStyleProp("color", "#888"),
          "target-arrow-shape": edgeStyleTargetArrow,
          "curve-style": "unbundled-bezier",
          "control-point-distances": parallelEdgeControlPoint,
          "control-point-weights": 0.5,
          "arrow-scale": 0.9,
          "line-style":         edgeStyleLineStyle,
          "line-dash-pattern":  edgeStyleProp("dash", []),
          "opacity": 0.85
        }
      },

      {
        selector: "edge.cy-expand-collapse-collapsed-edge",
        style: {
          "width": 2.4,
          "line-color":         edgeStyleProp("color", "#888"),
          "target-arrow-color": edgeStyleProp("color", "#888"),
          "source-arrow-color": edgeStyleProp("color", "#888"),
          "line-style":         edgeStyleLineStyle,
          "line-dash-pattern":  edgeStyleProp("dash", []),
          "target-arrow-shape": edgeStyleTargetArrow,
          "source-arrow-shape": "none",
          "curve-style": "unbundled-bezier",
          "control-point-distances": parallelEdgeControlPoint,
          "control-point-weights": 0.5,
          "opacity": 0.85
        }
      },

      {
        selector: "edge.dimmed",
        style: { "opacity": 0.14, "events": "no" }
      },
      {
        selector: "edge.cy-expand-collapse-collapsed-edge.dimmed",
        style: { "opacity": 0.14 }
      },

      {
        selector: "node.filter-hidden",
        style: { display: "none" }
      },
      {
        selector: "edge.filter-hidden",
        style: { display: "none" }
      },

      {
        selector: "edge.edge-aggregated-hidden",
        style: { display: "none" }
      }
    ],

    layout: {
      name: "preset"
    }
  });

  const ec = cy.expandCollapse({
    layoutBy: {
      name: "grid",
      animate: false,
      fit: false,
      padding: 14,
      avoidOverlap: true,
      avoidOverlapPadding: 14,
      spacingFactor: 1.1,
      condense: true,
      nodeDimensionsIncludeLabels: true
    },
    fisheye: true,
    animate: ANIMATE,
    animationDuration: 350,
    undoable: false,
    cueEnabled: true,
    expandCollapseCuePosition: "top-left",
    expandCollapseCueSize: 14,
    expandCollapseCueLineSize: 9,
    edgeTypeInfo: "etype",
    groupEdgesOfSameTypeOnCollapse: false,
    allowNestedEdgeCollapse: false,
    zIndex: 999
  });

  cy.layout({
    name: "fcose",
    quality: "default",
    randomize: true,
    animate: false,
    fit: false,
    padding: 50,
    nodeDimensionsIncludeLabels: true,
    nodeSeparation: 120,
    nodeRepulsion: 12000,
    idealEdgeLength: 120,
    edgeElasticity: 0.45,
    gravity: 0.15,
    gravityRange: 3.8,
    gravityCompound: 1.0,
    gravityRangeCompound: 1.5,
    numIter: 2500,
    tile: false,
    packComponents: true,
    nestingFactor: 0.1
  }).run();

  // Fit the graph, then refuse to leave the labels below the legibility floor.
  // Fit everything visible. Legibility comes from a compact layout (children of
  // a leaf compound wrap into rows, see alignLeafCompoundChildren) rather than
  // from zooming in past the fit, which would push nodes off the canvas. A cap
  // keeps a two-node graph from rendering gigantic.
  function fitWithLegibleLabels(padding) {
    cy.fit(undefined, padding ?? 60);
    const MAX_ZOOM = 1.35;
    if (cy.zoom() > MAX_ZOOM) {
      cy.zoom({ level: MAX_ZOOM, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
      cy.center();
    }
  }

  // Opening state: phone keeps the two roots collapsed so their labels remain
  // legible; wider canvases open each root exactly one level. Deeper levels
  // stay folded behind a double-click. `expand` is one level by definition;
  // `expandRecursively` is deliberately not used here.
  ec.collapseAll();
  const phoneComposition = window.matchMedia("(max-width: 44.98rem)").matches;
  if (!phoneComposition) {
    ROOT_IDS.forEach(id => {
      const root = cy.getElementById(id);
      if (root && !root.empty() && (root.isParent() || root.hasClass("cy-expand-collapse-collapsed-node"))) {
        try { ec.expand(root, { animate: false }); } catch (e) { console.warn("could not expand root " + id, e); }
      }
    });
  }

  setTimeout(() => {
    cy.layout({
      name: "fcose",
      quality: "default",
      randomize: false,
      animate: false,
      fit: true,
      padding: 60,
      nodeDimensionsIncludeLabels: true,
      nodeSeparation: 120,
      nodeRepulsion: 50000,
      idealEdgeLength: 200,
      gravity: 0.05,
      numIter: 2000,
      tile: false,
      packComponents: true
    }).run();
    alignLeafCompoundChildren();
    detectAndFixCompoundOverlap();
    stackRootsVertically();
    fitWithLegibleLabels();
  }, 50);

  // Opening composition: the process subtree sits on top and the chip subtree
  // centred beneath it, so "produces" arrows run downward and the two blocks
  // fit the frame at a legible zoom. Only the opening view is composed this
  // way; once the reader expands deeper, the force layout takes over.
  function stackRootsVertically() {
    const roots = ROOT_IDS.map(id => cy.getElementById(id)).filter(r => r && !r.empty());
    if (roots.length < 2) return;
    roots.sort((a, b) => (a.data("atype") === "Activity" ? 0 : 1) - (b.data("atype") === "Activity" ? 0 : 1));
    const GAP = 110;
    let prev = roots[0].boundingBox({ includeLabels: true });
    for (let i = 1; i < roots.length; i++) {
      const r = roots[i];
      const bb = r.boundingBox({ includeLabels: true });
      const dx = (prev.x1 + prev.w / 2) - (bb.x1 + bb.w / 2);
      const dy = (prev.y2 + GAP) - bb.y1;
      (r.isParent() ? r.descendants() : r).shift({ x: dx, y: dy });
      prev = r.boundingBox({ includeLabels: true });
    }
  }

  // The frame this exhibit sits in may have no size yet when the graph loads
  // (a lazy iframe, a background tab). Fit once more when the canvas first has
  // real dimensions, then leave the viewport alone so the reader's own zooming
  // is never undone.
  if (typeof ResizeObserver !== "undefined") {
    let settled = false;
    const ro = new ResizeObserver(() => {
      if (settled) return;
      const c = cy.container();
      if (c.clientWidth > 0 && c.clientHeight > 0) {
        settled = true;
        setTimeout(() => { cy.resize(); fitWithLegibleLabels(); ro.disconnect(); }, 150);
      }
    });
    ro.observe(cy.container());
  }

  let _relayoutTimer = null;
  function scheduleRelayoutAfterEC() {
    if (_relayoutTimer) clearTimeout(_relayoutTimer);
    _relayoutTimer = setTimeout(() => {
      _relayoutTimer = null;
      cy.layout({
        name: "fcose",
        quality: "default",
        randomize: false,
        animate: ANIMATE,
        animationDuration: 400,
        animationEasing: "ease-out",
        // Re-fit after every expand or collapse so what the reader just
        // opened is never left outside the frame.
        fit: true,
        padding: 60,
        nodeDimensionsIncludeLabels: true,
        // Kept compact on purpose: the graph re-fits after every expansion, so
        // the less it spreads, the larger the labels stay.
        nodeSeparation: 80,
        nodeRepulsion: 9000,
        idealEdgeLength: 90,
        gravity: 0.2,
        numIter: 1500,
        tile: false,
        packComponents: true
      }).run();
    }, 100);
  }
  function alignLeafCompoundChildren() {
    const leafCompounds = cy.nodes().filter(n => {
      if (!n.isParent()) return false;
      return n.children().every(c => !c.isParent());
    });
    leafCompounds.forEach(compound => {
      const childrenVisible = compound.children().filter(c => c.visible()).toArray();
      if (childrenVisible.length < 2) return;
      // Rows of at most MAX_PER_ROW, so nine chip families read as a block
      // rather than a line wider than the viewport.
      const MAX_PER_ROW = 5;
      const sortedChildren = childrenVisible.slice().sort((a, b) => {
        const dy = a.position("y") - b.position("y");
        return Math.abs(dy) > 40 ? dy : a.position("x") - b.position("x");
      });
      const n = sortedChildren.length;
      const cols = Math.min(MAX_PER_ROW, Math.ceil(Math.sqrt(n * 1.8)));
      const rows = Math.ceil(n / cols);
      const cellW = Math.max(...sortedChildren.map(c => c.outerWidth())) + 28;
      const cellH = Math.max(...sortedChildren.map(c => c.outerHeight())) + 24;
      const bbox = compound.boundingBox({ includeLabels: false });
      const centerX = bbox.x1 + bbox.w / 2;
      const centerY = bbox.y1 + bbox.h / 2;
      cy.batch(() => {
        sortedChildren.forEach((child, i) => {
          const r = Math.floor(i / cols);
          const col = i % cols;
          const rowCount = (r === rows - 1) ? (n - r * cols) : cols;
          child.position({
            x: centerX + (col - (rowCount - 1) / 2) * cellW,
            y: centerY + (r - (rows - 1) / 2) * cellH
          });
        });
      });
    });
  }

  //
  //
  function detectAndFixCompoundOverlap() {
    const MAX_ITER = 5;
    const MARGIN = 30;

    function bboxOf(n) {
      return n.boundingBox({ includeLabels: true, includeOverlays: false });
    }
    function overlaps(a, b) {
      return !(a.x2 <= b.x1 + 0.5 || b.x2 <= a.x1 + 0.5 || a.y2 <= b.y1 + 0.5 || b.y2 <= a.y1 + 0.5);
    }

    const groupsByParent = new Map();  // parentId (or "__root__") → Array<node>
    cy.nodes().forEach(n => {
      if (n.removed()) return;
      if (n.style("display") === "none") return;
      const parent = n.parent();
      const pid = parent.length > 0 ? parent.id() : "__root__";
      if (!groupsByParent.has(pid)) groupsByParent.set(pid, []);
      groupsByParent.get(pid).push(n);
    });

    const sortedParentIds = [...groupsByParent.keys()].sort((a, b) => {
      const levelA = a === "__root__" ? -1 : (cy.getElementById(a).data("level") ?? 0);
      const levelB = b === "__root__" ? -1 : (cy.getElementById(b).data("level") ?? 0);
      return levelB - levelA;
    });

    const failedGroups = [];
    cy.batch(() => {
      sortedParentIds.forEach(pid => {
        const siblings = groupsByParent.get(pid);
        if (siblings.length < 2) return;

        for (let iter = 0; iter < MAX_ITER; iter++) {
          let stillOverlap = false;
          const bboxes = siblings.map(n => bboxOf(n));

          for (let i = 0; i < siblings.length; i++) {
            for (let j = i + 1; j < siblings.length; j++) {
              const a = bboxes[i], b = bboxes[j];
              if (!overlaps(a, b)) continue;
              const overlapW = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
              const delta = overlapW + MARGIN;
              const aCx = (a.x1 + a.x2) / 2;
              const bCx = (b.x1 + b.x2) / 2;
              const target = aCx >= bCx ? siblings[i] : siblings[j];
              const targetIdx = aCx >= bCx ? i : j;
              const curPos = target.position();
              target.position({ x: curPos.x + delta, y: curPos.y });
              bboxes[targetIdx] = bboxOf(target);
              stillOverlap = true;
            }
          }

          if (!stillOverlap) break;
          if (iter === MAX_ITER - 1) failedGroups.push(pid);
        }
      });
    });

    if (failedGroups.length > 0) {
      console.warn(`[detectAndFixCompoundOverlap] compound overlap unresolved after ${MAX_ITER} iterations in groups: ${failedGroups.join(", ")}`);
    }
  }

  cy.on("layoutstop", () => {
    alignLeafCompoundChildren();
    detectAndFixCompoundOverlap();
  });

  cy.on("expandcollapse.afterexpand expandcollapse.aftercollapse", scheduleRelayoutAfterEC);

  function applyEdgeAggregation() {
    const seen = new Map();
    cy.batch(() => {
      cy.edges().forEach(e => {
        const src = e.data("source");
        const tgt = e.data("target");
        const etype = e.data("etype");
        if (!etype) return;
        const style = EDGE_STYLES[etype];
        const key = (style && style.symmetric)
          ? `${etype}|${[src, tgt].sort().join("|")}`
          : `${etype}|${src}|${tgt}`;
        if (seen.has(key)) {
          e.addClass("edge-aggregated-hidden");
        } else {
          seen.set(key, e.id());
          e.removeClass("edge-aggregated-hidden");
        }
      });
    });
  }

  cy.on("expandcollapse.afterexpand expandcollapse.aftercollapse", () => {
    applyEdgeAggregation();
    if (!STATE.currentSidebarNodeId) return;
    const node = cy.getElementById(STATE.currentSidebarNodeId);
    if (node && node.length > 0 && node.visible()) {
      renderSidebar(node);
    }
  });

  applyEdgeAggregation();

  cy.on("dbltap", "node", (evt) => {
    const node = evt.target;
    if (ec.isCollapsible(node)) {
      try { ec.collapse(node); } catch (e) { console.warn("collapse failed:", node.id(), e); }
    } else if (ec.isExpandable(node)) {
      try { ec.expand(node); } catch (e) { console.warn("expand failed:", node.id(), e); }
    }
  });

  cy.on("tap", "node", (evt) => {
    const node = evt.target;
    if (STATE.pin.nodeId !== null) {
      try {
        cy.elements().unselect();
        node.select();
        cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 1.0) }, { duration: 350 });
      } catch (e) { /* swallow */ }
      return;
    }
    renderSidebar(node);
  });

  cy.on("tap", (evt) => {
    if (evt.target === cy) {
      hideSidebar();
    }
  });

  document.getElementById("sidebar-close").addEventListener("click", hideSidebar);

  document.getElementById("btn-pin").addEventListener("click", togglePin);
  document.getElementById("btn-focus").addEventListener("click", toggleFocus);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (STATE.focus.nodeId !== null) {
        clearFocus();
        updateSidebarActionsUI();
        return;
      }
      if (document.body.classList.contains("sidebar-open")) {
        hideSidebar();
        return;
      }
    }
  });

  document.getElementById("sidebar").addEventListener("click", (e) => {
    const link = e.target.closest(".sidebar-node-link");
    if (!link) return;
    const nodeId = link.dataset.nodeId;
    if (!nodeId) return;
    focusNodeById(nodeId);
  });

  // ---- Tooltip ----
  cy.on("mouseover", "node", (evt) => {
    const d = evt.target.data();
    showTooltip(evt.originalEvent, tooltipHtmlForNode(d));
  });
  cy.on("mousemove", "node", (evt) => {
    moveTooltip(evt.originalEvent);
  });
  cy.on("mouseout", "node", () => hideTooltip());

  cy.on("mouseover", "edge", (evt) => {
    showTooltip(evt.originalEvent, tooltipHtmlForEdge(evt.target));
  });
  cy.on("mousemove", "edge", (evt) => {
    moveTooltip(evt.originalEvent);
  });
  cy.on("mouseout", "edge", () => hideTooltip());

  document.getElementById("cy").addEventListener("mouseleave", hideTooltip);

  // expose for debugging
  window._cy = cy;
  window._ec = ec;

  initEdgeLegend();
  syncHeaderHeightVar();
  window.addEventListener("resize", syncHeaderHeightVar);
}

// =======================================================================
// =======================================================================
//
//
/**
 * The edge-type legend, and the only control the exhibit ships.
 *
 * Each entry is both a key to the line style and a toggle: unchecking one hides
 * every edge of that type. The list comes from the data file, which declares
 * only the edge types that actually occur in this slice, so the legend never
 * names a relation the reader cannot find.
 */
function initEdgeLegend() {
  const edgeBox = document.getElementById("filter-edge");
  if (!edgeBox) return;

  EDGE_TYPES.forEach(et => {
    const style = EDGE_STYLES[et];
    if (!style) return;
    const svg = edgeStyleSvg(et);
    const name = EDGE_TYPE_LABEL_MAP[et] || et;
    const symMark = style.symmetric
      ? html`<span class="legend-sym">${t("filter.edge.symmetricMark")}</span>`
      : "";
    edgeBox.insertAdjacentHTML("beforeend", html`<label class="legend-chip" title="${et}"><input type="checkbox" data-et="${et}" checked />${raw(svg)}<span class="legend-name" style="color:${raw(style.color)};">${name}</span>${raw(symMark)}</label>`);
  });

  edgeBox.querySelectorAll("input[type=checkbox]").forEach(cb => {
    cb.addEventListener("change", () => {
      dispatch({ type: Actions.FILTER_EDGE_TYPE_TOGGLE, value: cb.dataset.et, on: cb.checked });
      applyEdgeFilter();
    });
  });
}

// The strip wraps to a second line on narrow viewports, so the canvas below it
// is positioned from a measured height rather than a guess.
function syncHeaderHeightVar() {
  const hdr = document.getElementById("header");
  if (!hdr) return;
  const h = Math.ceil(hdr.getBoundingClientRect().height);
  document.body.style.setProperty("--header-h", h + "px");
}

// =======================================================================
// =======================================================================
//
//
/**
 * Show or hide edges by type. Nodes are never filtered: the exhibit has no
 * node-level filters left, so the graph a reader sees is always the whole
 * slice, opened to whatever depth they have expanded.
 */
function applyEdgeFilter() {
  const cy = window._cy;
  if (!cy) return;

  cy.batch(() => {
    cy.edges().forEach(e => {
      const et = e.data("etype");
      const pass = et ? STATE.filter.edges.has(et) : true;
      if (pass) e.removeClass("filter-hidden");
      else e.addClass("filter-hidden");
    });
  });
}



// =======================================================================
// =======================================================================

//
//
// helper 1: getVisibleAncestor(originalId)
function getVisibleAncestor(originalId) {
  const cy = window._cy;
  const schemaById = STATE.schemaById;
  let curId = originalId;
  while (curId) {
    const cyNode = cy.getElementById(curId);
    if (cyNode.length > 0 && cyNode.visible()) {
      return curId;
    }
    const schemaNode = schemaById && schemaById.get(curId);
    if (!schemaNode) return null;
    const rawParent = schemaNode.parent;
    const parentId = Array.isArray(rawParent) ? rawParent[0] : rawParent;
    if (!parentId) return null;
    curId = parentId;
  }
  return null;
}

function isInSubtree(originalId, rootId) {
  const schemaById = STATE.schemaById;
  let curId = originalId;
  while (curId) {
    if (curId === rootId) return true;
    const schemaNode = schemaById && schemaById.get(curId);
    if (!schemaNode) return false;
    const rawParent = schemaNode.parent;
    const parentId = Array.isArray(rawParent) ? rawParent[0] : rawParent;
    if (!parentId) return false;
    curId = parentId;
  }
  return false;
}

function buildAncestorChain(startId) {
  const schemaById = STATE.schemaById;
  const chain = [];
  let curId = startId;
  let guard = 30;
  while (curId && guard-- > 0) {
    const node = schemaById && schemaById.get(curId);
    if (!node) break;
    chain.unshift({ id: curId, node });
    const rawParent = node.parent;
    const parentId = Array.isArray(rawParent) ? rawParent[0] : rawParent;
    if (!parentId) break;
    curId = parentId;
  }
  return chain;
}

function renderSidebar(node) {
  const cy = window._cy;
  const d = node.data();
  const nodeRaw = d.raw || {};

  if (STATE.pin.nodeId !== null && node.id() !== STATE.pin.nodeId) {
    return;
  }

  if (STATE.focus.nodeId !== null && node.id() !== STATE.focus.nodeId) {
    clearFocus();
  }

  document.body.classList.add("sidebar-open");
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.add("open");

  const labelPrimary = I18N.pick(nodeRaw.label, d.label || d.id);
  document.getElementById("sb-title").innerHTML = html`${labelPrimary}`;

  const descPrimary = I18N.pick(nodeRaw.description);

  let sbHtml = "";

  try {
    const chain = buildAncestorChain(node.id());
    if (chain.length >= 2) {
      const crumbs = chain.map((item, i) => {
        const lbl = I18N.pick(item.node.label, item.id);
        if (i === chain.length - 1) {
          return `<span class="breadcrumb-current">${escHtml(lbl)}</span>`;
        }
        return `<a class="sidebar-node-link" data-node-id="${escHtml(item.id)}">${escHtml(lbl)}</a>`;
      });
      sbHtml += `<div class="sidebar-breadcrumb">`
             +  crumbs.join(`<span class="breadcrumb-sep">›</span>`)
             +  `</div>`;
    }
  } catch (e) {
    console.error("[renderSidebar] breadcrumb section failed:", e);
  }

  sbHtml += sbField("@id",   nodeRaw["@id"] || d.id);
  sbHtml += sbField("@type", nodeRaw["@type"] || d.atype);
  sbHtml += sbField("level", nodeRaw.level ?? d.level ?? "—");
  if (nodeRaw.status) {
    sbHtml += sbField(t("sidebar.field.status"),
      nodeRaw.status === "provisional" ? "provisional (" + t("sidebar.status.provisional") + ")" : nodeRaw.status);
  }

  if (descPrimary) {
    sbHtml += html`<div class="field"><div class="field-label">${t("sidebar.field.description")}</div>`;
    sbHtml += html`<div class="desc-block">${descPrimary}</div>`;
    sbHtml += `</div>`;
  }

  try {
    sbHtml += sbStandardsBody(nodeRaw.standards_body);
  } catch (e) {
    console.error("[renderSidebar] standards_body section failed:", e);
    sbHtml += html`<div class="sidebar-section-title" style="color:#c33;">${t("error.standardsBodyRender")}</div>`
           +  `<div style="color:#c33;font-size:11px;white-space:pre-wrap;">${escHtml(e && e.message || String(e))}</div>`;
  }

  const nodeId = node.id();
  const renderRelRow = (relId, relNode) => {
    const relLabel = I18N.pick(relNode.label, relId);
    const relAtype = relNode["@type"] || "";
    const tag = relAtype === "Activity"      ? `<span class="sidebar-type-tag">[Activity]</span>`
              : relAtype === "Specification" ? `<span class="sidebar-type-tag">[Specification]</span>`
              : "";
    return `<div class="sidebar-edge-row sidebar-mereo-row">`
         +   `<a class="sidebar-node-link" data-node-id="${escHtml(relId)}">${escHtml(relLabel)}</a>${tag}`
         + `</div>`;
  };
  try {
    const parentList = [];
    if (STATE.schemaById) {
      const pRaw = nodeRaw.parent;
      const pids = Array.isArray(pRaw) ? pRaw : (pRaw ? [pRaw] : []);
      pids.forEach(pid => {
        const pNode = STATE.schemaById.get(pid);
        if (pNode) parentList.push({ id: pid, node: pNode });
      });
    }
    if (parentList.length > 0) {
      sbHtml += html`<div class="sidebar-section-title">${t("sidebar.section.parents")}</div>`;
      parentList.forEach(({ id: pId, node: pNode }) => {
        sbHtml += renderRelRow(pId, pNode);
      });
    }

    const childList = [];
    if (STATE.schemaById) {
      STATE.schemaById.forEach((sNode, sId) => {
        if (!sNode) return;
        const p = Array.isArray(sNode.parent) ? sNode.parent[0] : sNode.parent;
        if (p === nodeId) childList.push({ id: sId, node: sNode });
      });
    }
    if (childList.length > 0) {
      sbHtml += html`<div class="sidebar-section-title">${t("sidebar.section.children")}</div>`;
      childList.forEach(({ id: cId, node: cNode }) => {
        sbHtml += renderRelRow(cId, cNode);
      });
    }
  } catch (e) {
    console.error("[renderSidebar] parent/children section failed:", e);
    sbHtml += html`<div class="sidebar-section-title" style="color:#c33;">${t("error.parentChildrenRender")}</div>`
           +  `<div style="color:#c33;font-size:11px;white-space:pre-wrap;">${escHtml(e && e.message || String(e))}</div>`;
  }

  //
  //
  //
  // groups[et] = { out: Map(visibleOtherId → count), in: Map(visibleOtherId → count), otherById: Map(visibleOtherId → cy node) }
  const groups = {};
  EDGE_TYPES.forEach(et => {
    groups[et] = { out: new Map(), in: new Map(), otherById: new Map() };
  });
  (STATE.schemaEdges || []).forEach(({ src, tgt, etype }) => {
    const srcInside = isInSubtree(src, nodeId);
    const tgtInside = isInSubtree(tgt, nodeId);
    if (srcInside && tgtInside) return;
    if (!srcInside && !tgtInside) return;
    const otherOriginal = srcInside ? tgt : src;
    const direction = srcInside ? "out" : "in";
    const vOther = getVisibleAncestor(otherOriginal);
    if (!vOther || vOther === nodeId) return;
    const g = groups[etype];
    if (!g) return;
    const dirMap = direction === "out" ? g.out : g.in;
    dirMap.set(vOther, (dirMap.get(vOther) || 0) + 1);
    if (!g.otherById.has(vOther)) g.otherById.set(vOther, cy.getElementById(vOther));
  });

  const edgeGroupsHtml = EDGE_TYPES.map(et => {
    const g = groups[et];
    if (g.out.size === 0 && g.in.size === 0) return "";
    const style = EDGE_STYLES[et];
    const symmetric = style.symmetric;
    const swatch = edgeStyleSvg(et);
    const rows = [];
    g.out.forEach((cnt, otherId) => {
      const other = g.otherById.get(otherId);
      const dir = symmetric ? "↔" : "→";
      rows.push(edgeRowHtml(dir, style.color, other, false, cnt));
    });
    g.in.forEach((cnt, otherId) => {
      if (symmetric && g.out.has(otherId)) return;
      const other = g.otherById.get(otherId);
      const dir = symmetric ? "↔" : "←";
      rows.push(edgeRowHtml(dir, style.color, other, false, cnt));
    });
    if (rows.length === 0) return "";
    return html`<div class="sidebar-edge-group">
      <div class="sidebar-edge-group-head">${raw(swatch)} <span style="color:${raw(style.color)};font-weight:600;">${et}</span> (${rows.length})</div>
      ${rows.map(r => raw(r))}
    </div>`;
  }).join("");

  if (edgeGroupsHtml.trim()) {
    sbHtml += html`<div class="sidebar-section-title">${t("sidebar.section.adjacency")}</div>${raw(edgeGroupsHtml)}`;
  } else {
    sbHtml += html`<div class="sidebar-section-title">${t("sidebar.section.adjacency")}</div><div style="color:#aaa;font-style:italic;">${t("sidebar.adjacency.empty")}</div>`;
  }

  document.getElementById("sb-content").innerHTML = sbHtml;

  dispatch({ type: Actions.SIDEBAR_NODE_SET, nodeId: node.id() });
  updateSidebarActionsUI();
}

function sbField(label, value) {
  return html`<div class="field">
    <span class="field-label">${label}</span>
    <span class="field-value"> ${String(value ?? "")}</span>
  </div>`;
}

// =======================================================================
// =======================================================================
//
//
function sbStandardsBody(sb) {
  if (sb == null) return "";
  const TITLE = html`<div class="sidebar-section-title">${t("sidebar.standardsBody.title")}</div>`;
  if (typeof sb === "string") {
    return TITLE + sbField(t("sidebar.standardsBody.name"), sb);
  }
  if (typeof sb !== "object" || Array.isArray(sb)) return "";

  let out = TITLE;
  if (sb.name) out += sbField(t("sidebar.standardsBody.nameField"), sb.name);
  if (sb.governance) {
    const loc = vocabLabel("governance", sb.governance);
    out += sbField(t("sidebar.standardsBody.governance"), loc ? `${sb.governance} (${loc})` : sb.governance);
  }
  if (sb.openness) {
    const loc = vocabLabel("openness", sb.openness);
    out += sbField(t("sidebar.standardsBody.openness"), loc ? `${sb.openness} (${loc})` : sb.openness);
  }
  if (sb.stewardship) {
    const loc = vocabLabel("stewardship", sb.stewardship);
    out += sbField(t("sidebar.standardsBody.stewardship"), loc ? `${sb.stewardship} (${loc})` : sb.stewardship);
  }
  const refs = Array.isArray(sb.company_refs) ? sb.company_refs : [];
  if (refs.length > 0) {
    out += html`<div class="field"><div class="field-label">${t("sidebar.standardsBody.companyRefs")}</div>`;
    refs.forEach(rid => {
      const hit = STATE.schemaById && STATE.schemaById.get(rid);
      out += `<div class="sidebar-edge-row sidebar-mereo-row">`
           + (hit
               ? `<a class="sidebar-node-link" data-node-id="${escHtml(rid)}">${escHtml(rid)}</a>`
               : `<span class="field-value">${escHtml(rid)}</span>`
                 + html`<span class="sidebar-type-tag">${t("sidebar.standardsBody.outOfGraph")}</span>`)
           + `</div>`;
    });
    out += `</div>`;
  }
  const members = Array.isArray(sb.members) ? sb.members : [];
  if (members.length > 0) out += sbField(t("sidebar.standardsBody.members"), members.join(", "));
  return out;
}

function edgeRowHtml(dirMarker, color, otherNode, isMeta, aggCount) {
  const od = otherNode.data();
  const labelZh = od.label || od.id;
  const tag = od.atype === "Activity"      ? `<span class="sidebar-type-tag">[Activity]</span>`
            : od.atype === "Specification" ? `<span class="sidebar-type-tag">[Specification]</span>`
            : "";
  const metaTag = isMeta ? `<span class="sidebar-type-tag" style="color:#a66;">(meta)</span>` : "";
  const aggTag = (aggCount && aggCount > 1)
    ? `<span class="sidebar-type-tag" style="color:#737373;">× ${aggCount}</span>`
    : "";
  return html`<div class="sidebar-edge-row">
    <span class="sidebar-edge-dir" style="color:${raw(color)};">${dirMarker}</span>
    <a class="sidebar-node-link" data-node-id="${od.id}">${labelZh}</a>${raw(tag)}${raw(aggTag)}${raw(metaTag)}
  </div>`;
}

function hideSidebar() {
  clearPin();
  clearFocus();
  dispatch({ type: Actions.SIDEBAR_NODE_CLEAR });
  document.body.classList.remove("sidebar-open");
  document.getElementById("sidebar").classList.remove("open");
  updateSidebarActionsUI();
}

// =======================================================================
// =======================================================================
//
//
//   - ESC → clearFocus
function applyPin(nodeId) {
  dispatch({ type: Actions.PIN_SET, nodeId });
}
function clearPin() {
  dispatch({ type: Actions.PIN_CLEAR });
}
function togglePin() {
  const sidebarNodeId = STATE.currentSidebarNodeId;
  if (!sidebarNodeId) return;
  if (STATE.pin.nodeId === sidebarNodeId) {
    clearPin();
  } else {
    applyPin(sidebarNodeId);
  }
  updateSidebarActionsUI();
}

function applyFocus(node) {
  const cy = window._cy;
  if (!cy || !node || node.empty()) return;
  clearFocus();

  let neighborhoodNodes;
  if (node.isParent() && node.descendants().length > 0) {
    const subtree = node.union(node.descendants());
    neighborhoodNodes = subtree.union(subtree.openNeighborhood().nodes());
  } else {
    neighborhoodNodes = node.openNeighborhood().nodes();
  }
  const neighborIds = new Set([node.id(), ...neighborhoodNodes.map(n => n.id())]);

  dispatch({ type: Actions.FOCUS_SET, nodeId: node.id(), neighborIds });

  node.addClass("focus-target");

  const noDimAncestors = new Set();
  const schemaById = STATE.schemaById;
  function collectVisibleAncestorCompounds(startId) {
    let curId = startId;
    while (curId) {
      const cyNode = cy.getElementById(curId);
      if (cyNode.length > 0 && cyNode.visible() && cyNode.isParent()) {
        noDimAncestors.add(curId);
      }
      const schemaNode = schemaById && schemaById.get(curId);
      if (!schemaNode) break;
      const rawParent = schemaNode.parent;
      const parentId = Array.isArray(rawParent) ? rawParent[0] : rawParent;
      if (!parentId) break;
      curId = parentId;
    }
  }
  neighborIds.forEach(id => collectVisibleAncestorCompounds(id));

  cy.nodes().forEach(n => {
    if (neighborIds.has(n.id())) return;
    if (noDimAncestors.has(n.id())) return;
    n.addClass("dimmed");
  });

  const focusedSet = new Set([node.id()]);
  if (node.isParent() && node.descendants().length > 0) {
    node.descendants().forEach(d => focusedSet.add(d.id()));
  }
  cy.edges().forEach(e => {
    const src = e.data("source"), tgt = e.data("target");
    if (!(focusedSet.has(src) || focusedSet.has(tgt))) {
      e.addClass("dimmed");
    }
  });
}
function clearFocus() {
  const cy = window._cy;
  if (cy) {
    cy.nodes().removeClass("dimmed").removeClass("focus-target");
    cy.edges().removeClass("dimmed");
  }
  dispatch({ type: Actions.FOCUS_CLEAR });
}
function toggleFocus() {
  const cy = window._cy;
  const sidebarNodeId = STATE.currentSidebarNodeId;
  if (!cy || !sidebarNodeId) return;
  if (STATE.focus.nodeId !== null) {
    clearFocus();
  } else {
    const node = cy.getElementById(sidebarNodeId);
    if (node && !node.empty()) applyFocus(node);
  }
  updateSidebarActionsUI();
}

function updateSidebarActionsUI() {
  const btnPin = document.getElementById("btn-pin");
  const btnFocus = document.getElementById("btn-focus");
  const stateBar = document.getElementById("sidebar-state");
  if (!btnPin || !btnFocus || !stateBar) return;

  const pinActive = STATE.pin.nodeId !== null;
  const focusActive = STATE.focus.nodeId !== null;

  if (pinActive) {
    btnPin.classList.add("active");
    btnPin.textContent = "\u{1F4CC} " + t("sidebar.pin.active");
    btnPin.title = t("sidebar.pin.active.title");
  } else {
    btnPin.classList.remove("active");
    btnPin.textContent = "\u{1F4CC} " + t("sidebar.pin.default");
    btnPin.title = t("sidebar.pin.default.title");
  }

  if (focusActive) {
    btnFocus.classList.add("active");
    btnFocus.textContent = t("sidebar.focus.active");
    btnFocus.title = t("sidebar.focus.active.title");
  } else {
    btnFocus.classList.remove("active");
    btnFocus.textContent = t("sidebar.focus.default");
    btnFocus.title = t("sidebar.focus.default.title");
  }

  const badges = [];
  if (pinActive) badges.push(html`<span class="badge">\u{1F4CC} ${t("sidebar.badge.pin")}</span>`);
  if (focusActive) {
    const n = Math.max(0, STATE.focus.neighborIds.size - 1);
    badges.push(html`<span class="badge">\u{1F3AF} ${t("sidebar.badge.focus")} (${t("sidebar.badge.focus.neighbors")} ${n})</span>`);
  }
  stateBar.innerHTML = badges.join(" ");
}

function focusNodeById(nodeId) {
  const cy = window._cy;
  if (!cy) return;
  const node = cy.getElementById(nodeId);
  if (!node || node.empty()) {
    showStatus(t("status.nodeNotInView", { id: nodeId }) + " " + t("status.nodeNotInView.hint"), "info");
    return;
  }
  if (!node.visible()) {
    showStatus(t("status.nodeCollapsed", { id: nodeId }) + " " + t("status.nodeCollapsed.hint"), "info");
    return;
  }
  cy.elements().unselect();
  node.select();
  cy.animate({ center: { eles: node }, zoom: Math.max(cy.zoom(), 0.8) }, { duration: 350 });
  if (STATE.pin.nodeId !== null && nodeId !== STATE.pin.nodeId) {
    return;
  }
  renderSidebar(node);
}


// =======================================================================
// Tooltip
// =======================================================================
function truncateText(s, n) {
  s = String(s ?? "");
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function tooltipHtmlForNode(d) {
  const rawNode = d.raw || {};
  const collapsedNote = (() => {
    const cy = window._cy;
    if (!cy) return "";
    const node = cy.getElementById(d.id);
    const isCompound = node.isParent() || node.hasClass("cy-expand-collapse-collapsed-node");
    if (!isCompound) return "";
    const collapsed = node.hasClass("cy-expand-collapse-collapsed-node");
    return html`<br/><span style="opacity:.65">(${collapsed ? t("tooltip.compound.collapsed") : t("tooltip.compound.expanded")})</span>`;
  })();

  const pRaw = rawNode.parent;
  const pid = Array.isArray(pRaw) ? pRaw[0] : pRaw;
  let parentDisplay;
  if (!pid) {
    parentDisplay = t("tooltip.parent.root");
  } else {
    const pNode = STATE.schemaById && STATE.schemaById.get(pid);
    parentDisplay = I18N.pick(pNode && pNode.label, pid);
  }
  const status = rawNode.status || d.status || "confirmed";
  const statusDisplay = status === "provisional" ? "provisional (" + t("tooltip.status.provisional") + ")" : status;
  const refCount = Array.isArray(rawNode.references) ? rawNode.references.length : 0;
  const descTip = I18N.pick(rawNode.description);
  const descBlock = descTip
    ? html`<div style="margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.12);opacity:.82;line-height:1.5;">${truncateText(descTip, 160)}</div>`
    : "";

  return html`<b>${d.label}</b><br/><span style="opacity:.65">@id: ${d.id}</span><br/><span style="opacity:.65">@type: ${d.atype}</span><br/><span style="opacity:.65">level: ${d.level ?? "—"}</span>${raw(collapsedNote)}<br/><span style="opacity:.65">${t("tooltip.label.parent")} ${parentDisplay}</span><br/><span style="opacity:.65">${t("tooltip.label.status")} ${statusDisplay}</span><br/><span style="opacity:.65">${t("tooltip.label.references")} ${refCount}</span>${raw(descBlock)}`;
}

function edgeAggCount(e) {
  const S = e.data("source"), T = e.data("target"), ET = e.data("etype");
  const style = EDGE_STYLES[ET];
  let cnt = 0;
  (STATE.schemaEdges || []).forEach(({ src, tgt, etype }) => {
    if (etype !== ET) return;
    const vs = getVisibleAncestor(src);
    const vt = getVisibleAncestor(tgt);
    if (style && style.symmetric) {
      if ((vs === S && vt === T) || (vs === T && vt === S)) cnt++;
    } else if (vs === S && vt === T) {
      cnt++;
    }
  });
  return cnt;
}

function edgeAggQualifier(e, key) {
  const S = e.data("source"), T = e.data("target"), ET = e.data("etype");
  const style = EDGE_STYLES[ET];
  const vals = new Set();
  (STATE.schemaEdges || []).forEach((se) => {
    const v = se[key];
    if (se.etype !== ET || !v) return;
    const vs = getVisibleAncestor(se.src);
    const vt = getVisibleAncestor(se.tgt);
    const hit = (style && style.symmetric)
      ? ((vs === S && vt === T) || (vs === T && vt === S))
      : (vs === S && vt === T);
    if (hit) vals.add(v);
  });
  return [...vals];
}

function tooltipHtmlForEdge(e) {
  const cy = window._cy;
  const et = e.data("etype");
  const style = EDGE_STYLES[et] || {};
  const label = EDGE_TYPE_LABEL_MAP[et] || et;
  const arrow = style.symmetric ? "↔" : "→";
  const srcNode = cy.getElementById(e.data("source"));
  const tgtNode = cy.getElementById(e.data("target"));
  const srcLabel = (srcNode.length > 0 && srcNode.data("label")) || e.data("source");
  const tgtLabel = (tgtNode.length > 0 && tgtNode.data("label")) || e.data("target");
  const cnt = edgeAggCount(e);
  const countTag = cnt > 1 ? html`<br/><span style="opacity:.65">${t("tooltip.edge.aggregated.prefix")} × ${cnt} ${t("tooltip.edge.aggregated")}</span>` : "";
  const lays = edgeAggQualifier(e, "layering");
  const layTag = lays.length > 0
    ? html`<br/><span style="opacity:.75">${t("tooltip.edge.layering")} ${lays.join(", ")}</span>`
    : "";
  const fds = edgeAggQualifier(e, "fabric_domain");
  const fdTag = fds.length > 0
    ? html`<br/><span style="opacity:.75">${t("tooltip.edge.fabricDomain")} ${fds.join(", ")}</span>`
    : "";
  return html`<b style="color:${raw(style.color || "#e5e5e5")}">${label}</b><br/><span style="opacity:.85">${srcLabel} ${arrow} ${tgtLabel}</span>${raw(layTag)}${raw(fdTag)}${raw(countTag)}`;
}

function showTooltip(evt, htmlStr) {
  const el = document.getElementById("tooltip");
  el.style.display = "block";
  el.innerHTML = htmlStr;
  moveTooltip(evt);
}
function moveTooltip(evt) {
  const el = document.getElementById("tooltip");
  const x = evt?.clientX ?? 0;
  const y = evt?.clientY ?? 0;
  el.style.left = (x + 14) + "px";
  el.style.top  = (y + 14) + "px";
}
function hideTooltip() {
  document.getElementById("tooltip").style.display = "none";
}

function escHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", "\"":"&quot;", "'":"&#39;"
  }[c]));
}

// =======================================================================
// =======================================================================
//
const RAW = Symbol("raw-html");
function raw(s) { return { [RAW]: true, value: String(s ?? "") }; }

function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v && typeof v === "object" && v[RAW]) {
      out += v.value;
    } else if (Array.isArray(v)) {
      out += v.map(x => (x && typeof x === "object" && x[RAW]) ? x.value : escHtml(x)).join("");
    } else {
      out += escHtml(v);
    }
    out += strings[i + 1];
  }
  return out;
}

// =======================================================================
// Legend
// =======================================================================
