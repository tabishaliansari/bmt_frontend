# BMT · web app

The BMT web app: clients order video edits from editors with **verified credits**, Gemini writes the brief from raw footage and reviews each cut, and money stays held until the client approves.

Plain HTML, CSS and JavaScript. No framework, no build step, no npm. Started as a copy of `mock-ui/`.

## Run it

- **With the backend (normal):** run the FastAPI service in `../backend` (see its README). It serves this folder at http://localhost:8080 and the API at `/api/v1`.
- **Without a backend:** open http://localhost:8080/?mocks=1, or serve this folder (`python -m http.server 8000`) and open `/?mocks=1`. Everything runs on mock data with canned Gemini results. This is the demo fallback.
- **On your phone:** open the server's URL on your phone, then *Share → Add to Home Screen*. It runs full-screen like an app.

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
js/api.js                ← the ONLY place that touches data. Live backend calls + the ?mocks=1 fallback.
js/ui.js                 icons, chips, avatars, tab bar, sheets, toasts, long-press
js/screens/client.js     Welcome, Discover, Search, Editor storefront, Credits sheet, Customize sheet, Orders, Inbox, You
js/screens/order.js      Order tracking (brief, upload the cut, payout receipt), Review cut (real video, AI review, notes), Approve
js/screens/brief.js      Start with your footage, Brief result (editable), Editors for your brief
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
| Discover → **Start with your footage** | Upload clips, Gemini writes an editable brief, then matching editors |
| On an order: **Upload the editor's cut** | Demo stand-in for the editor app; moves the order to review |
| Review screen: **Run AI review** | Match score, checklist and timestamped notes on the scrubber |
| Review screen: type feedback → **Turn into notes** | Vague feedback rewritten into timestamped notes |
| On the review player: tap a note, or drag the scrubber | Jumps to that moment; type a note to pin it there |
| **Approve · release** | Confirms, releases escrow, order completes |
| You → Switch to editor mode | Editor side: Studio, accept/decline orders, add credits, Learn |
| You / Profile → Reset demo data | Clears everything stored in this browser |

Orders, favourites and toggles persist in `localStorage`, so the demo survives reloads.

## Backend

Every screen calls `BMT.api.*` and nothing else. `js/api.js` calls the FastAPI backend and converts its
snake_case JSON into the shapes the screens use (`toEditor`, `toOrder`, `toAddon`). The contract is
`../backend/docs/API.md`. Prices, escrow state and approval are all enforced on the server; the
frontend never sends a price.

Still mock in both modes (out of MVP scope): categories, quick packages, courses, community posts,
mentors, the editor studio, credit lookup and chat.

Order `status` in the UI is `editing → review → approved` (server: `funded | in_progress → review → approved`).
