/* Accessibility: display settings, screen-reader announcements, skip link, focus handling. */
window.BMT = window.BMT || {};

(function () {
  const KEY = "bmt:a11y";
  const DEFAULTS = { large_text: false, high_contrast: false, readable_font: false, reduce_motion: false };
  const CLASSES = { large_text: "A-large", high_contrast: "A-contrast", readable_font: "A-font", reduce_motion: "A-motion" };
  const FONT_URL = "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap";

  const read = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...DEFAULTS }; } };
  let prefs = read();

  function loadFont() {
    if (document.getElementById("a11y-font")) return;
    const link = Object.assign(document.createElement("link"), { id: "a11y-font", rel: "stylesheet", href: FONT_URL });
    document.head.appendChild(link);
  }
  function apply() {
    Object.entries(CLASSES).forEach(([k, cls]) => document.body.classList.toggle(cls, !!prefs[k]));
    if (prefs.readable_font) loadFont();
  }
  function keep(next) {
    prefs = { ...DEFAULTS, ...next };
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
    apply();
  }

  /** Change one setting; follows the account when signed in. */
  function set(key, value) {
    keep({ ...prefs, [key]: !!value });
    BMT.api.saveA11y(prefs);
  }

  // ---- screen-reader announcements (one polite live region for the whole app)
  const live = Object.assign(document.createElement("div"), { id: "a11y-live", className: "sr-only" });
  live.setAttribute("aria-live", "polite");
  live.setAttribute("role", "status");
  document.body.appendChild(live);
  function announce(msg) {
    live.textContent = "";
    setTimeout(() => { live.textContent = msg; }, 60);
  }

  // ---- skip link: jump past the navigation to the screen's main heading
  const skip = Object.assign(document.createElement("button"), { className: "skip-link", textContent: "Skip to content" });
  document.body.prepend(skip);
  skip.addEventListener("click", () => focusScreen());

  /** Move focus to the current screen's heading (after a navigation), and name the page. */
  function focusScreen() {
    const root = document.querySelector("#screen .screen");
    if (!root) return;
    const target = root.querySelector("h1, .large-title, .title-1, .title-2, .h2") || root;
    const label = (target.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
    if (label && target !== root) document.title = label + " · BMT";
    target.setAttribute("tabindex", "-1");
    target.classList.add("screen-focus");
    target.focus({ preventScroll: true });
  }

  // ---- focus trap for dialogs (sheets, tour). Returns a release function that restores focus.
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';
  function trap(el, first) {
    const before = document.activeElement;
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null || n === document.activeElement);
    const onKey = (e) => {
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) { e.preventDefault(); return; }
      const a = list[0], z = list[list.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => { const f = first || items()[0]; f && f.focus({ preventScroll: true }); }, 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }

  apply();
  // The account's settings win once we know who is signed in.
  BMT.api.ready.finally(() => { const p = BMT.api.profile(); if (p && p.a11y) keep(p.a11y); });

  BMT.a11y = { get: () => ({ ...prefs }), set, announce, focusScreen, trap, reload: () => { const p = BMT.api.profile(); if (p && p.a11y) keep(p.a11y); } };
})();
