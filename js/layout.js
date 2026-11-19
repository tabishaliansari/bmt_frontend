/*
 * Layout controller.
 *   L-phone : full-bleed app (real phones)
 *   L-frame : phone mockup in a device frame, scaled to fit the window
 *   L-desk  : desktop web layout (sidebar, grids, modals). On windows narrower
 *             than 1024px it renders at 1280px and scales down, so you can
 *             preview the true desktop layout anywhere.
 * The user's choice (auto / mobile / desktop) is remembered in localStorage.
 */
window.BMT = window.BMT || {};

(function () {
  const KEY = "bmt:view";
  const FRAME_W = 393 + 26, FRAME_H = 852 + 26; // device + bezel
  const DESK_W = 1280;
  const RAIL = 84; // width reserved for the preview rail (left edge + rail + gap)
  const body = document.body;
  const dev = document.querySelector(".device");

  const getPref = () => { try { return localStorage.getItem(KEY) || "auto"; } catch { return "auto"; } };
  const setPref = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

  function resolve(pref, vw) {
    if (pref === "desktop") return "desk";
    if (pref === "mobile") return vw <= 500 ? "phone" : "frame";
    return vw >= 1024 ? "desk" : vw <= 500 ? "phone" : "frame";
  }

  let current = null;
  function apply() {
    const vw = window.innerWidth, vh = window.innerHeight, pref = getPref();
    const L = resolve(pref, vw);
    body.classList.remove("L-phone", "L-frame", "L-desk", "L-wide");
    body.classList.add("L-" + L);
    Object.assign(dev.style, { transform: "", width: "", height: "", transformOrigin: "" });

    if (L === "frame") {
      const s = Math.min(1, (vh - 32) / FRAME_H, (vw - 2 * RAIL) / FRAME_W); // keep the phone clear of the rail on both sides
      dev.style.transform = `scale(${s})`;
    }
    if (L === "desk") {
      let effective = vw;
      if (vw < 1024) {
        const s = vw / DESK_W;
        effective = DESK_W;
        Object.assign(dev.style, { width: DESK_W + "px", height: vh / s + "px", transform: `scale(${s})`, transformOrigin: "top left" });
      }
      if (effective >= 1440) body.classList.add("L-wide");
    }

    // Switcher: hidden on a real phone in its natural layout (it lives in You/Profile there)
    bar.hidden = L === "phone";
    bar.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === (L === "desk" ? "desktop" : "mobile")));

    if (current && current !== L && BMT.router) BMT.router.refresh();
    current = L;
  }

  // ---------------------------------------------------------------- switcher pill
  const phoneIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 18.5h3"/></svg>';
  const deskIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>';
  const sunIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const moonIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';
  const bar = document.createElement("div");
  bar.className = "viewbar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", "Preview layout");
  bar.innerHTML = `<button data-view="mobile" title="Mobile view">${phoneIcon}<span>Mobile</span></button><button data-view="desktop" title="Desktop view">${deskIcon}<span>Desktop</span></button><span class="vb-sep"></span><button data-theme-toggle></button>`;
  document.body.appendChild(bar);
  bar.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.hasAttribute("data-theme-toggle")) return setTheme(isDark() ? "light" : "dark");
    setView(b.dataset.view);
  });

  function setView(v) {
    // Picking the layout the window would choose anyway resets to "auto"
    const natural = resolve("auto", window.innerWidth) === "desk" ? "desktop" : "mobile";
    setPref(v === natural ? "auto" : v);
    apply();
  }


  // ---------------------------------------------------------------- theme (auto / light / dark)
  const TKEY = "bmt:theme";
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const getTheme = () => { try { return localStorage.getItem(TKEY) || "auto"; } catch { return "auto"; } };
  const isDark = () => { const t = getTheme(); return t === "dark" || (t === "auto" && mq.matches); };
  function applyTheme() {
    const dark = isDark();
    body.classList.toggle("T-dark", dark);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#000000" : "#FFFFFF");
    const tb = bar.querySelector("[data-theme-toggle]");
    if (tb) { tb.innerHTML = dark ? sunIcon : moonIcon; tb.title = dark ? "Switch to light" : "Switch to dark"; tb.setAttribute("aria-label", tb.title); }
  }
  function setTheme(t) {
    try { localStorage.setItem(TKEY, t); } catch {}
    applyTheme(); // pure CSS swap: screen state, scroll and open sheets survive
  }
  mq.addEventListener ? mq.addEventListener("change", applyTheme) : mq.addListener(applyTheme);
  applyTheme();

  let t;
  window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(apply, 60); });
  apply();

  BMT.theme = { get: getTheme, set: setTheme, isDark };
  BMT.layout = { apply, setView, getPref, isDesktop: () => body.classList.contains("L-desk"), isPhone: () => body.classList.contains("L-phone") };
})();
