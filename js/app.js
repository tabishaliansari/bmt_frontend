/* Hash router + app shell. Routes map to BMT.screens.* */
window.BMT = window.BMT || {};

(function () {
  const S = BMT.screens;
  const routes = [
    [/^\/?$/, (m, q) => (BMT.api.getMode() === "editor" ? S.studio : BMT.api.getMode() === "client" ? S.discover : S.welcome)(m, q)],
    [/^\/welcome$/, S.welcome],
    [/^\/discover$/, S.discover],
    [/^\/search$/, S.search],
    [/^\/editor\/([\w-]+)$/, S.editor],
    [/^\/orders$/, S.orders],
    [/^\/order\/([\w-]+)$/, S.order],
    [/^\/review\/([\w-]+)$/, S.review],
    [/^\/inbox$/, S.inbox],
    [/^\/you$/, S.you],
    [/^\/favs$/, S.favs],
    [/^\/studio$/, S.studio],
    [/^\/studio-orders$/, S.studioOrders],
    [/^\/add-credit$/, S.addCredit],
    [/^\/learn$/, S.learn],
    [/^\/community$/, S.community],
    [/^\/me$/, S.me],
  ];

  const host = document.getElementById("screen");
  const side = document.getElementById("sidebar");
  let cleanup = null, stack = [];

  // Which sidebar item a route belongs to, per mode
  const EDITOR_ROUTES = /^\/(studio|studio-orders|add-credit|learn|community|me)\b/;
  function navState(path) {
    if (/^\/(welcome)?$/.test(path) && !BMT.api.getMode()) return null; // welcome: no nav
    const mode = EDITOR_ROUTES.test(path) ? "editor" : (BMT.api.getMode() || "client");
    const map = mode === "client"
      ? [[/^\/(discover|editor)/, "home"], [/^\/search/, "search"], [/^\/(orders|order|review)/, "orders"], [/^\/inbox/, "chat"], [/^\/(you|favs)/, "user"]]
      : [[/^\/studio$/, "studio"], [/^\/studio-orders/, "orders"], [/^\/community/, "users"], [/^\/learn/, "book"], [/^\/(me|add-credit|editor)/, "user"]];
    const hit = map.find(([re]) => re.test(path));
    return { mode, active: hit ? hit[1] : mode === "editor" ? "studio" : "home" };
  }
  function renderNav(path) {
    const st = navState(path);
    document.body.classList.toggle("no-nav", !st);
    if (!st) { side.innerHTML = ""; return; }
    side.innerHTML = BMT.ui.sidebar(st.mode, st.active);
    side.querySelector(".sb-switch").addEventListener("click", (e) => {
      const m = e.currentTarget.dataset.mode; BMT.api.setMode(m);
      location.hash = m === "editor" ? "#/studio" : "#/discover";
    });
  }

  async function render(direction) {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path, qs] = raw.split("?");
    const query = new URLSearchParams(qs || "");
    let match = null, fn = S.notFound;
    for (const [re, f] of routes) { const m = path.match(re); if (m) { match = m.slice(1); fn = f; break; } }

    // close any open sheets/peeks from the previous screen
    document.querySelectorAll(".sheet, .sheet-backdrop, .peek").forEach((n) => n.remove());
    if (typeof cleanup === "function") cleanup();
    cleanup = null;

    renderNav(path);
    const view = await fn(match || [], query);
    const el = document.createElement("div");
    el.className = "screen" + (view.dark ? " dark" : "") + (direction ? " " + direction : "");
    el.innerHTML = view.html + (view.tabs || "");
    host.replaceChildren(el);

    // status bar colour follows the screen
    const light = view.dark || view.noStatusDark;
    document.querySelector(".status").classList.toggle("light", !!light);
    document.querySelector(".home-indicator").classList.toggle("light", !!view.dark);
    document.querySelector('meta[name="theme-color"]').setAttribute("content", view.dark || BMT.theme.isDark() ? "#000000" : "#FFFFFF");

    el.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", back));
    if (view.mount) cleanup = view.mount(el) || null;
  }

  function back() {
    if (stack.length > 1) history.back();
    else location.hash = BMT.api.getMode() === "editor" ? "#/studio" : "#/discover";
  }

  window.addEventListener("hashchange", () => {
    const h = location.hash;
    const isBack = stack.length > 1 && stack[stack.length - 2] === h;
    if (isBack) stack.pop(); else stack.push(h);
    render(isBack ? "enter-back" : "enter");
  });

  BMT.router = { refresh: () => render(), back };

  // boot
  document.querySelector(".device").insertAdjacentHTML("afterbegin", BMT.ui.statusBar());
  stack.push(location.hash || "#/");
  render();
})();
