/* ==========================================================================
   Saketh Reddy Manda - portfolio behaviour
   No dependencies. Every enhancement degrades to a readable static page.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- footer year */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ----------------------------------------------------------------- theme */
  /* The initial value is resolved by the inline script in <head>; this only
     handles switching, persistence, and the transition choreography. */
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var themeColorMeta = document.querySelector('meta[name="theme-color"]');
  var THEME_COLOR = { dark: '#050506', light: '#fbfbfc' };

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function setTheme(theme, persist) {
    root.setAttribute('data-theme', theme);
    toggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
    toggle.setAttribute('aria-label',
      theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    if (themeColorMeta) themeColorMeta.setAttribute('content', THEME_COLOR[theme]);
    if (persist) {
      try { localStorage.setItem('theme', theme); } catch (e) { /* private mode */ }
    }
  }

  setTheme(currentTheme(), false);

  function swapTheme() {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';

    if (reduceMotion) {
      setTheme(next, true);
      return;
    }

    /* Fallback: crossfade every themed surface. The class has to land and be
       flushed first, otherwise the before-change style carries no transition
       and the swap snaps instead of fading. */
    if (typeof document.startViewTransition !== 'function') {
      root.classList.add('theming');
      void root.offsetWidth;
      setTheme(next, true);
      window.setTimeout(function () { root.classList.remove('theming'); }, 540);
      return;
    }

    /* Preferred: circular wipe expanding out of the toggle itself. */
    var box = toggle.getBoundingClientRect();
    var x = box.left + box.width / 2;
    var y = box.top + box.height / 2;
    var reach = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    var vt = document.startViewTransition(function () { setTheme(next, true); });

    vt.ready.then(function () {
      root.animate(
        {
          clipPath: [
            'circle(0px at ' + x + 'px ' + y + 'px)',
            'circle(' + reach + 'px at ' + x + 'px ' + y + 'px)'
          ]
        },
        {
          duration: 640,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    })['catch'](function () { /* transition skipped; theme already applied */ });
  }

  toggle.addEventListener('click', swapTheme);

  /* Follow the OS only while the visitor has not made an explicit choice. */
  var systemLight = window.matchMedia('(prefers-color-scheme: light)');
  var onSystemChange = function (e) {
    var stored = null;
    try { stored = localStorage.getItem('theme'); } catch (err) { /* ignore */ }
    if (stored === 'light' || stored === 'dark') return;
    setTheme(e.matches ? 'light' : 'dark', false);
  };
  if (systemLight.addEventListener) systemLight.addEventListener('change', onSystemChange);
  else if (systemLight.addListener) systemLight.addListener(onSystemChange);

  /* --------------------------------------------------------- nav scroll state */
  var nav = document.getElementById('nav');
  var stuck = false;

  function onScroll() {
    var should = window.scrollY > 24;
    if (should !== stuck) {
      stuck = should;
      nav.classList.toggle('is-stuck', stuck);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------------------------------------------------- mobile menu */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
    if (open) {
      menu.hidden = false;
      // next frame so the transition has a start state to animate from
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
    } else {
      menu.classList.remove('is-open');
      window.setTimeout(function () {
        if (burger.getAttribute('aria-expanded') === 'false') menu.hidden = true;
      }, reduceMotion ? 0 : 320);
    }
  }

  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      burger.focus();
    }
  });

  /* -------------------------------------------------------- reveal on scroll */
  var revealables = document.querySelectorAll('[data-reveal]');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    revealables.forEach(function (el) { revealObserver.observe(el); });
  }

  /* ------------------------------------------------------- active nav link */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav__links a'));
  var watched = navLinks
    .map(function (link) { return document.querySelector(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && watched.length) {
    var visible = new Set();

    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visible.add(entry.target.id);
        else visible.delete(entry.target.id);
      });

      // highlight the topmost section currently on screen
      var current = null;
      for (var i = 0; i < watched.length; i++) {
        if (visible.has(watched[i].id)) { current = watched[i].id; break; }
      }
      navLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + current);
      });
    }, { rootMargin: '-45% 0px -45% 0px' });

    watched.forEach(function (section) { sectionObserver.observe(section); });
  }

  /* ------------------------------------------------------------------ rail */
  var rail = document.getElementById('rail');
  var prevBtn = document.getElementById('railPrev');
  var nextBtn = document.getElementById('railNext');

  function railStep() {
    var card = rail.querySelector('.card');
    if (!card) return rail.clientWidth * 0.8;
    var gap = parseFloat(getComputedStyle(rail).columnGap || '16') || 16;
    return card.getBoundingClientRect().width + gap;
  }

  function syncRailButtons() {
    var max = rail.scrollWidth - rail.clientWidth;
    prevBtn.disabled = rail.scrollLeft <= 2;
    nextBtn.disabled = rail.scrollLeft >= max - 2;
  }

  function nudge(dir) {
    rail.scrollBy({ left: dir * railStep(), behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  prevBtn.addEventListener('click', function () { nudge(-1); });
  nextBtn.addEventListener('click', function () { nudge(1); });
  rail.addEventListener('scroll', syncRailButtons, { passive: true });
  window.addEventListener('resize', syncRailButtons);
  syncRailButtons();

  /* drag-to-scroll for pointer devices; touch already scrolls natively */
  var dragging = false;
  var suppressClick = false;
  var startX = 0;
  var startScroll = 0;

  rail.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    dragging = true;
    suppressClick = false;
    startX = e.clientX;
    startScroll = rail.scrollLeft;
    rail.style.cursor = 'grabbing';
    rail.style.scrollSnapType = 'none';
  });

  rail.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 6) suppressClick = true;
    rail.scrollLeft = startScroll - dx;
  });

  function endDrag() {
    if (!dragging) return;
    dragging = false;
    rail.style.cursor = '';
    rail.style.scrollSnapType = '';
  }
  rail.addEventListener('pointerup', endDrag);
  rail.addEventListener('pointercancel', endDrag);
  rail.addEventListener('pointerleave', endDrag);

  /* ----------------------------------------------------------------- modal */
  var modal = document.getElementById('modal');
  var modalHero = document.getElementById('modalHero');
  var modalTitle = document.getElementById('modalTitle');
  var modalMeta = document.getElementById('modalMeta');
  var modalBody = document.getElementById('modalBody');
  var modalClose = document.getElementById('modalClose');
  var supportsDialog = typeof modal.showModal === 'function';

  function openProject(card) {
    var tpl = card.querySelector('template[data-detail]');
    var titleBtn = card.querySelector('.card__link');
    if (!tpl || !titleBtn) return;

    var frag = tpl.content.cloneNode(true);
    var meta = frag.querySelector('.detail__meta');
    var lede = frag.querySelector('.detail__lede');
    var body = frag.querySelector('[data-detail-body]');

    modalTitle.textContent = titleBtn.textContent.trim();
    modalMeta.replaceChildren();
    if (meta) modalMeta.appendChild(meta);
    if (lede) modalMeta.appendChild(lede);
    modalBody.replaceChildren();
    if (body) modalBody.appendChild(body);

    modalHero.style.setProperty('--tint', getComputedStyle(card).getPropertyValue('--tint'));

    modal.showModal();
    modal.querySelector('.modal__scroll').scrollTop = 0;
    document.body.classList.add('is-locked');
  }

  function closeProject() {
    if (reduceMotion) {
      modal.close();
      return;
    }
    modal.classList.add('is-closing');
    modal.addEventListener('animationend', function handler() {
      modal.removeEventListener('animationend', handler);
      modal.classList.remove('is-closing');
      modal.close();
    });
  }

  document.querySelectorAll('.card').forEach(function (card) {
    var link = card.querySelector('.card__link');
    if (!link) return;
    link.addEventListener('click', function (e) {
      if (suppressClick) { e.preventDefault(); return; }
      if (!supportsDialog) return; // leave the card as inert text rather than half-working
      openProject(card);
    });
  });

  modalClose.addEventListener('click', closeProject);

  // Esc: run the close animation instead of the instant native dismiss
  modal.addEventListener('cancel', function (e) {
    e.preventDefault();
    closeProject();
  });

  // click on the backdrop (the dialog element itself, outside its content box)
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeProject();
  });

  modal.addEventListener('close', function () {
    document.body.classList.remove('is-locked');
  });
})();
