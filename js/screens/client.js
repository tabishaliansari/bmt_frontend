/* Client-side screens: Welcome, Discover, Search, Editor storefront (+ sheets), Orders, Inbox, You */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, seal, yt, logo, av, thumb, playBadge, chip, rating, tagChip, inr, esc, tabbar, toast, sheet } = ui;
  const S = BMT.screens;
  BMT.cart = BMT.cart || null; // { editorId, itemId, addons:[], rush:false }

  // ---------------------------------------------------------------- 01 Welcome
  S.welcome = async () => {
    const cols = [[[0, 190, "1.2M"], [5, 150, "84K"]], [[2, 140, "3.4M"], [8, 200, "610K"]], [[3, 180, "2.1M"], [6, 160, "92K"]]];
    const tiles = cols.map((col, ci) => `<div style="flex:1;margin-top:${[0, -46, -18][ci]}px">${col.map(([g, h, v]) =>
      thumb(g, "100%", h, 18, `<div style="position:absolute;left:10px;bottom:10px;display:flex;align-items:center;gap:4px;color:#fff;font-size:12px;font-weight:600">${icon("play", 12, "#fff")}${v}</div>`, "margin-bottom:10px")).join("")}</div>`).join("");
    return {
      html: `
      <div class="w-tiles" style="position:absolute;top:calc(var(--safe-top) + 4px);left:16px;right:16px;display:flex;gap:10px;height:400px;overflow:hidden">${tiles}</div>
      <div class="w-fade" style="position:absolute;top:300px;left:0;right:0;height:170px;background:linear-gradient(180deg,transparent 0%,var(--canvas) 85%)"></div>
      <div class="w-copy" style="position:absolute;left:24px;right:24px;bottom:calc(200px + var(--safe-bottom))">
        <div class="row gap-8">${logo(30)}<span style="font-size:20px;font-weight:700;letter-spacing:-0.4px">BMT</span></div>
        <h1 class="large-title" style="margin-top:20px">Videos, edited.<br>By people with proof.</h1>
        <p class="body" style="color:var(--sub);margin-top:12px">Pick an editor by their real, verified work. Your money stays safe until you love the cut.</p>
      </div>
      <div class="w-cta" style="position:absolute;left:24px;right:24px;bottom:calc(40px + var(--safe-bottom));display:flex;flex-direction:column;gap:10px">
        <button class="btn primary" data-go="client">I need a video edited</button>
        <button class="btn secondary" data-go="editor">I'm an editor</button>
        <div class="sub" style="text-align:center;margin-top:6px">Have an account? <button style="color:var(--ink);font-weight:600" data-go="client" data-returning="1">Sign in</button></div>
      </div>`,
      mount(root) {
        root.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => {
          if (api.signInRequired()) {
            b.dataset.returning ? S.signInReturning() : S.enterRole(b.dataset.go);
            return;
          }
          const m = b.dataset.go; api.setMode(m);
          location.hash = m === "editor" ? "#/studio" : "#/discover";
        }));
      },
    };
  };

  // ---------------------------------------------------------------- shared editor card
  const editorCard = (e) => `
    <article class="pressable" data-editor="${e.id}" style="margin-top:14px" aria-label="${e.name}">
      ${thumb(e.cover, "100%", 188, 16, `
        <div style="position:absolute;left:12px;top:12px">${chip(e.views + " verified views", "scrim", icon("play", 10, "#fff"))}</div>
        <button class="fav" data-fav="${e.id}" style="position:absolute;right:10px;top:8px;padding:4px" aria-label="Save">${icon(api.getFavorites().includes(e.id) ? "heartf" : "heart", 22, "#fff")}</button>
        <span class="duration" style="right:12px;bottom:12px">0:42</span>`)}
      <div class="row gap-10" style="margin-top:10px">
        ${av(e.initials, e.av, 36)}
        <div class="flex-1">
          <div class="row gap-4 h3">${e.name}${seal(16)}</div>
          <div class="foot" style="margin-top:1px">${e.styles.join(", ")} · from ${inr(e.from)} · ${e.days}</div>
        </div>${rating(e.rating)}
      </div>
    </article>`;

  function wireEditorCards(root) {
    root.querySelectorAll("[data-editor]").forEach((card) => {
      card.addEventListener("click", (ev) => {
        const fav = ev.target.closest("[data-fav]");
        if (fav) {
          ev.stopPropagation();
          const on = api.toggleFavorite(fav.dataset.fav);
          fav.innerHTML = icon(on ? "heartf" : "heart", 22, "#fff");
          toast(on ? "Saved to favourites" : "Removed from favourites", icon(on ? "heartf" : "heart", 16, on ? C.cut : "#fff"));
          return;
        }
        location.hash = "#/editor/" + card.dataset.editor;
      });
      ui.onLongPress(card, async () => {
        const e = await api.getEditor(card.dataset.editor);
        ui.peek(e.cover, e.name + "'s showreel", "Release to close · tap the card to open profile");
      });
    });
  }
  S.editorCard = editorCard;
  S.wireEditorCards = wireEditorCards;

  // The package on this storefront that best fits the client's brief, or null.
  function briefMatch(e, brief) {
    if (!brief) return null;
    const words = new Set(brief.packageTitle.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const scored = e.menu
      .filter((m) => m.tag !== "try")
      .map((m) => ({ m, score: m.title.toLowerCase().split(/\W+/).filter((w) => words.has(w)).length }))
      .sort((a, b) => b.score - a.score);
    if (scored[0]?.score > 0) return scored[0].m.id;
    return e.categories.includes(brief.category) ? e.menu.find((m) => m.tag === "best")?.id || null : null;
  }

  // ---------------------------------------------------------------- 02 Discover
  S.discover = async (_, query) => {
    const cat = query.get("cat");
    const [cats, quick, editors] = await Promise.all([api.getCategories(), api.getQuickPackages(), api.getEditors({ category: cat })]);
    const hour = new Date().getHours();
    const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
    const tone = { cut: [C.cutT, C.cut], trust: [C.trustT, C.trust], safe: [C.safeT, C.safe] };
    const catLabel = cat ? cats.find((c) => c.id === cat)?.label : null;
    return {
      tabs: tabbar("client", "home"),
      html: `<div class="scroll" id="disc-scroll">
        <div id="surprise" style="height:0;overflow:hidden;text-align:center;font-size:13px;color:var(--sub);transition:height .2s">${icon("sparkle", 14, C.cut)} Release for “Surprise me”</div>
        <div class="between" style="margin-top:6px">
          <div><div class="cap" style="font-size:13px;font-weight:500">${greet}</div><h1 class="large-title">Discover</h1></div>
          <div class="row gap-12"><button class="icon-btn" id="bell" aria-label="Notifications">${icon("bell", 21)}</button><a href="#/you">${av("TA", 1, 36)}</a></div>
        </div>
        <a href="#/search" class="field" style="margin-top:12px;text-decoration:none">${icon("search", 18, C.tab)}<span style="color:${C.tab};flex:1">Editors, styles, “podcast clips”</span>${icon("filter", 18, C.tab)}</a>
        <a href="#/start" class="card-ink pressable start-hero" id="start-hero">
          <div class="icon-tile">${icon("sparkle", 22, C.cut, 2)}</div>
          <div class="flex-1"><div style="font-size:17px;font-weight:600">Start with your footage</div><div style="font-size:13px;opacity:.7;margin-top:2px">Gemini writes the brief</div></div>
          ${icon("chev_r", 18, "currentColor", 2.2)}
        </a>
        <h2 class="h2" style="margin-top:22px">What are you making?</h2>
        <div class="hscroll cats" style="gap:6px">${cats.map((c) => `
          <a href="#/discover${cat === c.id ? "" : "?cat=" + c.id}" style="display:flex;flex-direction:column;align-items:center;gap:7px;width:64px;flex-shrink:0;text-decoration:none">
            <div style="width:62px;height:62px;border-radius:50%;background:${ui.G[c.g]};display:flex;align-items:center;justify-content:center;${cat === c.id ? `box-shadow:0 0 0 2.5px var(--canvas),0 0 0 4.5px ${C.cut}` : ""}">${icon(c.icon, 24, "#fff")}</div>
            <span style="font-size:12px;font-weight:${cat === c.id ? 700 : 500};color:${cat === c.id ? C.ink : C.ink2}">${c.label}</span></a>`).join("")}</div>
        <div class="section-head"><h2 class="h2">Order in one tap</h2><a class="link" href="#/search">See all</a></div>
        <div class="hscroll quick">${quick.map((q) => `
          <a href="#/discover?cat=${q.category}" class="pressable" style="width:150px;flex-shrink:0;border-radius:16px;background:var(--grouped);padding:12px;text-decoration:none;color:inherit">
            <div class="icon-tile" style="background:${tone[q.tone][0]}">${icon(q.icon, 18, tone[q.tone][1])}</div>
            <div style="font-size:15px;font-weight:600;margin-top:10px">${q.title}</div>
            <div class="foot" style="margin-top:2px">from ${inr(q.from)} · ${q.eta}</div></a>`).join("")}</div>
        <div class="section-head"><h2 class="h2">${catLabel ? "Top editors for " + catLabel : "Top editors"}</h2>${cat ? `<a class="link" href="#/discover">Clear</a>` : `<span class="cap">Hold a card to preview</span>`}</div>
        <div class="ed-grid">${editors.length ? editors.map(editorCard).join("") : `<div class="empty">No editors in this category yet.</div>`}</div>
      </div>`,
      mount(root) {
        wireEditorCards(root);
        root.querySelector("#bell").addEventListener("click", () => toast("Riya replied to your order", icon("chat", 16, "#fff")));
        // Pull down to "Surprise me"
        const sc = root.querySelector("#disc-scroll"), hint = root.querySelector("#surprise");
        let y0 = null, pulled = 0;
        sc.addEventListener("pointerdown", (e) => { if (sc.scrollTop <= 0) y0 = e.clientY; });
        sc.addEventListener("pointermove", (e) => { if (y0 === null) return; pulled = Math.max(0, e.clientY - y0); hint.style.height = Math.min(pulled, 40) + "px"; });
        const end = async () => {
          if (y0 !== null && pulled > 50) {
            const all = await api.getEditors({ category: cat });
            const pick = all[Math.floor(Math.random() * all.length)];
            if (pick) location.hash = "#/editor/" + pick.id;
          }
          y0 = null; pulled = 0; hint.style.height = "0";
        };
        sc.addEventListener("pointerup", end); sc.addEventListener("pointerleave", end);
      },
    };
  };

  // ---------------------------------------------------------------- Search
  S.search = async () => {
    const editors = await api.getEditors();
    const suggestions = ["podcast clips", "wedding", "captions", "gaming", "colour grade", "Pune"];
    return {
      tabs: tabbar("client", "search"),
      html: `<div class="scroll">
        <h1 class="large-title" style="margin-top:6px">Search</h1>
        <label class="field" style="margin-top:12px">${icon("search", 18, C.tab)}<input id="q" type="search" placeholder="Editors, styles, “podcast clips”" autocomplete="off"></label>
        <div class="row gap-8" style="flex-wrap:wrap;margin-top:12px" id="sugg">${suggestions.map((s) => `<button class="pill-tab" style="background:var(--grouped);color:var(--ink2)">${s}</button>`).join("")}</div>
        <div id="results" class="ed-grid">${editors.map(editorCard).join("")}</div>
      </div>`,
      mount(root) {
        const input = root.querySelector("#q"), out = root.querySelector("#results");
        let t;
        const run = async () => {
          const list = await api.getEditors({ q: input.value.trim() });
          out.innerHTML = list.length ? list.map(editorCard).join("") : `<div class="empty">No editors match “${input.value}”.<br>Try a style like “reels”.</div>`;
          wireEditorCards(out);
        };
        input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(run, 150); });
        root.querySelectorAll("#sugg button").forEach((b) => b.addEventListener("click", () => { input.value = b.textContent; run(); }));
        wireEditorCards(out);
        setTimeout(() => input.focus(), 350);
      },
    };
  };

  // ---------------------------------------------------------------- 03 Editor storefront
  const menuItem = (m, added, matched) => `
    <div class="menu-item">
      <div class="flex-1">
        ${matched || m.tag ? `<div class="row gap-4" style="margin-bottom:6px;flex-wrap:wrap">${matched ? chip("Matches your brief", "best", icon("sparkle", 11, C.cut, 2.2)) : ""}${tagChip(m.tag)}</div>` : ""}
        <div class="h3">${m.title}</div>
        <div class="row gap-8" style="margin-top:4px"><span style="font-size:15px;font-weight:600">${inr(m.price)}</span><span style="color:var(--ter)">·</span><span class="row gap-4 foot">${icon("clock", 13, C.sub)}${m.eta}</span></div>
        <div class="foot" style="margin-top:6px">${m.desc}</div>
      </div>
      <div class="media">
        ${thumb(m.g, 112, 104, 14, playBadge())}
        <button class="add-btn ${added ? "added" : ""}" data-add="${m.id}" aria-label="Add ${m.title}">${added ? "ADDED" : "ADD" + icon("plus", 14, C.cut, 2.4)}</button>
      </div>
    </div>`;

  const starRow = (n) => Array.from({ length: 5 }, (_, i) => icon("star", 13, i < n ? C.star : C.line)).join("");

  S.editor = async ([id], query) => {
    const e = await api.getEditor(id);
    if (!e) return S.notFound();
    let tab = query.get("tab") || "menu";
    const isFav = api.getFavorites().includes(e.id);
    const brief = api.getActiveBrief();
    const matchId = briefMatch(e, brief);
    const briefBanner = () => brief ? `
      <div class="card-gray row gap-10" style="margin-top:14px;grid-column:1 / -1">${icon("sparkle", 18, C.cut, 2)}
        <div class="flex-1"><div style="font-size:15px;font-weight:600">Ordering for your brief</div><div class="foot">${esc(brief.title)} · attached to your order</div></div>
        <button class="link" id="drop-brief" style="font-size:15px">Remove</button></div>` : "";

    const tabContent = (t) => {
      if (t === "menu") return briefBanner() + e.menu.map((m) => menuItem(m, BMT.cart && BMT.cart.editorId === e.id && BMT.cart.itemId === m.id, m.id === matchId)).join("");
      if (t === "work") return `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:14px">${e.work.map((g) => thumb(g, "100%", 160, 6, `<div style="position:absolute;left:6px;bottom:6px;color:#fff;font-size:11px;font-weight:600" class="row gap-4">${icon("play", 10, "#fff")}${(Math.random() * 900 + 50).toFixed(0)}K</div>`, "cursor:pointer")).join("")}</div>`;
      if (t === "reviews") return `
        <div class="row gap-12" style="margin-top:16px"><div class="rounded-num" style="font-size:44px">${e.rating}</div><div><div class="row">${starRow(Math.round(e.rating))}</div><div class="foot">${e.ratingCount} reviews · only from paid orders</div></div></div>
        ${e.reviews.map((r) => `<div style="padding:14px 0;border-bottom:1px solid var(--line)"><div class="row gap-10">${av(r.name.slice(0, 1), r.av, 30)}<div class="flex-1"><div style="font-size:15px;font-weight:600">${r.name}</div><div class="cap">${r.item} · ${r.when}</div></div><div class="row">${starRow(r.stars)}</div></div><p class="body" style="font-size:15px;line-height:21px;margin-top:8px">${r.text}</p></div>`).join("")}`;
      if (t === "learn") return `<div class="empty">${icon("book", 28, C.ter)}<div style="margin-top:8px">${e.id === "riya" ? `<a class="link" href="#/learn">Retention Editing 101 · ₹1,499</a>` : "No courses yet."}</div></div>`;
      return "";
    };

    return {
      noStatusDark: true,
      html: `
      <div class="scroll store" style="padding:0 0 140px" id="ed-scroll">
        ${thumb(e.cover, "100%", 250, 0, `<div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35) 0%,rgba(0,0,0,0) 40%,rgba(0,0,0,.25) 100%)"></div>
          <button id="reel" style="position:absolute;right:16px;bottom:44px">${chip("Showreel · 0:42", "scrim", icon("play", 10, "#fff"))}</button>`)}
        <div class="store-body" style="position:relative;margin-top:-28px;background:var(--canvas);border-radius:24px 24px 0 0;padding:0 16px">
          <div style="position:relative;top:-36px;height:40px">${av(e.initials, e.av, 76, true)}</div>
          <div class="between" style="margin-top:4px">
            <div class="flex-1"><h1 class="row gap-4" style="font-family:var(--font-display);font-size:24px;font-weight:700;letter-spacing:-0.6px">${e.name}<button id="verified" aria-label="See verified credits" style="padding:2px">${seal(20)}</button></h1>
              <div class="sub" style="margin-top:2px">@${e.handle} · ${e.styles.join(" & ")} · ${e.city}</div></div>
            <button id="rate">${rating(e.rating, e.ratingCount)}</button>
          </div>
          <button id="stats" style="display:flex;width:100%;margin-top:16px;padding:12px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)">
            ${[[e.credits, "verified credits"], [e.views, "views delivered"], [e.onTime + "%", "on time"]].map(([a, b]) => `<div style="flex:1;text-align:center"><div style="font-size:20px;font-weight:700;letter-spacing:-0.4px">${a}</div><div class="cap" style="margin-top:1px">${b}</div></div>`).join("")}
          </button>
          <div class="row gap-8 foot" style="margin-top:10px">${icon("chat", 14, C.sub)} Replies in ~${e.reply} <span style="color:var(--ter)">·</span> ${icon("shield", 14, C.safe)} <span style="color:var(--safe);font-weight:600">BMT Protected</span></div>
          <div class="seg" style="margin-top:14px" role="tablist">${["menu", "work", "reviews", "learn"].map((t) => `<button role="tab" data-tab="${t}" class="${t === tab ? "on" : ""}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}</div>
          <div id="tab-body">${tabContent(tab)}</div>
        </div>
      </div>
      <div class="store-top" style="position:absolute;top:calc(var(--safe-top) + 2px);left:16px;right:16px;display:flex;justify-content:space-between;z-index:20">
        <button class="glass" data-back aria-label="Back">${icon("chev_l", 20, "#fff", 2.2)}</button>
        <div class="row gap-10"><button class="glass" id="fav" aria-label="Save">${icon(isFav ? "heartf" : "heart", 19, "#fff", 2)}</button><button class="glass" id="share" aria-label="Share">${icon("share", 19, "#fff", 2)}</button></div>
      </div>
      <div id="cart-slot"></div>`,
      mount(root) {
        const body = root.querySelector("#tab-body");
        const setTab = (t) => {
          tab = t; body.innerHTML = tabContent(t);
          root.querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
          wireMenu();
        };
        root.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
        root.querySelector("#verified").addEventListener("click", () => creditsSheet(e));
        root.querySelector("#stats").addEventListener("click", () => creditsSheet(e));
        root.querySelector("#rate").addEventListener("click", () => { setTab("reviews"); root.querySelector("#tab-body").scrollIntoView({ behavior: "smooth" }); });
        root.querySelector("#reel").addEventListener("click", () => ui.peek(e.cover, e.name + "'s showreel", "0:42 · tap to close"));
        root.querySelector("#fav").addEventListener("click", (ev) => {
          const on = api.toggleFavorite(e.id);
          ev.currentTarget.innerHTML = icon(on ? "heartf" : "heart", 19, "#fff", 2);
          toast(on ? "Saved to favourites" : "Removed", icon(on ? "heartf" : "heart", 16, on ? C.cut : "#fff"));
        });
        root.querySelector("#share").addEventListener("click", async () => {
          const url = location.href;
          try { if (navigator.share) await navigator.share({ title: e.name + " on BMT", url }); else { await navigator.clipboard.writeText(url); toast("Link copied"); } } catch {}
        });

        const renderCart = () => {
          const slot = root.querySelector("#cart-slot");
          if (!BMT.cart || BMT.cart.editorId !== e.id) { slot.innerHTML = ""; return; }
          const total = api.quote(e.id, BMT.cart.itemId, BMT.cart);
          slot.innerHTML = `<button class="cart-bar" id="cart"><div class="flex-1" style="text-align:left"><div style="font-size:13px;opacity:.7">1 item</div><div style="font-size:17px;font-weight:600">${inr(total)}</div></div><div class="row gap-4" style="font-size:17px;font-weight:600">Review order${icon("chev_r", 18, "currentColor", 2.2)}</div></button>`;
          slot.querySelector("#cart").addEventListener("click", () => customizeSheet(e, BMT.cart.itemId, { onChange: renderAll }));
        };
        const renderAll = () => { if (tab === "menu") setTab("menu"); renderCart(); };
        function wireMenu() {
          const drop = root.querySelector("#drop-brief");
          drop && drop.addEventListener("click", () => { api.clearActiveBrief(); toast("Brief removed from this order"); BMT.router.refresh(); });
          root.querySelectorAll("[data-add]").forEach((b) => b.addEventListener("click", () => {
            const itemId = b.dataset.add;
            if (!BMT.cart || BMT.cart.editorId !== e.id || BMT.cart.itemId !== itemId) BMT.cart = { editorId: e.id, itemId, addons: [], rush: false };
            renderAll();
            customizeSheet(e, itemId, { onChange: renderAll });
          }));
        }
        wireMenu(); renderCart();
      },
    };
  };

  // ---------------------------------------------------------------- 04 Verified credits sheet
  function creditsSheet(e) {
    sheet({
      height: "86%",
      body: `
        <div class="between" style="margin-top:12px">
          <div class="row gap-8">${seal(28)}<span class="title-2">Verified credits</span></div>
          <button class="icon-btn gray" data-close aria-label="Close">${icon("x", 16, C.sub, 2.4)}</button>
        </div>
        <p class="sub" style="margin-top:10px">Every credit is confirmed by the channel that published it. View counts update daily from YouTube.</p>
        <div class="row gap-8" style="margin-top:16px">
          <div class="stat-box"><div class="v">${e.credits}</div><div class="cap">videos</div></div>
          <div class="stat-box"><div class="v">${e.channels}</div><div class="cap">channels</div></div>
          <div class="stat-box"><div class="v">${e.views}</div><div class="cap">total views</div></div>
        </div>
        <div class="between" style="margin-top:20px"><span class="h3">Most viewed</span><span class="row gap-4 sub">Sort${icon("chev_d", 14, C.sub, 2.2)}</span></div>
        ${e.creditList.map((c) => `
          <div class="list-row">
            ${thumb(c.g, 112, 63, 8, `<span class="duration" style="right:5px;bottom:5px;font-size:11px">${c.len}</span>`)}
            <div class="flex-1"><div style="font-size:15px;font-weight:600;line-height:19px">${c.title}</div>
              <div class="row gap-4 foot" style="margin-top:3px">${yt(14)}${c.channel}</div>
              <div class="row gap-8" style="font-size:12px;margin-top:3px"><span style="color:var(--ink2);font-weight:600">${c.views} views</span><span class="row" style="gap:2px;color:var(--safe);font-weight:600">${icon("check", 12, C.safe, 2.6)}Confirmed</span></div>
            </div>
          </div>`).join("")}
        <button id="how" class="row gap-4" style="margin:16px auto 0;font-size:15px;font-weight:600;color:var(--trust)">How verification works${icon("chev_r", 14, C.trust, 2.4)}</button>
        <div id="how-body" style="display:none;margin-top:12px" class="card-gray foot">
          1. The editor pastes a video link.<br>2. We pull public stats from YouTube.<br>3. The channel owner confirms with one tap.<br>4. Numbers refresh daily. Nobody can type their own view count.
        </div>`,
      onMount(el) { el.querySelector("#how").addEventListener("click", () => { const b = el.querySelector("#how-body"); b.style.display = b.style.display === "none" ? "block" : "none"; }); },
    });
  }

  // ---------------------------------------------------------------- 05 Customize order sheet
  async function customizeSheet(e, itemId, { onChange } = {}) {
    const item = e.menu.find((m) => m.id === itemId);
    const addons = await api.getAddons();
    const cart = BMT.cart;
    const files = [];
    const totalHTML = () => inr(api.quote(e.id, itemId, cart));
    const eta = item.eta;
    const brief = api.getActiveBrief();
    const footage = brief
      ? `<div class="h3" style="margin-top:20px">Your brief</div>
        <div class="card-gray row gap-10" style="margin-top:10px">${icon("sparkle", 18, C.cut, 2)}
          <div class="flex-1"><div style="font-size:15px;font-weight:600">${esc(brief.title)}</div><div class="cap">Written by Gemini from your clips · attached to this order</div></div>
          <a class="link" href="#/brief/${esc(brief.id)}" data-close style="font-size:15px">View</a></div>`
      : `<div class="h3" style="margin-top:20px">Your footage</div>
        <label class="dropzone" style="margin-top:10px">
          <div class="icon-tile" style="width:36px;height:36px;background:var(--cut-tint)">${icon("upload", 18, C.cut, 2)}</div>
          <div class="flex-1" id="file-label"><div style="font-size:15px;font-weight:600">Add clips or paste a Drive link</div><div class="cap">Uploads continue in the background</div></div>
          <input type="file" id="files" multiple accept="video/*" style="display:none">
        </label>`;

    sheet({
      height: "92%",
      body: `
        <div class="row gap-12" style="margin-top:16px">
          ${thumb(item.g, 52, 52, 12)}
          <div class="flex-1"><div style="font-size:20px;font-weight:700;letter-spacing:-0.4px">${item.title}</div><div class="row gap-4 foot">by ${e.name}${seal(13)}</div></div>
          <span style="font-size:20px;font-weight:700">${inr(item.price)}</span>
        </div>
        <div class="h3" style="margin-top:20px">Turnaround</div>
        <div class="row gap-10" style="margin-top:10px">
          <button class="choice ${!cart.rush ? "on" : ""}" data-rush="0"><div style="font-size:15px;font-weight:600">Standard</div><div class="foot">${eta} · included</div></button>
          <button class="choice ${cart.rush ? "on" : ""}" data-rush="1"><div class="row gap-4" style="font-size:15px;font-weight:600">${icon("bolt", 14, C.cut, 2.2)}Rush</div><div class="foot">24 hours · +${inr(api.RUSH_FEE)}</div></button>
        </div>
        <div class="h3" style="margin-top:20px">Make it yours</div>
        ${addons.map((a) => `
          <button class="list-row" style="width:100%;text-align:left;padding:11px 0" data-addon="${a.id}">
            <div class="icon-tile" style="background:var(--grouped)">${icon(a.icon, 18, C.ink2)}</div>
            <div class="flex-1"><div style="font-size:15px;font-weight:500">${a.title}</div><div class="cap">${a.sub}</div></div>
            <span style="font-size:15px;color:var(--ink2);margin-right:8px">+${inr(a.price)}</span>
            <span class="check ${cart.addons.includes(a.id) ? "on" : ""}">${cart.addons.includes(a.id) ? icon("check", 15, "#fff", 3) : ""}</span>
          </button>`).join("")}
        ${footage}
        <div class="h3" style="margin-top:20px">Notes for ${e.name.split(" ")[0]}</div>
        <textarea class="note" id="note" placeholder="Vibe, references, must-have moments…" style="margin-top:10px"></textarea>
        <button id="protect" style="margin-top:14px;width:100%;text-align:left;border-radius:14px;background:var(--safe-tint);padding:12px;display:flex;gap:10px;align-items:flex-start">
          ${icon("shield", 22, C.safe, 2)}
          <div style="font-size:13px;line-height:18px;color:var(--safe-ink)"><b style="font-weight:600">BMT Protected.</b> <span id="protect-amt">${totalHTML()}</span> stays with us until you approve the final cut. Missed deadline? Instant refund.</div>
        </button>`,
      foot: `<div><div class="foot">Total</div><div id="total" style="font-size:22px;font-weight:700;letter-spacing:-0.4px">${totalHTML()}</div></div>
             <button class="btn primary" id="place" style="flex:1;height:52px">Continue to payment</button>`,
      onMount(el, close) {
        const refresh = () => {
          el.querySelector("#total").textContent = totalHTML();
          el.querySelector("#protect-amt").textContent = totalHTML();
          onChange && onChange();
        };
        el.querySelectorAll("[data-rush]").forEach((b) => b.addEventListener("click", () => {
          cart.rush = b.dataset.rush === "1";
          el.querySelectorAll("[data-rush]").forEach((x) => x.classList.toggle("on", x === b));
          refresh();
        }));
        el.querySelectorAll("[data-addon]").forEach((b) => b.addEventListener("click", () => {
          const id = b.dataset.addon, on = !cart.addons.includes(id);
          cart.addons = on ? [...cart.addons, id] : cart.addons.filter((x) => x !== id);
          const box = b.querySelector(".check");
          box.classList.toggle("on", on); box.innerHTML = on ? icon("check", 15, "#fff", 3) : "";
          refresh();
        }));
        el.querySelector("#files")?.addEventListener("change", (ev) => {
          const list = [...ev.target.files];
          files.splice(0, files.length, ...list.map((f) => ({ name: f.name, size: f.size })));
          if (!list.length) return;
          const gb = (list.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(1);
          el.querySelector("#file-label").innerHTML = `<div style="font-size:15px;font-weight:600">${list[0].name}${list.length > 1 ? ` <span style="font-weight:400;color:var(--sub)">+ ${list.length - 1} more</span>` : ""}</div><div class="cap">${gb} GB · uploading in background</div>`;
        });
        el.querySelector("#protect").addEventListener("click", escrowSheet);
        el.querySelector("#place").addEventListener("click", async () => {
          if (api.needsSignIn()) {
            try { await api.signIn(); } catch (err) { if (err.code !== "auth/popup-closed-by-user") toast(esc(err.message)); return; }
          }
          const order = { editorId: e.id, itemId, addons: [...cart.addons], rush: cart.rush, note: el.querySelector("#note").value, briefId: brief?.id || null };
          close();
          S.checkoutSheet({ editor: e, item, order, brief });
        });
      },
    });
  }

  function escrowSheet(amount) {
    sheet({
      body: `<div style="margin-top:16px" class="row gap-8">${icon("shield", 28, C.safe, 2)}<span class="title-2">How your money is held</span></div>
        <div style="margin-top:16px">${[["You pay", "Money goes to BMT, not the editor."], ["Editor works", "They can see it's funded, so they start right away."], ["You approve", "Only your tap on Approve releases payment."], ["Missed deadline?", "Automatic, instant refund. No forms."]].map(([a, b], i) => `
          <div class="row gap-12" style="padding:10px 0;align-items:flex-start"><div style="width:26px;height:26px;border-radius:50%;background:var(--safe-tint);color:var(--safe);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0">${i + 1}</div><div><div class="h3" style="font-size:15px">${a}</div><div class="foot">${b}</div></div></div>`).join("")}</div>
        <button class="btn secondary" data-close style="margin-top:12px">Got it</button>`,
    });
  }
  S.escrowSheet = escrowSheet;

  // ---------------------------------------------------------------- Orders list
  S.orders = async () => {
    const orders = await api.getOrders();
    const editors = await api.getEditors();
    const name = (id) => editors.find((x) => x.id === id)?.name || id;
    const label = { editing: ["Editing", C.cut], review: ["Ready to review", C.trust], approved: ["Completed", C.safe], refunded: ["Refunded", C.sub] };
    return {
      tabs: tabbar("client", "orders"),
      html: `<div class="scroll">
        <h1 class="large-title" style="margin-top:6px">Orders</h1>
        ${orders.length ? orders.map((o) => `
          <a href="#/order/${o.id}" class="list-row" style="text-decoration:none;color:inherit">
            ${thumb(o.g, 56, 56, 12)}
            <div class="flex-1"><div style="font-size:15px;font-weight:600">${o.title}</div><div class="foot">${name(o.editorId)} · #${o.id}</div>
              <div style="font-size:12px;font-weight:600;color:${label[o.status][1]};margin-top:2px">${label[o.status][0]}</div></div>
            <div style="text-align:right"><div style="font-size:15px;font-weight:600">${inr(o.total)}</div>${icon("chev_r", 16, C.ter, 2.2)}</div>
          </a>`).join("") : `
          <div class="empty">${icon("orders", 36, C.ter)}<div class="h3" style="margin-top:10px;color:var(--ink)">No orders yet</div><div style="margin-top:4px">Find an editor and try a ₹199 taste test.</div>
          <a href="#/discover" class="btn primary sm" style="margin-top:16px;text-decoration:none">Discover editors</a></div>`}
      </div>`,
    };
  };

  // ---------------------------------------------------------------- Inbox
  S.inbox = async () => ({
    tabs: tabbar("client", "inbox"),
    html: `<div class="scroll"><h1 class="large-title" style="margin-top:6px">Inbox</h1>
      ${[["RK", 0, "Riya Kapoor", "Got your clips! Starting with the hook.", "2m"], ["KS", 1, "Kabir Shah", "Happy to do a taste test first 🙂", "1h"], ["", 3, "BMT", "Your taste test with Arjun is ready.", "Yesterday"]].map(([i, a, n, m, t]) => `
        <button class="list-row" style="width:100%;text-align:left" data-chat>${i ? av(i, a, 46) : `<div style="width:46px;height:46px;display:flex;align-items:center;justify-content:center">${logo(46)}</div>`}
          <div class="flex-1"><div class="between"><span class="row gap-4" style="font-size:15px;font-weight:600">${n}${i ? seal(14) : ""}</span><span class="cap">${t}</span></div><div class="foot" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m}</div></div></button>`).join("")}
      </div>`,
    mount(root) { root.querySelectorAll("[data-chat]").forEach((b) => b.addEventListener("click", () => toast("Chat arrives with the backend", icon("chat", 16, "#fff")))); },
  });

  // ---------------------------------------------------------------- You
  const accountCard = () => {
    const me = api.currentUser();
    if (me) return `<div class="card-gray row gap-12" style="margin-top:12px">${av(esc(me.initials), 1, 56)}<div class="flex-1" style="min-width:0"><div class="h3">${esc(me.name)}</div><div class="foot">${esc(me.email)}</div></div><button class="btn secondary sm" id="signout" style="width:auto;padding:0 14px">Sign out</button></div>`;
    if (api.needsSignIn()) return `<div class="card-gray row gap-12" style="margin-top:12px">${av("?", 1, 56)}<div class="flex-1"><div class="h3">Not signed in</div><div class="foot">Sign in to upload footage and order</div></div><button class="btn primary sm" id="signin" style="width:auto;padding:0 14px">Sign in</button></div>`;
    return `<div class="card-gray row gap-12" style="margin-top:12px">${av("TA", 1, 56)}<div class="flex-1"><div class="h3">Tabish A.</div><div class="foot">Client · Pune</div></div></div>`;
  };

  // Accessibility settings: apply instantly, saved on the account (and in this browser).
  const A11Y_SETTINGS = [
    ["large_text", "Larger text", "Makes text and buttons about 20% bigger."],
    ["high_contrast", "High contrast", "Darker text, stronger borders and colours."],
    ["readable_font", "Easy-to-read font", "Atkinson Hyperlegible, designed for low vision."],
    ["reduce_motion", "Reduce motion", "Turns off animations and slides."],
  ];
  function a11ySheet() {
    const cur = BMT.a11y.get();
    BMT.ui.sheet({
      body: `<h2 class="title-2" style="margin-top:16px">Accessibility</h2>
        <p class="sub" style="margin-top:4px">Saved to your account, so it follows you to every device.</p>
        <div style="margin-top:10px">${A11Y_SETTINGS.map(([k, label, hint]) => `
          <button class="a11y-set" role="switch" aria-checked="${!!cur[k]}" data-k="${k}">
            <span class="flex-1"><span style="font-size:17px;display:block">${label}</span><span class="sub">${hint}</span></span>
            <span class="switch ${cur[k] ? "on" : ""}" aria-hidden="true"></span></button>`).join("")}</div>
        <p class="sub" style="margin-top:14px;font-size:13px">BMT also follows your device's reduced-motion setting, and works with screen readers such as TalkBack, VoiceOver and ChromeVox.</p>`,
      foot: `<button class="btn" data-close>Done</button>`,
      onMount(el) {
        el.querySelectorAll("[data-k]").forEach((b) => b.addEventListener("click", () => {
          const on = b.getAttribute("aria-checked") !== "true";
          b.setAttribute("aria-checked", String(on));
          b.querySelector(".switch").classList.toggle("on", on);
          BMT.a11y.set(b.dataset.k, on);
          BMT.a11y.announce(`${b.querySelector(".flex-1 span").textContent} ${on ? "on" : "off"}`);
        }));
      },
    });
  }

  S.you = async () => { const role = api.getMode() === "editor" ? "editor" : "client"; return {
    tabs: tabbar(role, "user"),
    html: `<div class="scroll"><h1 class="large-title" style="margin-top:6px">You</h1>
      ${accountCard()}
      <div style="margin-top:20px">
        ${[...(role === "client" ? [["heart", "Favourite editors", "#/favs"], ["orders", "Order history", "#/orders"]] : []), ["shield", "How payments are protected", "escrow"], ["play", "Take the tour", "intro"], ["studio", BMT.layout.isDesktop() ? "View mobile version" : "View desktop version", "layout"], ["sparkle", "Appearance · " + ({ auto: "Automatic", light: "Light", dark: "Dark" })[BMT.theme.get()], "theme"], ["access", "Accessibility", "a11y"], ["swap", role === "editor" ? "Switch to client mode" : "Switch to editor mode", "switch"], ["repeat", "Reset demo data", "reset"]].map(([ic, t, act]) => `
          <button class="list-row" style="width:100%;text-align:left" data-act="${act}"><div class="icon-tile" style="background:var(--grouped)">${icon(ic, 18, C.ink2)}</div><span class="flex-1" style="font-size:17px">${t}</span>${icon("chev_r", 16, C.ter, 2.2)}</button>`).join("")}
      </div></div>`,
    mount(root) {
      root.querySelector("#signout")?.addEventListener("click", async () => { await api.signOut(); toast("Signed out"); location.hash = "#/"; BMT.router.refresh(); });
      root.querySelector("#signin")?.addEventListener("click", () => {
        api.signIn().then(() => BMT.router.refresh()).catch((err) => { if (err.code !== "auth/popup-closed-by-user") toast(esc(err.message)); });
      });
      root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
        const a = b.dataset.act;
        if (a.startsWith("#")) location.hash = a;
        else if (a === "escrow") escrowSheet();
        else if (a === "layout") BMT.layout.setView(BMT.layout.isDesktop() ? "mobile" : "desktop");
          else if (a === "theme") BMT.ui.sheet({
            body: `<div class="title-2" style="margin-top:16px">Appearance</div><p class="sub" style="margin-top:4px">Automatic follows your device.</p>
              <div class="row gap-10" style="margin-top:16px">${[["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button class="choice ${BMT.theme.get() === k ? "on" : ""}" data-close data-t="${k}" style="text-align:center"><span style="font-size:15px;font-weight:600">${l}</span></button>`).join("")}</div>`,
            onMount(el) { el.querySelectorAll("[data-t]").forEach((x) => x.addEventListener("click", () => { BMT.theme.set(x.dataset.t); BMT.router.refresh(); })); },
          });
          else if (a === "a11y") a11ySheet();
          else if (a === "switch") S.enterRole(role === "editor" ? "client" : "editor");
          else if (a === "intro") location.hash = S.tourHref(role);
        else if (a === "reset") { api.resetDemo(); BMT.cart = null; location.hash = "#/"; }
      }));
    },
  }; };

  S.favs = async () => {
    const favs = api.getFavorites();
    const list = (await api.getEditors()).filter((e) => favs.includes(e.id));
    return {
      tabs: tabbar("client", "user"),
      html: `<div class="scroll"><button data-back class="row gap-4 link" style="margin-top:8px">${icon("chev_l", 18, C.cut, 2.4)}You</button>
        <h1 class="large-title" style="margin-top:6px">Favourites</h1>
        <div class="ed-grid">${list.length ? list.map(editorCard).join("") : `<div class="empty">Tap ♡ on any editor to save them here.</div>`}</div></div>`,
      mount: wireEditorCards,
    };
  };

  S.notFound = async () => ({ html: `<div class="scroll"><div class="empty"><div class="h3">Not found</div><a class="link" href="#/discover">Back to Discover</a></div></div>` });

  // ---------------------------------------------------------------- Sign in (Firebase, Google)
  S.signIn = async () => ({
    tabs: tabbar("client", "home"),
    html: `<div class="scroll narrow"><div class="empty" style="padding-top:80px">
      <div style="display:flex;justify-content:center">${logo(56)}</div>
      <h1 class="title-2" style="margin-top:18px;color:var(--ink)">Sign in to continue</h1>
      <p class="sub" style="margin-top:8px">Your footage, briefs and orders are private to your account.</p>
      <button class="btn primary" id="google" style="margin-top:22px">Continue with Google</button>
      <a class="link" href="#/discover" style="display:block;margin-top:14px">Keep browsing editors</a>
    </div></div>`,
    mount(root) {
      root.querySelector("#google").addEventListener("click", (ev) => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        api.signIn()
          .then(() => { toast("Signed in", icon("check", 14, C.safe, 2.6)); BMT.router.refresh(); })
          .catch((err) => { btn.disabled = false; if (err.code !== "auth/popup-closed-by-user") toast(esc(err.message)); });
      });
    },
  });

  S.loadError = async (err) => ({
    tabs: tabbar("client", "home"),
    html: `<div class="scroll narrow"><div class="err-card" role="alert" style="margin-top:40px">
      <div class="msg">${esc(err.message || "Something went wrong.")}</div>
      <button class="btn secondary sm" id="retry" style="margin-top:12px">Try again</button></div></div>`,
    mount(root) { root.querySelector("#retry").addEventListener("click", () => BMT.router.refresh()); },
  });
})();
