/* First run: choose a role (client or editor) through Google sign-in, a short intro per role
   (skippable, replayable from You), and the editor home for the live app. */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, esc, toast, logo } = ui;
  const S = BMT.screens;

  const live = () => !api.BMT_USE_MOCKS;
  S.homeFor = (role) => (role === "editor" ? "#/studio" : "#/discover");

  /** Call straight from a click (sign-in opens a popup). Signs in if needed, saves the role,
      then shows that role's intro once, or goes home. */
  S.enterRole = (role) => {
    const signIn = api.needsSignIn() ? api.signIn() : Promise.resolve();
    return signIn
      .then(() => api.setMode(role))
      .then(() => { location.hash = api.hasSeenIntro(role) ? S.homeFor(role) : "#/intro/" + role; })
      .catch((err) => { if (err && err.code !== "auth/popup-closed-by-user") toast(esc(err.message)); });
  };

  /** "Have an account? Sign in": sign in and go wherever the saved role says. */
  S.signInReturning = () => {
    const signIn = api.needsSignIn() ? api.signIn() : Promise.resolve();
    return signIn
      .then(() => {
        const role = api.getMode();
        if (role) location.hash = S.homeFor(role);
        else toast("Signed in. Choose how you'll use BMT.", icon("check", 14, C.safe, 2.6));
      })
      .catch((err) => { if (err && err.code !== "auth/popup-closed-by-user") toast(esc(err.message)); });
  };

  // ---------------------------------------------------------------- Intro wizards
  const INTROS = {
    client: {
      steps: [
        { icon: "upload", g: 2, title: "Show us your footage", body: "Upload 1 to 3 raw clips and say what the video is for. Gemini watches them and writes a clear brief, with the best moments and timestamps." },
        { icon: "shield", g: 0, title: "Pick an editor with proof", body: "Every editor's work is verified from real published videos. Fixed prices, and the package that fits your brief is marked for you." },
        { icon: "lock", g: 3, title: "Your money is held safely", body: "You pay into escrow, so the editor starts right away. Nobody gets paid until you approve the final cut." },
        { icon: "sparkle", g: 6, title: "Approve with AI help", body: "Gemini checks the cut against your brief and turns your feedback into timestamped notes. Approve, and the editor is paid in their own currency." },
      ],
      cta: "Start my first project", ctaHref: "#/start", alt: "Explore editors first", altHref: "#/discover",
    },
    editor: {
      steps: [
        { icon: "shield", g: 0, title: "Your work, verified", body: "Show the videos you've edited, confirmed by the channels that published them. Clients choose you for proof, not promises." },
        { icon: "book", g: 9, title: "Briefs that make sense", body: "Every order arrives with a brief Gemini wrote from the client's own footage: the hook, the best moments, the must-haves." },
        { icon: "lock", g: 3, title: "Paid for sure", body: "The client's money is held before you start. When they approve, it's released to you in INR via Ramp." },
        { icon: "sparkle", g: 6, title: "Clear notes, not “make it pop”", body: "Feedback comes as timestamped notes you can act on, so revisions are quick and fair." },
      ],
      cta: "Go to my editor space", ctaHref: "#/studio", alt: null, altHref: null,
    },
  };

  S.intro = async ([role]) => {
    const intro = INTROS[role] || INTROS.client;
    const n = intro.steps.length;
    let i = 0;
    return {
      html: `<div class="scroll narrow intro">
        <div class="between" style="margin-top:6px">
          <div class="row gap-8">${logo(28)}<span style="font-size:17px;font-weight:700">BMT</span></div>
          <button class="link" id="skip" style="font-size:15px">Skip</button>
        </div>
        <div id="intro-body"></div>
      </div>`,
      mount(root) {
        const body = root.querySelector("#intro-body");
        const finish = async (href) => {
          await api.markOnboarded(role);
          location.hash = href;
        };
        const paint = () => {
          const s = intro.steps[i];
          const last = i === n - 1;
          body.innerHTML = `
            <div class="intro-art" style="background:${ui.G[s.g % ui.G.length]}">
              <div class="intro-icon">${icon(s.icon, 34, "white", 2)}</div>
            </div>
            <div class="cap" style="margin-top:22px;font-weight:600">Step ${i + 1} of ${n}</div>
            <h1 class="title-1" style="margin-top:6px">${s.title}</h1>
            <p class="body" style="color:var(--sub);margin-top:10px">${s.body}</p>
            <div class="intro-dots" aria-hidden="true">${intro.steps.map((_, k) => `<span class="${k === i ? "on" : ""}"></span>`).join("")}</div>
            <div class="row gap-10" style="margin-top:22px">
              ${i > 0 ? `<button class="btn secondary" id="back" style="flex:1">Back</button>` : ""}
              <button class="btn primary" id="next" style="flex:2">${last ? intro.cta : "Next"}</button>
            </div>
            ${last && intro.alt ? `<button class="link" id="alt" style="display:block;margin:14px auto 0;font-size:15px">${intro.alt}</button>` : ""}`;
          body.querySelector("#next").addEventListener("click", () => (last ? finish(intro.ctaHref) : (i++, paint())));
          body.querySelector("#back")?.addEventListener("click", () => { i--; paint(); });
          body.querySelector("#alt")?.addEventListener("click", () => finish(intro.altHref));
        };
        root.querySelector("#skip").addEventListener("click", () => finish(S.homeFor(role)));
        paint();
      },
    };
  };

  // ---------------------------------------------------------------- Editor home (live app)
  S.editorHome = async () => {
    const profile = api.profile();
    const linked = profile?.editor_id ? await api.getEditor(profile.editor_id) : null;
    const name = (api.currentUser()?.name || "there").split(" ")[0];
    if (linked) return S.editorDashboard(linked, name);
    return {
      tabs: ui.tabbar("editor", "studio"),
      html: `<div class="scroll narrow">
          <div class="cap" style="font-size:13px;font-weight:500;margin-top:6px">Editor</div>
          <h1 class="large-title">Thanks, ${esc(name)}</h1>
          <p class="body" style="color:var(--sub);margin-top:8px">Your editor profile is under review. Here's what happens next:</p>
          <div class="card-gray" style="margin-top:16px">${[
            ["shield", "We verify your work", "Share links to videos you edited; the channels confirm your credit."],
            ["studio", "Your storefront goes live", "Set fixed-price packages, starting with a taste test."],
            ["orders", "Orders arrive with a brief", "Written by Gemini from the client's footage. Payment is held before you start."],
          ].map(([ic, t, d]) => `<div class="row gap-12" style="padding:8px 0;align-items:flex-start"><div class="icon-tile" style="background:var(--raised)">${icon(ic, 18, C.ink2)}</div><div><div class="h3" style="font-size:15px">${t}</div><div class="foot">${d}</div></div></div>`).join("")}</div>
          <p class="cap" style="margin-top:10px">Editor sign-ups open after the buildathon. Meanwhile you can try BMT as a client.</p>
          <button class="btn primary" id="as-client" style="margin-top:16px">Try BMT as a client</button>
          <button class="btn secondary" id="replay" style="margin-top:10px">Replay the editor intro</button>
        </div>`,
      mount(root) {
        root.querySelector("#as-client")?.addEventListener("click", () => S.enterRole("client"));
        root.querySelector("#replay")?.addEventListener("click", () => (location.hash = "#/intro/editor"));
      },
    };
  };
})();
