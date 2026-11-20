/* Money screens: demo checkout (client pays into escrow) and the Ramp payout to the editor.
   Everything here is simulated and says so. No card or bank details are ever collected. */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, seal, inr, usd, esc, toast, sheet, thumb } = ui;
  const S = BMT.screens;

  const first = (e) => e.name.split(" ")[0];
  const inr2 = (n) => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  // A vertical list of steps that tick one by one: [{ title, sub }]
  const stepsHTML = (steps) => `<div class="pay-steps">${steps.map((s, i) => `
    <div class="pay-step todo" data-step="${i}">
      <span class="pay-dot" aria-hidden="true"></span>
      <div class="flex-1"><div class="pay-title">${s.title}</div>${s.sub ? `<div class="pay-sub">${s.sub}</div>` : ""}</div>
    </div>`).join("")}</div>`;

  function setStep(root, i, state) {
    const row = root.querySelector(`[data-step="${i}"]`);
    if (!row) return;
    row.className = "pay-step " + state;
    row.querySelector(".pay-dot").innerHTML = state === "done" ? icon("check", 12, "currentColor", 3) : "";
    if (state === "live") BMT.a11y.announce(row.querySelector(".pay-title").textContent);
  }

  async function playSteps(root, count, ms = 650) {
    for (let i = 0; i < count; i++) {
      setStep(root, i, "live");
      await delay(ms);
      setStep(root, i, "done");
    }
  }

  // ---------------------------------------------------------------- Checkout (client pays into escrow)
  S.checkoutSheet = async ({ editor, item, order, brief }) => {
    const addons = await api.getAddons();
    const chosen = addons.filter((a) => order.addons.includes(a.id));
    const totalInr = api.quote(editor.id, item.id, order);
    const totalUsd = api.quoteUsd(editor.id, item.id, order);
    const toUsd = (inrValue, usdValue) => usdValue != null ? usd(usdValue) : usd(inrValue / api.DEMO_FX);
    const line = (label, inrValue, usdValue) => `
      <div class="between pay-line"><span>${label}</span><span><b>${inr(inrValue)}</b> <span class="cap">${toUsd(inrValue, usdValue)}</span></span></div>`;
    let method = "demo_card";
    let placedId = null;

    sheet({
      height: "92%",
      onClose() { if (placedId) location.hash = "#/order/" + placedId; },
      body: `
        <div class="between" style="margin-top:14px">
          <span class="title-2">Checkout</span>
          <span class="chip" style="background:var(--grouped);color:var(--sub)">Demo · no real charge</span>
        </div>
        <div class="card-gray" style="margin-top:14px">
          <div class="row gap-12">${thumb(item.g, 44, 44, 10)}
            <div class="flex-1"><div style="font-size:15px;font-weight:600">${esc(item.title)}</div><div class="row gap-4 foot">by ${esc(editor.name)}${seal(13)}</div></div></div>
          <div style="margin-top:12px">
            ${line(esc(item.title), item.price, item.priceUsd)}
            ${chosen.map((a) => line(esc(a.title), a.price, a.priceUsd)).join("")}
            ${order.rush ? line("Rush, 24 hours", api.RUSH_FEE, null) : ""}
          </div>
          <div class="between" style="border-top:1px solid var(--line);margin-top:8px;padding-top:10px">
            <span class="h3">Total</span><span class="h3">${inr(totalInr)} <span class="cap" style="font-weight:500">charged as ${usd(totalUsd)}</span></span>
          </div>
          ${brief ? `<div class="row gap-8 foot" style="margin-top:8px">${icon("sparkle", 14, C.cut, 2)} Your brief "${esc(brief.title)}" is attached</div>` : ""}
        </div>
        <div class="h3" style="margin-top:20px">Pay with</div>
        <div class="row gap-10" style="margin-top:10px">
          <button class="choice on" data-method="demo_card"><div style="font-size:15px;font-weight:600">Test card</div><div class="foot">•••• 4242</div></button>
          <button class="choice" data-method="demo_upi"><div style="font-size:15px;font-weight:600">Test UPI</div><div class="foot">demo@bmt</div></button>
        </div>
        <p class="cap" style="margin-top:8px">Demo payment methods only. BMT never asks for real card or bank details here.</p>
        <div class="escrow-note">
          ${icon("shield", 22, C.safe, 2)}
          <div><b>Held by BMT, not paid to ${esc(first(editor))} yet.</b> ${esc(first(editor))} sees the order is funded and starts right away. The money is released only when you approve the cut, then paid out in INR via Ramp.</div>
        </div>
        <div id="pay-progress"></div>`,
      foot: `<div><div class="foot">You pay</div><div style="font-size:22px;font-weight:700;letter-spacing:-0.4px">${usd(totalUsd)}</div></div>
             <button class="btn primary" id="pay" style="flex:1;height:52px">Pay ${usd(totalUsd)} · demo</button>`,
      onMount(el, close) {
        el.querySelectorAll("[data-method]").forEach((b) => b.addEventListener("click", () => {
          method = b.dataset.method;
          el.querySelectorAll("[data-method]").forEach((x) => x.classList.toggle("on", x === b));
        }));
        el.querySelector("#pay").addEventListener("click", async (ev) => {
          const btn = ev.currentTarget;
          btn.disabled = true; btn.textContent = "Processing…";
          const progress = el.querySelector("#pay-progress");
          progress.innerHTML = `<div class="card-gray" style="margin-top:16px">${stepsHTML([
            { title: `Authorising ${method === "demo_upi" ? "test UPI" : "test card"} payment`, sub: "Simulated, no real charge" },
            { title: `Holding ${usd(totalUsd)} safely in escrow` },
            { title: `Telling ${esc(first(editor))} the order is funded` },
          ])}</div>`;
          progress.scrollIntoView({ behavior: "smooth", block: "end" });
          try {
            const [placed] = await Promise.all([api.placeOrder({ ...order, paymentMethod: method }), playSteps(progress, 3)]);
            BMT.cart = null;
            placedId = placed.id;
            if (order.briefId) api.clearActiveBrief();
            el.querySelector(".sheet-body").innerHTML = `
              <div style="text-align:center;padding:40px 8px">
                <div class="paid-badge">${icon("lock", 34, C.safe, 2)}</div>
                <div class="title-2" style="margin-top:16px">Payment held safely</div>
                <p class="sub" style="margin-top:6px">${usd(placed.totalUsd ?? totalUsd)} is with BMT until you approve ${esc(first(editor))}'s cut.</p>
                <div class="foot" style="margin-top:10px">Order #${esc(placed.id)} · Ref ${esc(placed.payment?.reference || "")} · simulated</div>
                <button class="btn primary" id="view" style="margin-top:20px">Track my order</button>
              </div>`;
            el.querySelector(".sheet-foot")?.remove();
            el.querySelector("#view").addEventListener("click", () => close());
          } catch (err) {
            progress.innerHTML = "";
            btn.disabled = false; btn.textContent = `Pay ${usd(totalUsd)} · demo`;
            toast(esc(err.message));
          }
        });
      },
    });
  };

  // ---------------------------------------------------------------- Payout via Ramp (after approval)
  S.payoutSheet = ({ editor, order }) => {
    const p = order.payout;
    const gross = p.gross_usd || order.totalUsd;
    sheet({
      height: "86%",
      body: `
        <div class="between" style="margin-top:14px">
          <span class="title-2">Paying ${esc(first(editor))}</span>
          <span class="chip" style="background:var(--grouped);color:var(--sub)">Simulated payout</span>
        </div>
        <p class="sub" style="margin-top:6px">You approved the cut, so the money held for this order is released.</p>
        <div class="card-gray" style="margin-top:14px" id="payout-steps">${stepsHTML([
          { title: "Released from escrow", sub: `${usd(gross)} from your payment` },
          { title: "BMT fee kept", sub: `${p.fee_pct || api.PLATFORM_FEE_PCT}% · ${usd(p.fee_usd)}` },
          { title: "Converted to INR", sub: `${usd(p.amount_usd)} × ${Number(p.fx_rate).toFixed(2)} = ${inr2(p.amount_inr)} · demo rate` },
          { title: "Sent via Ramp", sub: `To ${esc(first(editor))}'s bank account in India · ${esc(p.transfer_id || "")}` },
          { title: "Arriving", sub: esc(p.eta || "About 1 business day") },
        ])}</div>
        <div id="payout-done"></div>
        <p class="cap" style="margin-top:12px;text-align:center">Simulated with a fixed demo FX rate. No real money moved.</p>`,
      onMount(el, close) {
        playSteps(el.querySelector("#payout-steps"), 5, 600).then(() => {
          const done = el.querySelector("#payout-done");
          if (!done) return;
          done.innerHTML = `
            <div class="receipt" style="margin-top:14px">${icon("check", 22, C.safe, 2.6)}
              <div class="flex-1"><div class="big">${esc(first(editor))} gets ${inr2(p.amount_inr)}</div>
                <div style="font-size:13px;margin-top:2px">via Ramp · ${esc(p.transfer_id || "")}</div></div></div>
            <button class="btn primary" id="done" style="margin-top:14px">View receipt</button>`;
          done.querySelector("#done").addEventListener("click", () => close());
        });
      },
      onClose() { if (location.hash !== "#/order/" + order.id) location.hash = "#/order/" + order.id; },
    });
  };
})();
