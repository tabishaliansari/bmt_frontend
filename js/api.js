/*
 * BMT API layer. Every screen talks ONLY to BMT.api.
 *
 * Live mode (default): calls the FastAPI backend under /api/v1 (docs/API.md) and converts
 * its snake_case JSON into the shapes the screens use (toEditor, toOrder, toAddon).
 * Mock mode (?mocks=1 in the URL): the same functions served from in-memory data and
 * localStorage, with canned Gemini results. This is the demo fallback.
 * Categories, quick packages, courses, posts and the editor studio are mock in both modes.
 */
window.BMT = window.BMT || {};

(function () {
  const API_BASE = "/api/v1";
  // Demo fallback: true (or ?mocks=1 in the URL) serves everything from the mock data below.
  const BMT_USE_MOCKS = new URLSearchParams(location.search).has("mocks") || false;
  const LATENCY = 180;        // fake network delay, ms
  const wait = (v) => new Promise((res) => setTimeout(() => res(structuredClone(v)), LATENCY));

  // ---------------------------------------------------------------- auth (Firebase, Google sign-in)
  // The server's /config says whether sign-in is on and how to reach Firebase (or its emulator).
  const session = { mode: "off", auth: null, user: null, features: {} };

  async function initAuth() {
    if (BMT_USE_MOCKS) return;
    const cfg = await fetch(API_BASE + "/config").then((r) => r.json()).catch(() => ({ auth: "off" }));
    session.mode = cfg.auth;
    session.features = cfg.features || {};
    if (cfg.auth !== "firebase") return;
    if (!window.firebase) { console.error("Firebase SDK failed to load; sign-in unavailable."); return; }
    firebase.initializeApp(cfg.firebase);
    session.auth = firebase.auth();
    if (cfg.authEmulator) session.auth.useEmulator(cfg.authEmulator, { disableWarnings: true });
    await new Promise((resolve) => session.auth.onAuthStateChanged((u) => { session.user = u; resolve(); }));
  }
  const ready = initAuth();

  async function authHeaders() {
    if (!session.user) return {};
    return { Authorization: `Bearer ${await session.user.getIdToken()}` };
  }

  // ---------------------------------------------------------------- backend
  function apiError(status, body) {
    const err = new Error(body?.error?.message || `Something went wrong (${status}). Please try again.`);
    err.status = status;
    err.code = body?.error?.code;
    return err;
  }

  async function http(path, options = {}) {
    let r;
    try {
      r = await fetch(API_BASE + path, { ...options, headers: { ...(options.headers || {}), ...(await authHeaders()) } });
    } catch {
      throw new Error("Can't reach BMT. Check your connection and try again.");
    }
    const body = await r.json().catch(() => null);
    if (!r.ok) throw apiError(r.status, body);
    return body;
  }

  /** Multipart upload through XHR, because fetch() can't report upload progress. */
  async function uploadXHR(file, kind, onProgress) {
    const headers = await authHeaders();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/uploads");
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (ev) => ev.lengthComputable && onProgress && onProgress(ev.loaded / ev.total);
      xhr.onload = () => {
        let body = null;
        try { body = JSON.parse(xhr.responseText); } catch {}
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(apiError(xhr.status, body));
      };
      xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      xhr.send(form);
    });
  }

  const fmtEta = (hours) => (hours <= 48 ? `${hours}h` : `${Math.round(hours / 24)} days`);

  // Backend (snake_case, API.md) → the shape the screens already use.
  const toPackage = (p) => ({
    id: p.id, title: p.title, desc: p.desc, price: p.price_inr, priceUsd: p.price_usd,
    eta: fmtEta(p.eta_hours), tag: p.tag ?? undefined, g: p.g,
  });
  const toEditor = (e) => ({
    id: e.id, name: e.name, initials: e.initials, av: e.av, handle: e.handle, city: e.city,
    styles: e.styles, categories: e.categories, cover: e.cover,
    rating: e.rating, ratingCount: e.rating_count, credits: e.credits, channels: e.channels,
    views: e.views, onTime: e.on_time, reply: e.reply, from: e.from_inr, days: e.days,
    menu: e.packages.map(toPackage), creditList: e.credit_list, reviews: e.reviews, work: e.work,
  });
  const toAddon = (a) => ({ id: a.id, icon: a.icon, title: a.title, sub: a.sub, price: a.price_inr, priceUsd: a.price_usd });

  // Server statuses → the three the screens know. funded and in_progress both mean "being edited".
  const STATUS = { funded: "editing", in_progress: "editing", review: "review", approved: "approved", refunded: "refunded" };
  const eventTime = (o, status) => {
    const ev = [...o.timeline].reverse().find((t) => t.status === status);
    return ev ? Date.parse(ev.at) : null;
  };
  const toOrder = (o) => ({
    id: o.id, editorId: o.editor_id, itemId: o.package_id, title: o.title, g: o.g,
    addons: o.addons, rush: o.rush, note: o.note,
    total: o.total_inr, totalUsd: o.total_usd,
    placedAt: Date.parse(o.created_at), dueAt: Date.parse(o.due_at),
    status: STATUS[o.status], serverStatus: o.status, revisionsLeft: o.revisions_left,
    notes: o.client_notes.map((n) => ({ t: n.t, who: "you", text: n.text })),
    briefId: o.brief_id, brief: o.brief, review: o.review, payout: o.payout, cutUploadId: o.cut_upload_id,
    thumbnailUploadId: o.thumbnail_upload_id, payment: o.payment,
    deliveredAt: eventTime(o, "review"), approvedAt: eventTime(o, "approved"),
  });

  // ---------------------------------------------------------------- mock data
  const categories = [
    { id: "reels", label: "Reels", icon: "bolt", g: 2 },
    { id: "youtube", label: "YouTube", icon: "play", g: 0 },
    { id: "podcasts", label: "Podcasts", icon: "music", g: 3 },
    { id: "ads", label: "Ads", icon: "sparkle", g: 6 },
    { id: "weddings", label: "Weddings", icon: "heart", g: 7 },
    { id: "gaming", label: "Gaming", icon: "studio", g: 8 },
  ];

  const quickPackages = [
    { id: "q-reel", title: "60s Reel", from: 999, eta: "48h", icon: "bolt", tone: "cut", category: "reels" },
    { id: "q-yt", title: "YouTube · 10 min", from: 3499, eta: "4 days", icon: "play", tone: "trust", category: "youtube" },
    { id: "q-pod", title: "Podcast → 5 Shorts", from: 1999, eta: "3 days", icon: "repeat", tone: "safe", category: "podcasts" },
    { id: "q-ad", title: "30s Product Ad", from: 2499, eta: "3 days", icon: "sparkle", tone: "cut", category: "ads" },
  ];

  const addons = [
    { id: "captions", icon: "cc", title: "Animated captions", sub: "Word-by-word, on-brand", price: 199 },
    { id: "thumb", icon: "image", title: "Custom thumbnail", sub: "1 design, 2 options", price: 149 },
    { id: "music", icon: "music", title: "Licensed music", sub: "Royalty-free track", price: 99 },
    { id: "revision", icon: "repeat", title: "Extra revision", sub: "3 rounds instead of 2", price: 99 },
  ];
  const RUSH_FEE = 300;

  const credit = (g, title, channel, views, date, len) => ({ g, title, channel, views, date, len, confirmed: true });
  const review = (name, av, stars, text, item, when) => ({ name, av, stars, text, item, when });

  const editors = [
    {
      id: "riya", name: "Riya Kapoor", initials: "RK", av: 0, handle: "riyacuts", city: "Mumbai",
      styles: ["Vlogs", "Reels"], categories: ["reels", "youtube"], cover: 7,
      rating: 4.9, ratingCount: 212, credits: 34, channels: 9, views: "12.4M", onTime: 98, reply: "20 min",
      from: 999, days: "2 days",
      menu: [
        { id: "taste", title: "Taste test", desc: "15 sec from your own footage. See her style before you commit.", price: 199, eta: "12h", tag: "try", g: 5 },
        { id: "reel", title: "Instagram Reel", desc: "Up to 60s · captions · colour grade · 2 revisions", price: 999, eta: "48h", tag: "best", g: 2 },
        { id: "yt", title: "YouTube edit", desc: "Up to 12 min · pacing, B-roll, sound design · 2 revisions", price: 3499, eta: "4 days", g: 0 },
        { id: "shorts", title: "Long video → 5 Shorts", desc: "Hooks rewritten, vertical reframe, captions", price: 1999, eta: "3 days", g: 3 },
      ],
      creditList: [
        credit(0, "I Lived on ₹500 for a Week in Mumbai", "Rohan Explores", "2.1M", "Oct 2026", "14:32"),
        credit(6, "Street Food Tour: Old Delhi at 2 AM", "Foodie Nomads", "1.4M", "Sep 2026", "18:10"),
        credit(2, "How I Built a ₹1 Crore Brand", "The Bootstrap Show", "890K", "Aug 2026", "22:47"),
        credit(8, "Monsoon in Kerala · 4K Cinematic", "Wander Frames", "640K", "Jul 2026", "09:05"),
      ],
      reviews: [
        review("Arjun M.", 1, 5, "Turned 40 minutes of rambling into a reel that did 300K. Fast, and she actually listens to notes.", "Instagram Reel", "2 days ago"),
        review("Sana K.", 4, 5, "Did the taste test first, ordered the full edit the same night. Captions were on point.", "Taste test", "1 week ago"),
        review("Vikram R.", 3, 4, "Great pacing. One revision took a day longer than promised, but quality was worth it.", "YouTube edit", "2 weeks ago"),
      ],
      work: [7, 2, 0, 5, 3, 9],
    },
    {
      id: "kabir", name: "Kabir Shah", initials: "KS", av: 1, handle: "kabirgrades", city: "Bengaluru",
      styles: ["Cinematic", "Ads"], categories: ["ads", "weddings", "youtube"], cover: 1,
      rating: 4.8, ratingCount: 96, credits: 21, channels: 6, views: "5.8M", onTime: 95, reply: "1 hr",
      from: 2499, days: "3 days",
      menu: [
        { id: "taste", title: "Taste test", desc: "One 10s graded shot from your footage.", price: 249, eta: "24h", tag: "try", g: 4 },
        { id: "ad", title: "30s Product Ad", desc: "Cinematic grade, sound design, 3 aspect ratios", price: 2499, eta: "3 days", tag: "best", g: 6 },
        { id: "grade", title: "Colour grade only", desc: "Up to 10 min, look-matched across cameras", price: 1799, eta: "2 days", g: 1 },
      ],
      creditList: [
        credit(1, "Bengaluru After Dark · Short Film", "Lens & Lights", "1.9M", "Sep 2026", "11:20"),
        credit(6, "We Tried the ₹50,000 Tasting Menu", "Foodie Nomads", "1.1M", "Aug 2026", "16:44"),
      ],
      reviews: [review("Meher P.", 2, 5, "The ad looked like a TV spot. Our CTR doubled.", "30s Product Ad", "5 days ago")],
      work: [1, 6, 4, 8],
    },
    {
      id: "ananya", name: "Ananya Nair", initials: "AN", av: 4, handle: "ananyamotion", city: "Pune",
      styles: ["Motion", "Explainers"], categories: ["ads", "youtube"], cover: 9,
      rating: 4.9, ratingCount: 143, credits: 28, channels: 11, views: "8.2M", onTime: 99, reply: "15 min",
      from: 1499, days: "3 days",
      menu: [
        { id: "taste", title: "Taste test", desc: "A 5s animated title card in your brand colours.", price: 199, eta: "12h", tag: "try", g: 5 },
        { id: "titles", title: "Animated titles pack", desc: "Intro, lower thirds, outro. Editable source files.", price: 1499, eta: "3 days", tag: "best", g: 9 },
        { id: "explainer", title: "60s Explainer", desc: "Script polish, motion graphics, voiceover sync", price: 4999, eta: "6 days", g: 0 },
      ],
      creditList: [credit(9, "How UPI Actually Works", "Finance Simplified", "3.2M", "Oct 2026", "08:12")],
      reviews: [review("Rahul D.", 3, 5, "Explainer was crisp, delivered a day early.", "60s Explainer", "3 days ago")],
      work: [9, 0, 5],
    },
    {
      id: "arjun", name: "Arjun Mehta", initials: "AM", av: 2, handle: "arjunclips", city: "Delhi",
      styles: ["Podcasts", "Shorts"], categories: ["podcasts", "reels"], cover: 3,
      rating: 4.7, ratingCount: 188, credits: 52, channels: 14, views: "21M", onTime: 96, reply: "30 min",
      from: 1999, days: "3 days",
      menu: [
        { id: "taste", title: "Taste test", desc: "One 30s clip from your episode.", price: 149, eta: "12h", tag: "try", g: 3 },
        { id: "pod", title: "Podcast → 5 Shorts", desc: "Best moments found for you, captions, reframing", price: 1999, eta: "3 days", tag: "best", g: 3 },
        { id: "full", title: "Full episode edit", desc: "Multi-cam switching, cleanup, chapters", price: 3999, eta: "4 days", g: 4 },
      ],
      creditList: [credit(3, "The Founder Who Said No to ₹100 Crore", "The Bootstrap Show", "4.4M", "Oct 2026", "01:02")],
      reviews: [review("Priya S.", 0, 5, "He finds the moments I'd never have picked. Shorts keep going viral.", "Podcast → 5 Shorts", "1 day ago")],
      work: [3, 4, 2],
    },
    {
      id: "meera", name: "Meera Iyer", initials: "MI", av: 5, handle: "meeraweds", city: "Chennai",
      styles: ["Weddings", "Films"], categories: ["weddings"], cover: 7,
      rating: 4.9, ratingCount: 61, credits: 12, channels: 3, views: "1.1M", onTime: 100, reply: "2 hr",
      from: 7999, days: "10 days",
      menu: [
        { id: "teaser", title: "Wedding teaser", desc: "90s cinematic teaser for socials", price: 7999, eta: "7 days", tag: "best", g: 7 },
        { id: "film", title: "Wedding film", desc: "8–12 min story edit, licensed music", price: 24999, eta: "21 days", g: 5 },
      ],
      creditList: [credit(7, "A Monsoon Wedding in Kochi", "Meera Films", "520K", "Aug 2026", "10:40")],
      reviews: [review("Karan & Diya", 1, 5, "We cried. Our parents cried. Worth every rupee.", "Wedding film", "1 month ago")],
      work: [7, 5],
    },
    {
      id: "dev", name: "Dev Patel", initials: "DP", av: 3, handle: "devframes", city: "Ahmedabad",
      styles: ["Gaming", "Montage"], categories: ["gaming", "youtube"], cover: 8,
      rating: 4.6, ratingCount: 77, credits: 18, channels: 7, views: "6.3M", onTime: 93, reply: "45 min",
      from: 1299, days: "2 days",
      menu: [
        { id: "montage", title: "Gaming montage", desc: "Beat-synced, up to 3 min, SFX pack", price: 1299, eta: "2 days", tag: "best", g: 8 },
        { id: "stream", title: "Stream → highlights", desc: "Find the best plays from a 3h VOD", price: 1799, eta: "3 days", g: 1 },
      ],
      creditList: [credit(8, "BGMI Clutch Moments · Season 4", "ClutchKing", "2.7M", "Oct 2026", "12:00")],
      reviews: [review("Yash T.", 2, 5, "Sync on the drops is insane.", "Gaming montage", "4 days ago")],
      work: [8, 1],
    },
  ];

  const courses = [
    { id: "retention", title: "Retention Editing 101", by: "riya", lessons: 14, price: 1499, rating: 4.9, g: 9, tag: "Masterclass" },
    { id: "color", title: "Colour Grading on a Phone", by: "kabir", lessons: 9, price: 999, rating: 4.8, g: 1, tag: "Course" },
    { id: "hooks", title: "Hooks That Stop the Scroll", by: "arjun", lessons: 6, price: 699, rating: 4.7, g: 3, tag: "Course" },
  ];
  const posts = [
    { id: "p1", by: "kabir", role: "Colorist", ago: "3h", text: "Client said “make it more cinematic.” Here's how I turn vague feedback into a 3-line brief before touching a single frame.", likes: 1200, comments: 84, before: true },
    { id: "p2", by: "arjun", role: "Podcast editor", ago: "6h", text: "The first 1.5 seconds decide everything. I now cut the hook before I cut anything else in the episode.", likes: 860, comments: 41 },
  ];
  const mentors = [{ id: "ananya", topic: "Motion design", mins: 30, price: 799 }];

  // Editor-side mock (signed in as Riya when in editor mode)
  const studio = {
    me: "riya", accepting: true, month: 48250, growth: 18, protectedAmt: 6400,
    bars: [30, 42, 28, 55, 48, 66, 40, 72, 58, 80, 64, 92],
    incoming: { id: "in-1", client: "Tabish A.", initials: "TA", title: "Instagram Reel + captions", clips: 3, eta: "48h", total: 1198, expiresMin: 28 },
    active: [
      { title: "Instagram Reel", client: "Arjun M.", due: "Due in 6h", progress: 0.75, g: 3 },
      { title: "YouTube · 12 min", client: "The Bootstrap Show", due: "Due tomorrow", progress: 0.4, g: 0 },
    ],
    course: { title: "Retention Editing 101", sold: 12, revenue: 17988 },
  };

  // ---------------------------------------------------------------- mock AI results (?mocks=1 demo fallback)
  const MOCK_BRIEF = {
    title: "Cafe launch reel", format: "reel", target_length_sec: 30,
    hook_idea: "Open on the first pour in slow motion, cut on the beat",
    best_moments: [
      { upload_id: "", start: "00:04", end: "00:09", why: "Latte art close-up, strong hook" },
      { upload_id: "", start: "00:15", end: "00:19", why: "Customers laughing at the counter, warm and real" },
    ],
    style_notes: "Warm grade, quick cuts on the beat, bold captions.",
    must_include: ["Cafe name", "Opening date", "Location"],
    questions_for_client: ["Do you have a logo file?"],
    recommended_package: { category: "reels", package_title: "Instagram Reel", reason: "Under 60s, captions, fast turnaround" },
  };
  const MOCK_REVIEW = {
    overall_match: 82, summary: "Hook and pacing match the brief; captions missing in the middle section.",
    checklist: [{ item: "Under 30 seconds", met: true }, { item: "Opens on the pour", met: true }, { item: "Cafe name on screen", met: false }, { item: "Captions throughout", met: false }],
    notes: [
      { timestamp_sec: 12, issue: "Captions disappear", suggestion: "Keep captions through 0:12–0:18", severity: "high", source: "ai" },
      { timestamp_sec: 24, issue: "Cafe name never shown", suggestion: "Add the cafe name as a title over the closing shot", severity: "medium", source: "ai" },
    ],
  };
  const MOCK_FX = 84.1, MOCK_FEE = 0.15;

  // ---------------------------------------------------------------- persistence (this browser only)
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bmt:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("bmt:" + k, JSON.stringify(v)); } catch {} },
  };

  // Prices shown in the UI. The server re-prices every order, so this is display only.
  const cache = { editors: {}, addons: null };
  const findEditor = (id) => cache.editors[id] || editors.find((e) => e.id === id);
  const priceOf = (editorId, itemId, opts = {}) => {
    const item = findEditor(editorId).menu.find((m) => m.id === itemId);
    const list = cache.addons || addons;
    const add = (opts.addons || []).reduce((s, id) => s + (list.find((a) => a.id === id)?.price || 0), 0);
    return item.price + add + (opts.rush ? BMT.api.RUSH_FEE : 0);
  };
  // The same total in USD (what BMT charges). Live mode has server USD prices; mock converts.
  const priceUsdOf = (editorId, itemId, opts = {}) => {
    const item = findEditor(editorId).menu.find((m) => m.id === itemId);
    const list = cache.addons || [];
    if (item.priceUsd == null) return Math.round((priceOf(editorId, itemId, opts) / MOCK_FX) * 100) / 100;
    const add = (opts.addons || []).reduce((s, id) => s + (list.find((a) => a.id === id)?.priceUsd || 0), 0);
    return Math.round((item.priceUsd + add + (opts.rush ? cache.rushUsd || 0 : 0)) * 100) / 100;
  };

  // ---------------------------------------------------------------- shared (same in both modes)
  const shared = {
    API_BASE,
    BMT_USE_MOCKS,
    RUSH_FEE,

    /** Resolves once sign-in state is known; the router waits for it before the first render. */
    ready,
    /** True when this server needs Google sign-in and nobody is signed in yet. */
    needsSignIn: () => session.mode === "firebase" && !session.user,
    /** Must be called straight from a click handler (it opens a popup). */
    signIn() {
      if (!session.auth) return Promise.reject(new Error("Sign-in isn't available right now. Please reload the page."));
      const provider = new firebase.auth.GoogleAuthProvider();
      return session.auth.signInWithPopup(provider)
        .then((r) => { session.user = r.user; return r.user; })
        .catch((err) => {
          // Popup blocked (some phones, in-app browsers): sign in by full-page redirect instead.
          if (err.code === "auth/popup-blocked" || err.code === "auth/operation-not-supported-in-this-environment") {
            return session.auth.signInWithRedirect(provider);
          }
          throw err;
        });
    },
    async signOut() {
      if (session.auth) await session.auth.signOut();
      session.user = null;
    },
    currentUser() {
      const u = session.user;
      if (!u) return null;
      const name = u.displayName || u.email || "Signed in";
      return { name, email: u.email || "", initials: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() };
    },
    /** Server features: { thumbnail, screening } */
    features: () => (BMT_USE_MOCKS ? { thumbnail: true, screening: true } : session.features),

    getCategories: () => wait(categories),
    getQuickPackages: () => wait(quickPackages),
    quote: (editorId, itemId, opts) => priceOf(editorId, itemId, opts),
    quoteUsd: (editorId, itemId, opts) => priceUsdOf(editorId, itemId, opts),
    /** Platform fee and demo FX rate, for the checkout and payout screens (display only). */
    PLATFORM_FEE_PCT: 15,
    DEMO_FX: MOCK_FX,

    /** The brief the client is ordering for: { id, title, category, packageTitle } */
    getActiveBrief: () => store.get("brief", null),
    setActiveBrief: (b) => store.set("brief", { id: b.id, title: b.result.title, category: b.result.recommended_package.category, packageTitle: b.result.recommended_package.package_title }),
    clearActiveBrief: () => { try { localStorage.removeItem("bmt:brief"); } catch {} },

    /** POST /credits/lookup  (server calls YouTube Data API) */
    async lookupVideo(url) {
      if (!/youtu/.test(url)) throw new Error("Paste a YouTube link");
      return wait({ title: "I Lived on ₹500 for a Week in Mumbai", channel: "Rohan Explores", handle: "@RohanExplores", subs: "1.3M", views: "2.1M", likes: "98K", date: "Oct 2026", len: "14:32", g: 0 });
    },
    /** POST /credits → sends confirmation request to the channel */
    requestCredit: (payload) => wait({ ...payload, status: "pending" }),

    getCourses: () => wait(courses),
    getPosts: () => wait(posts),
    getMentors: () => wait(mentors),

    getStudio: () => wait({ ...studio, accepting: store.get("accepting", true), incomingHandled: store.get("incomingHandled", null) }),
    setAccepting: (v) => (store.set("accepting", v), wait(v)),
    handleIncoming: (action) => (store.set("incomingHandled", action), wait(action)),

    getFavorites: () => store.get("favs", []),
    toggleFavorite(id) {
      const f = store.get("favs", []);
      const next = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      store.set("favs", next);
      return next.includes(id);
    },

    getMode: () => store.get("mode", null),
    setMode: (m) => store.set("mode", m),
    resetDemo() { ["orders", "briefs", "brief", "favs", "accepting", "incomingHandled", "mode"].forEach((k) => { try { localStorage.removeItem("bmt:" + k); } catch {} }); },
  };

  // ---------------------------------------------------------------- live backend (/api/v1)
  const enc = encodeURIComponent;
  const json = (method, body) => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const orNull = async (promise) => {
    try { return await promise; } catch (err) { if (err.status === 404) return null; throw err; }
  };
  const remember = (list) => (list.forEach((e) => (cache.editors[e.id] = e)), list);

  const live = {
    async getAddons() {
      const c = await http("/addons");
      cache.addons = c.addons.map(toAddon);
      BMT.api.RUSH_FEE = c.rush_fee_inr;
      cache.rushUsd = c.rush_fee_usd;
      return cache.addons;
    },

    /** GET /editors?category=&q= */
    async getEditors({ category, q } = {}) {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (q) params.set("q", q);
      return remember((await http(`/editors?${params}`)).map(toEditor));
    },
    /** GET /editors/:id */
    async getEditor(id) {
      const e = await orNull(http(`/editors/${enc(id)}`));
      return e ? remember([toEditor(e)])[0] : null;
    },
    /** GET /editors/recommended?brief_id= */
    getRecommendedEditors: async (briefId) => remember((await http(`/editors/recommended?brief_id=${enc(briefId)}`)).map(toEditor)),

    /** POST /orders → funds held safely until approval. The server sets the price. */
    async placeOrder({ editorId, itemId, addons: ad = [], rush = false, note = "", briefId = null, paymentMethod = "demo_card" }) {
      return toOrder(await http("/orders", json("POST", { editor_id: editorId, package_id: itemId, addons: ad, rush, note, brief_id: briefId, payment_method: paymentMethod })));
    },
    getOrders: async () => (await http("/orders")).map(toOrder),
    getOrder: async (id) => { const o = await orNull(http(`/orders/${enc(id)}`)); return o && toOrder(o); },
    deliverCut: async (id, cutUploadId) => toOrder(await http(`/orders/${enc(id)}/deliver`, json("POST", { cut_upload_id: cutUploadId }))),
    addNote: async (id, n) => toOrder(await http(`/orders/${enc(id)}/notes`, json("POST", { t: n.t, text: n.text }))),
    requestChanges: async (id) => toOrder(await http(`/orders/${enc(id)}/revisions`, json("POST"))),
    approveOrder: async (id) => toOrder(await http(`/orders/${enc(id)}/approve`, json("POST"))),
    /** POST /orders/:id/review → Review Copilot. With feedback, it is rewritten into notes. */
    runReview: (id, feedback) => http(`/orders/${enc(id)}/review`, json("POST", feedback ? { client_feedback: feedback } : {})),

    /** POST /uploads (multipart) with upload progress 0..1 */
    uploadFile: uploadXHR,
    /** A short-lived signed link for <video>/<img> (media tags can't send the auth header). */
    mediaUrl: async (uploadId) => (await http(`/uploads/${enc(uploadId)}/url`)).url,
    /** POST /briefs/:id/thumbnail → Nano Banana drafts a thumbnail concept */
    draftThumbnail: (briefId) => http(`/briefs/${enc(briefId)}/thumbnail`, json("POST")),

    /** Briefs keep the backend shape: { id, upload_ids, client_note, result } */
    createBrief: ({ uploadIds, note }) => http("/briefs", json("POST", { upload_ids: uploadIds, client_note: note || "" })),
    getBrief: (id) => orNull(http(`/briefs/${enc(id)}`)),
    updateBrief: (id, result) => http(`/briefs/${enc(id)}`, json("PUT", { result })),
  };

  // ---------------------------------------------------------------- mock backend (localStorage)
  const mediaUrls = {};
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  async function patchOrder(id, patch) {
    const orders = store.get("orders", []);
    const i = orders.findIndex((o) => o.id === id);
    if (i < 0) return null;
    orders[i] = { ...orders[i], ...patch };
    store.set("orders", orders);
    return wait(orders[i]);
  }

  const mock = {
    getAddons: () => wait(addons),
    async getEditors({ category, q } = {}) {
      let list = editors;
      if (category) list = list.filter((e) => e.categories.includes(category));
      if (q) {
        const s = q.toLowerCase();
        list = list.filter((e) => [e.name, e.handle, e.city, ...e.styles, ...e.menu.map((m) => m.title)].join(" ").toLowerCase().includes(s));
      }
      return wait(list);
    },
    getEditor: (id) => wait(editors.find((e) => e.id === id) || null),
    async getRecommendedEditors(briefId) {
      const b = store.get("briefs", {})[briefId];
      const cat = b?.result.recommended_package.category;
      return wait(editors.filter((e) => !cat || e.categories.includes(cat)).sort((a, z) => z.rating - a.rating));
    },

    async placeOrder({ editorId, itemId, addons: ad = [], rush = false, note = "", briefId = null, paymentMethod = "demo_card" }) {
      const item = findEditor(editorId).menu.find((m) => m.id === itemId);
      const orders = store.get("orders", []);
      const hours = rush ? 24 : item.eta.includes("h") ? parseInt(item.eta) : parseInt(item.eta) * 24;
      const total = priceOf(editorId, itemId, { addons: ad, rush });
      const totalUsd = priceUsdOf(editorId, itemId, { addons: ad, rush });
      const order = {
        id: "BMT-" + (2481 + orders.length), editorId, itemId, title: item.title, g: item.g, addons: ad, rush, note,
        total, totalUsd,
        payment: { method: paymentMethod === "demo_upi" ? "Test UPI (demo@bmt)" : "Test card ending 4242", amount_usd: totalUsd, amount_inr: total, reference: "PAY-SIM-MOCK" + orders.length, status: "held", simulated: true },
        placedAt: Date.now(), dueAt: Date.now() + Math.min(hours, 14) * 3600e3,
        status: "editing", revisionsLeft: ad.includes("revision") ? 3 : 2, notes: [],
        briefId, brief: briefId ? store.get("briefs", {})[briefId]?.result || null : null,
        review: null, payout: null, cutUploadId: null,
      };
      orders.unshift(order);
      store.set("orders", orders);
      return wait(order);
    },
    getOrders: () => wait(store.get("orders", [])),
    getOrder: (id) => wait(store.get("orders", []).find((o) => o.id === id) || null),
    deliverCut: (id, cutUploadId) => patchOrder(id, { status: "review", deliveredAt: Date.now(), cutUploadId, review: null, notes: [] }),
    async addNote(id, note) {
      const o = await mock.getOrder(id);
      return patchOrder(id, { notes: [...o.notes, note].sort((a, b) => a.t - b.t) });
    },
    async requestChanges(id) {
      const o = await mock.getOrder(id);
      return patchOrder(id, { status: "editing", revisionsLeft: Math.max(0, o.revisionsLeft - 1), dueAt: Date.now() + 12 * 3600e3 });
    },
    async approveOrder(id) {
      const o = await mock.getOrder(id);
      const gross = o.totalUsd ?? Math.round((o.total / MOCK_FX) * 100) / 100;
      const fee = Math.round(gross * MOCK_FEE * 100) / 100;
      const usd = Math.round((gross - fee) * 100) / 100;
      const payout = {
        amount_usd: usd, fx_rate: MOCK_FX, amount_inr: Math.round(usd * MOCK_FX * 100) / 100,
        gross_usd: gross, fee_usd: fee, fee_pct: MOCK_FEE * 100, transfer_id: "RAMP-SIM-MOCK", eta: "About 1 business day",
        rail: "ramp", status: "simulated",
      };
      return patchOrder(id, { status: "approved", approvedAt: Date.now(), payout });
    },
    async runReview(id, feedback) {
      await delay(2500);
      const o = await mock.getOrder(id);
      let review = o.review || structuredClone(MOCK_REVIEW);
      if (feedback) review = { ...review, notes: [...review.notes, { timestamp_sec: 3, issue: "Client: " + feedback, suggestion: "Apply this on the opening shot first, then carry it through", severity: "medium", source: "client" }].sort((a, b) => a.timestamp_sec - b.timestamp_sec) };
      await patchOrder(id, { review });
      return review;
    },

    async uploadFile(file, kind, onProgress) {
      for (const p of [0.3, 0.7, 1]) { await delay(250); onProgress && onProgress(p); }
      const id = "up_mock" + Math.random().toString(16).slice(2, 8);
      mediaUrls[id] = URL.createObjectURL(file);
      return { id, kind, filename: file.name, mime: file.type, size: file.size };
    },
    mediaUrl: async (uploadId) => mediaUrls[uploadId] || null,
    async draftThumbnail(briefId) {
      await delay(2000);
      const briefs = store.get("briefs", {});
      const b = briefs[briefId];
      const id = "up_mockthumb" + Object.keys(mediaUrls).length;
      const title = b.result.title.replace(/[<&>"]/g, "");
      mediaUrls[id] = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="640"><rect width="360" height="640" fill="#2B1055"/><text x="24" y="560" font-family="sans-serif" font-size="40" font-weight="700" fill="white">${title}</text></svg>`);
      briefs[briefId] = { ...b, thumbnail_upload_id: id };
      store.set("briefs", briefs);
      return briefs[briefId];
    },

    async createBrief({ uploadIds, note }) {
      await delay(3000);
      const briefs = store.get("briefs", {});
      const id = "br_mock" + (Object.keys(briefs).length + 1);
      const result = { ...structuredClone(MOCK_BRIEF), best_moments: MOCK_BRIEF.best_moments.map((m) => ({ ...m, upload_id: uploadIds[0] })) };
      briefs[id] = { id, upload_ids: uploadIds, client_note: note || "", result };
      store.set("briefs", briefs);
      return briefs[id];
    },
    getBrief: (id) => wait(store.get("briefs", {})[id] || null),
    async updateBrief(id, result) {
      const briefs = store.get("briefs", {});
      briefs[id] = { ...briefs[id], result };
      store.set("briefs", briefs);
      return wait(briefs[id]);
    },
  };

  BMT.api = Object.assign({}, shared, BMT_USE_MOCKS ? mock : live);
})();
