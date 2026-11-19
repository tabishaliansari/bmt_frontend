# BMT · mock UI

Clickable prototype of BMT, the marketplace where clients order video edits from editors with **verified credits**, and money stays in escrow until the client approves the cut.

Plain HTML, CSS and JavaScript. No framework, no build step, no npm.

## Run it

- **Quickest:** double-click `index.html`.
- **On your phone:** serve the folder (`python3 -m http.server 8000`) or drop it on Vercel / Netlify, open it on your phone, then *Share → Add to Home Screen*. It runs full-screen like an app.

## Three layouts, one codebase

| Layout | When | What you get |
|---|---|---|
| **Phone** | real phones (≤ 500px) | Full-bleed app, bottom tab bar, bottom sheets |
| **Phone frame** | "Mobile" on any bigger screen | iPhone mockup, **auto-scaled to fit the window** (no zooming) |
| **Desktop** | ≥ 1024px, or "Desktop" anywhere | Sidebar nav, 3–4 column grids, two-column storefront, side-by-side tracking and review, modals instead of sheets. On small windows it renders at 1280px and scales down |

## Light and dark theme

Follows the device's light/dark setting by default. To force one:
- **Sun / moon button** on the preview rail (centre-left edge) flips it instantly, without reloading the screen, so you can switch mid-demo.
- **You → Appearance** (or **Profile → Appearance** in editor mode): Automatic, Light or Dark. This is the way on a real phone.

Colours live as CSS variables in `css/tokens.css`; the dark values are in the `body.T-dark` block at the bottom, following Apple's dark system colours. Brand accent, verified blue and protected green keep their meaning in both themes.

**Switching:** use the **Mobile / Desktop** buttons on the preview rail at the centre-left edge of the screen. On a real phone the rail is hidden; use *You → View desktop version* (or *Profile* in editor mode). The choice is remembered.

`js/layout.js` picks the layout and puts a class on `<body>` (`L-phone`, `L-frame`, `L-desk`); `css/app.css` styles each. Screens render the same markup everywhere; the sidebar comes from `BMT.ui.sidebar()` and the router decides which item is active.

## Project layout

```
index.html               app shell, loads scripts in order
manifest.webmanifest     "Add to Home Screen" metadata
assets/icon.svg          playhead logo
css/tokens.css           design tokens (colours, radii, type, motion) + dark theme, mirrors the Figma board
css/app.css              components and layout
js/api.js                ← the ONLY place that touches data. Swap mocks for fetch() here.
js/ui.js                 icons, chips, avatars, tab bar, sheets, toasts, long-press
js/screens/client.js     Welcome, Discover, Search, Editor storefront, Credits sheet, Customize sheet, Orders, Inbox, You
js/screens/order.js      Order tracking (live countdown), Review cut (frame notes), Approve / release
js/screens/editor.js     Studio, Add verified credit, Learn, Community, Editor profile
js/layout.js             picks phone / frame / desktop layout, scales to fit, light/dark theme, preview rail
js/app.js                hash router (#/discover, #/editor/riya, #/order/BMT-2481 …)
```

## Things to try

| Tap / gesture | What it reveals |
|---|---|
| Blue ✓ next to an editor's name (or the stats row) | Verified credits sheet with real view counts |
| **ADD** on a menu item | Customize sheet: turnaround, add-ons, upload, live total |
| Rating pill on a storefront | Jumps to Reviews |
| Long-press any editor card | Showreel peek (Haptic Touch style) |
| Pull down at the top of Discover | “Surprise me”: a random editor in that category |
| A category circle | Filters editors; tap again to clear |
| Green “BMT Protected” box / “₹ held safely” | How escrow works |
| On an order: **Demo: deliver the cut now** | Moves the order to review |
| On the review player: tap a note, or drag the scrubber | Jumps to that frame; type a note to pin it there |
| **Approve · release** | Confirms, releases escrow, order completes |
| You → Switch to editor mode | Editor side: Studio, accept/decline orders, add credits, Learn |
| You / Profile → Reset demo data | Clears everything stored in this browser |

Orders, favourites and toggles persist in `localStorage`, so the demo survives reloads.

## Plugging in the backend

Every screen calls `BMT.api.*` and nothing else. Replace each function body in `js/api.js` with a real request and keep the same return shape. Nothing in `screens/` needs to change.

```js
async getEditors({ category, q } = {}) {
  const r = await fetch(`${API_BASE}/editors?` + new URLSearchParams({ category, q }));
  if (!r.ok) throw new Error("Failed to load editors");
  return r.json();
}
```

### Endpoints the frontend expects

| Function | Method & path | Notes |
|---|---|---|
| `getCategories()` | `GET /categories` | |
| `getQuickPackages()` | `GET /packages/quick` | “Order in one tap” row |
| `getAddons()` | `GET /addons` | |
| `getEditors({category, q})` | `GET /editors?category=&q=` | |
| `getEditor(id)` | `GET /editors/:id` | includes `menu`, `creditList`, `reviews`, `work` |
| `quote(editorId, itemId, {addons, rush})` | `POST /quotes` | currently computed client-side; **server must re-price on order** |
| `placeOrder({...})` | `POST /orders` | charges the client, funds held in escrow |
| `getOrders()` / `getOrder(id)` | `GET /orders`, `GET /orders/:id` | |
| `addNote(id, {t, text})` | `POST /orders/:id/notes` | `t` = seconds into the video |
| `requestChanges(id)` | `POST /orders/:id/revisions` | decrements `revisionsLeft` |
| `approveOrder(id)` | `POST /orders/:id/approve` | releases escrow to the editor |
| `lookupVideo(url)` | `POST /credits/lookup` | server calls the YouTube Data API |
| `requestCredit({video, role})` | `POST /credits` | sends a one-tap confirmation to the channel |
| `getStudio()` | `GET /studio` | editor dashboard |
| `setAccepting(bool)` | `PATCH /studio` | |
| `handleIncoming(action)` | `POST /orders/:id/accept` or `/decline` | |
| `getCourses()` / `getPosts()` / `getMentors()` | `GET /courses`, `/posts`, `/mentors` | |

Order `status` moves `editing → review → approved`. Prices are in whole rupees.

### Before this goes anywhere real

- Pricing, escrow and approval must be enforced **server-side**. The client is only a view.
- Auth isn't modelled yet; add a token to the `fetch` calls in `api.js`.
- The “Demo: deliver the cut now” button and the fake 14-hour countdown cap exist only for demos. Remove them once real delivery is wired.
- Thumbnails are gradients standing in for real video frames.
