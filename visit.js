/* Visit counter — tells sonder-server one page view happened, so the admin
   dashboard can show daily unique visitors (sonder-server routes/siteVisit.ts).

   No cookies, no localStorage, nothing stored on the device. The server turns
   IP + browser into a one-way code that changes every day and keeps no IP.

   Sends only once the page is actually on screen: Meta's in-app browser
   preloads ad pages in the background, and those were never seen by anyone.
   Never throws, never blocks the page, never retries. */
(function () {
  try {
    if (navigator.webdriver) return;
    var URL_ = 'https://sonder-server-production.up.railway.app/api/public/visit';
    var sent = false;
    function send() {
      if (sent) return;
      sent = true;
      var q = new URLSearchParams(location.search);
      var body = JSON.stringify({
        p: location.pathname,
        r: document.referrer || '',
        u: q.get('utm_source') || '',
        a: q.has('fbclid') ? 1 : 0
      });
      if (navigator.sendBeacon && navigator.sendBeacon(URL_, body)) return;
      fetch(URL_, { method: 'POST', body: body, keepalive: true, mode: 'no-cors' }).catch(function () {});
    }
    if (document.visibilityState === 'visible') send();
    else document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') send();
    });
  } catch (e) {}
})();
