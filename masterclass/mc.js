/* /masterclass funnel — the bits the three pages share.

   1. The challenge schedule. Every live challenge runs Monday to Wednesday at
      12pm New York time. A buyer joins the first one that starts at least
      LEAD_HOURS after they buy, so nobody pays on a Sunday night for a Monday
      they can't prepare for. /masterclass/challenge and /masterclass/start both
      read this list, and the confirmation emails must use the same rule.
   2. Attribution. The course page stores the ad and affiliate tags it was
      opened with; the trial link on /masterclass/start sends them on to the
      app, so a trial is credited to the ad that paid for the visit. Session
      storage survives the round trip through the checkout in the same tab.

   Never throws: every page works without it. */
(function () {
  "use strict";
  var CHALLENGES = ['2026-11-02', '2026-11-16', '2026-11-30', '2026-12-14', '2027-01-04', '2027-01-18'];
  var LEAD_HOURS = 36;
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
  function nextChallenge(now) {
    now = now || new Date();
    for (var i = 0; i < CHALLENGES.length; i++) {
      if (sessions(CHALLENGES[i])[0].getTime() - now.getTime() >= LEAD_HOURS * 3600000) return CHALLENGES[i];
    }
    return null;
  }
  function isChallenge(iso) { return CHALLENGES.indexOf(iso) !== -1; }

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

  window.SonderMC = {
    CARRY: CARRY, sessions: sessions, nextChallenge: nextChallenge, isChallenge: isChallenge,
    fmt: fmt, clock: clock, localLine: localLine, googleCal: googleCal, icsHref: icsHref,
    saveTags: saveTags, readTags: readTags
  };
})();
