/* Visit counter — tells sonder-server one page view happened, so the admin
   dashboard can show unique visitors per day and per month
   (sonder-server routes/siteVisit.ts).

   Two ways a visitor is recognised:
   - every visit: the server turns IP + browser into a one-way code that
     changes every day and keeps no IP (unique within a day);
   - monthly: one first-party cookie, sonder_vid, holding a random id made
     here. It says nothing about the person, is shared with no one, lasts up to
     13 months, and is set on .yousonder.com so the app's signup screen
     recognises the same visitor. Only set when consent.js allows it: after
     Accept in the EU/EEA/UK/Switzerland, never under Global Privacy Control or
     Do Not Track. Either way the visit is still counted for the day.

   Also sends the device's time zone (e.g. America/New_York), the dashboard's
   only clue to roughly where visitors are; no IP lookup. While the page stays
   on screen it pings every 30 seconds so the dashboard can show who is on the
   site right now: pings stop when the tab is hidden and after 30 minutes.

   Sends only once the page is actually on screen: Meta's in-app browser
   preloads ad pages in the background, and those were never seen by anyone.
   Never throws, never blocks the page, never retries. */
(function () {
  try {
    if (navigator.webdriver) return;
    var URL_ = 'https://sonder-server-production.up.railway.app/api/public/visit';
    var sent = false;
    var PING_MS = 30000;
    var PING_FOR_MS = 30 * 60 * 1000;
    var started = 0;
    var timer = null;

    // consent.js decides (opt-in where the law asks for it, GPC/DNT everywhere).
    // If it somehow did not load, fall back to the GPC/DNT rule alone.
    function optedOut() {
      var c = window.sonderConsent;
      if (c && typeof c.allowed === 'function') return !c.allowed();
      return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
    }

    function visitorId() {
      try {
        if (optedOut()) return '';
        var m = document.cookie.match(/(?:^|; )sonder_vid=([a-z0-9]{20})(?:;|$)/);
        if (m) return m[1];
        var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        var bytes = new Uint8Array(20);
        crypto.getRandomValues(bytes);
        var v = '';
        for (var i = 0; i < 20; i++) v += chars[bytes[i] % 36];
        document.cookie = 'sonder_vid=' + v + '; Max-Age=34128000; Path=/; Domain=.yousonder.com; SameSite=Lax; Secure';
        return v;
      } catch (e) {
        return '';
      }
    }

    function timeZone() {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
    }

    function post(ping) {
      var q = new URLSearchParams(location.search);
      var data = {
        p: location.pathname,
        r: document.referrer || '',
        u: q.get('utm_source') || '',
        a: q.has('fbclid') ? 1 : 0,
        v: visitorId(),
        tz: timeZone()
      };
      if (ping) data.h = 1;
      var body = JSON.stringify(data);
      if (navigator.sendBeacon && navigator.sendBeacon(URL_, body)) return;
      fetch(URL_, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }).catch(function () {});
    }

    // Still-here pings: only while the page is visible, and for 30 minutes at most.
    function stopPings() {
      if (timer) clearInterval(timer);
      timer = null;
    }
    function startPings() {
      if (timer || Date.now() - started > PING_FOR_MS) return;
      timer = setInterval(function () {
        if (document.visibilityState !== 'visible' || Date.now() - started > PING_FOR_MS) return stopPings();
        post(true);
      }, PING_MS);
    }

    function onVisible() {
      if (document.visibilityState !== 'visible') return stopPings();
      if (!sent) {
        sent = true;
        started = Date.now();
        post(false);
      } else if (Date.now() - started <= PING_FOR_MS) {
        post(true);
      }
      startPings();
    }

    if (document.visibilityState === 'visible') onVisible();
    document.addEventListener('visibilitychange', onVisible);
  } catch (e) {}
})();
