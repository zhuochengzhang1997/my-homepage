/**
 * Axis-locked layout nudge. Dev-only. Not site chrome.
 *
 * Dormant until Alt+N or `?nudge=1`. Offsets are extra `transform` on top of
 * shipping CSS, kept in localStorage until the owner asks to lock. To mark a
 * new piece on any page: open the overlay, then "Mark next click".
 */
const STORAGE_KEY = "zz.layoutNudge.v3";
const STEP = 8;
const FINE = 1;

type Axis = "x" | "y";
type Offset = { x: number; y: number };

type Store = {
  axis: Axis;
  offsets: Record<string, Offset>;
};

const emptyOffset = (): Offset => ({ x: 0, y: 0 });

const readStore = (): Store => {
  const fallback: Store = { axis: "y", offsets: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Store>;
    return {
      axis: parsed.axis === "x" ? "x" : "y",
      offsets: parsed.offsets ?? {},
    };
  } catch {
    return fallback;
  }
};

const writeStore = (store: Store) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const targets = () => [...document.querySelectorAll<HTMLElement>("[data-nudge]")];

const labelOf = (el: HTMLElement) => el.dataset.nudgeLabel ?? el.dataset.nudge ?? "item";

const applyOffset = (el: HTMLElement, offset: Offset) => {
  el.style.setProperty("--nudge-x", `${offset.x}px`);
  el.style.setProperty("--nudge-y", `${offset.y}px`);
  if (offset.x === 0 && offset.y === 0) {
    el.style.removeProperty("transform");
    return;
  }
  el.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
};

const start = () => {
  const store = readStore();
  let axis: Axis = store.axis;
  let selected: HTMLElement | null = null;
  let dragging = false;
  let marking = false;
  let dragOrigin = 0;
  let dragStart = 0;
  let markCount = 0;

  const root = document.documentElement;
  const list = () => targets();

  const style = document.createElement("style");
  style.textContent = `
    html.layout-nudge-on [data-nudge] {
      outline: 1px dashed rgb(37 99 235 / 0.45);
      outline-offset: 4px;
      user-select: none;
    }
    html.layout-nudge-on [data-nudge][data-nudge-active] {
      outline: 2px solid rgb(37 99 235);
      outline-offset: 4px;
    }
    html.layout-nudge-on[data-nudge-axis="x"] [data-nudge][data-nudge-active] {
      cursor: ew-resize;
    }
    html.layout-nudge-on[data-nudge-axis="y"] [data-nudge][data-nudge-active] {
      cursor: ns-resize;
    }
    html.layout-nudge-on.layout-nudge-mark {
      cursor: crosshair;
    }
    #layout-nudge {
      position: fixed;
      z-index: 2147483000;
      right: 16px;
      bottom: 16px;
      display: grid;
      gap: 8px;
      width: 272px;
      padding: 12px;
      border: 1px solid rgb(255 255 255 / 0.12);
      border-radius: 8px;
      background: rgb(24 24 27 / 0.94);
      box-shadow: 0 12px 32px rgb(0 0 0 / 0.28);
      color: #f4f4f5;
      font: 12px/1.4 ui-sans-serif, system-ui, sans-serif;
    }
    #layout-nudge[hidden] { display: none; }
    #layout-nudge h2 {
      margin: 0;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #a1a1aa;
    }
    #layout-nudge .ln-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    #layout-nudge button,
    #layout-nudge .ln-chip {
      margin: 0;
      padding: 4px 8px;
      border: 1px solid rgb(255 255 255 / 0.16);
      border-radius: 4px;
      background: rgb(255 255 255 / 0.06);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    #layout-nudge button[aria-pressed="true"],
    #layout-nudge .ln-chip[aria-current="true"] {
      border-color: rgb(96 165 250);
      background: rgb(37 99 235 / 0.35);
    }
    #layout-nudge .ln-readout {
      font-variant-numeric: tabular-nums;
      color: #e4e4e7;
    }
    #layout-nudge .ln-hint {
      margin: 0;
      color: #a1a1aa;
    }
  `;
  document.head.append(style);

  for (const el of list()) {
    const id = el.dataset.nudge;
    if (!id) continue;
    const saved = store.offsets[id] ?? emptyOffset();
    store.offsets[id] = saved;
    applyOffset(el, saved);
  }

  const panel = document.createElement("aside");
  panel.id = "layout-nudge";
  panel.hidden = true;
  panel.setAttribute("aria-hidden", "true");
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Layout nudge");
  panel.innerHTML = `
    <h2>Axis nudge · local only</h2>
    <div class="ln-row" role="radiogroup" aria-label="Axis">
      <button type="button" data-axis="x" aria-pressed="false">Horizontal</button>
      <button type="button" data-axis="y" aria-pressed="false">Vertical</button>
    </div>
    <div class="ln-row" data-chips></div>
    <p class="ln-readout" data-readout>Click a piece, then move.</p>
    <div class="ln-row">
      <button type="button" data-step="-">−8</button>
      <button type="button" data-step="+">+8</button>
      <button type="button" data-reset="one">Reset this</button>
      <button type="button" data-reset="all">Reset all</button>
    </div>
    <div class="ln-row">
      <button type="button" data-mark>Mark next click</button>
      <button type="button" data-copy>Copy offsets</button>
      <button type="button" data-hide>Hide</button>
    </div>
    <p class="ln-hint">Alt+N opens this. Arrows 8px, Shift 1px. Drag on one axis. Mark next click tags a new piece on any page.</p>
  `;
  document.body.append(panel);

  const chipRow = panel.querySelector("[data-chips]");

  const addChip = (el: HTMLElement) => {
    if (!chipRow) return;
    const id = el.dataset.nudge ?? "";
    if ([...chipRow.querySelectorAll<HTMLButtonElement>(".ln-chip")].some((chip) => chip.dataset.select === id)) {
      return;
    }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "ln-chip";
    chip.dataset.select = id;
    chip.textContent = labelOf(el);
    chipRow.append(chip);
  };

  for (const el of list()) addChip(el);

  const persist = () => {
    writeStore({ axis, offsets: store.offsets });
  };

  const setAxis = (next: Axis) => {
    axis = next;
    root.dataset.nudgeAxis = next;
    for (const button of panel.querySelectorAll<HTMLButtonElement>("[data-axis]")) {
      button.setAttribute("aria-pressed", String(button.dataset.axis === next));
    }
    persist();
  };

  const renderReadout = () => {
    const node = panel.querySelector("[data-readout]");
    if (!node) return;
    if (marking) {
      node.textContent = "Click the piece to mark.";
      return;
    }
    if (!selected) {
      node.textContent = "Click a piece, then move.";
      return;
    }
    const offset = offsetOf(selected);
    node.textContent = `${labelOf(selected)}  X ${offset.x} · Y ${offset.y}  (${axis === "x" ? "horizontal" : "vertical"})`;
  };

  const setSelected = (el: HTMLElement | null) => {
    selected?.removeAttribute("data-nudge-active");
    selected = el;
    selected?.setAttribute("data-nudge-active", "");
    for (const chip of panel.querySelectorAll<HTMLButtonElement>(".ln-chip")) {
      if (chip.dataset.select === el?.dataset.nudge) {
        chip.setAttribute("aria-current", "true");
      } else {
        chip.removeAttribute("aria-current");
      }
    }
    renderReadout();
  };

  const offsetOf = (el: HTMLElement) => {
    const id = el.dataset.nudge;
    if (!id) return emptyOffset();
    store.offsets[id] ??= emptyOffset();
    return store.offsets[id];
  };

  const nudge = (el: HTMLElement, delta: number) => {
    const offset = offsetOf(el);
    if (axis === "x") offset.x += delta;
    else offset.y += delta;
    applyOffset(el, offset);
    persist();
    renderReadout();
  };

  const setMarking = (on: boolean) => {
    marking = on;
    root.classList.toggle("layout-nudge-mark", on);
    const button = panel.querySelector<HTMLButtonElement>("[data-mark]");
    button?.setAttribute("aria-pressed", String(on));
    renderReadout();
  };

  const setPanel = (open: boolean) => {
    panel.hidden = !open;
    panel.setAttribute("aria-hidden", String(!open));
    root.classList.toggle("layout-nudge-on", open);
    if (!open) setMarking(false);
  };

  const markElement = (from: HTMLElement) => {
    const hit =
      from.closest<HTMLElement>("[data-nudge]") ??
      from.closest<HTMLElement>("figure, h1, h2, h3, p, ul, ol, article, section, header, footer, nav, aside, li") ??
      from;
    if (hit === document.body || hit === document.documentElement || panel.contains(hit)) return;
    if (!hit.dataset.nudge) {
      markCount += 1;
      const className = [...hit.classList][0];
      hit.dataset.nudge = className ? `${className}-${markCount}` : `mark-${markCount}`;
      hit.dataset.nudgeLabel = className ?? hit.tagName.toLowerCase();
    }
    store.offsets[hit.dataset.nudge] ??= emptyOffset();
    applyOffset(hit, store.offsets[hit.dataset.nudge]);
    addChip(hit);
    setSelected(hit);
    persist();
  };

  const copyReport = async () => {
    const lines = [
      `layout-nudge  viewport ${window.innerWidth}×${window.innerHeight}`,
      ...list().map((el) => {
        const id = el.dataset.nudge ?? "?";
        const offset = offsetOf(el);
        return `${id}\t${labelOf(el)}\tx=${offset.x}\ty=${offset.y}`;
      }),
    ];
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      const node = panel.querySelector("[data-readout]");
      if (node) node.textContent = "Copied. Tell the agent to lock when you are done.";
    } catch {
      const node = panel.querySelector("[data-readout]");
      if (node) node.textContent = text;
    }
  };

  panel.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement | null)?.closest("button");
    if (!button || !panel.contains(button)) return;

    if (button.dataset.axis === "x" || button.dataset.axis === "y") {
      setAxis(button.dataset.axis);
      return;
    }
    if (button.dataset.select) {
      const el = list().find((item) => item.dataset.nudge === button.dataset.select);
      if (el) setSelected(el);
      return;
    }
    if (button.dataset.step && selected) {
      nudge(selected, button.dataset.step === "+" ? STEP : -STEP);
      return;
    }
    if (button.dataset.reset === "one" && selected) {
      const offset = offsetOf(selected);
      offset.x = 0;
      offset.y = 0;
      applyOffset(selected, offset);
      persist();
      renderReadout();
      return;
    }
    if (button.dataset.reset === "all") {
      for (const el of list()) {
        const offset = offsetOf(el);
        offset.x = 0;
        offset.y = 0;
        applyOffset(el, offset);
      }
      persist();
      renderReadout();
      return;
    }
    if (button.dataset.mark !== undefined) {
      setMarking(!marking);
      return;
    }
    if (button.dataset.copy !== undefined) {
      void copyReport();
      return;
    }
    if (button.dataset.hide !== undefined) {
      setPanel(false);
    }
  });

  const onPointerDown = (event: PointerEvent) => {
    if (!root.classList.contains("layout-nudge-on")) return;
    if (event.button !== 0) return;
    if (panel.contains(event.target as Node)) return;

    if (marking) {
      const from = event.target as HTMLElement | null;
      if (from) markElement(from);
      setMarking(false);
      event.preventDefault();
      return;
    }

    const hit = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-nudge]");
    if (!hit) return;

    setSelected(hit);
    dragging = true;
    dragOrigin = axis === "x" ? event.clientX : event.clientY;
    dragStart = axis === "x" ? offsetOf(hit).x : offsetOf(hit).y;
    hit.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (!dragging || !selected) return;
    const now = axis === "x" ? event.clientX : event.clientY;
    const next = Math.round(dragStart + (now - dragOrigin));
    const offset = offsetOf(selected);
    if (axis === "x") offset.x = next;
    else offset.y = next;
    applyOffset(selected, offset);
    renderReadout();
  };

  const onPointerUp = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    selected?.releasePointerCapture(event.pointerId);
    persist();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.altKey && (event.key === "n" || event.key === "N")) {
      event.preventDefault();
      setPanel(panel.hidden);
      return;
    }
    if (!root.classList.contains("layout-nudge-on")) return;
    if (event.key === "h" || event.key === "H") {
      setAxis("x");
      renderReadout();
      return;
    }
    if (event.key === "v" || event.key === "V") {
      setAxis("y");
      renderReadout();
      return;
    }
    if (!selected) return;
    const keys: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -1,
      ArrowDown: 1,
    };
    const sign = keys[event.key];
    if (!sign) return;

    const wantsX = event.key === "ArrowLeft" || event.key === "ArrowRight";
    if (wantsX !== (axis === "x")) return;

    event.preventDefault();
    nudge(selected, sign * (event.shiftKey ? FINE : STEP));
  };

  document.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("keydown", onKeyDown);

  setAxis(axis);
  setPanel(
    new URLSearchParams(location.search).has("nudge") ||
      document.querySelector("[data-nudge-start]") !== null,
  );
  renderReadout();
};

if (import.meta.env.DEV) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
}
