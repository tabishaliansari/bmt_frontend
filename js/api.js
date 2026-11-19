/*
 * BMT API layer.
 * Every screen talks ONLY to BMT.api. Today it serves mock data from memory
 * (+ localStorage for orders). To plug in the real backend, replace the body
 * of each function with a fetch() to your server. Keep the same return shapes.
 *
 *   Example:
 *   async getEditors(params) {
 *     const r = await fetch(`${API_BASE}/editors?` + new URLSearchParams(params));
 *     return r.json();
 *   }
 */
window.BMT = window.BMT || {};

(function () {
  const API_BASE = "/api/v1";
  // Demo fallback: true (or ?mocks=1 in the URL) serves everything from the mock data below.
  const BMT_USE_MOCKS = new URLSearchParams(location.search).has("mocks") || false;
  const LATENCY = 180;        // fake network delay, ms
  const wait = (v) => new Promise((res) => setTimeout(() => res(structuredClone(v)), LATENCY));

  // ---------------------------------------------------------------- backend
  async function http(path, options) {
    const r = await fetch(API_BASE + path, options);
    const body = await r.json().catch(() => null);
    if (!r.ok) {
      const err = new Error(body?.error?.message || `Request failed (${r.status})`);
      err.status = r.status;
      err.code = body?.error?.code;
      throw err;
    }
    return body;
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

  // ---------------------------------------------------------------- persistence
  const store = {
    get(k, d) { try { const v = localStorage.getItem("bmt:" + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("bmt:" + k, JSON.stringify(v)); } catch {} },
  };

  const priceOf = (editorId, itemId, opts = {}) => {
    const ed = editors.find((e) => e.id === editorId);
    const item = ed.menu.find((m) => m.id === itemId);
    const add = (opts.addons || []).reduce((s, id) => s + (addons.find((a) => a.id === id)?.price || 0), 0);
    return item.price + add + (opts.rush ? RUSH_FEE : 0);
  };

  // ---------------------------------------------------------------- public API
  BMT.api = {
    API_BASE,
    BMT_USE_MOCKS,
    RUSH_FEE,

    getCategories: () => wait(categories),
    getQuickPackages: () => wait(quickPackages),
    getAddons: () => wait(addons),

    /** GET /editors?category=&q= */
    async getEditors({ category, q } = {}) {
      if (!BMT_USE_MOCKS) {
        const params = new URLSearchParams();
        if (category) params.set("category", category);
        if (q) params.set("q", q);
        return (await http(`/editors?${params}`)).map(toEditor);
      }
      let list = editors;
      if (category) list = list.filter((e) => e.categories.includes(category));
      if (q) {
        const s = q.toLowerCase();
        list = list.filter((e) => [e.name, e.handle, e.city, ...e.styles, ...e.menu.map((m) => m.title)].join(" ").toLowerCase().includes(s));
      }
      return wait(list);
    },

    /** GET /editors/:id */
    async getEditor(id) {
      if (BMT_USE_MOCKS) return wait(editors.find((e) => e.id === id) || null);
      try {
        return toEditor(await http(`/editors/${encodeURIComponent(id)}`));
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },

    quote: (editorId, itemId, opts) => priceOf(editorId, itemId, opts),

    /** POST /orders  → funds held in escrow until approval */
    async placeOrder({ editorId, itemId, addons: ad = [], rush = false, note = "", files = [] }) {
      const ed = editors.find((e) => e.id === editorId);
      const item = ed.menu.find((m) => m.id === itemId);
      const orders = store.get("orders", []);
      const id = "BMT-" + (2481 + orders.length);
      const hours = rush ? 24 : item.eta.includes("h") ? parseInt(item.eta) : parseInt(item.eta) * 24;
      const order = {
        id, editorId, itemId, title: item.title, g: item.g, addons: ad, rush, note, files,
        total: priceOf(editorId, itemId, { addons: ad, rush }),
        placedAt: Date.now(), dueAt: Date.now() + Math.min(hours, 14) * 3600e3,
        status: "editing", // editing → review → approved
        revisionsLeft: ad.includes("revision") ? 3 : 2,
        notes: [],
      };
      orders.unshift(order);
      store.set("orders", orders);
      return wait(order);
    },

    getOrders: () => wait(store.get("orders", [])),
    getOrder: (id) => wait(store.get("orders", []).find((o) => o.id === id) || null),

    async updateOrder(id, patch) {
      const orders = store.get("orders", []);
      const i = orders.findIndex((o) => o.id === id);
      if (i < 0) return null;
      orders[i] = { ...orders[i], ...patch };
      store.set("orders", orders);
      return wait(orders[i]);
    },

    /** POST /orders/:id/approve → releases escrow to editor */
    approveOrder: (id) => BMT.api.updateOrder(id, { status: "approved", approvedAt: Date.now() }),

    /** POST /orders/:id/revisions */
    async requestChanges(id) {
      const o = await BMT.api.getOrder(id);
      return BMT.api.updateOrder(id, { status: "editing", revisionsLeft: Math.max(0, o.revisionsLeft - 1), dueAt: Date.now() + 12 * 3600e3 });
    },

    async addNote(id, note) {
      const o = await BMT.api.getOrder(id);
      return BMT.api.updateOrder(id, { notes: [...o.notes, note] });
    },

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
    resetDemo() { ["orders", "favs", "accepting", "incomingHandled", "mode"].forEach((k) => { try { localStorage.removeItem("bmt:" + k); } catch {} }); },
  };
})();
