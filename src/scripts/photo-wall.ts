/**
 * Photo wall interactions — the horizontal strip on /studio/.
 *
 * Progressive enhancement only. The strip is a native horizontal scroller, so
 * without this file it still works with shift+wheel, a trackpad, touch, and the
 * scrollbar. What is added here: a plain wheel scrolls the wall sideways, a
 * pointer can drag it, and the arrow keys step one photograph at a time.
 *
 * The wheel handler deliberately stops short of trapping the reader: once the
 * strip has reached the end it is scrolling toward, the event is left alone and
 * the page scrolls as usual.
 */

// Marks this file as a module so its top-level names stay out of the global
// script scope that `site-interactions.ts` occupies.
export {};

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Pointer travel, in px, past which a press counts as a drag and not a click. */
const DRAG_THRESHOLD = 3;

/** Wheel deltas arrive in lines or pages on some mice; normalise to pixels. */
const wheelPixels = (event: WheelEvent, strip: HTMLElement) => {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * strip.clientWidth;
  return event.deltaY;
};

const setupStrip = (strip: HTMLElement) => {
  const mats = Array.from(strip.querySelectorAll<HTMLElement>("[data-photo-mat]"));

  const maxScroll = () => Math.max(0, strip.scrollWidth - strip.clientWidth);

  /**
   * Scroll offsets that put each mat against the inner (padded) start edge.
   * Recomputed on demand because `--photo-row` is viewport-dependent.
   */
  const matOffsets = () => {
    const origin = strip.getBoundingClientRect().left - strip.scrollLeft;
    const inset = Number.parseFloat(getComputedStyle(strip).paddingInlineStart) || 0;
    const offsets = mats.map((mat) =>
      Math.round(mat.getBoundingClientRect().left - origin - inset),
    );
    return [...new Set(offsets)].sort((a, b) => a - b);
  };

  // The right-edge fade says "there is more". It has nothing left to say once
  // the reader is at the end, and a strip that does not overflow never fades.
  // Painted directly on every scroll event: a class toggle that does not change
  // costs nothing, and a requestAnimationFrame gate would leave the fade stale
  // whenever the tab is in the background, where frames do not run.
  const paintEdges = () => {
    const max = maxScroll();
    strip.classList.toggle("is-at-end", max <= 1 || strip.scrollLeft >= max - 1);
  };
  const scheduleEdges = paintEdges;

  strip.addEventListener("scroll", scheduleEdges, { passive: true });
  window.addEventListener("resize", scheduleEdges, { passive: true });
  paintEdges();

  strip.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return; // pinch zoom
      // A trackpad already scrolling sideways needs no help.
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;

      const delta = wheelPixels(event, strip);
      if (delta === 0) return;

      const max = maxScroll();
      if (max <= 0) return;

      const atStart = strip.scrollLeft <= 0 && delta < 0;
      const atEnd = strip.scrollLeft >= max - 1 && delta > 0;
      if (atStart || atEnd) return; // hand the wheel back to the page

      event.preventDefault();
      strip.scrollBy({ left: delta, behavior: "auto" });
    },
    { passive: false },
  );

  let pointerId: number | undefined;
  let originX = 0;
  let originScroll = 0;
  let travelled = 0;

  const endDrag = () => {
    if (pointerId === undefined) return;
    if (strip.hasPointerCapture(pointerId)) strip.releasePointerCapture(pointerId);
    pointerId = undefined;
    strip.classList.remove("is-dragging");
  };

  strip.addEventListener("pointerdown", (event) => {
    // Touch and pen already pan the scroller natively; only the mouse needs this.
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    pointerId = event.pointerId;
    originX = event.clientX;
    originScroll = strip.scrollLeft;
    travelled = 0;
  });

  strip.addEventListener("pointermove", (event) => {
    if (pointerId !== event.pointerId) return;

    const distance = event.clientX - originX;
    travelled = Math.max(travelled, Math.abs(distance));
    if (travelled <= DRAG_THRESHOLD) return;

    if (!strip.hasPointerCapture(pointerId)) {
      strip.setPointerCapture(pointerId);
      strip.classList.add("is-dragging");
    }

    strip.scrollTo({ left: originScroll - distance, behavior: "auto" });
  });

  strip.addEventListener("pointerup", endDrag);
  strip.addEventListener("pointercancel", endDrag);

  // Images are draggable by default, which would fight the drag-to-scroll.
  strip.addEventListener("dragstart", (event) => {
    if (pointerId !== undefined) event.preventDefault();
  });

  // A drag that happens to end over a photograph must not read as a click.
  strip.addEventListener(
    "click",
    (event) => {
      if (travelled <= DRAG_THRESHOLD) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  strip.addEventListener("keydown", (event) => {
    if (event.target !== strip) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const offsets = matOffsets();
    const here = strip.scrollLeft;

    switch (event.key) {
      case "ArrowRight":
        strip.scrollTo({ left: offsets.find((offset) => offset > here + 1) ?? maxScroll() });
        break;
      case "ArrowLeft":
        strip.scrollTo({ left: offsets.findLast((offset) => offset < here - 1) ?? 0 });
        break;
      case "Home":
        strip.scrollTo({ left: 0 });
        break;
      case "End":
        strip.scrollTo({ left: maxScroll() });
        break;
      default:
        return;
    }

    event.preventDefault();
  });

  // Smooth stepping is a motion preference, not a scrolling mechanism: the
  // wheel and drag paths above always ask for "auto" so they stay one-to-one
  // with the input. Only the keyboard inherits the stylesheet's behaviour.
  const applyScrollBehaviour = () => {
    strip.style.scrollBehavior = reduceMotion.matches ? "auto" : "";
  };
  applyScrollBehaviour();
  reduceMotion.addEventListener("change", applyScrollBehaviour);
};

const handlePageLoad = () => {
  document.querySelectorAll<HTMLElement>("[data-photo-wall]").forEach(setupStrip);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handlePageLoad);
} else {
  handlePageLoad();
}
