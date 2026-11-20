/* First run: choose a role (client or editor) through Google sign-in, then a product tour on the
   real home screen (skippable; "Take the tour" in You replays it). Also the editor home for the
   live app when the account isn't linked to an editor profile yet. */
window.BMT = window.BMT || {};
BMT.screens = BMT.screens || {};

(function () {
  const { api, ui } = BMT;
  const { C, icon, esc, toast } = ui;
  const S = BMT.screens;

  S.homeFor = (role) => (role === "editor" ? "#/studio" : "#/discover");
  /** The role's home screen, with the tour started on it. */
  S.tourHref = (role) => S.homeFor(role) + "?tour=1";

  /** Call straight from a click (sign-in opens a popup). Signs in if needed, saves the role,
      then goes home, starting the tour if this account hasn't seen it for this role. */
  S.enterRole = (role) => {
    const signIn = api.needsSignIn() ? api.signIn() : Promise.resolve();
    return signIn
      .then(() => api.setMode(role))
      .then(() => { location.hash = api.hasSeenIntro(role) ? S.homeFor(role) : S.tourHref(role); })
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

  // ---------------------------------------------------------------- Product tours
  // Each target lists the desktop sidebar link and the phone tab bar link; the visible one wins.
  const nav = (href) => [`#sidebar a[href="${href}"]`, `.tabbar a[href="${href}"]`];

  const TOURS = {
    client: {
      steps: [
        { target: "#start-hero", title: "Start with your footage", text: "Upload 1 to 3 raw clips and say what the video is for. Gemini watches them and writes a clear brief." },
        { target: 'a.field[href="#/search"]', title: "Find an editor", text: "Search by style, name or city, like “podcast clips” or “Pune”." },
        { target: ".hscroll.cats", title: "What are you making?", text: "Pick a category to see the editors who do that best." },
        { target: "[data-editor]", title: "Editors with proof", text: "Views and credits are verified from real published videos. Tap a card for fixed-price packages; hold it to preview a showreel." },
        { target: nav("#/orders"), title: "Your orders", text: "Your payment is held safely here. Track the edit, review the cut with Gemini, and approve to pay the editor." },
        { target: nav("#/you"), title: "Take the tour again", text: "You'll find this tour, your account and settings under You.", next: "Start my first project" },
      ],
      finishHref: "#/start",
    },
    editor: {
      steps: [
        { target: ".editor-stats", title: "Your work at a glance", text: "New orders, work in progress, and what you've been paid via Ramp." },
        { target: ".editor-orders", title: "Incoming orders", text: "Each order comes with a brief Gemini wrote from the client's footage, and the payment is already held before you start." },
        { target: '.section-head a.link[href^="#/editor/"]', title: "Your storefront", text: "Your fixed-price packages and verified credits, exactly as clients see them." },
        { target: nav("#/studio-orders"), title: "Accept and deliver", text: "Open an order to accept it, download the client's clips and upload your cut." },
        { target: nav("#/me"), title: "Take the tour again", text: "You'll find this tour, your account and settings under Profile." },
      ],
    },
    editorPending: {
      steps: [
        { target: ".editor-steps", title: "Your editor profile", text: "We verify your published work first. Then your storefront goes live and orders start arriving with a Gemini brief." },
        { target: "#as-client", title: "Try the client side", text: "While you wait, see how clients brief and pay for an edit." },
        { target: nav("#/me"), title: "Take the tour again", text: "You'll find this tour, your account and settings under Profile." },
      ],
    },
  };

  /** Run the tour for the screen that's showing; marks it seen when finished or skipped. */
  S.runTour = (role) => {
    const key = role === "editor" ? (api.profile()?.editor_id || api.BMT_USE_MOCKS ? "editor" : "editorPending") : "client";
    const tour = TOURS[key];
    BMT.tour.start(tour.steps, {
      onEnd(completed) {
        api.markOnboarded(role);
        if (completed && tour.finishHref) location.hash = tour.finishHref;
      },
    });
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
          <div class="card-gray editor-steps" style="margin-top:16px">${[
            ["shield", "We verify your work", "Share links to videos you edited; the channels confirm your credit."],
            ["studio", "Your storefront goes live", "Set fixed-price packages, starting with a taste test."],
            ["orders", "Orders arrive with a brief", "Written by Gemini from the client's footage. Payment is held before you start."],
          ].map(([ic, t, d]) => `<div class="row gap-12" style="padding:8px 0;align-items:flex-start"><div class="icon-tile" style="background:var(--raised)">${icon(ic, 18, C.ink2)}</div><div><div class="h3" style="font-size:15px">${t}</div><div class="foot">${d}</div></div></div>`).join("")}</div>
          <p class="cap" style="margin-top:10px">Editor sign-ups open after the buildathon. Meanwhile you can try BMT as a client.</p>
          <button class="btn primary" id="as-client" style="margin-top:16px">Try BMT as a client</button>
          <button class="btn secondary" id="replay" style="margin-top:10px">Take the tour</button>
        </div>`,
      mount(root) {
        root.querySelector("#as-client")?.addEventListener("click", () => S.enterRole("client"));
        root.querySelector("#replay")?.addEventListener("click", () => S.runTour("editor"));
      },
    };
  };
})();
