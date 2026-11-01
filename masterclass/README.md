# /masterclass — the low-ticket funnel

Four pages, one path:

| Step | Page | Sells | Price |
|---|---|---|---|
| 1 | `/masterclass` | The Book Marketing Masterclass (recorded, Lexi): six courses, 58 lessons, in the Sonder community on Skool | $47 once, launch price ($97 struck through, no date) |
| 1b | `/masterclass/checkout` | Our own checkout page, ClickFunnels style: a two-step order form (name and email, then the card) | the $47 |
| 2 | `/masterclass/challenge` | The 3-Day Book Video Challenge (live, Mon–Wed 12pm ET, every other week), one click after checkout | $147 |
| 3 | `/masterclass/start` | Order confirmed + the free 7-day Sonder trial (the same card trial as `/f`) | $0 today |

Buyers who say no on step 2 still land on step 3. Add `?notes=1` to any page to see why each section is there.

## How it works (since 1 Nov 2026)

Every payment is on **Sonder's own Stripe**, through sonder-server (`routes/masterclass.ts`, rules in `lib/masterclassRules.ts`), so revenue and conversion live in one place. Nothing is paid on Skool.

1. A buy button opens **our own checkout page**, `/masterclass/checkout` (since 1 Nov 2026). Step 1 takes a name and an email and asks the server for a checkout (`POST /api/public/masterclass/checkout` with `ui: 'page'`). The server opens a Stripe Checkout Session in "elements" mode, and step 2 shows Stripe's card fields inside our form, with the order summary, the tax Stripe works out, the terms tick box (required, our own: Stripe can't draw it in this mode) and one button. The card is saved for one click, and the page says so. If the card fields can't load, or the page is switched off, step 1 opens Stripe's hosted checkout instead, with the email filled in.
2. Stripe sends the buyer to `/masterclass/challenge/?s=cs_...`. That checkout id is the buyer's key from then on. **Yes** charges the same card once (`POST .../challenge`). If the bank wants a confirmation, or declines, the page links to Stripe's own page to finish or use another card.
3. `/masterclass/start/?s=...` reads the order (`GET .../order`). It shows the Skool steps, a **Send my invite again** button and an **I use a different email on Skool** box. Challenge buyers also get their dates and calendar buttons, and the page fires Meta's Purchase with the same event id the server sends, so each sale is counted once.

**Course access:** when Stripe confirms the $47, the server asks Skool to email the buyer an invite to the Sonder group (Skool's Webhook plugin). That invite gets them past the group's paywall. The course lives in that group's Classroom.

## Settings

| Where | Setting | What it is |
|---|---|---|
| Railway (sonder-server) | `MASTERCLASS_FUNNEL_ENABLED` | `true` takes real payments. Off = the pages run in preview mode (buttons walk the three pages, nothing is charged). |
| Railway | `STRIPE_PRICE_MASTERCLASS_LAUNCH`, `STRIPE_PRICE_MASTERCLASS`, `STRIPE_PRICE_MASTERCLASS_CHALLENGE` | The $47, $97 and $147 prices (`scripts/create-masterclass-prices.ts` makes them). The server refuses to charge if a price differs from what the page shows. |
| Railway | `STRIPE_PUBLISHABLE_KEY` | The `pk_live_...` key Stripe.js needs on our checkout page. Public by design, but it must be from the same account and mode as `STRIPE_SECRET_KEY`. Unset = buttons use Stripe's hosted checkout. |
| Railway | `MASTERCLASS_CHECKOUT_PAGE` | `false` sends every buy button back to Stripe's hosted checkout (no deploy; the page follows within a minute). Unset = our own checkout page. |
| Stripe | Payment method domains | `www.yousonder.com` must be registered for Apple Pay and Google Pay to show on our checkout page. |
| Railway | `MASTERCLASS_FULL_PRICE` | Off: the course is $47, shown as a launch price with $97 struck through (no date), whatever the date. `true`: $97, on the page (within a minute) and at checkout together, and the struck-through lines disappear. Nothing changes it automatically. |
| Railway + Trigger | `SKOOL_INVITE_WEBHOOK_URL` | Skool → Settings → Plugins → Webhook. Secret: anyone with it can invite anyone. |
| Railway + Trigger | `BOOTCAMP_ZOOM_URL` | The challenge's Zoom link (one per cohort can be set in the `bootcamp_cohorts` table instead). |
| Railway + Trigger | `BOOTCAMP_SKIP_DATES` | Cohort Mondays to drop, e.g. `2026-12-21`. |
| Trigger | `BOOTCAMP_REMINDERS_ENABLED` | `true` sends the reminders: Day 1 at 5 days, 3 days, 24 hours and 1 hour before, and when it starts; Days 2 and 3 at 1 hour before and when they start. |
| `challenge/index.html` | `LEXI_VIDEO_URL` | Lexi's short video for the upgrade page. Empty = no video block. |
| `start/index.html` | `COURSE_URL` | The Sonder classroom on Skool ("Not now" and "Already joined?"). |
| `mc.js` | `FIRST`, `CADENCE_DAYS` | The fallback schedule (every other Monday from 23 Nov). The server's list (`GET /config`) replaces it as soon as it loads. Anyone can buy until Day 1 starts and joins that cohort. |

## What the course page may promise

Step 1 was rewritten on 30 Oct from the transcripts of every lesson in Lexi's Skool classroom (skool.com/bookmarketing). It describes only the 58 lessons that go into the course, and its lesson counts and running times come from those recordings. Left out of the course, and so off the page: the Onboarding course, the coaching call replays, 2.1 (Skool tour), 2.3 (another community's 2025 call), 2.6 (duplicate of 7.1), 2.14 (Discord), 4.7 (written for Lexi's creators), 6.4 (internal feedback; must not be sold), 6.8 (internal hand-off) and 8.10 (Gerald's software pitch). If the course build changes, change the numbers on the page.

## Tracking

- Meta Pixel: `ViewContent` on step 1, `InitiateCheckout` on every buy button, `AddToCart` on the challenge yes, `Purchase` on step 3 (one per sale, the server's event id), `InitiateCheckout` (`mc_trial`) on the trial button. The server also reports each Purchase through the Conversions API, with consent only.
- Ad tags (`utm_*`, `fbclid`, `via`) go with the checkout and are saved for the tab, then put on the trial link, so a trial is credited to the ad that paid for the visit. Affiliates earn nothing on funnel sales.
- Visitors: `/visit.js` on all three pages, counted apart (`masterclass`, `masterclass-challenge`, `masterclass-start`). The admin's Funnel tab shows visitors, checkouts, buyers, revenue and conversion for each step, ads vs organic.
