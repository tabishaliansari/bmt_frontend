/* The editor's side of the live app: incoming orders, accept or decline, the brief and the
   client's raw clips, upload the cut, see the client's review notes, and get paid via Ramp. */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, esc, inr, usd, toast, sheet, thumb, chip, av } = ui;
  const S = BMT.screens;

  const inr2 = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const ts = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  const when = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const left = (ms) => {
    if (ms <= 0) return "Due now";
    const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
    return h >= 24 ? `${Math.floor(h / 24)}d ${h % 24}h left` : `${h}h ${String(m).padStart(2, "0")}m left`;
  };
  /** What the editor will receive (display only; the server computes the real payout). */
  const expectedInr = (o) => Math.round((o.totalUsd ?? o.totalUsdRaw ?? o.total / api.DEMO_FX) * (1 - api.PLATFORM_FEE_PCT / 100) * 100) / 100 * api.DEMO_FX;

  // [label, colour] per job state, as the editor sees it
  const jobState = (o) => {
    if (o.serverStatus === "funded") return ["New order", "var(--cut-ink)"];
    if (o.serverStatus === "in_progress") return o.changesRequested ? ["Changes requested", "var(--cut-ink)"] : ["Editing", "var(--trust-ink)"];
    if (o.serverStatus === "review") return ["With the client", "var(--trust-ink)"];
    if (o.serverStatus === "approved") return ["Paid", "var(--safe-ink)"];
    return ["Declined", C.sub];
  };

  // ---------------------------------------------------------------- Dashboard (linked editor)
  S.editorDashboard = async (editor, name) => {
    const jobs = await api.getJobs();
    const fresh = jobs.filter((o) => o.serverStatus === "funded").length;
    const earned = jobs.filter((o) => o.payout).reduce((s, o) => s + o.payout.amount_inr, 0);
    return {
      tabs: ui.tabbar("editor", "studio"),
      html: `<div class="scroll narrow">
        <div class="cap" style="font-size:13px;font-weight:500;margin-top:6px">Editor</div>
        <h1 class="large-title">Hi, ${esc(name)}</h1>
        <div class="row gap-8 editor-stats" style="margin-top:14px">
          <div class="stat-box"><div class="v">${fresh}</div><div class="cap">new orders</div></div>
          <div class="stat-box"><div class="v">${jobs.filter((o) => ["in_progress", "review"].includes(o.serverStatus)).length}</div><div class="cap">in progress</div></div>
          <div class="stat-box"><div class="v">${inr(Math.round(earned))}</div><div class="cap">paid via Ramp</div></div>
        </div>
        <div class="section-head"><h2 class="h2">Orders</h2><a class="link" href="#/editor/${esc(editor.id)}">My storefront</a></div>
        <div class="editor-orders">
        ${jobs.length ? jobs.map((o) => {
          const [label, colour] = jobState(o);
          return `<a href="#/job/${esc(o.id)}" class="list-row" style="text-decoration:none;color:inherit">
            ${thumb(o.g, 56, 56, 12)}
            <div class="flex-1" style="min-width:0"><div style="font-size:15px;font-weight:600">${esc(o.title)}</div>
              <div class="foot">${esc(o.clientName)} · #${esc(o.id)}</div>
              <div style="font-size:12px;font-weight:600;color:${colour};margin-top:2px">${label}</div></div>
            <div style="text-align:right"><div style="font-size:15px;font-weight:600">${inr(o.total)}</div>${icon("chev_r", 16, C.ter, 2.2)}</div>
          </a>`;
        }).join("") : `<div class="empty" style="padding:30px 10px">${icon("orders", 32, C.ter)}<div style="margin-top:8px">No orders yet. When a client orders one of your packages, it shows up here with their brief.</div></div>`}
        </div>
      </div>`,
    };
  };

  // ---------------------------------------------------------------- One order (job)
  const briefHTML = (b, clipNames, links, refClipCount) => `
    <div class="brief-doc">
      <div class="title-2">${esc(b.title)}</div>
      <div class="row gap-8" style="margin-top:8px;flex-wrap:wrap">${chip(esc(b.format), "best", icon("play", 10, C.cut))}${chip(b.target_length_sec + " sec", "safe", icon("clock", 11, C.safe, 2.2))}</div>
      <div class="sec"><div class="label">Hook</div><div class="hook">${esc(b.hook_idea)}</div></div>
      <div class="sec"><div class="label">Best moments</div>${b.best_moments.map((m) => `
        <div class="moment"><span class="ts-chip">${esc(m.start)}–${esc(m.end)}</span>
          <div class="flex-1"><div style="font-size:15px;line-height:20px">${esc(m.why)}</div><div class="cap">${esc(clipNames[m.upload_id] || "Clip")}</div></div></div>`).join("")}</div>
      <div class="sec"><div class="label">Style</div><div style="font-size:15px;line-height:21px">${esc(b.style_notes)}</div></div>
      ${ui.referencesSec(b.references, links, refClipCount, "The client's references")}
      <div class="sec"><div class="label">Must include</div><ul>${b.must_include.map((t) => `<li>${icon("check", 16, C.safe, 2.2)}<span>${esc(t)}</span></li>`).join("")}</ul></div>
      ${b.questions_for_client.length ? `<div class="sec"><div class="label">Open questions for the client</div><ul>${b.questions_for_client.map((t) => `<li>${icon("chat", 16, C.sub, 2.2)}<span>${esc(t)}</span></li>`).join("")}</ul></div>` : ""}
      <div class="ai-label">${icon("sparkle", 14, C.cut)} Brief written by Gemini from the client's footage</div>
    </div>`;

  const notesHTML = (o) => {
    const r = o.review;
    const pinned = o.notes || [];
    if (!r && !pinned.length) return "";
    const rows = [
      ...(r?.notes || []).map((n) => ({ t: n.timestamp_sec, who: n.source === "ai" ? "Gemini" : "Client (rewritten by Gemini)", text: n.issue, sub: n.suggestion, sev: n.severity })),
      ...pinned.map((n) => ({ t: n.t, who: "Client", text: n.text })),
    ].sort((a, b) => a.t - b.t);
    return `<div class="section-head"><h2 class="h2">Notes on your cut</h2>${r ? `<span class="cap">${r.overall_match}% match with the brief</span>` : ""}</div>
      ${r ? `<p class="foot" style="margin-top:-4px">${esc(r.summary)}</p>` : ""}
      ${rows.map((n) => `<div class="list-row" style="align-items:flex-start">
        <span class="ts-chip">${ts(n.t)}</span>
        <div class="flex-1"><div class="cap" style="font-weight:600">${esc(n.who)}${n.sev ? ` · ${esc(n.sev)}` : ""}</div>
          <div style="font-size:15px;line-height:20px">${esc(n.text)}</div>${n.sub ? `<div class="foot">${esc(n.sub)}</div>` : ""}</div></div>`).join("")}`;
  };

  S.job = async ([id]) => {
    const o = await api.getJob(id);
    if (!o) return S.notFound();
    const media = await api.getJobMedia(id).catch(() => []);
    const raws = media.filter((m) => m.kind === "raw" || m.kind === "ref");
    const refClipCount = media.filter((m) => m.kind === "ref").length;
    const thumbItem = media.find((m) => m.kind === "thumb");
    const clipNames = Object.fromEntries(raws.map((m) => [m.id, m.label]));
    const [label] = jobState(o);
    const s = o.serverStatus;
    const gets = expectedInr(o);

    const hero = {
      funded: `<div class="cap" style="color:rgba(255,255,255,.6);font-weight:500">NEW ORDER</div>
        <div class="rounded-num" style="font-size:32px;line-height:40px">${inr(o.total)} held for you</div>
        <div style="font-size:15px;opacity:.75">${esc(o.clientName)} · ${esc(o.title)}${o.rush ? " · Rush" : ""}</div>
        <div class="row gap-10" style="margin-top:16px"><button class="btn accent sm" id="accept" style="flex:2">Accept order</button><button class="btn sm" id="decline" style="flex:1;background:rgba(255,255,255,.12);color:white">Decline</button></div>`,
      in_progress: `<div class="cap" style="color:rgba(255,255,255,.6);font-weight:500">${o.changesRequested ? "CHANGES REQUESTED" : "EDITING"}</div>
        <div class="rounded-num" style="font-size:32px;line-height:40px">${left(o.dueAt - Date.now())}</div>
        <div style="font-size:15px;opacity:.75">${esc(o.title)} for ${esc(o.clientName)} · due ${when(o.dueAt)}</div>
        <label class="btn accent sm" id="cut-btn" style="margin-top:16px;cursor:pointer">${icon("upload", 16, "white", 2)}<span id="cut-label" style="margin-left:6px">${o.changesRequested ? "Upload the revised cut" : "Upload my cut"}</span>
          <input type="file" id="cut-file" accept="video/*" hidden></label>`,
      review: `<div class="cap" style="color:rgba(255,255,255,.6);font-weight:500">WITH THE CLIENT</div>
        <div class="rounded-num" style="font-size:32px;line-height:40px">Waiting for approval</div>
        <div style="font-size:15px;opacity:.75">Delivered ${o.deliveredAt ? when(o.deliveredAt) : ""}. You'll be paid when ${esc(o.clientName)} approves.</div>`,
      approved: `<div class="cap" style="color:rgba(255,255,255,.6);font-weight:500">APPROVED</div>
        <div class="rounded-num" style="font-size:32px;line-height:40px">Paid ✓</div>
        <div style="font-size:15px;opacity:.75">${esc(o.clientName)} approved your cut.</div>`,
      refunded: `<div class="cap" style="color:rgba(255,255,255,.6);font-weight:500">DECLINED</div>
        <div class="rounded-num" style="font-size:32px;line-height:40px">Order declined</div>
        <div style="font-size:15px;opacity:.75">The client's payment was refunded.</div>`,
    }[s] || "";

    const money = s === "approved" && o.payout
      ? `<div class="receipt">${icon("check", 22, C.safe, 2.6)}<div class="flex-1"><div class="big">${inr2(o.payout.amount_inr)} on its way via Ramp</div>
          <div class="receipt-lines">
            <div class="between"><span>Client paid</span><span>${usd(o.payout.gross_usd)}</span></div>
            <div class="between"><span>BMT fee (${o.payout.fee_pct}%)</span><span>− ${usd(o.payout.fee_usd)}</span></div>
            <div class="between"><span>You receive</span><span><b>${inr2(o.payout.amount_inr)}</b> at ${Number(o.payout.fx_rate).toFixed(2)}</span></div>
            <div class="between"><span>Ramp transfer</span><span>${esc(o.payout.transfer_id)}</span></div>
            <div class="between"><span>Arrives</span><span>${esc(o.payout.eta)}</span></div></div>
          <div style="font-size:12px;opacity:.8;margin-top:6px">Simulated payout at a demo FX rate. No real money moved.</div></div></div>`
      : s === "refunded" ? ""
      : `<div class="escrow-note">${icon("shield", 22, C.safe, 2)}<div><b>${inr(o.total)} is held by BMT for this order.</b> When ${esc(o.clientName)} approves your cut, you receive about <b>${inr2(gets)}</b> in INR via Ramp (after BMT's ${api.PLATFORM_FEE_PCT}% fee, demo FX rate).</div></div>`;

    return {
      tabs: ui.tabbar("editor", "studio"),
      html: `<div class="scroll narrow">
        <div class="between" style="margin-top:4px">
          <button class="icon-btn gray" data-back aria-label="Back">${icon("chev_l", 18, C.ink, 2.4)}</button>
          <span class="h3">Order #${esc(o.id)}</span><span style="width:36px" aria-label="${esc(label)}"></span>
        </div>
        <div class="card-ink" style="margin-top:16px">${hero}</div>
        ${money}
        ${notesHTML(o)}
        ${o.brief ? `<div class="section-head"><h2 class="h2">The brief</h2></div>${briefHTML(o.brief, clipNames, o.referenceLinks, refClipCount)}` : ""}
        ${o.note ? `<div class="card-gray" style="margin-top:14px"><div class="cap" style="font-weight:600">NOTE FROM ${esc(o.clientName.toUpperCase())}</div><div style="font-size:15px;line-height:20px;margin-top:4px">${esc(o.note)}</div></div>` : ""}
        ${raws.length || thumbItem ? `<div class="section-head"><h2 class="h2">Client's footage</h2><span class="cap">${raws.length} clip${raws.length === 1 ? "" : "s"}</span></div>
          <div class="job-media">${raws.map((m) => `
            <div class="job-clip"><video src="${esc(m.url)}" controls playsinline preload="metadata"></video>
              <div class="between" style="margin-top:6px"><span class="cap">${esc(m.label)} · ${esc(m.filename)}</span><a class="link" href="${esc(m.url)}" download="${esc(m.filename)}" style="font-size:13px">Download</a></div></div>`).join("")}
            ${thumbItem ? `<div class="job-clip"><img src="${esc(thumbItem.url)}" alt="Thumbnail concept" style="width:100%;border-radius:12px;display:block">
              <div class="cap" style="margin-top:6px">Thumbnail concept · drafted by Nano Banana</div></div>` : ""}
          </div>` : ""}
      </div>`,
      mount(root) {
        root.querySelector("#accept")?.addEventListener("click", async (ev) => {
          const btn = ev.currentTarget; btn.disabled = true;
          try { await api.acceptJob(o.id); toast("Order accepted. The client can see you've started.", icon("check", 14, C.safe, 2.6)); BMT.router.refresh(); }
          catch (err) { btn.disabled = false; toast(esc(err.message)); }
        });
        root.querySelector("#decline")?.addEventListener("click", () => sheet({
          body: `<div style="text-align:center;margin-top:18px"><div class="title-2">Decline this order?</div>
            <p class="sub" style="margin-top:8px">${esc(o.clientName)}'s payment of ${inr(o.total)} is refunded to them. This can't be undone.</p>
            <button class="btn primary" id="confirm" style="margin-top:18px">Decline and refund</button>
            <button class="btn secondary" data-close style="margin-top:10px">Keep the order</button></div>`,
          onMount(el, close) {
            el.querySelector("#confirm").addEventListener("click", async (ev) => {
              const btn = ev.currentTarget; btn.disabled = true;
              try { await api.declineJob(o.id); close(); toast("Order declined. The client was refunded."); BMT.router.refresh(); }
              catch (err) { btn.disabled = false; toast(esc(err.message)); }
            });
          },
        }));
        const cutFile = root.querySelector("#cut-file");
        cutFile?.addEventListener("change", async () => {
          const file = cutFile.files[0];
          if (!file) return;
          const label = root.querySelector("#cut-label"), btn = root.querySelector("#cut-btn");
          btn.style.pointerEvents = "none";
          try {
            const up = await api.uploadFile(file, "cut", (p) => (label.textContent = `Uploading ${Math.round(p * 100)}%…`));
            label.textContent = "Delivering…";
            await api.deliverJob(o.id, up.id);
            toast("Cut delivered. The client can review it now.", icon("play", 14, C.cut));
            BMT.router.refresh();
          } catch (err) {
            btn.style.pointerEvents = "";
            label.textContent = "Upload my cut";
            toast(esc(err.message));
          }
          cutFile.value = "";
        });
      },
    };
  };
})();
