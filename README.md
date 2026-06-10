# Sonder Landing Page — Handoff to Abdul

Static landing page for `yousonder.com`. Replaces the current Lovable build. Built to brand v2.1 (Plum Black + Aurora Mint, Magician/Effortless archetype).

## What this is

A **single-file static site**. No build step, no framework, no npm install. Three files (`index.html`, `style.css`, `app.js`) plus an `assets/` folder. Open `index.html` in any browser and the whole site runs locally.

Tech stack:
- Vanilla HTML / CSS / JS — zero dependencies installed locally
- **GSAP 3.12** (loaded from jsDelivr CDN, used for scroll choreography)
- **Wistia Player** (loaded from `fast.wistia.com`, used for the tutorial + showcase reels)
- **Inter + Nunito** fonts (loaded from Google Fonts)

That means deploying is just: **upload the folder to any static host. That's it.**

---

## How to deploy (pick one)

### Option A — Vercel (recommended, free tier)
```bash
cd "Landing Page"
npx vercel
```
Drag the folder onto vercel.com → New Project → "Deploy as static." Vercel will give you a preview URL. Then add `yousonder.com` as a custom domain in Vercel project settings.

### Option B — Netlify drop
1. Go to <https://app.netlify.com/drop>
2. Drag the entire `Landing Page` folder onto the drop zone.
3. Netlify gives you a URL immediately. Point `yousonder.com` to it via DNS.

### Option C — Cloudflare Pages
1. Push to a Git repo, connect it to Cloudflare Pages.
2. Build command: *(none)*. Output directory: *(root)*. Deploy.

### Option D — Anything that serves static files
S3 + CloudFront, GitHub Pages, traditional shared hosting — all fine. Just upload the folder. Set `index.html` as the default document.

**Total page weight:** ~25 MB once all hero frames are loaded (the bulk is the 168-frame scroll-driven hero video). On a modern CDN with image compression this delivers in 2–3 seconds on 4G.

---

## ⚠️ Before going live — 4 things to wire up

These are placeholders right now. Search for the marker in the code, swap the value, and you're done.

### 1. CTA destinations
**Search:** `https://yousonder.com/pricing`
**Currently:** every "Be seen →" button across the page points to `yousonder.com/pricing` (with `?tier=starter`/`?tier=author`/`?tier=studio`/`?tier=agency` on the pricing-tier buttons).
**Action:** confirm `yousonder.com/pricing` exists in the Sonder app. If the pricing page is somewhere else (`/upgrade`, `/checkout`, etc.) update the URLs.

### 2. Exit-intent form submission
**File:** `app.js`
**Search:** `[Sonder free-video claim]`
**Currently:** the form just `console.log`s the email + first name when submitted, then shows a "Welcome. Check your inbox" success state.
**Action:** replace the `console.log` line with a real `fetch()` POST to whatever endpoint Sonder uses for leads — Mailchimp, HubSpot, ConvertKit, or a Sonder backend route. Payload object is already built (`{ firstname, email, source, ts }`).

### 3. Footer + nav links currently set to `#`
**Search:** `href="#"`
**Currently:** these go nowhere — Sign in, Manifesto, Founders link in footer, Terms, Privacy, Contact.
**Action:** wire each to its real destination. Or remove them from the footer if they don't have pages yet.

### 4. Wistia player permissions
The 9 Wistia videos are embedded by media-id. In Wistia → Customize → Embed & Share → check that embeds are allowed for the `yousonder.com` domain. If you don't add the production domain to the allowlist, the player will refuse to embed and show an error in production. Currently it works on `localhost` because Wistia permits localhost by default.

Wistia media-IDs in use (search `data-wistia-id` to see them all):
- Tutorial walkthrough: `oenqanb3ej`
- European Cartoon: `le99g7qi7f`
- Expert Podcaster: `1ymppelyqm`
- Neon Wireframe: `2tnccunxqx`
- Expert Panelist: `xqg4ugdw8z`
- Yellow Cartoon: `ebeee2cm3z`
- Expert Speaker: `ejw6zhrgpo`
- Skeleton: `66x1be2gyp2um9n`  *(this is the share-ID, real media-id resolves automatically)*
- Stick Figure: `gi0j9axtu9roe4n`  *(same)*

---

## File structure & asset map

```
Landing Page/
├── index.html              # The page itself
├── style.css               # All styles
├── app.js                  # All JS (canvas scroll-driver, lightbox, pricing toggle, exit-intent, etc.)
├── README.md               # This file
│
├── assets/
│   ├── sonder-logo-plum-flat.svg     # Used as favicon
│   ├── sonder-logo-plum-night.svg    # Canonical brand mark
│   │
│   ├── frames/hero/                  # Hero scroll-driven video (168 JPEG frames @ ~50KB each, ~8MB total)
│   │   ├── frame_001.jpg
│   │   ├── ...
│   │   └── frame_168.jpg
│   │
│   ├── stills/                       # Showcase tile + tutorial thumbnails
│   │   ├── how-demo.jpg              # Tutorial walkthrough thumbnail (Nano Banana branded card)
│   │   ├── european-cartoon.jpg      # 8 showcase reels — one per Wistia video
│   │   ├── expert-podcaster.jpg
│   │   ├── neon-wireframe.jpg
│   │   ├── expert-panelist.jpg
│   │   ├── yellow-cartoon.jpg
│   │   ├── expert-speaker.jpg
│   │   ├── skeleton.jpg
│   │   └── stick-figure.jpg
│   │
│   ├── founders/                     # About Sonder section avatars
│   │   ├── lexi.jpg                  # 200×200 — replace with a higher-res shot when available
│   │   └── mike.jpg                  # 200×200 — same
│   │
│   ├── receipts/                     # Proof section customer screenshots
│   │   ├── forty-four-sales.jpg
│   │   ├── ten-sales-happy-dance.jpg
│   │   ├── lynn-dashboard.jpg
│   │   ├── lexi-profile.jpg
│   │   ├── lexi-insights.jpg
│   │   └── headline-numbers.png
│   │
│   └── images/                       # Section background photos (low-opacity ambient)
│       ├── stats-bg.jpg              # Behind the 2.9M views numbers (32% opacity)
│       └── final-bg.jpg              # Behind the closing "Be seen" section (28% opacity)
│
└── _source/                          # OPTIONAL — the raw hero MP4 master
    └── Test hero trimmed.mp4         # If you want to re-extract frames at different quality, the source is here.
                                      # Safe to delete if you don't need it. Frames are pre-extracted.
```

---

## How key pieces work (quick mental model for Abdul)

### The scroll-driven hero
- 168 JPEG frames preload in parallel as the page loads (~8MB, lazy-batched by the browser).
- A `<canvas>` element fills the hero section. As the user scrolls through the hero's 320vh tall container, `app.js` calculates scroll progress (0→1) and draws the corresponding frame (0→167) onto the canvas.
- `position: sticky` keeps the canvas pinned during scroll.
- **No GSAP needed** for this — pure scroll + requestAnimationFrame.

### The showcase reels (the marquee at the bottom of the Showcase section)
- 8 tiles + 8 duplicates = 16 elements scrolling left infinitely via CSS animation.
- Each tile is a `<button data-reel data-wistia-id="...">` — clicking it opens the lightbox modal.
- The duplicates exist so the marquee loop is seamless (no visible reset jump).

### The lightbox (showcase + tutorial)
- One shared modal markup at the bottom of `<body>` (`[data-lightbox]`).
- On click, JS creates a `<wistia-player>` element with the correct `media-id`, `aspect` (portrait or landscape), and `autoplay="true"`. The Wistia player loads, autoplays, and the user closes via × button, backdrop click, or Esc.

### Pricing toggle
- Top-right of the Pricing section. Two buttons (Monthly / Annual) + a sliding mint thumb.
- On click, JS swaps the price text by reading `data-monthly` / `data-annual` attributes on each `.tier-num`, `.tier-pervideo`, and the section headline's `$6.97` span.
- The "Billed annually · save $X/year" line shows only when annual via `.pricing[data-cycle="annual"] .tier-billed { display: block }`.

### Exit-intent modal
- Triggers on `mouseleave` with `clientY <= 0` (cursor exits via the top edge of the viewport — signal of moving to close/back).
- On mobile: triggers after scrolling > 800px down then scrolling > 320px back up (intent-to-leave signal on touchscreens).
- 8-second arm delay so it never fires immediately on page load.
- Uses `sessionStorage` to only show once per session.

### Cache-busting strategy
- When you swap an asset and the same filename, browsers may serve a stale cached copy. To force a refresh, append `?v=N` to the `src` and bump N. Example currently in the codebase: `how-demo.jpg?v=2`.
- Better long-term: configure your host (Vercel/Netlify) to send proper `cache-control: max-age=...` and use content-hashed filenames. That's a 30-minute setup, optional.

---

## Brand reference
Full brand guidelines live in `SONDER/Brand/` (separate from this folder). Key values used throughout:
- **Plum Black** `#0A0613` — canvas
- **Aurora Mint** `#7FFFD4` — signature accent
- **Plum Glow** `#4A2F6E`, **Plum Mid** `#2D1A48`, **Plum Deep** `#1A0F2E` — gradient halo stops
- **Paper White** `#F5F5F7` — primary text
- **Quiet Gray** `#8B8FA3` — secondary text
- **Violet Shift** `#B794F4` — motion-only (used in CSS variable, currently unused since the violet-sweep moment was removed with the hero rewrite)

Fonts: **Inter** for everything except the **Nunito 900** wordmark "Sonder".

---

## Questions for Mike (if anything in here is unclear)
Ping me — I'll connect you with the original author of these files. Otherwise: drag the folder onto Vercel, do the 4 wire-up tasks above, and you're live.

— Generated 2026-05-29 for the Sonder pre-launch handoff.
