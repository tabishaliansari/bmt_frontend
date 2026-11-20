/* Editor-side screens: 08 Studio, Add credit, Learn & Community, Profile */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, seal, yt, av, thumb, chip, inr, tabbar, toast, sheet } = ui;
  const S = BMT.screens;

  // ---------------------------------------------------------------- 08 Studio
  S.studio = async () => {
    const s = await api.getStudio();
    const bars = s.bars.map((b, i) => `<div style="flex:1;height:${b}%;border-radius:3px;background:${i === s.bars.length - 1 ? C.cut : "rgba(255,255,255,.22)"}"></div>`).join("");
    const inc = s.incoming;
    const incomingHTML = s.incomingHandled
      ? `<div class="card-gray row gap-10" style="margin-top:14px">${icon(s.incomingHandled === "accepted" ? "check" : "x", 20, s.incomingHandled === "accepted" ? C.safe : C.sub, 2.4)}<span class="foot">${s.incomingHandled === "accepted" ? `Accepted ${inc.client}'s order. ${inr(inc.total)} is funded and protected.` : "Order declined. The client was refunded instantly."}</span></div>`
      : `<div id="incoming" style="margin-top:14px;border-radius:18px;border:1.5px solid ${C.cut};padding:14px;background:${C.cutT}">
          <div class="between"><span style="font-size:12px;font-weight:700;color:${C.cut};letter-spacing:.4px">NEW ORDER · 2 MIN AGO</span><span class="foot">Expires in ${inc.expiresMin} min</span></div>
          <div class="row gap-12" style="margin-top:10px">${av(inc.initials, 1, 40)}
            <div class="flex-1"><div class="h3">${inc.title}</div><div class="foot">${inc.client} · ${inc.clips} clips · ${inc.eta}</div></div>
            <span style="font-size:20px;font-weight:700">${inr(inc.total)}</span></div>
          <div class="row gap-10" style="margin-top:12px"><button class="btn secondary sm" data-inc="declined" style="flex:1;background:var(--raised)">Decline</button><button class="btn primary sm" data-inc="accepted" style="flex:1.4">Accept</button></div>
        </div>`;
    return {
      tabs: tabbar("editor", "studio"),
      html: `<div class="scroll">
        <div class="between" style="margin-top:6px">
          <h1 class="large-title">Studio</h1>
          <label class="row gap-8 foot" style="font-weight:500;cursor:pointer">${s.accepting ? "Accepting orders" : "Paused"}<button id="acc" class="switch ${s.accepting ? "on" : ""}" role="switch" aria-checked="${s.accepting}" aria-label="Accepting orders"></button></label>
        </div>
        <div class="studio-top"><button class="card-ink" id="earn" style="display:block;width:100%;text-align:left;margin-top:14px">
          <div class="between"><span style="font-size:13px;opacity:.6;font-weight:500">EARNED IN ${new Date().toLocaleString("en-IN", { month: "long" }).toUpperCase()}</span><span style="font-size:13px;color:#4ADE80;font-weight:600">+${s.growth}%</span></div>
          <div class="rounded-num" style="font-size:40px;margin-top:2px">${inr(s.month)}</div>
          <div style="display:flex;gap:5px;align-items:flex-end;height:60px;margin-top:12px">${bars}</div>
          <div class="row gap-8" style="margin-top:14px;font-size:13px;opacity:.8">${icon("lock", 14, "#fff", 2)}${inr(s.protectedAmt)} protected · releases on approval</div>
        </button>
        ${incomingHTML}</div>
        <div class="section-head"><h2 class="h2">In progress</h2><span class="link">${s.active.length} active</span></div>
        ${s.active.map((a) => `
          <div class="list-row">${thumb(a.g, 48, 48, 10)}
            <div class="flex-1"><div style="font-size:15px;font-weight:600">${a.title}</div><div class="foot">${a.client} · ${a.due}</div>
              <div class="bar-track" style="margin-top:7px"><div class="bar-fill" style="width:${a.progress * 100}%"></div></div></div>${icon("chev_r", 16, C.ter, 2.2)}</div>`).join("")}
        <a href="#/learn" class="card-gray row gap-12" style="margin-top:14px;text-decoration:none;color:inherit">
          <div class="icon-tile" style="width:40px;height:40px;border-radius:12px;background:${C.trustT}">${icon("book", 20, C.trust, 2)}</div>
          <div class="flex-1"><div style="font-size:15px;font-weight:600">${s.course.title}</div><div class="foot">${s.course.sold} sales this week · ${inr(s.course.revenue)}</div></div>${icon("chev_r", 16, C.ter, 2.2)}
        </a>
        <a href="#/add-credit" class="btn secondary sm" style="margin-top:14px;text-decoration:none">${icon("plusc", 18, C.ink, 2)} Add a verified credit</a>
      </div>`,
      mount(root) {
        const acc = root.querySelector("#acc");
        acc.addEventListener("click", async () => {
          const on = !acc.classList.contains("on");
          acc.classList.toggle("on", on); acc.setAttribute("aria-checked", on);
          acc.parentElement.firstChild.textContent = on ? "Accepting orders" : "Paused";
          await api.setAccepting(on);
          toast(on ? "You're visible to clients" : "Paused. Hidden from Discover");
        });
        root.querySelectorAll("[data-inc]").forEach((b) => b.addEventListener("click", async () => {
          await api.handleIncoming(b.dataset.inc);
          toast(b.dataset.inc === "accepted" ? "Accepted. Client notified" : "Declined. Client refunded", icon(b.dataset.inc === "accepted" ? "check" : "x", 15, "#fff", 2.6));
          BMT.router.refresh();
        }));
        root.querySelector("#earn").addEventListener("click", () => sheet({
          body: `<div class="title-2" style="margin-top:16px">Payouts</div>
            <div style="margin-top:12px">${[["Available", "₹41,850", C.ink], ["Protected (awaiting approval)", "₹6,400", C.safe], ["Next payout", "Monday, to HDFC ••4417", C.sub]].map(([a, b, c]) => `<div class="list-row"><span class="flex-1" style="font-size:15px">${a}</span><span style="font-size:15px;font-weight:600;color:${c}">${b}</span></div>`).join("")}</div>
            <button class="btn primary" data-close style="margin-top:16px">Withdraw ₹41,850</button>`,
        }));
      },
    };
  };

  S.studioOrders = async () => {
    const s = await api.getStudio();
    return {
      tabs: tabbar("editor", "orders"),
      html: `<div class="scroll"><h1 class="large-title" style="margin-top:6px">Orders</h1>
        <div class="pill-tabs" style="margin:10px 0 0 -4px"><span class="pill-tab on">Active</span><span class="pill-tab">Requests</span><span class="pill-tab">Done</span></div>
        ${s.active.map((a) => `<div class="list-row">${thumb(a.g, 56, 56, 12)}<div class="flex-1"><div style="font-size:15px;font-weight:600">${a.title}</div><div class="foot">${a.client} · ${a.due}</div><div class="bar-track" style="margin-top:7px"><div class="bar-fill" style="width:${a.progress * 100}%"></div></div></div></div>`).join("")}
        <button class="btn secondary sm" id="deliver" style="margin-top:16px">${icon("upload", 18, C.ink, 2)} Deliver a cut</button></div>`,
      mount(root) { root.querySelector("#deliver").addEventListener("click", () => toast("Upload flow comes with the backend", icon("upload", 15, "#fff", 2))); },
    };
  };

  // ---------------------------------------------------------------- 09 Add verified credit
  S.addCredit = async () => {
    let video = null, role = "Editor", sent = false;
    const roles = ["Editor", "Colorist", "Motion", "Sound"];
    const stepsHTML = () => {
      const st = [
        ["Video found", "Public stats pulled from YouTube", video ? "done" : "todo"],
        [video ? `Confirmation sent to ${video.handle}` : "Channel confirms", "They approve with one tap", sent ? "live" : "todo"],
        ["Shows on your profile", "With live view counts", "todo"],
      ];
      return st.map(([t, s, k], i) => {
        const dot = k === "done" ? `<div style="width:24px;height:24px;border-radius:50%;background:${C.safe};display:flex;align-items:center;justify-content:center">${icon("check", 14, "#fff", 3)}</div>`
          : k === "live" ? `<div style="width:24px;height:24px;border-radius:50%;background:${C.cutT};display:flex;align-items:center;justify-content:center">${icon("clock", 14, C.cut, 2.4)}</div>`
          : `<div style="width:24px;height:24px;border-radius:50%;background:var(--grouped);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${C.sub}">${i + 1}</div>`;
        return `<div class="row gap-12" style="padding:5px 0;align-items:flex-start">${dot}<div><div style="font-size:15px;font-weight:600;color:${k === "todo" ? C.sub : C.ink}">${t}</div><div class="foot">${s}</div></div></div>`;
      }).join("");
    };
    return {
      html: `<div class="scroll narrow" style="padding-bottom:140px">
        <div class="between" style="margin-top:4px"><button data-back style="font-size:17px;color:${C.cut}">Cancel</button><span class="h3">Add a credit</span><span style="width:52px"></span></div>
        <h1 class="title-1" style="margin-top:16px">Prove it once.<br>Show it forever.</h1>
        <p class="sub" style="margin-top:8px">Paste a video you edited. The channel confirms, and its real numbers land on your profile.</p>
        <label class="field focus-ring" style="margin-top:18px">${yt(18)}<input id="url" type="url" placeholder="youtube.com/watch?v=…" value="https://youtube.com/watch?v=x8Kq2Lm"><button id="fetch" class="link" style="font-weight:600">Fetch</button></label>
        <div id="preview" style="margin-top:12px"></div>
        <div class="h3" style="margin-top:20px">Your role</div>
        <div class="row gap-8" id="roles" style="margin-top:10px;flex-wrap:wrap">${roles.map((r) => `<button class="pill-tab ${r === role ? "on" : ""}" style="${r === role ? "" : "background:var(--grouped);color:var(--ink2)"}" data-role="${r}">${r}</button>`).join("")}</div>
        <div id="steps" style="margin-top:16px">${stepsHTML()}</div>
      </div>
      <div class="bottom-bar narrow-bar" style="position:absolute;left:16px;right:16px;bottom:calc(30px + var(--safe-bottom));background:var(--canvas);padding-top:8px">
        <button class="btn primary" id="send" disabled>Send confirmation request</button>
        <div class="cap" style="text-align:center;margin-top:10px">Channels confirm with one tap. We never post on their behalf.</div>
      </div>`,
      mount(root) {
        const preview = root.querySelector("#preview"), send = root.querySelector("#send"), steps = root.querySelector("#steps");
        const fetchIt = async () => {
          preview.innerHTML = `<div class="card-gray foot" style="text-align:center">Looking up video…</div>`;
          try {
            video = await api.lookupVideo(root.querySelector("#url").value);
            preview.innerHTML = `<div style="border-radius:16px;overflow:hidden;border:1px solid var(--line)">
              ${thumb(video.g, "100%", 118, 0, `<span class="duration" style="right:10px;bottom:10px">${video.len}</span><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center">${yt(44)}</div>`)}
              <div style="padding:12px"><div class="h3">${video.title}</div>
                <div class="row gap-8" style="margin-top:6px">${av("RE", 3, 22)}<span style="font-size:13px;color:var(--ink2);font-weight:500">${video.channel}</span><span class="foot">· ${video.subs} subs</span></div>
                <div class="row" style="gap:16px;margin-top:10px;font-size:13px;color:var(--sub)"><span><b style="color:var(--ink);font-weight:600">${video.views}</b> views</span><span><b style="color:var(--ink);font-weight:600">${video.likes}</b> likes</span><span><b style="color:var(--ink);font-weight:600">${video.date}</b></span></div></div></div>`;
            send.disabled = false;
          } catch (err) {
            video = null; send.disabled = true;
            preview.innerHTML = `<div class="card-gray foot" style="color:#FF3B30">${err.message}</div>`;
          }
          steps.innerHTML = stepsHTML();
        };
        root.querySelector("#fetch").addEventListener("click", fetchIt);
        root.querySelector("#url").addEventListener("keydown", (ev) => ev.key === "Enter" && fetchIt());
        fetchIt();
        root.querySelectorAll("[data-role]").forEach((b) => b.addEventListener("click", () => {
          role = b.dataset.role;
          root.querySelectorAll("[data-role]").forEach((x) => { const on = x === b; x.classList.toggle("on", on); x.style.cssText = on ? "" : "background:var(--grouped);color:var(--ink2)"; });
        }));
        send.addEventListener("click", async () => {
          await api.requestCredit({ video, role }); sent = true;
          steps.innerHTML = stepsHTML();
          send.textContent = "Request sent"; send.disabled = true;
          toast(`Sent to ${video.handle}`, icon("send", 14, "#fff", 2));
        });
      },
    };
  };

  // ---------------------------------------------------------------- 10 Learn & Community
  S.learn = async (_, query, isCommunity) => {
    const [courses, posts, mentors, editors] = await Promise.all([api.getCourses(), api.getPosts(), api.getMentors(), api.getEditors()]);
    const ed = (id) => editors.find((e) => e.id === id);
    let seg = query.get("tab") || (isCommunity ? "posts" : "foryou");
    const segs = [["foryou", "For you"], ["courses", "Courses"], ["posts", "Posts"], ["1on1", "1:1"]];

    const courseCard = (c, big) => {
      const e = ed(c.by);
      return `<button data-course="${c.id}" style="display:block;width:100%;text-align:left;margin-top:14px;border-radius:22px;overflow:hidden;position:relative;height:${big ? 230 : 150}px;background:${ui.G[c.g]}">
        <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(0,0,0,.7) 100%)"></div>
        <div style="position:absolute;left:16px;top:16px">${chip(c.tag, "", icon("sparkle", 11, "#fff", 2.2)).replace('class="chip "', 'class="chip" style="background:rgba(255,255,255,.2);color:#fff"')}</div>
        <div style="position:absolute;left:16px;right:16px;bottom:16px;color:#fff">
          <div style="font-size:${big ? 24 : 20}px;font-weight:700;letter-spacing:-0.5px;line-height:1.15">${c.title}</div>
          <div class="row gap-4" style="margin-top:6px;font-size:13px;opacity:.9">${av(e.initials, e.av, 20)}${e.name}${seal(13)}<span style="opacity:.6">·</span>${c.lessons} lessons<span style="opacity:.6">·</span>${icon("star", 12, C.star)}${c.rating}</div>
          ${big ? `<div class="between" style="margin-top:12px"><span style="font-size:20px;font-weight:700">${inr(c.price)}</span><span style="height:36px;padding:0 16px;border-radius:18px;background:#fff;color:#0B0B0C;font-size:15px;font-weight:600;display:flex;align-items:center">Preview free</span></div>` : `<div style="font-size:15px;font-weight:700;margin-top:6px">${inr(c.price)}</div>`}
        </div></button>`;
    };
    const postCard = (p) => {
      const e = ed(p.by);
      return `<div style="margin-top:16px;padding-bottom:14px;border-bottom:1px solid var(--line)">
        <div class="row gap-10">${av(e.initials, e.av, 36)}<a href="#/editor/${e.id}" class="flex-1" style="text-decoration:none;color:inherit"><div class="row gap-4" style="font-size:15px;font-weight:600">${e.name}${seal(14)}</div><div class="foot">${p.role} · ${p.ago}</div></a>${icon("more", 20, C.sub, 2)}</div>
        <p style="font-size:15px;line-height:21px;margin-top:10px">${p.text}</p>
        ${p.before ? `<div class="row" style="gap:4px;margin-top:10px;border-radius:14px;overflow:hidden">
          ${thumb(0, "50%", 120, 0, `<div style="position:absolute;left:8px;bottom:8px">${chip("Before", "scrim")}</div>`, "background:linear-gradient(135deg,#8E9EAB,#C9D6DF)")}
          ${thumb(6, "50%", 120, 0, `<div style="position:absolute;left:8px;bottom:8px">${chip("After", "scrim")}</div>`)}</div>` : ""}
        <div class="row" style="gap:18px;margin-top:10px;font-size:13px;color:var(--sub)">
          <button class="row gap-4" data-like="${p.likes}">${icon("heart", 17, C.sub, 2)}<span>${ui.compact(p.likes)}</span></button>
          <span class="row gap-4">${icon("chat", 17, C.sub, 2)}${p.comments}</span>
          <button class="row gap-4" data-save>${icon("share", 17, C.sub, 2)}Save</button></div></div>`;
    };
    const mentorCard = (m) => {
      const e = ed(m.id);
      return `<div class="card-gray row gap-12" style="margin-top:14px">${av(e.initials, e.av, 44)}
        <div class="flex-1"><div style="font-size:15px;font-weight:600">1:1 with ${e.name.split(" ")[0]} ${e.name.split(" ")[1][0]}.</div><div class="foot">${m.topic} · ${m.mins} min · ${inr(m.price)}</div></div>
        <button class="btn primary" data-book="${e.id}" style="height:32px;width:auto;padding:0 14px;font-size:13px;border-radius:16px">Book</button></div>`;
    };
    const body = () => ({
      foryou: courseCard(courses[0], true) + postCard(posts[0]) + mentorCard(mentors[0]),
      courses: courses.map((c, i) => courseCard(c, i === 0)).join(""),
      posts: posts.map(postCard).join(""),
      "1on1": mentors.map(mentorCard).join(""),
    })[seg];

    return {
      tabs: tabbar("editor", isCommunity ? "users" : "book"),
      html: `<div class="scroll">
        <div class="between" style="margin-top:6px"><h1 class="large-title">${isCommunity ? "Community" : "Learn"}</h1><button class="icon-btn gray" id="post" aria-label="${isCommunity ? "New post" : "Search"}">${icon(isCommunity ? "plus" : "search", 19, C.ink, 2)}</button></div>
        <div class="pill-tabs" style="margin:10px 0 0 -4px">${segs.map(([k, l]) => `<button class="pill-tab ${k === seg ? "on" : ""}" data-seg="${k}">${l}</button>`).join("")}</div>
        <div id="lbody" class="learn-body">${body()}</div></div>`,
      mount(root) {
        const lb = root.querySelector("#lbody");
        const wire = () => {
          lb.querySelectorAll("[data-course]").forEach((b) => b.addEventListener("click", () => {
            const c = courses.find((x) => x.id === b.dataset.course);
            sheet({
              body: `${thumb(c.g, "100%", 160, 16, ui.playBadge(20), "margin-top:14px")}<div class="title-2" style="margin-top:14px">${c.title}</div>
                <p class="sub" style="margin-top:6px">${c.lessons} lessons · by ${ed(c.by).name}. Lesson 1 is free.</p>
                ${["Why viewers leave at 0:03", "Cutting on the breath", "Pattern interrupts that don't feel cheap"].map((l, i) => `<div class="list-row">${icon(i ? "lock" : "play", 18, i ? C.ter : C.cut)}<span class="flex-1" style="font-size:15px">${i + 1}. ${l}</span><span class="cap">${6 + i * 3} min</span></div>`).join("")}`,
              foot: `<div><div class="foot">One-time</div><div style="font-size:22px;font-weight:700">${inr(c.price)}</div></div><button class="btn primary" data-close style="flex:1;height:52px" id="buy">Get course</button>`,
              onMount(el) { el.querySelector("#buy").addEventListener("click", () => toast("Purchased · 85% goes to the creator", icon("check", 15, "#4ADE80", 2.6))); },
            });
          }));
          lb.querySelectorAll("[data-like]").forEach((b) => b.addEventListener("click", () => {
            const on = !b.classList.contains("liked"); b.classList.toggle("liked", on);
            b.innerHTML = `${icon(on ? "heartf" : "heart", 17, on ? C.cut : C.sub, 2)}<span>${ui.compact(+b.dataset.like + (on ? 1 : 0))}</span>`;
          }));
          lb.querySelectorAll("[data-save]").forEach((b) => b.addEventListener("click", () => toast("Saved")));
          lb.querySelectorAll("[data-book]").forEach((b) => b.addEventListener("click", () => {
            const e = ed(b.dataset.book);
            sheet({
              body: `<div class="title-2" style="margin-top:16px">Book ${e.name.split(" ")[0]}</div><p class="sub" style="margin-top:4px">30 min video call · ₹799</p>
                <div class="row gap-8" style="margin-top:14px;flex-wrap:wrap">${["Today 7:00 PM", "Today 8:30 PM", "Tomorrow 11:00 AM", "Tomorrow 6:00 PM"].map((t, i) => `<button class="choice ${i === 1 ? "on" : ""}" data-slot style="flex:0 0 calc(50% - 4px)"><span style="font-size:15px;font-weight:600">${t}</span></button>`).join("")}</div>`,
              foot: `<button class="btn primary" data-close id="confirm">Confirm · ₹799</button>`,
              onMount(el) {
                el.querySelectorAll("[data-slot]").forEach((s) => s.addEventListener("click", () => el.querySelectorAll("[data-slot]").forEach((x) => x.classList.toggle("on", x === s))));
                el.querySelector("#confirm").addEventListener("click", () => toast("Booked. Invite sent", icon("check", 15, "#4ADE80", 2.6)));
              },
            });
          }));
        };
        root.querySelectorAll("[data-seg]").forEach((b) => b.addEventListener("click", () => {
          seg = b.dataset.seg; lb.innerHTML = body(); wire();
          root.querySelectorAll("[data-seg]").forEach((x) => x.classList.toggle("on", x === b));
        }));
        root.querySelector("#post").addEventListener("click", () => isCommunity
          ? sheet({ body: `<div class="title-2" style="margin-top:16px">Share something you learned</div><textarea class="note" style="margin-top:12px;height:120px" placeholder="A trick, a client story, a before/after…"></textarea>`, foot: `<button class="btn primary" data-close id="pub">Post</button>`, onMount(el) { el.querySelector("#pub").addEventListener("click", () => toast("Posted to Community")); } })
          : toast("Search arrives with the backend"));
        wire();
      },
    };
  };
  S.community = (p, q) => S.learn(p, q, true);

  // ---------------------------------------------------------------- Editor's own profile
  S.me = async () => {
    const e = await api.getEditor("riya");
    return {
      tabs: tabbar("editor", "user"),
      html: `<div class="scroll"><h1 class="large-title" style="margin-top:6px">Profile</h1>
        <a href="#/editor/riya" class="card-gray row gap-12" style="margin-top:12px;text-decoration:none;color:inherit">${av(e.initials, e.av, 56)}
          <div class="flex-1"><div class="row gap-4 h3">${e.name}${seal(16)}</div><div class="foot">See your storefront as clients do</div></div>${icon("chev_r", 16, C.ter, 2.2)}</a>
        <div class="row gap-8" style="margin-top:14px">
          <div class="stat-box"><div class="v">${e.credits}</div><div class="cap">credits</div></div>
          <div class="stat-box"><div class="v">${e.rating}</div><div class="cap">rating</div></div>
          <div class="stat-box"><div class="v">${e.onTime}%</div><div class="cap">on time</div></div>
        </div>
        <div style="margin-top:20px">
          ${[["plusc", "Add a verified credit", "#/add-credit"], ["orders", "Edit your menu & prices", "menu"], ["book", "Your courses", "#/learn?tab=courses"], ["studio", BMT.layout.isDesktop() ? "View mobile version" : "View desktop version", "layout"], ["sparkle", "Appearance · " + ({ auto: "Automatic", light: "Light", dark: "Dark" })[BMT.theme.get()], "theme"], ["swap", "Switch to client mode", "switch"], ["repeat", "Reset demo data", "reset"]].map(([ic, t, act]) => `
            <button class="list-row" style="width:100%;text-align:left" data-act="${act}"><div class="icon-tile" style="background:var(--grouped)">${icon(ic, 18, C.ink2)}</div><span class="flex-1" style="font-size:17px">${t}</span>${icon("chev_r", 16, C.ter, 2.2)}</button>`).join("")}
        </div></div>`,
      mount(root) {
        root.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", () => {
          const a = b.dataset.act;
          if (a.startsWith("#")) location.hash = a;
          else if (a === "menu") toast("Menu editor comes next");
          else if (a === "layout") BMT.layout.setView(BMT.layout.isDesktop() ? "mobile" : "desktop");
          else if (a === "theme") BMT.ui.sheet({
            body: `<div class="title-2" style="margin-top:16px">Appearance</div><p class="sub" style="margin-top:4px">Automatic follows your device.</p>
              <div class="row gap-10" style="margin-top:16px">${[["auto", "Automatic"], ["light", "Light"], ["dark", "Dark"]].map(([k, l]) => `<button class="choice ${BMT.theme.get() === k ? "on" : ""}" data-close data-t="${k}" style="text-align:center"><span style="font-size:15px;font-weight:600">${l}</span></button>`).join("")}</div>`,
            onMount(el) { el.querySelectorAll("[data-t]").forEach((x) => x.addEventListener("click", () => { BMT.theme.set(x.dataset.t); BMT.router.refresh(); })); },
          });
          else if (a === "switch") S.enterRole("client");
          else if (a === "reset") { api.resetDemo(); BMT.cart = null; location.hash = "#/"; }
        }));
      },
    };
  };
})();
