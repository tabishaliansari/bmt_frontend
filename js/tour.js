/* Product tour: dims the real screen, spotlights one element at a time and explains it in a
   small card next to it. Back / Next / Skip, arrow keys and Esc. Works in every layout because it
   positions from getBoundingClientRect (which includes the phone frame's scaling).

   BMT.tour.start(steps, { onEnd(completed) })
   step: { target: "css selector" | ["selector", "fallback"], title, text, next?: "label" }
   The first visible match is used; steps whose target isn't on screen are skipped. */
window.BMT = window.BMT || {};

(function () {
  const PAD = 6;     // spotlight padding around the target
  const GAP = 12;    // space between target and card
  const EDGE = 16;   // minimum distance from the viewport edge
  let active = null;

  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  };
  const find = (target) => {
    for (const sel of [].concat(target)) {
      const el = [...document.querySelectorAll(sel)].find(visible);
      if (el) return el;
    }
    return null;
  };

  function start(steps, { onEnd } = {}) {
    stop(false);
    const usable = steps.filter((s) => find(s.target));
    if (!usable.length) { onEnd && onEnd(false); return; }

    const root = document.createElement("div");
    root.className = "tour";
    // Dim layer = four plain rectangles around the target: paints reliably everywhere (a giant
    // box-shadow or an SVG mask doesn't on some high-density phones). Ring drawn on top.
    root.innerHTML = `<div class="tour-block"></div>
      <div class="tour-dim" data-side="top"></div><div class="tour-dim" data-side="bottom"></div>
      <div class="tour-dim" data-side="left"></div><div class="tour-dim" data-side="right"></div>
      <div class="tour-spot"></div>
      <div class="tour-card" role="dialog" aria-modal="true" aria-live="polite">
        <div class="tour-count"></div><div class="tour-title"></div><div class="tour-text"></div>
        <div class="tour-actions"><button class="tour-skip"></button><span style="flex:1"></span>
          <button class="tour-back">Back</button><button class="tour-next"></button></div>
      </div>`;
    document.body.appendChild(root);
    const spot = root.querySelector(".tour-spot"), card = root.querySelector(".tour-card");
    const dims = Object.fromEntries([...root.querySelectorAll(".tour-dim")].map((d) => [d.dataset.side, d]));
    let i = 0, el = null, raf = 0;

    const place = () => {
      // The screen may have re-rendered (layout switch, theme change): find the target again.
      if (!el || !document.body.contains(el) || !visible(el)) el = find(usable[i].target);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vw = innerWidth, vh = innerHeight;
      const box = { x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 };
      Object.assign(spot.style, { left: box.x + "px", top: box.y + "px", width: box.w + "px", height: box.h + "px" });
      const px = (n) => Math.max(0, n) + "px";
      Object.assign(dims.top.style, { left: 0, top: 0, width: "100%", height: px(box.y) });
      Object.assign(dims.bottom.style, { left: 0, top: px(box.y + box.h), width: "100%", bottom: 0 });
      Object.assign(dims.left.style, { left: 0, top: px(box.y), width: px(box.x), height: px(box.h) });
      Object.assign(dims.right.style, { left: px(box.x + box.w), top: px(box.y), right: 0, height: px(box.h) });
      const cw = Math.min(340, vw - EDGE * 2);
      card.style.width = cw + "px";
      const ch = card.offsetHeight;
      let top = r.bottom + PAD + GAP;                                  // below the target
      if (top + ch > vh - EDGE) top = r.top - PAD - GAP - ch;          // else above it
      if (top < EDGE) top = Math.max(EDGE, vh - ch - EDGE);            // else pinned to the bottom
      const left = Math.min(Math.max(r.left + r.width / 2 - cw / 2, EDGE), vw - cw - EDGE);
      Object.assign(card.style, { top: top + "px", left: left + "px" });
    };
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };

    const show = (n) => {
      i = n;
      const s = usable[i];
      el = find(s.target);
      if (!el) { i < usable.length - 1 ? show(i + 1) : end(true); return; }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      const last = i === usable.length - 1;
      root.querySelector(".tour-count").textContent = `${i + 1} of ${usable.length}`;
      root.querySelector(".tour-title").textContent = s.title;
      root.querySelector(".tour-text").textContent = s.text;
      root.querySelector(".tour-skip").textContent = last ? "Close" : "Skip tour";
      root.querySelector(".tour-back").hidden = i === 0;
      const next = root.querySelector(".tour-next");
      next.textContent = last ? (s.next || "Done") : "Next";
      place();
      setTimeout(place, 350); // after the smooth scroll settles
      next.focus({ preventScroll: true });
    };

    function end(completed) {
      stop(completed);
      onEnd && onEnd(completed, usable[i]);
    }
    const onKey = (e) => {
      if (e.key === "Escape") end(false);
      else if (e.key === "ArrowRight") i < usable.length - 1 ? show(i + 1) : end(true);
      else if (e.key === "ArrowLeft" && i > 0) show(i - 1);
    };

    root.querySelector(".tour-next").addEventListener("click", () => (i < usable.length - 1 ? show(i + 1) : end(true)));
    root.querySelector(".tour-back").addEventListener("click", () => i > 0 && show(i - 1));
    root.querySelector(".tour-skip").addEventListener("click", () => end(i === usable.length - 1));
    addEventListener("resize", schedule);
    document.addEventListener("scroll", schedule, true);
    document.addEventListener("keydown", onKey);
    active = { root, cleanup: () => {
      removeEventListener("resize", schedule);
      document.removeEventListener("scroll", schedule, true);
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    } };
    requestAnimationFrame(() => root.classList.add("on"));
    show(0);
  }

  function stop() {
    if (!active) return;
    active.cleanup();
    active.root.remove();
    active = null;
  }

  BMT.tour = { start, stop, isActive: () => !!active };
})();
