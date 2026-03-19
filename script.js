/* ========================================
   CONVERSION AUDIT — Minimal JS
   ======================================== */

// --- Nav scroll effect: frosted glass + hide-on-down / show-on-up ---
const nav = document.querySelector('.nav');
let lastScrollY = window.scrollY;
let ticking = false;

function handleNavScroll() {
  const currentScrollY = window.scrollY;

  // Frosted glass after 40px
  if (currentScrollY > 40) {
    nav.classList.add('nav--scrolled');
  } else {
    nav.classList.remove('nav--scrolled');
  }

  // Hide on scroll-down, reveal on scroll-up (ignore tiny jitter < 4px)
  const delta = currentScrollY - lastScrollY;
  if (Math.abs(delta) > 4) {
    if (delta > 0 && currentScrollY > 80) {
      nav.classList.add('nav--hidden');
    } else {
      nav.classList.remove('nav--hidden');
    }
    lastScrollY = currentScrollY;
  }

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(handleNavScroll);
    ticking = true;
  }
}, { passive: true });

// --- FAQ accordion (a11y: aria-expanded) ---
document.querySelectorAll('.faq-item__question').forEach(btn => {
  const item = btn.closest('.faq-item');
  const answerId = 'faq-answer-' + Array.from(document.querySelectorAll('.faq-item')).indexOf(item);
  const answerDiv = item.querySelector('.faq-item__answer');

  // Set ARIA ids
  answerDiv.id = answerId;
  btn.setAttribute('aria-controls', answerId);

  btn.addEventListener('click', () => {
    const isOpen = item.classList.contains('faq-item--open');

    // Close all
    document.querySelectorAll('.faq-item--open').forEach(openItem => {
      openItem.classList.remove('faq-item--open');
      openItem.querySelector('.faq-item__question').setAttribute('aria-expanded', 'false');
    });

    // Toggle current
    if (!isOpen) {
      item.classList.add('faq-item--open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// --- Scroll reveal (respects prefers-reduced-motion) ---
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReducedMotion) {
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));
} else {
  // Show everything immediately
  document.querySelectorAll('.reveal').forEach(el => {
    el.classList.add('reveal--visible');
  });
}

// --- Carousel: transform-based, centered, auto-play, looping ---
(function() {
  const slides = document.querySelectorAll('.carousel__slide');
  const dots = document.querySelectorAll('.carousel__dot');
  const track = document.querySelector('.carousel__track');
  const pauseBtn = document.querySelector('.carousel__pause');
  if (!slides.length || !track) return;

  const total = slides.length;
  let current = 0;
  let autoplayTimer = null;
  let isPlaying = true;
  const AUTOPLAY_DELAY = 5000;

  function goTo(index) {
    current = ((index % total) + total) % total;

    slides.forEach((slide, i) => {
      slide.classList.remove('carousel__slide--active');
      let offset = i - current;
      if (offset > Math.floor(total / 2)) offset -= total;
      if (offset < -Math.floor(total / 2)) offset += total;

      const slideWidth = slide.offsetWidth + 24;
      slide.style.transform = `translateX(${offset * slideWidth}px) scale(${offset === 0 ? 1 : 0.92})`;
      slide.style.opacity = offset === 0 ? '1' : '0.3';
      slide.style.pointerEvents = offset === 0 ? 'auto' : 'none';

      // a11y: hide non-active slides from screen readers
      slide.setAttribute('aria-hidden', offset !== 0 ? 'true' : 'false');
    });

    slides[current].classList.add('carousel__slide--active');

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('carousel__dot--active', i === current);
      dot.setAttribute('aria-selected', i === current ? 'true' : 'false');
    });

    // Announce to screen readers (update aria-live region)
    track.setAttribute('aria-live', isPlaying ? 'off' : 'polite');
  }

  function next() { goTo(current + 1); }

  function startAutoplay() {
    stopAutoplay();
    isPlaying = true;
    autoplayTimer = setInterval(next, AUTOPLAY_DELAY);
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-label', 'Pause carousel');
      pauseBtn.dataset.playing = 'true';
    }
    track.setAttribute('aria-live', 'off');
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
    autoplayTimer = null;
    isPlaying = false;
    if (pauseBtn) {
      pauseBtn.setAttribute('aria-label', 'Play carousel');
      pauseBtn.dataset.playing = 'false';
    }
    track.setAttribute('aria-live', 'polite');
  }

  // Click dots
  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      goTo(parseInt(dot.dataset.slide, 10));
      if (isPlaying) startAutoplay();
    });
  });

  // Pause button (WCAG 2.2.2)
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (isPlaying) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    });
  }

  // Pause on hover, resume on leave (only if was playing)
  track.addEventListener('mouseenter', () => {
    if (isPlaying) { clearInterval(autoplayTimer); autoplayTimer = null; }
  });
  track.addEventListener('mouseleave', () => {
    if (isPlaying && !autoplayTimer) startAutoplay();
  });

  // Keyboard: arrows to navigate
  document.querySelector('.carousel')?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { goTo(current + 1); if (isPlaying) startAutoplay(); }
    if (e.key === 'ArrowLeft') { goTo(current - 1); if (isPlaying) startAutoplay(); }
  });

  const prefersRM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  goTo(0);

  if (!prefersRM) {
    startAutoplay();
  } else {
    stopAutoplay();
  }
})();

// --- Timeline: scroll-based step switching ---
(function() {
  const steps = document.querySelectorAll('.timeline__step');
  const images = document.querySelectorAll('.timeline__image');
  if (!steps.length || !images.length) return;

  // Only run sticky behavior on desktop (>768px)
  const isDesktop = () => window.innerWidth > 768;

  const timelineObserver = new IntersectionObserver((entries) => {
    if (!isDesktop()) return;

    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const stepNum = entry.target.dataset.step;

        // Activate step text
        steps.forEach(s => s.classList.remove('timeline__step--active'));
        entry.target.classList.add('timeline__step--active');

        // Switch image
        images.forEach(img => img.classList.remove('timeline__image--active'));
        const targetImage = document.querySelector(`.timeline__image[data-step="${stepNum}"]`);
        if (targetImage) targetImage.classList.add('timeline__image--active');
      }
    });
  }, {
    threshold: 0.5,
    rootMargin: '-20% 0px -30% 0px'
  });

  steps.forEach(step => timelineObserver.observe(step));
})();
