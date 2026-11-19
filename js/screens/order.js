/* Order screens: 06 Tracking, 07 Review cut */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, seal, av, thumb, inr, tabbar, toast, sheet, logo } = ui;
  const S = BMT.screens;

  const fmtLeft = (ms) => {
    if (ms <= 0) return "Any minute";
    const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3), s = Math.floor((ms % 60e3) / 1e3);
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  };
  const time = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

  // ---------------------------------------------------------------- 06 Tracking
  S.order = async ([id]) => {
    const o = await api.getOrder(id);
    if (!o) return S.notFound();
    const e = await api.getEditor(o.editorId);

    const steps = [
      ["Order placed", time(o.placedAt), "done"],
      [`${e.name.split(" ")[0]} accepted`, time(o.placedAt + 8 * 60e3), "done"],
      [o.status === "editing" && o.revisionsLeft < (o.addons.includes("revision") ? 3 : 2) ? "Working on your notes" : "Editing your video", o.status === "editing" ? "Now" : "", o.status === "editing" ? "live" : "done"],
      ["First cut ready", o.status === "editing" ? "by " + time(o.dueAt) : "", o.status === "review" ? "live" : o.status === "approved" ? "done" : "todo"],
      ["Your review", "", o.status === "approved" ? "done" : o.status === "review" ? "live" : "todo"],
      [`Payment released to ${e.name.split(" ")[0]}`, o.status === "approved" ? time(o.approvedAt) : "", o.status === "approved" ? "done" : "todo"],
    ];
    const stepHTML = steps.map(([t, s, st], i) => `
      <div class="step ${st}" style="${i === steps.length - 1 ? "min-height:24px" : ""}">
        <div class="rail"><div class="dot">${st === "done" ? icon("check", 13, "currentColor", 3) : ""}</div>${i < steps.length - 1 ? '<div class="line"></div>' : ""}</div>
        <div class="flex-1 between" style="align-items:flex-start;padding-top:1px"><span style="font-size:15px;font-weight:${st === "live" ? 600 : 500};color:${st === "todo" ? C.sub : C.ink}">${t}</span>
        <span style="font-size:13px;color:${st === "live" ? C.cut : C.sub};font-weight:${st === "live" ? 600 : 400}">${s}</span></div>
      </div>`).join("");

    const ticks = Array.from({ length: 38 }, (_, i) => `<div style="width:2px;height:${i % 5 ? 8 : 14}px;background:rgba(255,255,255,${i % 5 ? 0.25 : 0.5})"></div>`).join("");
    const total = o.dueAt - o.placedAt;

    const hero = {
      editing: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">${o.revisionsLeft < 2 ? "REVISED CUT IN" : "FIRST CUT IN"}</div>
        <div class="rounded-num" id="left" style="font-size:44px;line-height:52px">${fmtLeft(o.dueAt - Date.now())}</div>`,
      review: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">YOUR TURN</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Cut is ready</div>`,
      approved: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">DONE</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Delivered ✓</div>`,
    }[o.status];

    return {
      tabs: tabbar("client", "orders"),
      html: `<div class="scroll">
        <div class="between" style="margin-top:4px">
          <button class="icon-btn gray" data-back aria-label="Back">${icon("chev_l", 18, C.ink, 2.4)}</button>
          <span class="h3">Order #${o.id}</span>
          <button class="icon-btn gray" id="more" aria-label="More">${icon("more", 18, C.ink, 2)}</button>
        </div>
        <div class="track-grid"><div class="track-a">
        <div class="card-ink" style="margin-top:16px">
          ${hero}
          <div style="font-size:15px;opacity:.75">${o.title} · ${o.rush ? "Rush" : "Standard"}</div>
          <div style="margin-top:18px;position:relative;height:30px">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;height:14px">${ticks}</div>
            <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:6px;position:relative;overflow:hidden"><div id="prog" style="position:absolute;left:0;top:0;bottom:0;background:${C.cut};border-radius:3px"></div></div>
            <div id="head" style="position:absolute;top:2px;width:2px;height:30px;background:${C.cut};border-radius:1px"></div>
          </div>
          ${o.status === "review" ? `<a href="#/review/${o.id}" class="btn accent sm" style="margin-top:16px;text-decoration:none">Watch the cut</a>` : ""}
        </div>
        <div class="row gap-12 card-gray" style="margin-top:14px">
          ${av(e.initials, e.av, 42)}
          <a href="#/editor/${e.id}" class="flex-1" style="text-decoration:none;color:inherit"><div class="row gap-4" style="font-size:15px;font-weight:600">${e.name}${seal(14)}</div><div class="foot">Usually replies in ${e.reply}</div></a>
          <button class="icon-btn" id="chat" style="background:var(--raised);width:40px;height:40px" aria-label="Message">${icon("chat", 19, C.ink, 2)}</button>
        </div>
        </div><div class="track-b">
        <div style="margin-top:22px" class="steps">${stepHTML}</div>
        <button id="held" style="width:100%;text-align:left;margin-top:22px;border-radius:16px;border:1px solid var(--line);padding:14px;display:flex;gap:12px;align-items:center">
          <div class="icon-tile" style="width:40px;height:40px;border-radius:12px;background:var(--safe-tint)">${icon(o.status === "approved" ? "check" : "lock", 20, C.safe, 2)}</div>
          <div class="flex-1"><div class="h3" style="font-size:15px">${inr(o.total)} ${o.status === "approved" ? "released" : "held safely"}</div><div class="foot">${o.status === "approved" ? "Paid to " + e.name.split(" ")[0] + ". Leave a review?" : "Released to " + e.name.split(" ")[0] + " only when you approve the final cut."}</div></div>
          ${icon("chev_r", 16, C.ter, 2.2)}
        </button>
        ${o.status === "editing" ? `<button id="demo-deliver" class="btn secondary sm" style="margin-top:14px">${icon("bolt", 16, C.cut, 2)} Demo: deliver the cut now</button>` : ""}
        ${o.status === "approved" ? `<button id="review-btn" class="btn primary sm" style="margin-top:14px">Rate ${e.name.split(" ")[0]}</button>` : ""}
      </div></div></div>`,
      mount(root) {
        const left = root.querySelector("#left"), prog = root.querySelector("#prog"), head = root.querySelector("#head");
        const tick = () => {
          const done = o.status !== "editing" ? 1 : Math.min(1, Math.max(0.04, (Date.now() - o.placedAt) / total));
          const pct = (o.status === "editing" ? Math.max(done, 0.42) : 1) * 100;
          prog.style.width = pct + "%"; head.style.left = `calc(${pct}% - 1px)`;
          if (left) left.textContent = fmtLeft(o.dueAt - Date.now());
        };
        tick();
        const t = setInterval(tick, 1000);
        root.querySelector("#chat").addEventListener("click", () => toast("Chat arrives with the backend", icon("chat", 16, "#fff")));
        root.querySelector("#held").addEventListener("click", () => S.escrowSheet());
        root.querySelector("#more").addEventListener("click", () => sheet({
          body: `<div style="margin-top:12px">${[["clock", "Extend the deadline"], ["chat", "Message " + e.name.split(" ")[0]], ["x", "Cancel and refund"]].map(([ic, t]) => `<button class="list-row" style="width:100%;text-align:left" data-close>${icon(ic, 20, ic === "x" ? "#FF3B30" : C.ink)}<span style="font-size:17px;color:${ic === "x" ? "#FF3B30" : C.ink}">${t}</span></button>`).join("")}</div>`,
        }));
        const d = root.querySelector("#demo-deliver");
        d && d.addEventListener("click", async () => { await api.updateOrder(o.id, { status: "review", deliveredAt: Date.now() }); toast("First cut delivered", icon("play", 14, C.cut)); BMT.router.refresh(); });
        const rb = root.querySelector("#review-btn");
        rb && rb.addEventListener("click", () => rateSheet(e));
        return () => clearInterval(t);
      },
    };
  };

  function rateSheet(e) {
    let stars = 5;
    sheet({
      body: `<div style="text-align:center;margin-top:16px">${av(e.initials, e.av, 64)}<div class="title-2" style="margin-top:10px">How was ${e.name.split(" ")[0]}?</div>
        <div class="row" id="stars" style="justify-content:center;gap:6px;margin-top:14px">${[1, 2, 3, 4, 5].map((n) => `<button data-s="${n}">${icon("star", 34, C.star)}</button>`).join("")}</div>
        <textarea class="note" placeholder="What stood out?" style="margin-top:16px"></textarea>
        <button class="btn primary" data-close id="send" style="margin-top:12px">Post review</button></div>`,
      onMount(el) {
        const paint = () => el.querySelectorAll("[data-s]").forEach((b) => (b.innerHTML = icon("star", 34, +b.dataset.s <= stars ? C.star : C.line)));
        el.querySelectorAll("[data-s]").forEach((b) => b.addEventListener("click", () => { stars = +b.dataset.s; paint(); }));
        el.querySelector("#send").addEventListener("click", () => toast("Thanks! Review posted", icon("star", 14, C.star)));
      },
    });
  }

  // ---------------------------------------------------------------- 07 Review cut (dark)
  S.review = async ([id]) => {
    const o = await api.getOrder(id);
    if (!o) return S.notFound();
    const e = await api.getEditor(o.editorId);
    const DURATION = 58;
    let pos = 21, playing = false;
    const seed = o.notes.length ? o.notes : [
      { t: 4, who: "you", text: "Cut this pause, it drags a bit." },
      { t: 12, who: "editor", text: "Swapped the transition. Better?" },
    ];
    let notes = [...seed];
    const ts = (s) => `0:${String(Math.round(s)).padStart(2, "0")}`;

    const noteHTML = (n) => `
      <button class="row gap-10" data-t="${n.t}" style="width:100%;text-align:left;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);align-items:flex-start">
        ${n.who === "you" ? av("TA", 1, 30) : av(e.initials, e.av, 30)}
        <div class="flex-1"><div class="row gap-8"><span style="font-size:13px;font-weight:600;color:#fff">${n.who === "you" ? "You" : e.name.split(" ")[0]}</span>
          <span style="font-size:12px;font-weight:600;color:${C.cut};background:rgba(255,90,31,.16);padding:1px 6px;border-radius:6px">${ts(n.t)}</span></div>
          <div style="font-size:15px;color:rgba(255,255,255,.85);margin-top:2px;line-height:20px">${n.text}</div></div>
      </button>`;

    return {
      dark: true,
      html: `
      <div style="position:absolute;top:calc(var(--safe-top) + 0px);left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;color:#fff;z-index:5">
        <button class="icon-btn" data-back style="background:rgba(255,255,255,.12)" aria-label="Close">${icon("x", 17, "#fff", 2.4)}</button>
        <div style="text-align:center"><div class="h3">${o.revisionsLeft < 2 ? "Revised cut" : "First cut"}</div><div style="font-size:12px;opacity:.6">${o.title} · by ${e.name.split(" ")[0]}</div></div>
        <button class="icon-btn" style="background:rgba(255,255,255,.12)" id="share" aria-label="Share">${icon("share", 17, "#fff", 2.2)}</button>
      </div>
      <div class="scroll review" style="padding:calc(var(--safe-top) + 50px) 16px 110px"><div class="review-grid"><div class="review-a">
        <button id="player" style="display:block;margin:0 auto;width:200px;height:350px;border-radius:20px;background:${ui.G[o.g % ui.G.length]};position:relative;overflow:hidden">
          <div id="pp" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center">${icon("play", 26, "#fff")}</div></div>
          <div style="position:absolute;left:14px;right:14px;bottom:56px;text-align:center;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.3px">₹500 for a whole<br><span style="color:#FFE14D">WEEK?</span></div>
          <div id="clock" style="position:absolute;left:12px;bottom:12px;font-size:12px;color:#fff;font-weight:600">${ts(pos)} / ${ts(DURATION)}</div>
        </button>
        <div class="scrubber" id="scrub" style="margin-top:18px"><div class="fill" id="fill"></div><div id="marks"></div><div class="head" id="phead"></div></div>
        </div><div class="review-b"><div class="h3 desk-only" style="color:#fff;margin-bottom:4px">Notes</div>
        <div id="notes" style="margin-top:10px">${notes.map(noteHTML).join("")}</div>
        <div class="row gap-8" style="margin-top:10px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);padding:0 6px 0 14px">
          <span id="at" style="font-size:12px;font-weight:600;color:${C.cut}">@ ${ts(pos)}</span>
          <input id="note-in" placeholder="Add a note at this frame" style="flex:1;border:0;outline:0;background:transparent;color:#fff;font-size:15px;min-width:0">
          <button id="send" style="width:30px;height:30px;border-radius:50%;background:${C.cut};display:flex;align-items:center;justify-content:center" aria-label="Send note">${icon("send", 15, "#fff", 2.2)}</button>
        </div>
      </div></div></div>
      <div class="bottom-bar review-actions" style="position:absolute;left:16px;right:16px;bottom:calc(30px + var(--safe-bottom));display:flex;gap:10px;z-index:5">
        <button class="btn" id="changes" style="flex:1;background:rgba(40,40,42,.95);color:#fff;height:50px;font-size:15px" ${o.revisionsLeft ? "" : "disabled"}>Changes<span style="opacity:.55;font-weight:500;margin-left:4px">· ${o.revisionsLeft} left</span></button>
        <button class="btn accent" id="approve" style="flex:1.2;height:50px;font-size:15px">Approve · release ${inr(o.total)}</button>
      </div>`,
      mount(root) {
        const fill = root.querySelector("#fill"), head = root.querySelector("#phead"), clock = root.querySelector("#clock"), at = root.querySelector("#at");
        const marks = root.querySelector("#marks"), list = root.querySelector("#notes"), pp = root.querySelector("#pp");
        const paint = () => {
          const pct = (pos / DURATION) * 100;
          fill.style.width = pct + "%"; head.style.left = pct + "%";
          clock.textContent = `${ts(pos)} / ${ts(DURATION)}`; at.textContent = `@ ${ts(pos)}`;
        };
        const paintMarks = () => (marks.innerHTML = notes.map((n) => `<div class="mark" style="left:${(n.t / DURATION) * 100}%"></div>`).join(""));
        const wireNotes = () => list.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { pos = +b.dataset.t; paint(); toast("Jumped to " + ts(pos)); }));
        paint(); paintMarks(); wireNotes();

        let timer;
        root.querySelector("#player").addEventListener("click", () => {
          playing = !playing;
          pp.style.opacity = playing ? 0 : 1;
          clearInterval(timer);
          if (playing) timer = setInterval(() => { pos = pos >= DURATION ? 0 : pos + 0.25; paint(); }, 250);
        });
        const scrub = root.querySelector("#scrub");
        const seek = (ev) => { const r = scrub.getBoundingClientRect(); pos = Math.max(0, Math.min(DURATION, ((ev.clientX - r.left) / r.width) * DURATION)); paint(); };
        scrub.addEventListener("pointerdown", (ev) => { seek(ev); scrub.setPointerCapture(ev.pointerId); scrub.onpointermove = seek; });
        scrub.addEventListener("pointerup", () => (scrub.onpointermove = null));

        const input = root.querySelector("#note-in");
        const send = async () => {
          const text = input.value.trim(); if (!text) return;
          const n = { t: Math.round(pos), who: "you", text };
          notes.push(n); notes.sort((a, b) => a.t - b.t);
          await api.addNote(o.id, n);
          list.innerHTML = notes.map(noteHTML).join(""); wireNotes(); paintMarks(); input.value = "";
          toast("Note pinned at " + ts(n.t));
        };
        root.querySelector("#send").addEventListener("click", send);
        input.addEventListener("keydown", (ev) => ev.key === "Enter" && send());
        root.querySelector("#share").addEventListener("click", () => toast("Private review link copied"));

        root.querySelector("#changes").addEventListener("click", async () => {
          await api.requestChanges(o.id);
          toast(`Sent ${notes.filter((n) => n.who === "you").length} notes to ${e.name.split(" ")[0]}`, icon("send", 14, "#fff", 2));
          location.hash = "#/order/" + o.id;
        });
        root.querySelector("#approve").addEventListener("click", () => sheet({
          body: `<div style="text-align:center;margin-top:18px">${icon("lock", 40, C.safe, 1.8).replace("<svg", '<svg style="margin:0 auto"')}
            <div class="title-2" style="margin-top:12px">Release ${inr(o.total)} to ${e.name.split(" ")[0]}?</div>
            <p class="sub" style="margin-top:8px">You'll get the full-quality file instantly. This can't be undone.</p>
            <button class="btn accent" id="confirm" style="margin-top:18px">Approve and release</button>
            <button class="btn secondary" data-close style="margin-top:10px">Not yet</button></div>`,
          onMount(el, close) {
            el.querySelector("#confirm").addEventListener("click", async () => {
              await api.approveOrder(o.id); close();
              toast("Approved. Payment released", icon("check", 16, "#4ADE80", 2.6));
              location.hash = "#/order/" + o.id;
            });
          },
        }));
        return () => clearInterval(timer);
      },
    };
  };
})();
