# /masterclass — the low-ticket funnel

Three pages, one path:

| Step | Page | Sells | Price |
|---|---|---|---|
| 1 | `/masterclass` | The Book Marketing Masterclass (recorded, Lexi): six courses, 58 lessons, delivered in Kajabi | $47 once (launch price; $97 from 24 Nov) |
| 2 | `/masterclass/challenge` | The 3-Day Book Video Challenge (live, Mon–Wed 12pm ET), one click after checkout | $147 |
| 3 | `/masterclass/start` | Order confirmed + the free 7-day Sonder trial (the same card trial as `/f`) | $0 today |

Buyers who say no on step 2 still land on step 3. Add `?notes=1` to any page to see why each section is there.

## Settings

Each page keeps its settings in one block at the foot of its script.

| Where | Setting | What it is |
|---|---|---|
| `index.html` | `CHECKOUT_URL` | The $47 checkout (the Kajabi offer's checkout link). Empty = preview mode: buttons walk to step 2 without charging. |
| `index.html` | `LAUNCH_ENDS` | When the launch price ends (end of 23 Nov, New York, the first live challenge). After it, the crossed-out $97 lines disappear by themselves. On that day raise the checkout to $97 and change the $47s on the page, or move the date. |
| `challenge/index.html` | `ACCEPT_URL`, `DECLINE_URL` | The one-click accept and decline links for the $147 add-on. Empty = preview mode. |
| `challenge/index.html` | `LEXI_VIDEO_URL` | Lexi's short video for the upgrade page. Empty = no video block. |
| `start/index.html` | `COURSE_URL` | Where "Not now, I'll start with the lessons" goes (the Kajabi classroom login). The page also invites every buyer to the free Sonder community, skool.com/sonder-6045 (never Lexi's bookmarketing group). |
| `mc.js` | `CHALLENGES`, `LEAD_HOURS` | The Monday each challenge starts. A buyer joins the first one at least 36 hours away. The confirmation emails must follow the same rule. |

Step 3 reads `?challenge=1`, `?starts=YYYY-MM-DD`, `?email=` and `?name=` from its URL, so the checkout tool should send buyers there with them when it can.

## What the course page may promise

Step 1 was rewritten on 30 Oct from the transcripts of every lesson in Lexi's Skool classroom (skool.com/bookmarketing). It describes only the 58 lessons that go into Kajabi, and its lesson counts and running times come from those recordings. Left out of Kajabi, and so off the page: the Onboarding course, the coaching call replays, 2.1 (Skool tour), 2.3 (another community's 2025 call), 2.6 (duplicate of 7.1), 2.14 (Discord), 4.7 (written for Lexi's creators), 6.4 (internal feedback; must not be sold), 6.8 (internal hand-off) and 8.10 (Gerald's software pitch). If the Kajabi build changes, change the numbers on the page.

## Tracking

- Meta Pixel: `ViewContent` on step 1, `InitiateCheckout` on every buy button, `AddToCart` on the challenge yes, `InitiateCheckout` (`mc_trial`) on the trial button. `Purchase` must come from the checkout tool.
- Ad and affiliate tags (`utm_*`, `fbclid`, `via`, `dub_id` …) are passed on to the checkout and saved for the tab, then put on the trial link, so a trial is credited to the ad that paid for the visit.
