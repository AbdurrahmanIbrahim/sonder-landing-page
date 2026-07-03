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

  function updateHoursBadge(videoCount) {
    var hoursSaved = Math.floor(videoCount * HOURS_PER_VIDEO);
    var hoursFormatted = hoursSaved >= 1000
      ? (Math.floor(hoursSaved / 100) * 100).toLocaleString() + '+'
      : hoursSaved + '+';
    var videosFormatted = videoCount >= 1000
      ? (Math.floor(videoCount / 100) * 100).toLocaleString() + '+'
      : videoCount + '+';

    var hoursEl = document.getElementById('hours-saved-num');
    var videosEl = document.getElementById('videos-made-num');
    if (hoursEl) hoursEl.textContent = hoursFormatted;
    if (videosEl) videosEl.textContent = videosFormatted;
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

  // -------- Hero — scroll-driven canvas video --------
  const heroSection = document.querySelector('[data-hero]');
  const canvas = document.querySelector('[data-hero-canvas]');

  if (heroSection && canvas) {
    const ctx = canvas.getContext('2d', { alpha: false });
    const FRAME_COUNT = 168;
    const framePath = (i) => `assets/frames/hero/frame_${String(i).padStart(3, '0')}.jpg`;

    const frames = new Array(FRAME_COUNT);
    let loadedCount = 0;
    let highestLoaded = -1;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(rect.width, window.innerWidth);
      const h = Math.max(rect.height, window.innerHeight);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    const drawFrame = (idx) => {
      // Prefer the requested frame; if not yet loaded, fall back to the
      // highest-loaded frame that's <= idx so the playback never freezes.
      let img = frames[idx];
      if (!img || !img.complete || img.naturalWidth === 0) {
        for (let i = idx; i >= 0; i--) {
          const f = frames[i];
          if (f && f.complete && f.naturalWidth > 0) { img = f; break; }
        }
      }
      if (!img || !img.complete || img.naturalWidth === 0) return;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      // object-fit: cover — scale to fill, crop overflow
      const scale = Math.max(cw / iw, ch / ih);
      const w = iw * scale;
      const h = ih * scale;
      const x = (cw - w) / 2;
      const y = (ch - h) / 2;

      ctx.fillStyle = '#0A0613';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, x, y, w, h);
    };

    let currentFrame = 0;
    const renderCurrent = () => drawFrame(currentFrame);

    // Preload all frames in parallel. Browsers throttle to ~6-8 connections,
    // so this fills the pipeline efficiently.
    const preload = () => {
      for (let i = 0; i < FRAME_COUNT; i++) {
        const img = new Image();
        img.decoding = 'async';
        img.src = framePath(i + 1);
        img.onload = () => {
          loadedCount++;
          if (i > highestLoaded) highestLoaded = i;
          // First frame: paint immediately so the hero isn't blank
          if (i === 0) renderCurrent();
          // If a later frame the user is currently looking at finally loads, redraw
          if (i === currentFrame) renderCurrent();
        };
        frames[i] = img;
      }
    };

    sizeCanvas();
    preload();

    // Scroll driver. We use a raw scroll listener (lighter than ScrollTrigger for this)
    // and let ScrollTrigger handle non-hero animations.
    let pending = false;
    const updateScroll = () => {
      pending = false;
      const rect = heroSection.getBoundingClientRect();
      const total = heroSection.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const p = total > 0 ? scrolled / total : 0;
      const target = Math.min(FRAME_COUNT - 1, Math.max(0, Math.round(p * (FRAME_COUNT - 1))));
      if (target !== currentFrame) {
        currentFrame = target;
        renderCurrent();
      }
    };
    const onScroll = () => {
      if (!pending) {
        pending = true;
        requestAnimationFrame(updateScroll);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Resize: refit canvas, redraw current frame
    let resizeTO;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        sizeCanvas();
        renderCurrent();
        if (hasGSAP) ScrollTrigger.refresh();
      }, 200);
    });

    // Reduced motion: just show frame 0 (and skip the scroll-driven sequence)
    if (prefersReduced) {
      window.removeEventListener('scroll', onScroll);
      // Best effort: render whatever's loaded
      const first = new Image();
      first.onload = () => {
        sizeCanvas();
        const cw = canvas.width, ch = canvas.height;
        const iw = first.naturalWidth, ih = first.naturalHeight;
        const scale = Math.max(cw / iw, ch / ih);
        const w = iw * scale, h = ih * scale;
        ctx.fillStyle = '#0A0613';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(first, (cw - w) / 2, (ch - h) / 2, w, h);
      };
      first.src = framePath(1);
    }
  }

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
    '.final-inner, .marquee, .showcase-rail, .adfilm-frame, .adfilm-note'
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
  };

  const openLightbox = (wistiaId, title, aspect) => {
    if (!lightbox || !lightboxInner) return;

    clearLightboxPlayer();
    if (lightboxMeta) lightboxMeta.textContent = title || '';

    const aspectNum = parseFloat(aspect) || 0.5625;
    const isLandscape = aspectNum > 1;
    lightboxInner.classList.toggle('is-landscape', isLandscape);

    if (wistiaId) {
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
      openLightbox(wistiaId, title, aspect);
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
})();
