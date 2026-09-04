/**
 * Site interactions.
 *
 * Jobs: the essay reading-progress bar (MOTION.md M4), focus management when
 * arriving at #contact, and returning from an essay to the index at the list
 * position the reader left. Content is fully visible without this file.
 * Scroll-reveals and route transitions were removed with Phase 8 (GR-009).
 */
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let teardownReadingProgress: (() => void) | undefined;

/**
 * Reading progress — the essay sheet only. MOTION.md M4: the meter may still
 * update under reduced motion (it is a value, not a flourish); fill easing
 * is not required.
 */
const setupReadingProgress = () => {
  teardownReadingProgress?.();
  teardownReadingProgress = undefined;

  if (!document.querySelector(".prose-article")) return;

  const track = document.createElement("div");
  track.className = "reading-progress";
  track.setAttribute("aria-hidden", "true");

  const bar = document.createElement("span");
  bar.className = "reading-progress__bar";
  track.append(bar);
  document.body.prepend(track);

  let frame = 0;

  const paint = () => {
    frame = 0;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    bar.style.transform = `scaleX(${progress})`;
    if (reduceMotion.matches) {
      bar.style.transition = "none";
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(paint);
  };

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  paint();

  teardownReadingProgress = () => {
    if (frame) cancelAnimationFrame(frame);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
    track.remove();
  };
};

/**
 * Contact is navigation to the site footer, which carries `id="contact"` on
 * every route. Focusing it with preventScroll moves keyboard and screen-reader
 * users to the same place sighted users land, without a second scroll
 * animation (MOTION.md X4).
 */
const focusContactTarget = () => {
  if (window.location.hash !== "#contact") return;
  const target = document.getElementById("contact");
  if (!target) return;

  requestAnimationFrame(() => target.focus({ preventScroll: true }));
};

const ESSAYS_FROM_INDEX = "essays:from-index";
const ESSAYS_INDEX_Y = "essays:index-y";
const ESSAYS_RESTORE = "essays:restore";

const isEssaysIndex = () => /^\/essays\/?$/.test(window.location.pathname);

const saveEssaysIndexScroll = () => {
  if (!isEssaysIndex()) return;
  sessionStorage.setItem(ESSAYS_INDEX_Y, String(window.scrollY));
};

const restoreEssaysIndexScroll = () => {
  if (sessionStorage.getItem(ESSAYS_RESTORE) !== "1") return;
  sessionStorage.removeItem(ESSAYS_RESTORE);
  const raw = sessionStorage.getItem(ESSAYS_INDEX_Y);
  if (raw == null) return;
  const top = Number(raw);
  if (Number.isNaN(top)) return;
  window.scrollTo(0, top);
};

/**
 * Remember that this tab left the Essays index, and the scroll offset there.
 * "All essays" uses history.back() so the browser can restore that offset
 * (no route fade — MOTION.md bucket C is still off). If back is unavailable,
 * the link's fragment still lands on this essay in the list.
 */
const setupEssaysIndexMemory = () => {
  if (!isEssaysIndex()) return;

  restoreEssaysIndexScroll();

  let frame = 0;
  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      saveEssaysIndexScroll();
    });
  };

  window.addEventListener("scroll", schedule, { passive: true });
  document.querySelectorAll<HTMLAnchorElement>(".essay-entry h2 a").forEach((link) => {
    link.addEventListener("pointerdown", saveEssaysIndexScroll, { passive: true });
  });
  window.addEventListener(
    "pagehide",
    () => {
      saveEssaysIndexScroll();
      sessionStorage.setItem(ESSAYS_FROM_INDEX, "1");
    },
    { once: true },
  );
};

const setupEssaysBackLink = () => {
  const back = document.querySelector<HTMLAnchorElement>("[data-essays-back]");
  if (!back) {
    if (!isEssaysIndex()) sessionStorage.setItem(ESSAYS_FROM_INDEX, "0");
    return;
  }

  back.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    if (sessionStorage.getItem(ESSAYS_FROM_INDEX) !== "1" || window.history.length < 2) {
      return;
    }

    sessionStorage.setItem(ESSAYS_RESTORE, "1");
    event.preventDefault();
    window.history.back();
  });
};

window.addEventListener("pageshow", (event) => {
  if (event.persisted) sessionStorage.removeItem(ESSAYS_RESTORE);
});

const handlePageLoad = () => {
  setupReadingProgress();
  focusContactTarget();
  setupEssaysIndexMemory();
  setupEssaysBackLink();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", handlePageLoad);
} else {
  handlePageLoad();
}
