/* /masterclass funnel — the bits the three pages share.

   1. The challenge schedule. Every live challenge runs Monday to Wednesday at
      12pm New York time, every other week from 23 Nov 2026. Anyone can buy
      until Day 1 starts and joins that one (Abdul, 1 Nov 2026). The SERVER owns
      the real list (GET /api/public/masterclass/config, which also knows any
      dropped dates); the rule below is only the fallback while that loads.
   3. The server: checkout, the buyer's order, the one-click challenge and the
      Skool invite all go through sonder-server (routes/masterclass.ts). The
      buy buttons open our own checkout page (/masterclass/checkout) unless the
      server's config says to use Stripe's hosted one.
   2. Attribution. The course page stores the ad and affiliate tags it was
      opened with; the trial link on /masterclass/start sends them on to the
      app, so a trial is credited to the ad that paid for the visit. Session
      storage survives the round trip through the checkout in the same tab.

   Never throws: every page works without it. */
(function () {
  "use strict";
  var FIRST = '2026-11-23';
  var CADENCE_DAYS = 14;
  /* Set from the server's config once it arrives: its cohorts are the truth. */
  var serverCohorts = null;
  var API = 'https://sonder-server-production.up.railway.app/api/public/masterclass';
  var SESSION_MIN = 90;
  var CARRY = ['fbclid','utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','ttclid','via','dub_id'];
  var TAGS_KEY = 'sonder.mc.tags';

  /* New York wall-clock time -> a real instant, daylight saving included
     (the same method as /live and /live/youre-in). */
  function nyParts(d) {
    var p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour12: false, year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  function nyOffset(d) { var p = nyParts(d); return Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second) - d.getTime(); }
  function fromNY(y, m, d, h, mi) { var t = Date.UTC(y, m - 1, d, h, mi); for (var i = 0; i < 2; i++) { t = Date.UTC(y, m - 1, d, h, mi) - nyOffset(new Date(t)); } return new Date(t); }

  /* The three sessions of the challenge starting on `iso` (a Monday). */
  function sessions(iso) {
    var p = iso.split('-').map(Number);
    return [0, 1, 2].map(function (n) { return fromNY(p[0], p[1], p[2] + n, 12, 0); });
  }
  function addDays(iso, n) {
    var p = iso.split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)).toISOString().slice(0, 10);
  }
  /* The first challenge whose Day 1 has not started at `now`. */
  function nextChallenge(now) {
    now = now || new Date();
    var list = serverCohorts;
    if (list && list.length) {
      for (var j = 0; j < list.length; j++) if (sessions(list[j])[0].getTime() > now.getTime()) return list[j];
    }
    var iso = FIRST;
    for (var i = 0; i < 400; i++) {
      if (sessions(iso)[0].getTime() > now.getTime()) return iso;
      iso = addDays(iso, CADENCE_DAYS);
    }
    return null;
  }
  function isChallenge(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return false;
    var diff = (Date.parse(iso + 'T00:00:00Z') - Date.parse(FIRST + 'T00:00:00Z')) / 86400000;
    return diff >= 0 && diff % CADENCE_DAYS === 0;
  }

  function fmt(d, opts, tz) {
    try { return new Intl.DateTimeFormat('en-US', Object.assign({ timeZone: tz || 'America/New_York' }, opts)).format(d); }
    catch (e) { return ''; }
  }
  /* "5pm" style clock in a zone. */
  function clock(d, tz) {
    try {
      var p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
      return p.hour + (p.minute && p.minute !== '00' ? ':' + p.minute : '') + String(p.dayPeriod || '').toLowerCase();
    } catch (e) { return ''; }
  }
  /* "That's 5pm where you are", or '' when they are on New York or LA time anyway. */
  function localLine(d) {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      var here = tz ? clock(d, tz) : '';
      if (!here || here === clock(d, 'America/New_York') || here === clock(d, 'America/Los_Angeles')) return '';
      return 'That’s ' + here + ' where you are.';
    } catch (e) { return ''; }
  }

  function stamp(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
  /* Google Calendar: one event repeating daily for the three days. */
  function googleCal(iso, title, details) {
    var s = sessions(iso)[0];
    var e = new Date(s.getTime() + SESSION_MIN * 60000);
    var q = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: stamp(s) + '/' + stamp(e),
      details: details, location: 'Zoom', recur: 'RRULE:FREQ=DAILY;COUNT=3' });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  /* Apple / Outlook: the same event as an .ics file made in the browser. */
  function icsHref(iso, title, details) {
    var s = sessions(iso)[0];
    var e = new Date(s.getTime() + SESSION_MIN * 60000);
    var esc = function (t) { return String(t).replace(/[\\;,]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sonder//Masterclass//EN', 'BEGIN:VEVENT',
      'UID:mc-challenge-' + iso + '@yousonder.com', 'DTSTAMP:' + stamp(new Date()), 'DTSTART:' + stamp(s), 'DTEND:' + stamp(e),
      'RRULE:FREQ=DAILY;COUNT=3', 'SUMMARY:' + esc(title), 'DESCRIPTION:' + esc(details), 'LOCATION:Zoom', 'END:VEVENT', 'END:VCALENDAR'];
    return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(lines.join('\r\n'));
  }

  /* Attribution: keep the first set of tags this tab arrived with. */
  function saveTags() {
    try {
      var here = new URL(window.location.href), tags = {}, any = false;
      CARRY.forEach(function (k) { var v = here.searchParams.get(k); if (v) { tags[k] = v.slice(0, 200); any = true; } });
      if (any && !sessionStorage.getItem(TAGS_KEY)) sessionStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    } catch (e) { /* storage blocked: the page still works */ }
  }
  function readTags() {
    try { var t = JSON.parse(sessionStorage.getItem(TAGS_KEY) || 'null'); return t && typeof t === 'object' ? t : {}; }
    catch (e) { return {}; }
  }

  /* Review notes: add ?notes=1 to any of the three pages and each section
     shows why it is there (the research behind it). Buyers never load them. */
  function showNotes() {
    var on = false;
    try { on = new URL(window.location.href).searchParams.get('notes') === '1'; } catch (e) {}
    if (!on) return;
    var s = document.createElement('script');
    s.src = '/masterclass/notes.js';
    s.onload = function () {
      var notes = window.SonderMCNotes || {};
      Array.prototype.forEach.call(document.querySelectorAll('[data-note]'), function (el) {
        var text = notes[el.getAttribute('data-note')];
        if (!text) return;
        var n = document.createElement('aside');
        n.className = 'why';
        var b = document.createElement('b'); b.textContent = 'Why this is here';
        n.appendChild(b); n.appendChild(document.createTextNode(text));
        /* its own row above the section's content, so it never joins a grid */
        var row = document.createElement('div');
        row.className = 'wrap';
        row.appendChild(n);
        el.insertBefore(row, el.firstChild);
      });
    };
    document.head.appendChild(s);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showNotes); else showNotes();

  /* ----- The server ----- */

  function cookie(name) {
    try { var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; }
    catch (e) { return ''; }
  }
  /* Ads cookies allowed? consent.js decides (opt-in where the law asks for it,
     GPC and DNT everywhere); without it, the GPC/DNT rule alone. */
  function adConsent() {
    var c = window.sonderConsent;
    if (c && typeof c.allowed === 'function') return !!c.allowed();
    return !(navigator.globalPrivacyControl === true || navigator.doNotTrack === '1' || window.doNotTrack === '1');
  }
  /* The buyer's key: the Stripe checkout id Stripe sends them back with. */
  function sid() {
    try { var v = new URL(window.location.href).searchParams.get('s') || ''; return /^cs_(live|test)_[A-Za-z0-9]{10,200}$/.test(v) ? v : ''; }
    catch (e) { return ''; }
  }
  function call(method, path, body) {
    return fetch(API + path, {
      method: method,
      headers: body ? { 'content-type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { j.httpStatus = r.status; return j; });
    }).catch(function () { return { ok: false, error: 'network' }; });
  }
  var configP = null;
  /* Price, launch and the next cohorts. Null when the server can't be reached:
     every page then falls back to its own copy and the rule above. */
  function config() {
    if (!configP) {
      configP = call('GET', '/config').then(function (c) {
        if (c && c.cohorts && c.cohorts.length) serverCohorts = c.cohorts.map(function (x) { return x.monday; });
        return c && c.course ? c : null;
      });
    }
    return configP;
  }
  /* Open the $47 checkout. Resolves { ok, url } (Stripe's page) or, from our
     own checkout page with extra = { ui: 'page', name, email },
     { ok, clientSecret }; or { ok: false, error }. */
  function checkout(extra) {
    var here = {};
    try {
      var u = new URL(window.location.href);
      CARRY.forEach(function (k) { var v = u.searchParams.get(k); if (v) here[k] = v.slice(0, 200); });
    } catch (e) {}
    var tags = Object.assign({}, readTags(), here);
    var ok = adConsent();
    return call('POST', '/checkout', Object.assign({
      tags: tags,
      vid: cookie('sonder_vid'),
      consent: ok,
      fbc: ok ? cookie('_fbc') : '',
      fbp: ok ? cookie('_fbp') : ''
    }, extra || {}));
  }
  function order(s) { return call('GET', '/order?s=' + encodeURIComponent(s)); }
  function acceptChallenge(s) { return call('POST', '/challenge', { s: s }); }
  function resendInvite(s, email) { return call('POST', '/skool-invite', email ? { s: s, email: email } : { s: s }); }

  window.SonderMC = {
    CARRY: CARRY, sessions: sessions, nextChallenge: nextChallenge, isChallenge: isChallenge,
    fmt: fmt, clock: clock, localLine: localLine, googleCal: googleCal, icsHref: icsHref,
    saveTags: saveTags, readTags: readTags,
    config: config, checkout: checkout, order: order, acceptChallenge: acceptChallenge, resendInvite: resendInvite,
    sid: sid, adConsent: adConsent
  };
})();
