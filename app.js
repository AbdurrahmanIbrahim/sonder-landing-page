/* =====================================================
   Sonder — landing page motion engine
   ===================================================== */

// -------- Hours saved trust badge --------
// Shows live video count × 4 hours saved.
// Falls back to hardcoded numbers if the API isn't available.
// TO MAKE LIVE: Mike needs to add GET /api/public/video-count to sonder-server.
(function () {
  var HOURS_PER_VIDEO = 4;
  var FALLBACK_VIDEOS = 1012;

  function animateCount(el, target, duration) {
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString() + '+';
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function updateHoursBadge(videoCount) {
    var hoursSaved = Math.floor(Math.floor(videoCount * HOURS_PER_VIDEO) / 100) * 100;
    var videosBase = Math.floor(videoCount / 100) * 100;
    var hoursEl = document.getElementById('hours-saved-num');
    var videosEl = document.getElementById('videos-made-num');
    if (hoursEl) animateCount(hoursEl, hoursSaved, 1800);
    if (videosEl) animateCount(videosEl, videosBase, 1800);
  }

  // Try to fetch live count; fall back silently.
  fetch('https://sonder-server-production.up.railway.app/api/public/video-count')
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (d) { if (d && d.count) updateHoursBadge(d.count); })
    .catch(function () { updateHoursBadge(FALLBACK_VIDEOS); });
})();

(function () {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // -------- Nav scroll state --------
  const nav = document.querySelector('[data-nav]');
  if (nav) {
    const updateNav = () => {
      if (window.scrollY > 24) nav.classList.add('is-scrolled');
      else nav.classList.remove('is-scrolled');
    };
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  // -------- Hero --------
  // The hero is now a pure-CSS "wall of proof": a marquee of real Sonder
  // videos drifting behind the claim. No canvas, no frame sequence, no scroll
  // listener. The engagement badges reuse the [data-counter] machinery below.

  // -------- Stats count-up --------
  const counters = document.querySelectorAll('[data-counter]');
  const startedCounters = new WeakSet();

  const animateCounter = (el) => {
    if (startedCounters.has(el)) return;
    startedCounters.add(el);

    const target = parseFloat(el.dataset.target || '0');
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals || '0', 10);

    if (prefersReduced) {
      el.textContent = target.toFixed(decimals) + suffix;
      return;
    }

    if (hasGSAP) {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; },
        onComplete: () => { el.textContent = target.toFixed(decimals) + suffix; }
      });
    } else {
      el.textContent = target.toFixed(decimals) + suffix;
    }
  };

  if (counters.length && 'IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    counters.forEach(c => obs.observe(c));
  } else {
    counters.forEach(animateCounter);
  }

  // -------- Section reveals --------
  const revealTargets = document.querySelectorAll(
    '.section-head, .stats-grid, .stats-caption, .steps, .quotes, .receipts, ' +
    '.founder-grid, .pricing-head, .tiers, .extras, .trust-row, .pricing-close, ' +
    '.final-inner, .marquee, .showcase-rail, .adcarousel, .adfilm-note'
  );

  if ('IntersectionObserver' in window) {
    const stagger = ['.steps', '.quotes', '.receipts-grid', '.founder-grid', '.tiers', '.trust-row', '.stats-grid'];
    revealTargets.forEach(el => {
      const useStagger = stagger.some(sel => el.matches(sel));
      el.classList.add(useStagger ? 'reveal-stagger' : 'reveal');
    });
    // Also tag .receipts-grid for stagger explicitly (sits inside .receipts)
    document.querySelectorAll('.receipts-grid').forEach(el => {
      el.classList.add('reveal-stagger');
    });

    const revealObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    revealTargets.forEach(el => revealObs.observe(el));
    document.querySelectorAll('.receipts-grid').forEach(el => revealObs.observe(el));
  }

  // -------- Pricing monthly/annual toggle --------
  // One section-level toggle plus a compact toggle in each tier card. They all
  // drive a single billing cycle and stay in lockstep.
  const pricingToggles = document.querySelectorAll('[data-pricing-toggle]');
  const pricingSection = document.querySelector('#pricing');
  if (pricingToggles.length && pricingSection) {
    const setCycle = (cycle) => {
      pricingSection.setAttribute('data-cycle', cycle);
      pricingToggles.forEach(group => {
        group.setAttribute('data-cycle', cycle);
        group.querySelectorAll('.pricing-toggle-btn').forEach(b => {
          const active = b.dataset.cycle === cycle;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-pressed', String(active));
        });
      });

      document.querySelectorAll('[data-price]').forEach(el => {
        const val = cycle === 'annual' ? el.dataset.annual : el.dataset.monthly;
        if (val !== undefined) el.textContent = val;
      });
    };

    pricingToggles.forEach(group => {
      group.querySelectorAll('.pricing-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => setCycle(btn.dataset.cycle));
      });
    });
  }

  // -------- Pricing tier carousel (4 visible, arrow reveals the 5th) --------
  const tierCarousel = document.querySelector('[data-tiers-carousel]');
  if (tierCarousel) {
    const track = tierCarousel.querySelector('[data-tiers-track]');
    const prevBtn = tierCarousel.querySelector('[data-tiers-prev]');
    const nextBtn = tierCarousel.querySelector('[data-tiers-next]');

    const cardStep = () => {
      const card = track.querySelector('.tier');
      if (!card) return track.clientWidth;
      const styles = getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || '16') || 16;
      return card.getBoundingClientRect().width + gap;
    };

    const update = () => {
      const overflow = track.scrollWidth - track.clientWidth;
      // Everything already fits (very wide viewport) → no arrows needed.
      if (overflow <= 4) {
        prevBtn.hidden = true;
        nextBtn.hidden = true;
        return;
      }
      const x = track.scrollLeft;
      prevBtn.hidden = false;
      nextBtn.hidden = false;
      prevBtn.disabled = x <= 2;              // start → can't go back
      nextBtn.disabled = x >= overflow - 2;   // end → can't go further
    };

    prevBtn.addEventListener('click', () => track.scrollBy({ left: -cardStep(), behavior: 'smooth' }));
    nextBtn.addEventListener('click', () => track.scrollBy({ left: cardStep(), behavior: 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // -------- Lightbox for showcase reels --------
  const lightbox = document.querySelector('[data-lightbox]');
  const lightboxInner = document.querySelector('[data-lightbox-inner]');
  const lightboxClose = document.querySelector('[data-lightbox-close]');
  const lightboxMeta = document.querySelector('[data-lightbox-meta]');

  const clearLightboxPlayer = () => {
    if (!lightboxInner) return;
    const players = lightboxInner.querySelectorAll('wistia-player, video, iframe, .lightbox-placeholder');
    players.forEach(p => p.remove());
    // The "View on TikTok" fallback hangs off the overlay, not the inner box.
    if (lightbox) lightbox.querySelectorAll('.lightbox-link').forEach(l => l.remove());
  };

  const openLightbox = (wistiaId, title, aspect, embedUrl, linkUrl) => {
    if (!lightbox || !lightboxInner) return;

    clearLightboxPlayer();
    if (lightboxMeta) lightboxMeta.textContent = title || '';

    const aspectNum = parseFloat(aspect) || 0.5625;
    const isLandscape = aspectNum > 1;
    lightboxInner.classList.toggle('is-landscape', isLandscape);
    // The slideshow example is a TikTok embed, which needs a taller box than a
    // reel. Toggled (not just added) so a Wistia card opened afterwards resets.
    lightboxInner.classList.toggle('is-tall', !!embedUrl);

    if (embedUrl) {
      const frame = document.createElement('iframe');
      frame.src = embedUrl;
      frame.title = title || 'Example';
      frame.setAttribute('allow', 'encrypted-media; clipboard-write; fullscreen');
      frame.setAttribute('allowfullscreen', '');
      lightboxInner.appendChild(frame);
      if (linkUrl) {
        const link = document.createElement('a');
        link.className = 'lightbox-link';
        link.href = linkUrl;
        link.target = '_blank';
        link.rel = 'noopener';
        link.innerHTML = 'View on TikTok <span aria-hidden="true">↗</span>';
        lightbox.appendChild(link);
      }
    } else if (wistiaId) {
      const player = document.createElement('wistia-player');
      player.setAttribute('media-id', wistiaId);
      player.setAttribute('aspect', String(aspectNum));
      player.setAttribute('player-color', '0A0613');
      // No autoplay on purpose: browsers (especially Safari) force autoplaying
      // video to be MUTED. Opening on the poster means the visitor's tap on the
      // play button counts as a direct gesture, so the example plays WITH sound.
      lightboxInner.appendChild(player);
    } else {
      const ph = document.createElement('div');
      ph.className = 'lightbox-placeholder';
      ph.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:14px;text-align:center;padding:32px;">' +
        '<span style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#7FFFD4;font-weight:600;">' + (title || 'Coming soon') + '</span>' +
        '<p style="color:#F5F5F7;font-size:17px;max-width:28ch;margin:0;line-height:1.45;">This reel is on the way. Final Sonder cut going live here soon.</p>' +
        '<p style="color:#8B8FA3;font-size:13px;margin:0;">Drop a Wistia media-id on this tile to swap it in.</p>' +
        '</div>';
      lightboxInner.appendChild(ph);
    }

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lightbox.classList.add('is-open'));
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    lightbox.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => {
      lightbox.hidden = true;
      clearLightboxPlayer();
    }, prefersReduced ? 0 : 600);
  };

  document.querySelectorAll('[data-reel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wistiaId = btn.dataset.wistiaId || '';
      const title = btn.dataset.reelTitle || '';
      const aspect = btn.dataset.reelAspect || '';
      const embedUrl = btn.dataset.embedUrl || '';
      const linkUrl = btn.dataset.reelLink || '';
      openLightbox(wistiaId, title, aspect, embedUrl, linkUrl);
    });
  });

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox && !lightbox.hidden) closeLightbox();
  });

  // -------- Amazon Ads Z-space carousel --------
  // The active card sits forward; neighbours recede left/right. Clicking a
  // side card brings it to the front (capture phase, so it beats the card's
  // own data-reel lightbox listener); clicking the front card plays it.
  const adCar = document.querySelector('[data-adcarousel]');
  if (adCar) {
    const cards = Array.from(adCar.querySelectorAll('[data-adcar-card]'));
    const n = cards.length;
    let adIdx = 0;

    const renderAdCar = () => {
      cards.forEach((card, i) => {
        const off = (i - adIdx + n) % n;
        card.classList.toggle('is-active', off === 0);
        card.classList.toggle('is-next', off === 1);
        card.classList.toggle('is-prev', off === n - 1);
        card.classList.toggle('is-hidden', off !== 0 && off !== 1 && off !== n - 1);
        card.tabIndex = off === 0 ? 0 : -1;
      });
    };
    renderAdCar();

    const stepAdCar = (d) => {
      adIdx = (adIdx + d + n) % n;
      renderAdCar();
    };
    const adPrev = adCar.querySelector('[data-adcar-prev]');
    const adNext = adCar.querySelector('[data-adcar-next]');
    if (adPrev) adPrev.addEventListener('click', () => stepAdCar(-1));
    if (adNext) adNext.addEventListener('click', () => stepAdCar(1));

    adCar.addEventListener('click', (e) => {
      const card = e.target.closest('[data-adcar-card]');
      if (!card || card.classList.contains('is-active')) return; // front card → lightbox
      e.stopPropagation();
      e.preventDefault();
      adIdx = cards.indexOf(card);
      renderAdCar();
    }, true);

    adCar.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepAdCar(-1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); stepAdCar(1); }
    });
  }

  // -------- Exit-intent modal --------
  // Safety-net restatement of the free-video offer for leavers. One direct
  // claim link (signup?offer=freevideo grants the trial at account creation) —
  // no email capture: the offer is already all over the page, so the shortest
  // path wins.
  const exitModal = document.querySelector('[data-exit-modal]');
  const exitClose = document.querySelector('[data-exit-close]');

  if (exitModal) {
    const STORAGE_KEY = 'sonder-exit-modal-shown';
    const ARM_DELAY_MS = 8000;
    const MOBILE_SCROLL_UP_THRESHOLD = 320;
    const MOBILE_MAX_SCROLL_NEEDED = 800;

    let armed = false;
    let fired = false;
    setTimeout(() => { armed = true; }, ARM_DELAY_MS);

    const alreadyShown = () => {
      try { return !!sessionStorage.getItem(STORAGE_KEY); }
      catch (_) { return false; }
    };
    const markShown = () => {
      try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (_) {}
    };

    const openExit = () => {
      if (fired || !armed || alreadyShown()) return;
      fired = true;
      markShown();
      exitModal.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => exitModal.classList.add('is-open'));
      // Focus the claim CTA for keyboard users
      setTimeout(() => {
        const claim = exitModal.querySelector('[data-exit-claim]');
        if (claim) claim.focus();
      }, 400);
    };

    const closeExit = () => {
      exitModal.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => { exitModal.hidden = true; }, prefersReduced ? 0 : 600);
    };

    // Desktop: mouse leaves the viewport from the top → exit intent
    document.addEventListener('mouseleave', (e) => {
      // e.clientY <= 0 means the cursor exited via the top edge
      if (e.clientY > 0) return;
      if (e.relatedTarget || e.toElement) return; // moved to another element
      openExit();
    });

    // Mobile fallback: scrolled down significantly then scrolled up fast
    let maxScroll = 0;
    if ('ontouchstart' in window) {
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y > maxScroll) maxScroll = y;
        if (maxScroll > MOBILE_MAX_SCROLL_NEEDED && y < maxScroll - MOBILE_SCROLL_UP_THRESHOLD) {
          openExit();
        }
      }, { passive: true });
    }

    // Close handlers
    if (exitClose) exitClose.addEventListener('click', closeExit);
    exitModal.addEventListener('click', (e) => {
      if (e.target === exitModal) closeExit();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !exitModal.hidden) closeExit();
    });
  }

  // -------- Smooth scroll for anchor links (respect reduced motion) --------
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({
        top,
        behavior: prefersReduced ? 'auto' : 'smooth'
      });
    });
  });

  // -------- Re-evaluate ScrollTrigger on resize --------
  if (hasGSAP) {
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => ScrollTrigger.refresh(), 200);
    });
  }

  // -------- FAQ accordion --------
  document.querySelectorAll('.faq-q').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      var answerId = btn.getAttribute('aria-controls');
      var answer = document.getElementById(answerId);
      if (expanded) {
        btn.setAttribute('aria-expanded', 'false');
        answer.hidden = true;
      } else {
        btn.setAttribute('aria-expanded', 'true');
        answer.hidden = false;
      }
    });
  });
})();
