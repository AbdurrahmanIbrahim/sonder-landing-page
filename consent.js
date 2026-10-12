/* Cookie consent — yousonder.com.

   LOAD IT FIRST, synchronously, in <head>, before the Meta Pixel snippet.

   Where the law asks for opt-in (EU, EEA, UK, Switzerland — judged by the
   device's time zone, so there is no lookup and no delay), nothing optional
   runs until the visitor presses Accept:
     - Meta Pixel: this file defines Meta's own queue stub first, so the page's
       standard snippet sees `fbq` already exists and does NOT load Meta's
       script. Calls queue up in memory. On Accept the script is loaded and
       Meta replays the queue; on Reject it is never loaded at all.
     - Dub referral tag: written as type="text/plain" data-consent="dub" and
       turned into a real script only on Accept.
     - Our monthly-visitor cookie (visit.js asks sonderConsent.allowed()).
   The cookieless daily count is not optional storage and always runs.

   Everywhere else everything runs as before, except that Global Privacy
   Control / Do Not Track switch the optional parts off.

   The choice lives in one essential cookie, sonder_consent, on .yousonder.com,
   so the app (app.yousonder.com) honours the same answer. Every banner shown
   and every choice is reported to sonder-server (no identifiers) for the
   admin dashboard. Never throws. */
(function () {
  var API = 'https://sonder-server-production.up.railway.app/api/public/consent';
  var COOKIE = 'sonder_consent';
  var PIXEL_SRC = 'https://connect.facebook.net/en_US/fbevents.js';
  var grantFns = [];

  function readChoice() {
    try {
      var m = document.cookie.match(/(?:^|; )sonder_consent=(all|essential)(?:;|$)/);
      return m ? m[1] : null;
    } catch (e) {
      return null;
    }
  }

  function writeChoice(v) {
    try {
      var host = location.hostname;
      var domain = /(^|\.)yousonder\.com$/.test(host) ? '; Domain=.yousonder.com' : '';
      document.cookie = COOKIE + '=' + v + '; Max-Age=31536000; Path=/' + domain + '; SameSite=Lax; Secure';
    } catch (e) {}
  }

  function optedOut() {
    try {
      return navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1';
    } catch (e) {
      return false;
    }
  }

  /* EU + EEA + UK + Switzerland, by IANA zone. Unknown zone = ask (fail safe). */
  var NON_EUROPE_ZONES_IN_EUROPE = {
    'Atlantic/Canary': 1, 'Atlantic/Madeira': 1, 'Atlantic/Azores': 1, 'Atlantic/Reykjavik': 1,
    'Atlantic/Faroe': 1, 'Asia/Nicosia': 1, 'Asia/Famagusta': 1, 'Africa/Ceuta': 1,
    'Arctic/Longyearbyen': 1, 'Indian/Reunion': 1, 'Indian/Mayotte': 1, 'America/Guadeloupe': 1,
    'America/Martinique': 1, 'America/Cayenne': 1
  };
  /* Europe/* zones outside the EU/EEA/UK/CH rules. */
  var EUROPE_ZONES_OUTSIDE = {
    'Europe/Moscow': 1, 'Europe/Kaliningrad': 1, 'Europe/Samara': 1, 'Europe/Volgograd': 1,
    'Europe/Saratov': 1, 'Europe/Ulyanovsk': 1, 'Europe/Astrakhan': 1, 'Europe/Kirov': 1,
    'Europe/Minsk': 1, 'Europe/Istanbul': 1
  };
  function consentRequired() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (!tz) return true;
      if (NON_EUROPE_ZONES_IN_EUROPE[tz]) return true;
      return tz.indexOf('Europe/') === 0 && !EUROPE_ZONES_OUTSIDE[tz];
    } catch (e) {
      return true;
    }
  }

  var required = consentRequired();
  var choice = readChoice();

  function allowed() {
    if (optedOut()) return false;
    if (choice) return choice === 'all';
    return !required;
  }

  function report(event) {
    try {
      var q = new URLSearchParams(location.search);
      var body = JSON.stringify({ e: event, p: location.pathname, a: q.has('fbclid') ? 1 : 0, r: required ? 1 : 0 });
      if (navigator.sendBeacon && navigator.sendBeacon(API, body)) return;
      fetch(API, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }).catch(function () {});
    } catch (e) {}
  }

  /* ---- Meta Pixel: stub now, script only when allowed --------------------- */
  (function (f) {
    if (f.fbq) return;
    var n = (f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
  })(window);

  var pixelLoaded = false;
  function loadPixel() {
    if (pixelLoaded) return;
    pixelLoaded = true;
    var t = document.createElement('script');
    t.async = true;
    t.src = PIXEL_SRC;
    (document.head || document.documentElement).appendChild(t);
  }

  /* ---- Dub: inert tags become real scripts -------------------------------- */
  function activateDeferred() {
    var tags = document.querySelectorAll('script[type="text/plain"][data-consent]');
    for (var i = 0; i < tags.length; i++) {
      var old = tags[i];
      if (old.getAttribute('data-consent-done')) continue;
      old.setAttribute('data-consent-done', '1');
      var s = document.createElement('script');
      for (var j = 0; j < old.attributes.length; j++) {
        var a = old.attributes[j];
        if (a.name !== 'type' && a.name !== 'data-consent' && a.name !== 'data-consent-done') s.setAttribute(a.name, a.value);
      }
      s.text = old.text;
      old.parentNode.insertBefore(s, old.nextSibling);
    }
  }

  function grant() {
    loadPixel();
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', activateDeferred);
    else activateDeferred();
    var fns = grantFns;
    grantFns = [];
    for (var i = 0; i < fns.length; i++) {
      try { fns[i](); } catch (e) {}
    }
  }

  /* ---- Banner -------------------------------------------------------------- */
  var bannerEl = null;
  function hideBanner() {
    if (bannerEl && bannerEl.parentNode) bannerEl.parentNode.removeChild(bannerEl);
    bannerEl = null;
  }

  /* On Reject, clear what an earlier Accept (or another page) may have set. */
  function clearOptional() {
    var names = ['_fbp', '_fbc', 'sonder_vid', 'dub_id', 'dub_partner_data'];
    for (var i = 0; i < names.length; i++) {
      try {
        document.cookie = names[i] + '=; Max-Age=0; Path=/; Domain=.yousonder.com';
        document.cookie = names[i] + '=; Max-Age=0; Path=/';
      } catch (e) {}
    }
  }

  function decide(v) {
    choice = v;
    writeChoice(v);
    if (v === 'essential') clearOptional();
    hideBanner();
    report(v === 'all' ? 'accept' : 'reject');
    if (v === 'all' && !optedOut()) grant();
  }

  function showBanner(reason) {
    if (bannerEl) return;
    var css =
      '#sonder-consent{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;max-width:640px;margin:0 auto;' +
      'background:#140C21;color:#F5F5F7;border:1px solid rgba(245,245,247,.14);border-radius:16px;padding:16px 18px;' +
      'box-shadow:0 12px 40px rgba(0,0,0,.45);font:14px/1.5 Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '#sonder-consent p{margin:0 0 12px}#sonder-consent a{color:#7FFFD4}' +
      '#sonder-consent .sc-row{display:flex;gap:10px;flex-wrap:wrap}' +
      '#sonder-consent button{flex:1 1 140px;min-height:44px;border-radius:999px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;' +
      'border:1px solid rgba(245,245,247,.35);background:transparent;color:#F5F5F7}' +
      '#sonder-consent button.sc-yes{background:#7FFFD4;border-color:#7FFFD4;color:#0A0613}' +
      '#sonder-consent button:focus-visible{outline:2px solid #7FFFD4;outline-offset:2px}';
    var style = document.createElement('style');
    style.textContent = css;
    var el = document.createElement('div');
    el.id = 'sonder-consent';
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', 'Cookie choices');
    el.innerHTML =
      '<p>We use cookies to count visitors and to measure our adverts on Facebook and Instagram. ' +
      'Accept to allow them, or reject to keep only the ones the site needs to work. ' +
      '<a href="/privacy.html#cookies">Privacy policy</a></p>' +
      '<div class="sc-row"><button type="button" class="sc-no">Reject</button>' +
      '<button type="button" class="sc-yes">Accept</button></div>';
    el.appendChild(style);
    el.querySelector('.sc-no').addEventListener('click', function () { decide('essential'); });
    el.querySelector('.sc-yes').addEventListener('click', function () { decide('all'); });
    bannerEl = el;
    function mount() {
      if (bannerEl && !bannerEl.parentNode) document.body.appendChild(bannerEl);
    }
    if (document.body) mount();
    else document.addEventListener('DOMContentLoaded', mount);
    if (reason !== 'reopen') report('shown');
  }

  /* "Cookie settings" next to every Privacy link, where a choice is asked for. */
  function addSettingsLinks() {
    if (!required) return;
    var links = document.querySelectorAll('a[href*="privacy"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      if (a.getAttribute('data-sc') || (a.closest && a.closest('#sonder-consent'))) continue;
      a.setAttribute('data-sc', '1');
      var s = document.createElement('a');
      s.href = '#';
      s.textContent = 'Cookie settings';
      s.className = a.className;
      s.style.marginLeft = '0.75em';
      s.addEventListener('click', function (ev) {
        ev.preventDefault();
        showBanner('reopen');
      });
      a.parentNode.insertBefore(s, a.nextSibling);
    }
  }

  window.sonderConsent = {
    required: required,
    choice: function () { return choice; },
    allowed: allowed,
    /** Run fn once optional cookies are allowed (now, if they already are). */
    onGrant: function (fn) {
      if (allowed()) {
        try { fn(); } catch (e) {}
      } else grantFns.push(fn);
    },
    open: function () { showBanner('reopen'); }
  };

  if (allowed()) grant();
  else if (required && !choice && !optedOut()) showBanner('first');

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addSettingsLinks);
  else addSettingsLinks();
})();
