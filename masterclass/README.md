# /masterclass — the low-ticket funnel

Three pages, one path:

| Step | Page | Sells | Price |
|---|---|---|---|
| 1 | `/masterclass` | The Faceless Book Marketing Masterclass (recorded, Lexi) | $47 once |
| 2 | `/masterclass/challenge` | The 3-Day Book Video Challenge (live, Mon–Wed 12pm ET), one click after checkout | $147 |
| 3 | `/masterclass/start` | Order confirmed + the free 7-day Sonder trial (the same card trial as `/f`) | $0 today |

Buyers who say no on step 2 still land on step 3. Add `?notes=1` to any page to see why each section is there.

## Settings

Each page keeps its settings in one block at the foot of its script.

| Where | Setting | What it is |
|---|---|---|
| `index.html` | `CHECKOUT_URL` | The $47 checkout (SamCart product page or a Stripe link). Empty = preview mode: buttons walk to step 2 without charging. |
| `challenge/index.html` | `ACCEPT_URL`, `DECLINE_URL` | The one-click accept and decline links for the $147 add-on. Empty = preview mode. |
| `challenge/index.html` | `LEXI_VIDEO_URL` | Lexi's short video for the upgrade page. Empty = no video block. |
| `start/index.html` | `COURSE_URL` | Where "Not now, I'll start with the lessons" goes (the course login). |
| `mc.js` | `CHALLENGES`, `LEAD_HOURS` | The Monday each challenge starts. A buyer joins the first one at least 36 hours away. The confirmation emails must follow the same rule. |

Step 3 reads `?challenge=1`, `?starts=YYYY-MM-DD`, `?email=` and `?name=` from its URL, so the checkout tool should send buyers there with them when it can.

## Tracking

- Meta Pixel: `ViewContent` on step 1, `InitiateCheckout` on every buy button, `AddToCart` on the challenge yes, `InitiateCheckout` (`mc_trial`) on the trial button. `Purchase` must come from the checkout tool.
- Ad and affiliate tags (`utm_*`, `fbclid`, `via`, `dub_id` …) are passed on to the checkout and saved for the tab, then put on the trial link, so a trial is credited to the ad that paid for the visit.
