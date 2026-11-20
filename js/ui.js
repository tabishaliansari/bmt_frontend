/* BMT UI kit: icons, small components, sheets, toasts. Pure functions returning HTML strings. */
window.BMT = window.BMT || {};

(function () {
  const C = {
    // Theme-aware: these resolve per light/dark via CSS variables (see css/tokens.css)
    ink: "var(--ink)", ink2: "var(--ink-2)", sub: "var(--sub)", ter: "var(--ter)", line: "var(--line)", onInk: "var(--on-ink)",
    cut: "var(--cut)", cutT: "var(--cut-tint)", trust: "var(--trust)", trustT: "var(--trust-tint)", safe: "var(--safe)", safeT: "var(--safe-tint)", star: "#FFB020", tab: "#8E8E93",
  };

  // Cinematic gradients stand in for real thumbnails: the editors' work is the colour.
  const G = [
    "linear-gradient(135deg,#2B1055 0%,#7597DE 100%)",
    "linear-gradient(160deg,#0F2027 0%,#2C5364 100%)",
    "linear-gradient(135deg,#F7971E 0%,#B5179E 100%)",
    "linear-gradient(150deg,#11998E 0%,#38EF7D 100%)",
    "linear-gradient(135deg,#232526 0%,#414345 100%)",
    "linear-gradient(140deg,#FC5C7D 0%,#6A82FB 100%)",
    "linear-gradient(160deg,#1A2A6C 0%,#B21F1F 55%,#FDBB2D 100%)",
    "linear-gradient(135deg,#3A1C71 0%,#D76D77 60%,#FFAF7B 100%)",
    "linear-gradient(150deg,#000428 0%,#004E92 100%)",
    "linear-gradient(135deg,#C33764 0%,#1D2671 100%)",
  ];
  const AV = ["linear-gradient(135deg,#FF8A5B,#E2445C)", "linear-gradient(135deg,#5B8CFF,#7B4DFF)", "linear-gradient(135deg,#2BC48A,#0E8C7A)",
    "linear-gradient(135deg,#FFC24B,#FF7A2F)", "linear-gradient(135deg,#9B5BFF,#E04BB0)", "linear-gradient(135deg,#4AC7FF,#2E6BFF)"];

  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    orders: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    chev_r: '<path d="m9 6 6 6-6 6"/>', chev_l: '<path d="m15 6-6 6 6 6"/>', chev_d: '<path d="m6 9 6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 8 2.5 8h-17S6 15 6 9z"/><path d="M10 20.5h4"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"/>',
    heart: '<path d="M12 20s-7.5-4.8-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.2 12 20 12 20z"/>',
    share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v8h14v-8"/>',
    shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.9 7.5 9 4.3-1.1 7.5-4.4 7.5-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    book: '<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>',
    filter: '<path d="M4 7h16M7 12h10M10 17h4"/>',
    sparkle: '<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/>',
    studio: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9h18M8 5v4M16 5v4"/>',
    more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    cc: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M10 10.2a2.2 2.2 0 1 0 0 3.6M16.5 10.2a2.2 2.2 0 1 0 0 3.6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
    repeat: '<path d="M17 2.5 20.5 6 17 9.5"/><path d="M3.5 11.5V10a4 4 0 0 1 4-4h13M7 21.5 3.5 18 7 14.5"/><path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13"/>',
    send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    plusc: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8S10.5 3 8 4s.5 4 4 4zM12 8s1.5-5 4-4-.5 4-4 4z"/>',
  };
  const FILLED = {
    star: '<path d="M12 2.8l2.8 5.8 6.4.9-4.6 4.5 1.1 6.3L12 17.3l-5.7 3 1.1-6.3-4.6-4.5 6.4-.9z"/>',
    play: '<path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z"/>',
    heartf: '<path d="M12 20s-7.5-4.8-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.2 12 20 12 20z"/>',
  };
  const SEAL = "M12 1.8l2.4 1.7 2.9-.1 1 2.7 2.4 1.7-.8 2.8.8 2.8-2.4 1.7-1 2.7-2.9-.1L12 22.2l-2.4-1.7-2.9.1-1-2.7-2.4-1.7.8-2.8-.8-2.8 2.4-1.7 1-2.7 2.9.1z";

  const icon = (name, size = 22, color = C.ink, sw = 1.8) =>
    FILLED[name]
      ? `<svg width="${size}" height="${size}" viewBox="0 0 24 24" style="fill:${color}" aria-hidden="true">${FILLED[name]}</svg>`
      : `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="stroke:${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ""}</svg>`;

  const seal = (size = 16, attrs = "") =>
    `<svg ${attrs} width="${size}" height="${size}" viewBox="0 0 24 24" role="img" aria-label="Verified"><path style="fill:${C.trust}" d="${SEAL}"/><path d="m8 12.3 2.8 2.8L16.2 9.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const yt = (size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-label="YouTube"><rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0033"/><path d="M10 9v6l5-3z" fill="#fff"/></svg>`;
  const logo = (size = 28, tile = "var(--hero)") =>
    `<svg width="${size}" height="${size}" viewBox="0 0 32 32" aria-label="BMT"><rect width="32" height="32" rx="9" style="fill:${tile}"/><path d="M11.5 8h9l-4.5 5z" style="fill:${C.cut}"/><rect x="15" y="12" width="2" height="13" rx="1" style="fill:${C.cut}"/></svg>`;

  const av = (initials, i = 0, size = 36, ring = false) =>
    `<div class="avatar" style="width:${size}px;height:${size}px;background:${AV[i % AV.length]};font-size:${Math.round(size * 0.38)}px;${ring ? "box-shadow:0 0 0 3px var(--canvas);" : ""}">${initials}</div>`;

  const thumb = (g, w, h, r = 12, inner = "", extra = "") =>
    `<div class="thumb" style="width:${typeof w === "number" ? w + "px" : w};height:${h}px;border-radius:${r}px;background:${G[g % G.length]};${extra}">${inner}</div>`;
  const playBadge = (size = 15) => `<div class="play-badge"><div>${icon("play", size, "#fff")}</div></div>`;

  const chip = (text, cls = "", ic = "") => `<span class="chip ${cls}">${ic}${text}</span>`;
  const rating = (v, n) => `<span class="chip rating">${icon("star", 11, "#fff")}${v}${n ? ` <span style="font-weight:500;opacity:.85">(${n})</span>` : ""}</span>`;
  const tagChip = (tag) => tag === "best" ? chip("Bestseller", "best", icon("bolt", 11, C.cut, 2.2)) : tag === "try" ? chip("Try first", "try") : "";

  const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
  const usd = (n) => "US$" + Number(n).toFixed(2);
  // Escape text from users or Gemini before it goes into innerHTML.
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  // Calm, honest progress line for AI steps: cycles through messages, no fake percentages.
  function aiProgress(el, lines, ms = 2600) {
    let i = 0;
    const paint = () => (el.innerHTML = `<div class="ai-wait"><span class="ai-dot"></span><span>${lines[i % lines.length]}</span></div>`);
    paint();
    const t = setInterval(() => { i++; paint(); }, ms);
    return () => clearInterval(t);
  }
  const compact = (n) => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "K" : String(n);

  const TABS = {
    client: [["home", "Discover", "#/discover"], ["search", "Search", "#/search"], ["orders", "Orders", "#/orders"], ["chat", "Inbox", "#/inbox"], ["user", "You", "#/you"]],
    editor: [["studio", "Studio", "#/studio"], ["orders", "Orders", "#/studio-orders"], ["users", "Community", "#/community"], ["book", "Learn", "#/learn"], ["user", "Profile", "#/me"]],
  };
  const tabbar = (mode, active) =>
    `<nav class="tabbar">${TABS[mode].map(([ic, label, href]) => {
      const on = ic === active;
      return `<a href="${href}" class="${on ? "on" : ""}">${icon(ic, 25, on ? C.cut : C.tab, 1.9)}<span>${label}</span></a>`;
    }).join("")}</nav>`;

  // Desktop sidebar: same destinations as the tab bar, laid out vertically.
  const sidebar = (mode, active) => `
    <a href="#/" class="sb-brand">${logo(32)}<span>BMT</span></a>
    <nav class="sb-nav">${TABS[mode].map(([ic, label, href]) => {
      const on = ic === active;
      return `<a href="${href}" class="${on ? "on" : ""}">${icon(ic, 22, on ? C.cut : C.ink2, 1.9)}<span>${label}</span></a>`;
    }).join("")}</nav>
    <div class="sb-foot">
      ${mode === "client"
        ? `<div class="sb-me">${(() => { const me = BMT.api.currentUser(); return me ? `${av(esc(me.initials), 1, 36)}<div class="flex-1" style="min-width:0"><div style="font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(me.name)}</div><div class="cap">Client</div></div>` : BMT.api.needsSignIn() ? `${av("?", 1, 36)}<div class="flex-1"><a href="#/you" style="font-size:15px;font-weight:600;color:inherit;text-decoration:none">Sign in</a><div class="cap">Client</div></div>` : `${av("TA", 1, 36)}<div class="flex-1"><div style="font-size:15px;font-weight:600">Tabish A.</div><div class="cap">Client</div></div>`; })()}</div>
           <button class="sb-switch" data-mode="editor">${icon("swap", 16, C.sub, 2)}Switch to editor</button>`
        : `<div class="sb-me">${(() => { const me = BMT.api.currentUser(); return me ? `${av(esc(me.initials), 0, 36)}<div class="flex-1" style="min-width:0"><div style="font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(me.name)}</div><div class="cap">Editor</div></div>` : `${av("RK", 0, 36)}<div class="flex-1"><div class="row gap-4" style="font-size:15px;font-weight:600">Riya Kapoor${seal(14)}</div><div class="cap">Editor</div></div>`; })()}</div>
           <button class="sb-switch" data-mode="client">${icon("swap", 16, C.sub, 2)}Switch to client</button>`}
    </div>`;

  // ------------------------------------------------------------ toast
  let toastTimer;
  function toast(msg, ic = "") {
    const dev = document.querySelector(".device");
    let t = dev.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; dev.appendChild(t); }
    t.innerHTML = ic + msg;
    requestAnimationFrame(() => t.classList.add("show"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ------------------------------------------------------------ sheets
  function sheet({ body, foot = "", onMount, onClose, height } = {}) {
    const dev = document.querySelector(".device");
    const back = document.createElement("div");
    back.className = "sheet-backdrop";
    const el = document.createElement("div");
    el.className = "sheet";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    if (height) el.style.height = height;
    el.innerHTML = `<div class="grabber"></div><div class="sheet-body">${body}</div>${foot ? `<div class="sheet-foot">${foot}</div>` : ""}`;
    dev.append(back, el);
    requestAnimationFrame(() => { back.classList.add("open"); el.classList.add("open"); });
    const close = () => {
      back.classList.remove("open"); el.classList.remove("open");
      setTimeout(() => { back.remove(); el.remove(); }, 380);
      onClose && onClose();
      document.removeEventListener("keydown", onKey);
    };
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    back.addEventListener("click", close);
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    // swipe down to dismiss
    let startY = null;
    el.querySelector(".grabber").addEventListener("pointerdown", (e) => { startY = e.clientY; });
    el.addEventListener("pointerup", (e) => { if (startY !== null && e.clientY - startY > 60) close(); startY = null; });
    onMount && onMount(el, close);
    return { el, close };
  }

  // ------------------------------------------------------------ long-press (Haptic Touch style)
  function onLongPress(node, fn, ms = 420) {
    let t, fired = false;
    node.addEventListener("pointerdown", () => { fired = false; t = setTimeout(() => { fired = true; navigator.vibrate && navigator.vibrate(10); fn(); }, ms); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => node.addEventListener(ev, () => clearTimeout(t)));
    node.addEventListener("click", (e) => { if (fired) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
    node.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function peek(g, title, sub) {
    const dev = document.querySelector(".device");
    const el = document.createElement("div");
    el.className = "peek";
    el.innerHTML = `<div class="reel" style="background:${G[g % G.length]}"><div class="progress-anim"></div>
      <div style="position:absolute;left:16px;right:16px;bottom:18px;color:#fff"><div style="font-size:17px;font-weight:700">${title}</div><div style="font-size:13px;opacity:.85">${sub}</div></div></div>`;
    el.addEventListener("click", () => el.remove());
    dev.appendChild(el);
    setTimeout(() => el.remove(), 6200);
  }

  const statusBar = (light = false) => `
    <div class="status ${light ? "light" : ""}"><span class="time">9:41</span><div class="icons">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5 10.4 9a3.4 3.4 0 0 0-4.8 0z" fill="currentColor"/><path d="M3.8 7.2a6 6 0 0 1 8.4 0M1.4 4.7a9.5 9.5 0 0 1 13.2 0" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>
      <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="23" height="12" rx="3.5" stroke="currentColor" stroke-opacity=".4" fill="none"/><rect x="2" y="2" width="19" height="9" rx="2" fill="currentColor"/><rect x="24.5" y="4.5" width="1.6" height="4" rx=".8" fill="currentColor" fill-opacity=".45"/></svg>
    </div></div>`;

  const isDesktop = () => document.body.classList.contains("L-desk");

  BMT.ui = { C, G, icon, seal, yt, logo, av, thumb, playBadge, chip, rating, tagChip, inr, usd, esc, aiProgress, compact, tabbar, sidebar, toast, sheet, onLongPress, peek, statusBar, isDesktop };
})();
