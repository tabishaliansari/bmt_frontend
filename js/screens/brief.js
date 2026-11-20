/* Brief Builder screens: Start with your footage, Brief result, Recommended editors */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, chip, esc, toast, aiProgress } = ui;
  const S = BMT.screens;

  const MAX_CLIPS = 3;
  const FORMAT_LABEL = { reel: "Reel", shorts: "Shorts", youtube: "YouTube video", podcast_clips: "Podcast clips", ad: "Ad", other: "Video" };
  const mb = (bytes) => (bytes < 1e6 ? Math.max(1, Math.round(bytes / 1e3)) + " KB" : (bytes / 1e6).toFixed(1) + " MB");

  const backRow = (title) => `
    <div class="between" style="margin-top:4px">
      <button class="icon-btn gray" data-back aria-label="Back">${icon("chev_l", 18, C.ink, 2.4)}</button>
      <span class="h3">${title}</span><span style="width:36px"></span>
    </div>`;

  const errorCard = (message, retryLabel = "Try again") => `
    <div class="err-card" role="alert">
      <div class="msg">${esc(message)}</div>
      <button class="btn secondary sm" data-retry style="margin-top:12px">${retryLabel}</button>
    </div>`;

  // ---------------------------------------------------------------- Start with your footage
  const MAX_REF_CLIPS = 2, MAX_LINKS = 3;
  const YT = /^(www\.|m\.)?(youtube\.com|youtu\.be)$/i;
  const isYouTube = (link) => { try { return YT.test(new URL(link).hostname); } catch { return false; } };
  const validLink = (link) => { try { const u = new URL(link); return ["http:", "https:"].includes(u.protocol) && !!u.hostname && link.length <= 300; } catch { return false; } };
  const linkHost = (link) => { try { return new URL(link).hostname.replace(/^www\./, ""); } catch { return link; } };

  S.start = async () => {
    const clips = []; // { key, file, url, progress, upload, error }: raw footage
    const refClips = []; // same shape: reference clips (kind "ref")
    const links = []; // reference links
    let busy = false;

    return {
      tabs: ui.tabbar("client", "home"),
      html: `<div class="scroll narrow">
        ${backRow("New project")}
        <h1 class="large-title" style="margin-top:14px">Start with your footage</h1>
        <p class="sub" style="margin-top:6px">Add 1 to 3 short clips. Gemini watches them and writes a brief any editor can follow.</p>
        <label class="dropzone" style="margin-top:18px" id="drop">
          <div class="icon-tile" style="width:36px;height:36px;background:var(--cut-tint)">${icon("upload", 18, C.cut, 2)}</div>
          <div class="flex-1"><div style="font-size:15px;font-weight:600">Add clips</div><div class="cap">MP4 or MOV · up to 50 MB each · under a minute works best</div></div>
          <input type="file" id="files" multiple accept="video/*" style="display:none">
        </label>
        <div id="clips"></div>

        <div class="h3" style="margin-top:20px">What's this video for?</div>
        <textarea class="note" id="note" maxlength="1000" aria-label="What's this video for?" placeholder="Reel for my cafe launch, fun and fast, 30 seconds" style="margin-top:10px"></textarea>

        <div class="row gap-8" style="margin-top:22px;align-items:baseline"><h2 class="h3">References</h2><span class="cap">optional</span></div>
        <p class="sub" style="margin-top:4px">Show the style you want: a trend, a video you love, an editor's work. Gemini watches YouTube links and clips.</p>
        <form class="ref-add" id="ref-form" style="margin-top:10px">
          <input type="url" id="ref-link" inputmode="url" autocomplete="off" aria-label="Reference link" placeholder="Paste a YouTube or Instagram link">
          <button class="btn secondary sm" type="submit">Add</button>
        </form>
        <div id="links"></div>
        <label class="ref-clip-btn" id="ref-drop">${icon("upload", 16, C.ink2, 2)}<span>Or upload a reference clip</span>
          <input type="file" id="ref-files" accept="video/*" style="display:none"></label>
        <div id="ref-clips"></div>

        <div id="status"></div>
        <button class="btn primary" id="go" style="margin-top:16px" disabled>Write my brief</button>
        <div class="ai-label" style="justify-content:center">${icon("sparkle", 14, C.cut)} Written by Gemini · you can edit it before ordering</div>
      </div>`,
      mount(root) {
        const list = root.querySelector("#clips"), go = root.querySelector("#go"), status = root.querySelector("#status");
        const drop = root.querySelector("#drop"), input = root.querySelector("#files");
        const linkList = root.querySelector("#links"), linkIn = root.querySelector("#ref-link"), form = root.querySelector("#ref-form");
        const refList = root.querySelector("#ref-clips"), refDrop = root.querySelector("#ref-drop"), refInput = root.querySelector("#ref-files");
        let stopProgress = null;

        const ready = (arr) => arr.filter((c) => c.upload);
        const settled = (arr) => arr.every((c) => c.upload || c.error);
        const canGo = () => !busy && ready(clips).length > 0 && settled(clips) && settled(refClips);
        const clipRows = (arr) => arr.map((c) => `
            <div class="clip-row">
              <video src="${c.url}" muted preload="metadata" playsinline aria-hidden="true"></video>
              <div class="flex-1" style="min-width:0">
                <div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(c.file.name)}</div>
                <div class="cap" style="${c.error ? "color:var(--cut-ink)" : ""}">${c.error ? esc(c.error) : c.upload ? mb(c.file.size) + " · uploaded" : mb(c.file.size) + " · uploading " + Math.round(c.progress * 100) + "%"}</div>
                ${c.upload || c.error ? "" : `<div class="progress" role="progressbar" aria-label="Uploading ${esc(c.file.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(c.progress * 100)}"><div style="width:${Math.round(c.progress * 100)}%"></div></div>`}
              </div>
              <button class="icon-btn gray" data-remove="${c.key}" aria-label="Remove ${esc(c.file.name)}" ${busy ? "disabled" : ""}>${icon("x", 14, C.sub, 2.4)}</button>
            </div>`).join("");
        const wireRemove = (el, arr) => el.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", (ev) => {
          ev.preventDefault();
          const i = arr.findIndex((c) => String(c.key) === b.dataset.remove);
          if (i >= 0) { URL.revokeObjectURL(arr[i].url); arr.splice(i, 1); paint(); }
        }));
        const paint = () => {
          list.innerHTML = clipRows(clips); wireRemove(list, clips);
          refList.innerHTML = clipRows(refClips); wireRemove(refList, refClips);
          linkList.innerHTML = links.map((l, i) => `
            <div class="ref-link">
              <div class="icon-tile" style="width:32px;height:32px;background:var(--grouped)">${isYouTube(l) ? ui.yt(18) : icon("share", 16, C.ink2, 2)}</div>
              <div class="flex-1" style="min-width:0"><div style="font-size:15px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(linkHost(l))}</div>
                <div class="cap">${isYouTube(l) ? "Gemini will watch this" : "Shared with your editor as a link"}</div></div>
              <button class="icon-btn gray" data-unlink="${i}" aria-label="Remove link ${esc(linkHost(l))}" ${busy ? "disabled" : ""}>${icon("x", 14, C.sub, 2.4)}</button>
            </div>`).join("");
          linkList.querySelectorAll("[data-unlink]").forEach((b) => b.addEventListener("click", () => { links.splice(+b.dataset.unlink, 1); paint(); }));
          go.disabled = !canGo();
          drop.style.display = clips.length >= MAX_CLIPS || busy ? "none" : "";
          refDrop.style.display = refClips.length >= MAX_REF_CLIPS || busy ? "none" : "";
          form.style.display = links.length >= MAX_LINKS || busy ? "none" : "";
        };

        const upload = async (clip, kind) => {
          try {
            clip.upload = await api.uploadFile(clip.file, kind, (p) => { clip.progress = p; paint(); });
            BMT.a11y.announce(clip.file.name + " uploaded");
          } catch (err) {
            clip.error = err.message;
          }
          paint();
        };
        const addFiles = (inputEl, arr, max, kind, what) => {
          const room = max - arr.length;
          const picked = [...inputEl.files];
          if (picked.length > room) toast(`Up to ${max} ${what}. Added the first ${room}.`);
          picked.slice(0, room).forEach((file, i) => {
            const clip = { key: Date.now() + i, file, url: URL.createObjectURL(file), progress: 0, upload: null, error: null };
            arr.push(clip);
            upload(clip, kind);
          });
          inputEl.value = "";
          paint();
        };
        input.addEventListener("change", () => addFiles(input, clips, MAX_CLIPS, "raw", "clips"));
        refInput.addEventListener("change", () => addFiles(refInput, refClips, MAX_REF_CLIPS, "ref", "reference clips"));

        // Adds the typed link. Returns false (and says why) if it isn't a usable link.
        const addLink = () => {
          const link = linkIn.value.trim();
          if (!link) return true;
          if (!validLink(link)) { toast("Paste a full link, starting with https://"); linkIn.focus(); return false; }
          if (!links.includes(link) && links.length < MAX_LINKS) links.push(link);
          linkIn.value = "";
          paint();
          BMT.a11y.announce("Reference added");
          return true;
        };
        form.addEventListener("submit", (ev) => { ev.preventDefault(); addLink(); });

        const write = async () => {
          if (!addLink()) return; // a link typed but not added yet still counts
          busy = true; paint();
          go.textContent = "Writing your brief…";
          status.innerHTML = `<div class="card-ink" style="margin-top:16px" id="wait"></div>`;
          const hasRefs = links.length || ready(refClips).length;
          stopProgress = aiProgress(status.querySelector("#wait"), ["Watching your clips…", ...(hasRefs ? ["Studying your references…"] : []), "Finding the best moments…", "Writing the brief…"]);
          try {
            const brief = await api.createBrief({
              uploadIds: ready(clips).map((c) => c.upload.id), note: root.querySelector("#note").value.trim(),
              referenceUploadIds: ready(refClips).map((c) => c.upload.id), referenceLinks: links,
            });
            stopProgress();
            api.setActiveBrief(brief);
            location.hash = "#/brief/" + brief.id;
          } catch (err) {
            stopProgress();
            busy = false;
            go.textContent = "Write my brief";
            status.innerHTML = errorCard(err.message || "Gemini couldn't read these clips. Try a shorter MP4 under 50 MB.");
            status.querySelector("[data-retry]").addEventListener("click", write);
            paint();
          }
        };
        go.addEventListener("click", write);
        return () => stopProgress && stopProgress();
      },
    };
  };

  // ---------------------------------------------------------------- Brief result
  const listItems = (items, field, ic) => items.map((t, i) => `
    <li>${icon(ic, 16, ic === "check" ? C.safe : C.sub, 2.2)}<span class="flex-1" contenteditable="true" data-list="${field}" data-i="${i}">${esc(t)}</span></li>`).join("");

  S.brief = async ([id]) => {
    const brief = await api.getBrief(id);
    if (!brief) return S.notFound();
    const r = brief.result;
    const clipNo = (uploadId) => brief.upload_ids.indexOf(uploadId) + 1 || 1;

    return {
      tabs: ui.tabbar("client", "home"),
      html: `<div class="scroll narrow">
        ${backRow("Your brief")}
        <article class="brief-doc">
          <div class="large-title" style="font-size:28px;line-height:34px" contenteditable="true" data-f="title">${esc(r.title)}</div>
          <div class="row gap-8" style="margin-top:10px;flex-wrap:wrap">
            ${chip(FORMAT_LABEL[r.format] || "Video", "best", icon("play", 10, C.cut))}
            ${chip(r.target_length_sec + " sec", "safe", icon("clock", 11, C.safe, 2.2))}
          </div>
          <div class="sec"><div class="label">Hook</div><div class="hook" contenteditable="true" data-f="hook_idea">${esc(r.hook_idea)}</div></div>
          <div class="sec"><div class="label">Best moments</div>
            ${r.best_moments.map((m) => `
              <div class="moment"><span class="ts-chip">${esc(m.start)}–${esc(m.end)}</span>
                <div class="flex-1"><div style="font-size:15px;line-height:20px">${esc(m.why)}</div><div class="cap">Clip ${clipNo(m.upload_id)}</div></div></div>`).join("") || `<div class="foot">No standout moments found.</div>`}
          </div>
          <div class="sec"><div class="label">Style</div><div style="font-size:15px;line-height:21px" contenteditable="true" data-f="style_notes">${esc(r.style_notes)}</div></div>
          ${ui.referencesSec(r.references, brief.reference_links, (brief.reference_upload_ids || []).length)}
          <div class="sec"><div class="label">Must include</div><ul>${listItems(r.must_include, "must_include", "check")}</ul></div>
          ${r.questions_for_client.length ? `<div class="sec"><div class="label">Questions for you</div><ul>${listItems(r.questions_for_client, "questions_for_client", "chat")}</ul></div>` : ""}
          <div class="sec card-gray"><div class="label">Recommended package</div>
            <div class="h3">${esc(r.recommended_package.package_title)}</div><div class="foot" style="margin-top:2px">${esc(r.recommended_package.reason)}</div></div>
          <div class="ai-label">${icon("sparkle", 14, C.cut)} Written by Gemini · tap any text to edit it</div>
          ${brief.screened_by ? `<div class="ai-label" style="margin-top:4px">${icon("shield", 14, C.safe, 2)} Your note was checked by Gemma</div>` : ""}
        </article>
        ${api.features().thumbnail ? `<section class="brief-doc" id="thumb-box">
          <div class="label" style="font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:.4px">Thumbnail concept</div>
          <div id="thumb-body" style="margin-top:8px"></div>
        </section>` : ""}
        <a href="#/brief/${esc(brief.id)}/editors" class="btn primary" id="find" style="margin-top:16px;text-decoration:none">Find editors for this</a>
      </div>`,
      mount(root) {
        api.setActiveBrief(brief);
        const thumbBody = root.querySelector("#thumb-body");
        let stopThumb = null;
        const showThumb = async (uploadId) => {
          const url = await api.mediaUrl(uploadId);
          thumbBody.innerHTML = `<img src="${esc(url)}" alt="Thumbnail concept for ${esc(r.title)}" style="display:block;max-width:100%;max-height:420px;border-radius:14px;margin:0 auto">
            <div class="ai-label" style="justify-content:center">${icon("sparkle", 14, C.cut)} Drafted by Nano Banana · the editor will refine it</div>
            <button class="btn secondary sm" id="thumb-go" style="margin-top:10px">Draft another</button>`;
          thumbBody.querySelector("#thumb-go").addEventListener("click", draft);
        };
        const showButton = (message) => {
          thumbBody.innerHTML = `${message ? `<div class="msg" style="font-size:15px;line-height:20px;margin-bottom:10px" role="alert">${esc(message)}</div>` : `<div class="foot" style="margin-bottom:10px">Nano Banana turns your brief into a thumbnail idea for the editor.</div>`}
            <button class="btn secondary sm" id="thumb-go">${icon("image", 16, C.cut, 2)}<span style="margin-left:6px">${message ? "Try again" : "Draft a thumbnail"}</span></button>`;
          thumbBody.querySelector("#thumb-go").addEventListener("click", draft);
        };
        async function draft() {
          stopThumb = aiProgress(thumbBody, ["Reading your brief…", "Sketching the thumbnail…"]);
          try {
            const updated = await api.draftThumbnail(brief.id);
            stopThumb();
            brief.thumbnail_upload_id = updated.thumbnail_upload_id;
            await showThumb(updated.thumbnail_upload_id);
          } catch (err) {
            stopThumb();
            showButton(`Nano Banana couldn't draft a thumbnail (${err.message}) You can skip this step.`);
          }
        }
        if (thumbBody) brief.thumbnail_upload_id ? showThumb(brief.thumbnail_upload_id).catch(() => showButton()) : showButton();
        const collect = () => {
          const next = structuredClone(r);
          root.querySelectorAll("[data-f]").forEach((el) => (next[el.dataset.f] = el.textContent.trim()));
          ["must_include", "questions_for_client"].forEach((f) => {
            next[f] = [...root.querySelectorAll(`[data-list="${f}"]`)].map((el) => el.textContent.trim()).filter(Boolean);
          });
          return next;
        };
        let saved = JSON.stringify(r);
        const save = async () => {
          const next = collect();
          if (JSON.stringify(next) === saved) return;
          try {
            await api.updateBrief(brief.id, next);
            saved = JSON.stringify(next);
            Object.assign(r, next);
            api.setActiveBrief({ ...brief, result: next });
            toast("Brief saved", icon("check", 14, "currentColor", 2.6));
          } catch (err) {
            toast(err.message);
          }
        };
        root.querySelectorAll("[contenteditable]").forEach((el) => {
          el.addEventListener("blur", save);
          el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); el.blur(); } });
        });
        return () => stopThumb && stopThumb();
      },
    };
  };

  // ---------------------------------------------------------------- Recommended editors
  S.briefEditors = async ([id]) => {
    const brief = await api.getBrief(id);
    if (!brief) return S.notFound();
    const editors = await api.getRecommendedEditors(id);
    const rec = brief.result.recommended_package;

    return {
      tabs: ui.tabbar("client", "home"),
      html: `<div class="scroll">
        ${backRow("Editors for your brief")}
        <div class="card-gray" style="margin-top:14px">
          <div class="row gap-8">${icon("sparkle", 16, C.cut)}<span class="h3" style="font-size:15px">${esc(brief.result.title)}</span></div>
          <div class="foot" style="margin-top:4px">Looking for: ${esc(rec.package_title)}. ${esc(rec.reason)}</div>
        </div>
        <div class="section-head"><h2 class="h2">Best matches</h2><span class="cap">Featured, then best rated</span></div>
        <div class="ed-grid">${editors.length ? editors.map(S.editorCard).join("") : `<div class="empty">No editors in this category yet.<br><a class="link" href="#/discover">Browse all editors</a></div>`}</div>
      </div>`,
      mount(root) {
        api.setActiveBrief(brief);
        S.wireEditorCards(root);
      },
    };
  };
})();
