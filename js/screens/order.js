/* Order screens: 06 Tracking, 07 Review cut (with Review Copilot) */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, seal, av, inr, usd, esc, tabbar, toast, sheet, aiProgress } = ui;
  const S = BMT.screens;

  const fmtLeft = (ms) => {
    if (ms <= 0) return "Any minute";
    const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3), s = Math.floor((ms % 60e3) / 1e3);
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m ${String(s).padStart(2, "0")}s`;
  };
  const time = (ts) => new Date(ts).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const inr2 = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const first = (e) => e.name.split(" ")[0];

  // ---------------------------------------------------------------- 06 Tracking
  const briefCard = (b, thumbUrl) => `
    <button class="brief-card" id="brief-toggle" aria-expanded="false">
      <div class="between"><span class="row gap-8">${icon("sparkle", 16, C.cut, 2)}<span class="h3" style="font-size:15px">Your brief</span></span><span id="brief-chev">${icon("chev_d", 16, C.sub, 2.2)}</span></div>
      <div class="foot" style="margin-top:2px">${esc(b.title)} · ${b.target_length_sec} sec</div>
      <div id="brief-body" hidden style="margin-top:12px">
        ${thumbUrl ? `<img src="${esc(thumbUrl)}" alt="Thumbnail concept" style="display:block;max-height:200px;border-radius:10px;margin-bottom:10px">` : ""}
        <div class="cap" style="font-weight:600">HOOK</div><div style="font-size:15px;line-height:20px;margin-top:2px">${esc(b.hook_idea)}</div>
        <div class="cap" style="font-weight:600;margin-top:10px">MUST INCLUDE</div><div style="font-size:15px;line-height:20px;margin-top:2px">${b.must_include.map(esc).join(" · ")}</div>
        <div class="cap" style="font-weight:600;margin-top:10px">STYLE</div><div style="font-size:15px;line-height:20px;margin-top:2px">${esc(b.style_notes)}</div>
      </div>
    </button>`;

  const receipt = (e, p) => `
    <div class="receipt" role="status">
      ${icon("check", 22, C.safe, 2.6)}
      <div class="flex-1"><div class="big">Paid to ${esc(first(e))}: ${inr2(p.amount_inr)}</div>
        <div style="font-size:13px;margin-top:2px">${usd(p.amount_usd)} at ${Number(p.fx_rate).toFixed(2)} · via Ramp · simulated</div>
        ${p.gross_usd ? `<div class="receipt-lines">
          <div class="between"><span>You paid</span><span>${usd(p.gross_usd)}</span></div>
          <div class="between"><span>BMT fee (${p.fee_pct}%)</span><span>− ${usd(p.fee_usd)}</span></div>
          <div class="between"><span>${esc(first(e))} receives</span><span><b>${inr2(p.amount_inr)}</b></span></div>
          ${p.transfer_id ? `<div class="between"><span>Ramp transfer</span><span>${esc(p.transfer_id)}</span></div>` : ""}
        </div>` : ""}
        <div style="font-size:12px;opacity:.8;margin-top:6px">Demo FX rate and payout. No real money moved.</div></div>
    </div>`;

  S.order = async ([id]) => {
    const o = await api.getOrder(id);
    if (!o) return S.notFound();
    const e = await api.getEditor(o.editorId);
    const thumbUrl = o.thumbnailUploadId ? await api.mediaUrl(o.thumbnailUploadId).catch(() => null) : null;

    // Live app: the editor really accepts (or declines). Mock mode keeps the prototype's timing.
    const live = !api.BMT_USE_MOCKS;
    const waiting = live && o.serverStatus === "funded";
    // Stage fallback: the client can upload the cut on the editor's behalf (mock mode, or ?standin=1).
    const standin = !live || new URLSearchParams(location.search).has("standin");
    const acceptedStep = !live ? [`${first(e)} accepted`, time(o.placedAt + 8 * 60e3), "done"]
      : waiting ? [`Waiting for ${first(e)} to accept`, "", "live"]
      : o.declinedAt ? [`${first(e)} declined`, time(o.declinedAt), "done"]
      : [`${first(e)} accepted`, o.acceptedAt ? time(o.acceptedAt) : "", "done"];
    const steps = [
      ["Order placed", time(o.placedAt), "done"],
      acceptedStep,
      [o.status === "editing" && o.revisionsLeft < (o.addons.includes("revision") ? 3 : 2) ? "Working on your notes" : "Editing your video", o.status === "editing" && !waiting ? "Now" : "", waiting ? "todo" : o.status === "editing" ? "live" : "done"],
      ["First cut ready", o.status === "editing" ? "by " + time(o.dueAt) : o.deliveredAt ? time(o.deliveredAt) : "", ["review", "approved"].includes(o.status) ? "done" : "todo"],
      ["Your review", "", o.status === "approved" ? "done" : o.status === "review" ? "live" : "todo"],
      [`Payment released to ${first(e)}`, o.status === "approved" && o.approvedAt ? time(o.approvedAt) : "", o.status === "approved" ? "done" : "todo"],
    ];
    const stepHTML = steps.map(([t, s, st], i) => `
      <div class="step ${st}" style="${i === steps.length - 1 ? "min-height:24px" : ""}">
        <div class="rail"><div class="dot">${st === "done" ? icon("check", 13, "currentColor", 3) : ""}</div>${i < steps.length - 1 ? '<div class="line"></div>' : ""}</div>
        <div class="flex-1 between" style="align-items:flex-start;padding-top:1px"><span style="font-size:15px;font-weight:${st === "live" ? 600 : 500};color:${st === "todo" ? C.sub : C.ink}">${t}</span>
        <span style="font-size:13px;color:${st === "live" ? C.cut : C.sub};font-weight:${st === "live" ? 600 : 400}">${s}</span></div>
      </div>`).join("");

    const ticks = Array.from({ length: 38 }, (_, i) => `<div style="width:2px;height:${i % 5 ? 8 : 14}px;background:rgba(255,255,255,${i % 5 ? 0.25 : 0.5})"></div>`).join("");
    const total = o.dueAt - o.placedAt;

    const hero = waiting ? `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">WAITING FOR ${esc(first(e).toUpperCase())}</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Order sent</div>
        <div style="font-size:13px;opacity:.7;margin-top:2px">${esc(first(e))} sees your brief and that payment is held. If they decline, you're refunded.</div>` : {
      editing: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">${o.revisionsLeft < 2 ? "REVISED CUT IN" : "FIRST CUT IN"}</div>
        <div class="rounded-num" id="left" style="font-size:44px;line-height:52px">${fmtLeft(o.dueAt - Date.now())}</div>`,
      review: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">YOUR TURN</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Cut is ready</div>`,
      approved: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">DONE</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Delivered ✓</div>`,
      refunded: `<div class="cap" style="font-size:13px;color:rgba(255,255,255,.6);font-weight:500">CLOSED</div>
        <div class="rounded-num" style="font-size:36px;line-height:46px">Refunded</div>`,
    }[o.status];

    return {
      tabs: tabbar("client", "orders"),
      html: `<div class="scroll">
        <div class="between" style="margin-top:4px">
          <button class="icon-btn gray" data-back aria-label="Back">${icon("chev_l", 18, C.ink, 2.4)}</button>
          <span class="h3">Order #${esc(o.id)}</span>
          <button class="icon-btn gray" id="more" aria-label="More">${icon("more", 18, C.ink, 2)}</button>
        </div>
        <div class="track-grid"><div class="track-a">
        <div class="card-ink" style="margin-top:16px">
          ${hero}
          <div style="font-size:15px;opacity:.75">${esc(o.title)} · ${o.rush ? "Rush" : "Standard"}</div>
          <div style="margin-top:18px;position:relative;height:30px">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;height:14px">${ticks}</div>
            <div style="height:6px;border-radius:3px;background:rgba(255,255,255,.15);margin-top:6px;position:relative;overflow:hidden"><div id="prog" style="position:absolute;left:0;top:0;bottom:0;background:${C.cut};border-radius:3px"></div></div>
            <div id="head" style="position:absolute;top:2px;width:2px;height:30px;background:${C.cut};border-radius:1px"></div>
          </div>
          ${o.status === "review" ? `<a href="#/review/${esc(o.id)}" class="btn accent sm" style="margin-top:16px;text-decoration:none">Watch the cut</a>` : ""}
        </div>
        <div class="row gap-12 card-gray" style="margin-top:14px">
          ${av(e.initials, e.av, 42)}
          <a href="#/editor/${e.id}" class="flex-1" style="text-decoration:none;color:inherit"><div class="row gap-4" style="font-size:15px;font-weight:600">${e.name}${seal(14)}</div><div class="foot">Usually replies in ${e.reply}</div></a>
          <button class="icon-btn" id="chat" style="background:var(--raised);width:40px;height:40px" aria-label="Message">${icon("chat", 19, C.ink, 2)}</button>
        </div>
        ${o.brief ? briefCard(o.brief, thumbUrl) : ""}
        </div><div class="track-b">
        <div style="margin-top:22px" class="steps">${stepHTML}</div>
        ${o.status === "approved" && o.payout ? receipt(e, o.payout) : `
        <button id="held" style="width:100%;text-align:left;margin-top:22px;border-radius:16px;border:1px solid var(--line);padding:14px;display:flex;gap:12px;align-items:center">
          <div class="icon-tile" style="width:40px;height:40px;border-radius:12px;background:var(--safe-tint)">${icon(o.status === "approved" ? "check" : "lock", 20, C.safe, 2)}</div>
          <div class="flex-1"><div class="h3" style="font-size:15px">${inr(o.total)} ${o.status === "approved" ? "released" : o.status === "refunded" ? "refunded to you" : "held safely"}</div><div class="foot">${o.status === "approved" ? "Paid to " + first(e) + ". Leave a review?" : o.status === "refunded" ? first(e) + " declined this order, so your payment was returned (simulated)." : "Released to " + first(e) + " only when you approve the final cut."}</div>${o.payment ? `<div class="cap" style="margin-top:2px">${esc(o.payment.method)} · ${esc(o.payment.reference)} · simulated</div>` : ""}</div>
          ${icon("chev_r", 16, C.ter, 2.2)}
        </button>`}
        ${o.status === "editing" && standin ? `
          <label class="btn secondary sm" id="cut-btn" style="margin-top:14px;cursor:pointer">${icon("upload", 16, C.cut, 2)}<span id="cut-label" style="margin-left:6px">Upload the editor's cut</span>
            <input type="file" id="cut-file" accept="video/*" hidden></label>
          <div class="cap" style="text-align:center;margin-top:6px">Demo: stands in for the editor's app</div>` : ""}
        ${o.status === "approved" ? `<button id="review-btn" class="btn primary sm" style="margin-top:14px">Rate ${first(e)}</button>` : ""}
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
        root.querySelector("#chat").addEventListener("click", () => toast("Chat isn't part of this demo yet", icon("chat", 16, "currentColor")));
        root.querySelector("#held")?.addEventListener("click", () => S.escrowSheet());
        root.querySelector("#more").addEventListener("click", () => sheet({
          body: `<div style="margin-top:12px">${[["clock", "Extend the deadline"], ["chat", "Message " + first(e)], ["x", "Cancel and refund"]].map(([ic, t]) => `<button class="list-row" style="width:100%;text-align:left" data-close>${icon(ic, 20, ic === "x" ? C.cut : C.ink)}<span style="font-size:17px;color:${ic === "x" ? C.cut : C.ink}">${t}</span></button>`).join("")}</div>`,
        }));

        const bt = root.querySelector("#brief-toggle");
        bt && bt.addEventListener("click", () => {
          const body = root.querySelector("#brief-body"), open = body.hidden;
          body.hidden = !open;
          bt.setAttribute("aria-expanded", String(open));
          root.querySelector("#brief-chev").innerHTML = icon(open ? "minus" : "chev_d", 16, C.sub, 2.2);
        });

        const cutFile = root.querySelector("#cut-file");
        cutFile && cutFile.addEventListener("change", async () => {
          const file = cutFile.files[0];
          if (!file) return;
          const label = root.querySelector("#cut-label"), btn = root.querySelector("#cut-btn");
          btn.style.pointerEvents = "none";
          try {
            const up = await api.uploadFile(file, "cut", (p) => (label.textContent = `Uploading ${Math.round(p * 100)}%…`));
            label.textContent = "Delivering…";
            await api.deliverCut(o.id, up.id);
            toast("Cut delivered for your review", icon("play", 14, C.cut));
            BMT.router.refresh();
          } catch (err) {
            btn.style.pointerEvents = "";
            label.textContent = "Upload the editor's cut";
            toast(esc(err.message));
          }
          cutFile.value = "";
        });

        const rb = root.querySelector("#review-btn");
        rb && rb.addEventListener("click", () => rateSheet(e));
        return () => clearInterval(t);
      },
    };
  };

  function rateSheet(e) {
    let stars = 5;
    sheet({
      body: `<div style="text-align:center;margin-top:16px">${av(e.initials, e.av, 64)}<div class="title-2" style="margin-top:10px">How was ${first(e)}?</div>
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

  // ---------------------------------------------------------------- 07 Review cut (dark) + Review Copilot
  const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const WHO = {
    you: { name: "You", avatar: () => av("TA", 1, 30) },
    client: { name: "From your feedback", avatar: () => av("TA", 1, 30) },
    ai: { name: "Gemini", avatar: () => `<div class="avatar" style="width:30px;height:30px;background:var(--cut-tint)">${icon("sparkle", 16, C.cut, 2)}</div>` },
  };

  S.review = async ([id]) => {
    const o = await api.getOrder(id);
    if (!o) return S.notFound();
    const e = await api.getEditor(o.editorId);
    const src = o.cutUploadId ? await api.mediaUrl(o.cutUploadId).catch(() => null) : null;
    const canAct = o.status === "review";
    let duration = 58, pos = 0, playing = false;
    let review = o.review, pinned = [...o.notes];

    const allNotes = () => [
      ...pinned.map((n) => ({ who: "you", t: n.t, text: n.text })),
      ...(review?.notes || []).map((n) => ({ who: n.source, t: n.timestamp_sec, text: n.issue, sub: n.suggestion, severity: n.severity })),
    ].sort((a, b) => a.t - b.t);

    const noteHTML = (n) => `
      <button class="row gap-10" data-t="${n.t}" style="width:100%;text-align:left;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.08);align-items:flex-start">
        ${WHO[n.who].avatar()}
        <div class="flex-1"><div class="row gap-8" style="flex-wrap:wrap"><span style="font-size:13px;font-weight:600;color:white">${WHO[n.who].name}</span>
          <span style="font-size:12px;font-weight:600;color:${C.cut};background:rgba(255,90,31,.16);padding:1px 6px;border-radius:6px">${ts(n.t)}</span>
          ${n.severity ? `<span class="sev ${n.severity}">${n.severity}</span>` : ""}</div>
          <div style="font-size:15px;color:rgba(255,255,255,.88);margin-top:2px;line-height:20px">${esc(n.text)}</div>
          ${n.sub ? `<div style="font-size:14px;color:rgba(255,255,255,.6);margin-top:2px;line-height:19px">${esc(n.sub)}</div>` : ""}</div>
      </button>`;

    const checklistHTML = (r) => r.checklist.map((c) => `
      <div class="check-row">${icon(c.met ? "check" : "x", 16, c.met ? C.safe : C.cut, 2.6)}<span>${esc(c.item)}</span></div>`).join("");

    return {
      dark: true,
      html: `
      <div style="position:absolute;top:calc(var(--safe-top) + 0px);left:16px;right:16px;display:flex;justify-content:space-between;align-items:center;color:white;z-index:5">
        <button class="icon-btn" data-back style="background:rgba(255,255,255,.12)" aria-label="Close">${icon("x", 17, "white", 2.4)}</button>
        <div style="text-align:center"><div class="h3">${o.revisionsLeft < 2 ? "Revised cut" : "First cut"}</div><div style="font-size:12px;opacity:.6">${esc(o.title)} · by ${first(e)}</div></div>
        <button class="icon-btn" style="background:rgba(255,255,255,.12)" id="share" aria-label="Share">${icon("share", 17, "white", 2.2)}</button>
      </div>
      <div class="scroll review" style="padding:calc(var(--safe-top) + 50px) 16px 110px"><div class="review-grid"><div class="review-a">
        <button id="player" style="display:block;margin:0 auto;width:200px;height:350px;border-radius:20px;background:${src ? "black" : ui.G[o.g % ui.G.length]};position:relative;overflow:hidden">
          ${src ? `<video id="vid" class="player-video" src="${src}" playsinline preload="metadata"></video>`
            : `<div style="position:absolute;left:14px;right:14px;bottom:56px;text-align:center;font-size:20px;font-weight:800;color:white">No cut uploaded yet</div>`}
          <div id="pp" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.25);display:flex;align-items:center;justify-content:center">${icon("play", 26, "white")}</div></div>
          <div id="clock" style="position:absolute;left:12px;bottom:12px;font-size:12px;color:white;font-weight:600;text-shadow:0 1px 3px rgba(0,0,0,.6)"></div>
        </button>
        <div class="scrubber" id="scrub" style="margin-top:18px"><div class="fill" id="fill"></div><div id="marks"></div><div class="head" id="phead"></div></div>
        </div><div class="review-b">
        <div class="ai-panel" id="ai"></div>
        <div class="h3" style="color:white;margin-top:18px">Notes</div>
        <div id="notes" style="margin-top:4px"></div>
        <div class="row gap-8" style="margin-top:10px;height:40px;border-radius:20px;background:rgba(255,255,255,.1);padding:0 6px 0 14px">
          <span id="at" style="font-size:12px;font-weight:600;color:${C.cut}"></span>
          <input id="note-in" placeholder="Add a note at this frame" maxlength="500" style="flex:1;border:0;outline:0;background:transparent;color:white;font-size:15px;min-width:0" ${canAct ? "" : "disabled"}>
          <button id="send" style="width:30px;height:30px;border-radius:50%;background:${C.cut};display:flex;align-items:center;justify-content:center" aria-label="Send note" ${canAct ? "" : "disabled"}>${icon("send", 15, "white", 2.2)}</button>
        </div>
      </div></div></div>
      <div class="bottom-bar review-actions" style="position:absolute;left:16px;right:16px;bottom:calc(30px + var(--safe-bottom));display:flex;gap:10px;z-index:5">
        <button class="btn" id="changes" style="flex:1;background:rgba(40,40,42,.95);color:white;height:50px;font-size:15px" ${canAct && o.revisionsLeft ? "" : "disabled"}>Changes<span style="opacity:.55;font-weight:500;margin-left:4px">· ${o.revisionsLeft} left</span></button>
        <button class="btn accent" id="approve" style="flex:1.2;height:50px;font-size:15px" ${canAct ? "" : "disabled"}>Approve · release ${inr(o.total)}</button>
      </div>`,
      mount(root) {
        const fill = root.querySelector("#fill"), head = root.querySelector("#phead"), clock = root.querySelector("#clock"), at = root.querySelector("#at");
        const marks = root.querySelector("#marks"), list = root.querySelector("#notes"), pp = root.querySelector("#pp");
        const player = root.querySelector("#player"), vid = root.querySelector("#vid"), ai = root.querySelector("#ai");
        let stopProgress = null, timer;

        const paint = () => {
          const pct = Math.min(100, (pos / duration) * 100);
          fill.style.width = pct + "%"; head.style.left = pct + "%";
          clock.textContent = `${ts(pos)} / ${ts(duration)}`; at.textContent = `@ ${ts(pos)}`;
        };
        const seek = (t) => { pos = Math.max(0, Math.min(duration, t)); if (vid) vid.currentTime = pos; paint(); };
        const paintNotes = () => {
          const notes = allNotes();
          marks.innerHTML = notes.map((n) => `<div class="mark ${n.who === "ai" ? "" : "client"}" style="left:${Math.min(100, (n.t / duration) * 100)}%"></div>`).join("");
          list.innerHTML = notes.length ? notes.map(noteHTML).join("")
            : `<div style="font-size:14px;color:rgba(255,255,255,.55);padding:12px 0">No notes yet. Run the AI review, or pin a note at any frame.</div>`;
          list.querySelectorAll("[data-t]").forEach((b) => b.addEventListener("click", () => { seek(+b.dataset.t); toast("Jumped to " + ts(pos)); }));
        };

        // ---- AI review panel
        const renderAI = (state, error) => {
          if (stopProgress) { stopProgress(); stopProgress = null; }
          if (state === "running") {
            stopProgress = aiProgress(ai, ["Watching the cut…", "Checking it against your brief…", "Writing notes…"]);
            return;
          }
          if (state === "error") {
            ai.innerHTML = `<div style="font-size:15px;line-height:20px">${esc(error)}</div><button class="btn accent sm" id="run" style="margin-top:12px">Try again</button>`;
            ai.querySelector("#run").addEventListener("click", () => run());
            return;
          }
          if (!review) {
            ai.innerHTML = `<div class="row gap-8">${icon("sparkle", 18, C.cut, 2)}<span class="h3" style="color:white">AI review</span></div>
              <div style="font-size:14px;color:rgba(255,255,255,.65);margin-top:4px">Gemini watches the cut and checks it against ${o.brief ? "your brief" : "your order"}.</div>
              <button class="btn accent sm" id="run" style="margin-top:12px" ${src && canAct ? "" : "disabled"}>Run AI review</button>`;
            ai.querySelector("#run").addEventListener("click", () => run());
            return;
          }
          ai.innerHTML = `<div class="row gap-12" style="align-items:flex-end"><div class="score">${review.overall_match}%</div><div style="font-size:14px;color:rgba(255,255,255,.65);padding-bottom:6px">match with ${o.brief ? "your brief" : "your order"}</div></div>
            <div style="font-size:15px;line-height:20px;margin-top:6px">${esc(review.summary)}</div>
            <div style="margin-top:10px">${checklistHTML(review)}</div>
            <div class="row gap-4" style="font-size:12px;color:rgba(255,255,255,.5);margin-top:10px">${icon("sparkle", 12, C.cut, 2)} Reviewed by Gemini</div>
            ${canAct ? `<div style="font-size:14px;font-weight:600;margin-top:16px">Tell the editor what you want, in your own words</div>
            <textarea id="fb" maxlength="1000" placeholder="e.g. make it more cinematic"></textarea>
            <div id="fb-status" style="font-size:14px;margin-top:8px"></div>
            <button class="btn secondary sm" id="fb-go" style="margin-top:8px">Turn into notes</button>
            ${api.features().screening ? `<div class="row gap-4" style="font-size:12px;color:rgba(255,255,255,.5);margin-top:8px">${icon("shield", 12, C.safe, 2)} Feedback is checked by Gemma first</div>` : ""}` : ""}`;
          const go = ai.querySelector("#fb-go");
          go && go.addEventListener("click", () => {
            const text = ai.querySelector("#fb").value.trim();
            if (!text) { toast("Type what you'd like changed first"); return; }
            run(text);
          });
        };

        async function run(feedback) {
          if (feedback) {
            const status = ai.querySelector("#fb-status");
            ai.querySelector("#fb-go").disabled = true;
            stopProgress = aiProgress(status, ["Reading your feedback…", "Finding the right moments…"]);
          } else {
            renderAI("running");
          }
          try {
            const before = review?.notes.length || 0;
            review = await api.runReview(o.id, feedback);
            renderAI();
            paintNotes();
            if (feedback) toast(`Added ${Math.max(0, review.notes.length - before)} notes from your feedback`, icon("sparkle", 14, C.cut, 2));
          } catch (err) {
            if (feedback && review) {
              renderAI();
              toast(esc(err.message));
            } else {
              renderAI("error", err.message);
            }
          }
        }

        renderAI();
        paint(); paintNotes();

        // ---- player
        if (vid) {
          // Some files (e.g. browser-recorded WebM) report Infinity until fully read:
          // seek far past the end once so the browser computes the real length, then rewind.
          let probing = false;
          const useDuration = () => {
            if (!Number.isFinite(vid.duration) || vid.duration <= 0 || vid.duration === duration) return;
            duration = vid.duration;
            if (probing) { probing = false; vid.currentTime = 0; }
            paint(); paintNotes();
          };
          vid.addEventListener("durationchange", useDuration);
          vid.addEventListener("loadedmetadata", () => {
            if (vid.duration === Infinity) {
              probing = true; vid.currentTime = 1e101;
              setTimeout(() => { if (probing) { probing = false; vid.currentTime = 0; } }, 1500);
            }
            useDuration();
            if (vid.videoWidth > vid.videoHeight) {
              player.style.width = "100%"; player.style.maxWidth = "560px"; player.style.height = "auto";
              player.style.aspectRatio = `${vid.videoWidth} / ${vid.videoHeight}`;
            }
          });
          vid.addEventListener("timeupdate", () => { pos = vid.currentTime; useDuration(); paint(); });
          vid.addEventListener("play", () => (pp.style.opacity = 0));
          vid.addEventListener("pause", () => (pp.style.opacity = 1));
          vid.addEventListener("error", () => toast("This cut can't be played in the browser"));
        }
        player.addEventListener("click", () => {
          if (vid) { vid.paused ? vid.play() : vid.pause(); return; }
          playing = !playing;
          pp.style.opacity = playing ? 0 : 1;
          clearInterval(timer);
          if (playing) timer = setInterval(() => { pos = pos >= duration ? 0 : pos + 0.25; paint(); }, 250);
        });
        const scrub = root.querySelector("#scrub");
        const seekAt = (ev) => { const r = scrub.getBoundingClientRect(); seek(((ev.clientX - r.left) / r.width) * duration); };
        scrub.addEventListener("pointerdown", (ev) => { seekAt(ev); scrub.setPointerCapture(ev.pointerId); scrub.onpointermove = seekAt; });
        scrub.addEventListener("pointerup", () => (scrub.onpointermove = null));

        // ---- pinned notes
        const input = root.querySelector("#note-in");
        const send = async () => {
          const text = input.value.trim(); if (!text) return;
          try {
            const updated = await api.addNote(o.id, { t: Math.round(pos), who: "you", text });
            pinned = updated.notes;
            input.value = "";
            paintNotes();
            toast("Note pinned at " + ts(pos));
          } catch (err) {
            toast(esc(err.message));
          }
        };
        root.querySelector("#send").addEventListener("click", send);
        input.addEventListener("keydown", (ev) => ev.key === "Enter" && send());
        root.querySelector("#share").addEventListener("click", () => toast("Private review link copied"));

        root.querySelector("#changes").addEventListener("click", async () => {
          try {
            await api.requestChanges(o.id);
            toast(`Sent ${allNotes().length} notes to ${first(e)}`, icon("send", 14, "currentColor", 2));
            location.hash = "#/order/" + o.id;
          } catch (err) {
            toast(esc(err.message));
          }
        });
        root.querySelector("#approve").addEventListener("click", () => sheet({
          body: `<div style="text-align:center;margin-top:18px">${icon("lock", 40, C.safe, 1.8).replace("<svg", '<svg style="margin:0 auto"')}
            <div class="title-2" style="margin-top:12px">Release ${inr(o.total)} to ${first(e)}?</div>
            <p class="sub" style="margin-top:8px">You'll get the full-quality file instantly. This can't be undone.</p>
            <button class="btn accent" id="confirm" style="margin-top:18px">Approve and release</button>
            <button class="btn secondary" data-close style="margin-top:10px">Not yet</button></div>`,
          onMount(el, close) {
            el.querySelector("#confirm").addEventListener("click", async (ev) => {
              const btn = ev.currentTarget;
              btn.disabled = true; btn.textContent = "Releasing…";
              try {
                const approved = await api.approveOrder(o.id);
                close();
                S.payoutSheet({ editor: e, order: approved });
              } catch (err) {
                btn.disabled = false; btn.textContent = "Approve and release";
                toast(esc(err.message));
              }
            });
          },
        }));
        return () => { clearInterval(timer); if (stopProgress) stopProgress(); if (vid) vid.pause(); };
      },
    };
  };
})();
