# /masterclass — the low-ticket funnel

Three pages, one path:

| Step | Page | Sells | Price |
|---|---|---|---|
| 1 | `/masterclass` | The Book Marketing Masterclass (recorded, Lexi): six courses, 58 lessons, in the Sonder community on Skool | $47 once (until the founders change it) |
| 2 | `/masterclass/challenge` | The 3-Day Book Video Challenge (live, Mon–Wed 12pm ET, every other week), one click after checkout | $147 |
| 3 | `/masterclass/start` | Order confirmed + the free 7-day Sonder trial (the same card trial as `/f`) | $0 today |

Buyers who say no on step 2 still land on step 3. Add `?notes=1` to any page to see why each section is there.

## How it works (since 1 Nov 2026)

Every payment is on **Sonder's own Stripe**, through sonder-server (`routes/masterclass.ts`, rules in `lib/masterclassRules.ts`), so revenue and conversion live in one place. Nothing is paid on Skool.

1. A buy button asks the server to open a Stripe checkout (`POST /api/public/masterclass/checkout`). The card is saved for one click, and the checkout says so.
2. Stripe sends the buyer to `/masterclass/challenge/?s=cs_...`. That checkout id is the buyer's key from then on. **Yes** charges the same card once (`POST .../challenge`). If the bank wants a confirmation, or declines, the page links to Stripe's own page to finish or use another card.
3. `/masterclass/start/?s=...` reads the order (`GET .../order`). It shows the Skool steps, a **Send my invite again** button and an **I use a different email on Skool** box. Challenge buyers also get their dates and calendar buttons, and the page fires Meta's Purchase with the same event id the server sends, so each sale is counted once.

**Course access:** when Stripe confirms the $47, the server asks Skool to email the buyer an invite to the Sonder group (Skool's Webhook plugin). That invite gets them past the group's paywall. The course lives in that group's Classroom.

## Settings

| Where | Setting | What it is |
|---|---|---|
| Railway (sonder-server) | `MASTERCLASS_FUNNEL_ENABLED` | `true` takes real payments. Off = the pages run in preview mode (buttons walk the three pages, nothing is charged). |
| Railway | `STRIPE_PRICE_MASTERCLASS_LAUNCH`, `STRIPE_PRICE_MASTERCLASS`, `STRIPE_PRICE_MASTERCLASS_CHALLENGE` | The $47, $97 and $147 prices (`scripts/create-masterclass-prices.ts` makes them). The server refuses to charge if a price differs from what the page shows. |
| Railway | `MASTERCLASS_FULL_PRICE` | Off: the course is $47, whatever the date. `true`: $97, on the page (within a minute) and at checkout together. Nothing changes it automatically. |
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
