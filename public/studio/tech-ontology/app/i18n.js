/* i18n.js — the viewer's UI copy.
 *
 * This snapshot ships in English only. The table holds UI chrome; node labels
 * and descriptions come from the data file's `label.en` / `description.en`.
 *
 * The exhibit's only controls are the edge-type legend and the detail panel,
 * so the table is deliberately short: no search, no filter groups, no
 * language switch.
 *
 * Use: t("search.button") / t("search.hitCount", { n: 3 })
 * In markup: data-i18n / data-i18n-html / data-i18n-title / data-i18n-placeholder,
 * refreshed by applyI18n() on load.
 */
(function (global) {
  "use strict";

  var LANG = "en";

  var STRINGS = {
    en: {
    "error.libExpandCollapse": "not defined — check that the expand/collapse library loaded",
    "error.libFcose": "not defined — check that the fcose layout library loaded",
    "error.metaMissing": "Schema missing OntologyMeta node",
    "error.parentChildrenRender": "Parent/children render failed",
    "error.standardsBodyRender": "Standards body render failed",
    "filter.edge.symmetricMark": "(symmetric)",
    "filter.edge.title": "Edge type",
    "header.hint.interactions": "<b>Double-click</b> a node to expand / collapse · <b>Click</b> for details · <b>Scroll</b> to zoom · <b>Drag</b> the background to pan.",
    "header.hint.interactionsMobile": "<b>Double-tap</b> a node to expand or collapse. <b>Tap</b> for details. Pinch to zoom and drag to pan.",
    "sidebar.adjacency.empty": "No adjacency edges in the visible graph",
    "sidebar.badge.focus": "Focus neighborhood",
    "sidebar.badge.focus.neighbors": "neighbors",
    "sidebar.badge.pin": "Pinned",
    "sidebar.close.title": "Close",
    "sidebar.field.description": "Description",
    "sidebar.field.status": "Status",
    "sidebar.focus": "Focus neighborhood",
    "sidebar.focus.active": "Exit focus",
    "sidebar.focus.active.title": "Click to exit focus",
    "sidebar.focus.default": "Focus neighborhood",
    "sidebar.focus.default.title": "Dim non-neighbor nodes",
    "sidebar.focus.title": "Dim non-neighbor nodes",
    "sidebar.pin": "Pin",
    "sidebar.pin.active": "Pinned",
    "sidebar.pin.active.title": "Click to unpin",
    "sidebar.pin.default": "Pin",
    "sidebar.pin.default.title": "Pin sidebar content",
    "sidebar.pin.title": "Pin sidebar content",
    "sidebar.section.adjacency": "Adjacency (typed edges)",
    "sidebar.section.children": "Children",
    "sidebar.section.parents": "Parents",
    "sidebar.standardsBody.companyRefs": "Controlling parties (company_refs)",
    "sidebar.standardsBody.governance": "Governance",
    "sidebar.standardsBody.members": "Members",
    "sidebar.standardsBody.name": "Organization name",
    "sidebar.standardsBody.nameField": "Organization name",
    "sidebar.standardsBody.openness": "Openness",
    "sidebar.standardsBody.outOfGraph": "(off-graph)",
    "sidebar.standardsBody.stewardship": "Stewardship",
    "sidebar.standardsBody.title": "Standards body",
    "sidebar.status.provisional": "provisional / pending confirmation",
    "status.loadRenderFailed": "Load/render failed:",
    "status.loaded": "Loaded {nodes} nodes and {edges} typed edges. Both roots are open one level — double-click a node to go deeper.",
    "status.loadingSchema": "Loading graph…",
    "status.nodeCollapsed": "is collapsed and hidden",
    "status.nodeCollapsed.hint": "Double-click its parent module to expand first.",
    "status.nodeNotInView": "is not currently in view",
    "status.nodeNotInView.hint": "Double-click the module to expand first.",
    "tooltip.compound.collapsed": "Collapsed · double-click to expand",
    "tooltip.compound.expanded": "Expanded · double-click to collapse",
    "tooltip.edge.aggregated": "raw edges",
    "tooltip.edge.aggregated.prefix": "Aggregated",
    "tooltip.edge.fabricDomain": "Fabric domain:",
    "tooltip.edge.layering": "Layering:",
    "tooltip.label.parent": "Parent:",
    "tooltip.label.references": "References:",
    "tooltip.label.status": "Status:",
    "tooltip.parent.root": "Root node",
    "tooltip.status.provisional": "provisional",
    "vocab.governance.consortium": "Consortium",
    "vocab.governance.foundation": "Foundation",
    "vocab.governance.multiBody": "Multi-body",
    "vocab.governance.sdo": "Standards development organization",
    "vocab.governance.singleVendor": "Single vendor",
    "vocab.governance.vendorPair": "Vendor pair",
    "vocab.openness.licensed": "Licensed",
    "vocab.openness.proprietary": "Proprietary",
    "vocab.openness.royaltyFree": "Royalty-free",
    "vocab.stewardship.hosted": "Foundation-hosted",
    "vocab.stewardship.vendorStewarded": "Vendor-stewarded",
    }
  };

  function lang() { return LANG; }

  // Missing key falls back to the key itself, so nothing ever renders undefined.
  function t(key, vars) {
    var s = STRINGS[LANG][key];
    if (s === undefined) return key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, name) {
        return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
      });
    }
    return s;
  }

  // Data-layer language maps (node label / description).
  function pick(field, fallback) {
    if (!field) return fallback || "";
    return field[LANG] || fallback || "";
  }

  // No second language ships in this snapshot.
  function pickOther() { return ""; }

  function applyI18n(root) {
    var scope = root || global.document;
    if (!scope || !scope.querySelectorAll) return;
    scope.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      el.innerHTML = t(el.getAttribute("data-i18n-html"));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    if (scope.documentElement) scope.documentElement.setAttribute("lang", LANG);
  }

  global.I18N = {
    t: t, lang: lang,
    pick: pick, pickOther: pickOther, applyI18n: applyI18n,
    STRINGS: STRINGS
  };
  global.t = t;
})(window);
