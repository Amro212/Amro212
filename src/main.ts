import './style.css';
import { projects, type Project } from './projects';
import { inject } from '@vercel/analytics';

// Initialize Vercel Web Analytics
inject();

type RetroComputerScene = import('./scene').RetroComputerScene;

type AnimationModules = {
  gsap: typeof import('gsap').default;
  ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger;
  Lenis: typeof import('lenis').default;
};

let retroScene: RetroComputerScene | null = null;
let animationModulesPromise: Promise<AnimationModules> | null = null;
let sceneInitPromise: Promise<void> | null = null;
let terminalInitPromise: Promise<void> | null = null;
let smoothScrollInitialized = false;
let magneticElementsInitialized = false;
let prologueInitialized = false;
let toolkitInitialized = false;
let workInitialized = false;
let signalInitialized = false;

const prefersReducedMotion = (): boolean =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─────────────────────────────────────
// Module loading (unchanged)
// ─────────────────────────────────────

function loadAnimationModules(): Promise<AnimationModules> {
  if (!animationModulesPromise) {
    animationModulesPromise = Promise.all([
      import('gsap'),
      import('gsap/ScrollTrigger'),
      import('lenis'),
    ]).then(([gsapModule, scrollTriggerModule, lenisModule]) => {
      const modules: AnimationModules = {
        gsap: gsapModule.default,
        ScrollTrigger: scrollTriggerModule.ScrollTrigger,
        Lenis: lenisModule.default,
      };

      modules.gsap.registerPlugin(modules.ScrollTrigger);
      return modules;
    });
  }

  return animationModulesPromise;
}

// ─────────────────────────────────────
// Scene init (unchanged)
// ─────────────────────────────────────

function initScene(): Promise<void> {
  if (!sceneInitPromise) {
    sceneInitPromise = import('./scene')
      .then(({ RetroComputerScene }) => {
        try {
          retroScene = new RetroComputerScene('three-container');
        } catch (error) {
          console.warn('Three.js scene failed to initialize:', error);
        }
      })
      .then(() => undefined);
  }

  return sceneInitPromise;
}

// ─────────────────────────────────────
// Navigation (unchanged)
// ─────────────────────────────────────

function setMobileMenuOpen(
  open: boolean,
  hamburger: HTMLButtonElement,
  mobileMenu: HTMLElement,
  firstMenuLink: HTMLAnchorElement | null,
): void {
  hamburger.classList.toggle('active', open);
  mobileMenu.classList.toggle('active', open);
  hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
  document.documentElement.classList.toggle('mobile-menu-open', open);
  document.body.classList.toggle('mobile-menu-open', open);

  if (open && firstMenuLink && window.matchMedia('(pointer: fine)').matches) {
    firstMenuLink.focus();
  }
}

function initNavigation(): void {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = mobileMenu?.querySelectorAll<HTMLAnchorElement>('.mobile-menu__link');

  if (!hamburger || !mobileMenu || !(hamburger instanceof HTMLButtonElement)) return;

  const firstLink = menuLinks?.[0] ?? null;

  const closeMenu = () => setMobileMenuOpen(false, hamburger, mobileMenu, null);

  hamburger.addEventListener('click', () => {
    const willOpen = !mobileMenu.classList.contains('active');
    setMobileMenuOpen(willOpen, hamburger, mobileMenu, willOpen ? firstLink : null);
  });

  menuLinks?.forEach((link) => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (!mobileMenu.classList.contains('active')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      hamburger.focus();
      return;
    }

    if (event.key === 'Tab') {
      const focusables = Array.from(mobileMenu.querySelectorAll<HTMLElement>('a, button'));
      const elements = [hamburger, ...focusables];
      const first = elements[0];
      const last = elements[elements.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  });
}

// ─────────────────────────────────────
// Smooth scroll (unchanged)
// ─────────────────────────────────────

function shouldUseLenis(): boolean {
  return window.matchMedia('(pointer: fine) and (hover: hover)').matches;
}

function initSmoothScroll(modules: AnimationModules): void {
  if (smoothScrollInitialized) return;
  smoothScrollInitialized = true;

  if (shouldUseLenis()) {
    const lenis = new modules.Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
    });

    lenis.on('scroll', modules.ScrollTrigger.update);

    modules.gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });

    modules.gsap.ticker.lagSmoothing(0);
  }

  modules.ScrollTrigger.refresh();
}

// ─────────────────────────────────────
// Scroll handlers for Three.js scene (unchanged)
// ─────────────────────────────────────

function initScrollHandlers(): void {
  const threeContainer = document.getElementById('three-container');
  const blurOverlay = document.getElementById('three-blur-overlay');
  const aboutSection = document.getElementById('about');
  const projectsSection = document.getElementById('projects');
  const body = document.body;
  let pendingFrame = false;
  let lastBackground = '';
  let canvas: HTMLCanvasElement | null = null;

  const update = () => {
    pendingFrame = false;

    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    if (threeContainer && retroScene) {
      const containerTop = threeContainer.offsetTop;
      const containerHeight = threeContainer.offsetHeight;
      const scrollRange = Math.max(1, containerHeight - windowHeight);
      const progress = (scrollY - containerTop) / scrollRange;
      retroScene.setScrollProgress(progress);

      if (blurOverlay) {
        const blurStart = 0.65;
        const initialMaxBlur = 14;
        const finalMaxBlur = 30;
        const containerEnd = containerTop + containerHeight;
        const pastContainer = scrollY - (containerEnd - windowHeight);
        const overlayStyle = blurOverlay.style as CSSStyleDeclaration & { webkitBackdropFilter?: string };

        if (progress <= blurStart) {
          overlayStyle.backdropFilter = 'blur(0px)';
          overlayStyle.webkitBackdropFilter = 'blur(0px)';
          overlayStyle.opacity = '0';
        } else if (progress < 1) {
          const blurProgress = (progress - blurStart) / (1 - blurStart);
          const eased = blurProgress * blurProgress;
          const blurValue = eased * initialMaxBlur;
          const blurCss = `blur(${blurValue.toFixed(1)}px)`;
          overlayStyle.backdropFilter = blurCss;
          overlayStyle.webkitBackdropFilter = blurCss;
          overlayStyle.opacity = '1';
        } else {
          const aboutHeight = aboutSection ? aboutSection.offsetHeight : windowHeight;
          const aboutProgress = Math.min(1, pastContainer / aboutHeight);
          const blurValue = initialMaxBlur + (finalMaxBlur - initialMaxBlur) * aboutProgress;
          const blurCss = `blur(${blurValue.toFixed(1)}px)`;
          overlayStyle.backdropFilter = blurCss;
          overlayStyle.webkitBackdropFilter = blurCss;
          overlayStyle.opacity = '1';
        }

        if (!canvas || !canvas.isConnected) {
          canvas = threeContainer.querySelector('canvas') as HTMLCanvasElement | null;
        }

        if (canvas && projectsSection) {
          const projectsTop = projectsSection.offsetTop;
          const fadeStart = projectsTop - windowHeight * 1.5;
          const fadeEnd = projectsTop - windowHeight * 0.5;

          if (scrollY <= fadeStart) {
            canvas.style.opacity = '1';
          } else if (scrollY >= fadeEnd) {
            canvas.style.opacity = '0';
            overlayStyle.opacity = '0';
          } else {
            const fadeProgress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
            canvas.style.opacity = `${(1 - fadeProgress).toFixed(2)}`;
          }
        }
      }

      const bgColor = retroScene.getBackgroundColor();
      const nextBackground = `rgb(${Math.round(bgColor.r * 255)}, ${Math.round(bgColor.g * 255)}, ${Math.round(
        bgColor.b * 255,
      )})`;

      if (nextBackground !== lastBackground) {
        body.style.backgroundColor = nextBackground;
        lastBackground = nextBackground;
      }
    }

  };

  const queueUpdate = () => {
    if (pendingFrame) return;
    pendingFrame = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate, { passive: true });
  queueUpdate();
}

// ─────────────────────────────────────
// Magnetic elements (unchanged)
// ─────────────────────────────────────

function initMagneticElements(modules: AnimationModules): void {
  if (magneticElementsInitialized) return;
  magneticElementsInitialized = true;

  const magnetics = document.querySelectorAll<HTMLElement>('[data-magnetic]');

  magnetics.forEach((element) => {
    const content = element.querySelector<HTMLElement>('[data-magnetic-content]') || element;
    const xTo = modules.gsap.quickTo(element, 'x', {
      duration: 1,
      ease: 'elastic.out(1, 0.3)',
    });
    const yTo = modules.gsap.quickTo(element, 'y', {
      duration: 1,
      ease: 'elastic.out(1, 0.3)',
    });
    const contentXTo = modules.gsap.quickTo(content, 'x', {
      duration: 0.8,
      ease: 'power4.out',
    });
    const contentYTo = modules.gsap.quickTo(content, 'y', {
      duration: 0.8,
      ease: 'power4.out',
    });

    element.addEventListener('mousemove', (event: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;

      xTo(x * 0.4);
      yTo(y * 0.4);

      if (content !== element) {
        contentXTo(x * 0.6);
        contentYTo(y * 0.6);
      }
    });

    element.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);

      if (content !== element) {
        contentXTo(0);
        contentYTo(0);
      }
    });
  });
}

// ─────────────────────────────────────
// CHAPTER 3 — PROJECT CARD RENDERING
// Professional redesign Nov 14, 2026: clean dark cards in a 2-col grid.
// No pixel transitions, no background images, no scrims, no full-height
// cinematic panels, normal cursor. First preview image is the card image;
// clicking it opens the modal gallery with all preview images.
// ─────────────────────────────────────

function renderProjectPanels(): void {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  container.innerHTML = projects.map((project, index) => createProjectCard(project, index)).join('');
}

function createProjectCard(project: Project, index: number): string {
  const isPortrait = project.imageResolution && project.imageResolution.height > project.imageResolution.width;
  const portraitClass = isPortrait ? ' work__card-media--portrait' : '';

  // Media: first preview image only. The rest live in the modal gallery.
  let mediaHtml: string;
  if (project.previewImages && project.previewImages.length > 0) {
    const imagesHtml = project.previewImages
      .map(
        (src, i) =>
          `<img src="${src}" alt="${project.title} preview image ${i + 1}" loading="lazy" decoding="async" />`,
      )
      .join('');
    mediaHtml = `
      <div class="work__card-media${portraitClass}" tabindex="0" role="button" aria-label="View ${project.title} preview images">
        ${imagesHtml}
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="work__card-placeholder">
        <span>${project.title}</span>
      </div>
    `;
  }

  const tagsHtml = project.tags
    .map((tag) => `<span class="work__card-tag">${tag}</span>`)
    .join('');

  const linkLabel = (() => {
    if (!project.link) return '';
    try {
      const host = new URL(project.link).hostname.replace(/^www\./, '');
      return host === 'github.com' ? 'View repository' : 'Visit live site';
    } catch {
      return 'Open project';
    }
  })();

  const linkHtml = project.link
    ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="work__card-cta" aria-label="Open ${project.title} in a new tab">
        <span>${linkLabel}</span>
        <span class="work__card-cta-arrow" aria-hidden="true">\u2192</span>
      </a>`
    : '';

  return `
    <article class="work__card" data-project-index="${index}" aria-label="Project ${index + 1}: ${project.title}">
      ${mediaHtml}
      <div class="work__card-body">
        <p class="work__card-focus">${project.focus}</p>
        <h3 class="work__card-title">${project.title}</h3>
        <p class="work__card-year">${project.year}</p>
        <div class="work__card-tags" aria-label="Project technologies">${tagsHtml}</div>
        <p class="work__card-desc">${project.description}</p>
        ${linkHtml}
      </div>
    </article>
  `;
}

// ═══════════════════════════════════════════
// CHAPTER ANIMATIONS
// ═══════════════════════════════════════════

// ---------- Chapter 1: Prologue ----------

function initPrologueTimeline(modules: AnimationModules): void {
  if (prologueInitialized) return;
  prologueInitialized = true;

  const section = document.querySelector('.chapter--prologue');
  if (!section) return;

  const lines = modules.gsap.utils.toArray<HTMLElement>('.prologue__line');
  const heading = section.querySelector('.prologue__heading');

  if (prefersReducedMotion()) {
    if (heading) modules.gsap.set(heading, { opacity: 1, y: 0 });
    if (lines.length > 0) modules.gsap.set(lines, { opacity: 1, y: 0 });
    section.classList.add('is-active');
    return;
  }

  // Heading fade in
  if (heading) {
    modules.gsap.from(heading, {
      opacity: 0,
      y: 32,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 75%',
        once: true,
      },
    });
  }

  // Accent line animation via class toggle
  modules.ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      section.classList.add('is-active');
    },
  });

  // Line-by-line text reveal with stagger
  if (lines.length > 0) {
    modules.gsap.to(lines, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.18,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 60%',
        once: true,
      },
    });
  }
}

// ---------- Chapter 2: Skills ----------
// Professional redesign Nov 14, 2026: the old version pinned the section
// with a scrub timeline (min-height 230vh, pinSpacing false). That pin is
// what cut off the last group, Data & ML Systems. No pin, no scrub, no
// clip-path reveal. The section is normal flow now and every group fades
// up once, the same as the other sections.

function initToolkitTimeline(modules: AnimationModules): void {
  if (toolkitInitialized) return;
  toolkitInitialized = true;

  const section = document.querySelector('.chapter--toolkit');
  const headingArea = document.querySelector('.toolkit__heading-area');
  const capabilities = modules.gsap.utils.toArray<HTMLElement>('.toolkit__capability');
  const railFill = document.querySelector<HTMLElement>('.toolkit__rail-fill');

  if (!section || capabilities.length === 0) return;

  if (prefersReducedMotion()) {
    modules.gsap.set([headingArea, ...capabilities, railFill].filter(Boolean), {
      autoAlpha: 1,
      y: 0,
      scaleY: 1,
    });
    capabilities.forEach((c) => c.classList.add('is-active'));
    return;
  }

  if (railFill) {
    modules.gsap.set(railFill, { scaleY: 1 });
  }

  modules.gsap.from([headingArea, ...capabilities].filter(Boolean), {
    autoAlpha: 0,
    y: 22,
    duration: 0.55,
    stagger: 0.07,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',
      once: true,
    },
  });
}

// ---------- Chapter 3: Projects ----------
// Professional redesign Nov 14, 2026: clean cards, one simple fade-up
// per card. No clip-path background reveal, no alternating panels.

function initWorkTimeline(modules: AnimationModules): void {
  if (workInitialized) return;
  workInitialized = true;

  const headingArea = document.querySelector('.work__heading-area');
  const cards = modules.gsap.utils.toArray<HTMLElement>('.work__card');

  if (prefersReducedMotion()) {
    modules.gsap.set([headingArea, ...cards].filter(Boolean), { opacity: 1, y: 0 });
    return;
  }

  modules.gsap.from([headingArea, ...cards].filter(Boolean), {
    autoAlpha: 0,
    y: 24,
    duration: 0.6,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.chapter--work',
      start: 'top 80%',
      once: true,
    },
  });
}

// ---------- Chapter 4: Signal ----------

function initSignalTimeline(modules: AnimationModules): void {
  if (signalInitialized) return;
  signalInitialized = true;

  const section = document.querySelector('.chapter--signal');
  const flash = document.querySelector<HTMLElement>('.signal__flash');
  const content = document.querySelector<HTMLElement>('.signal__content');
  const email = document.querySelector<HTMLElement>('.signal__email');

  if (!section) return;

  if (prefersReducedMotion()) {
    if (content) {
      modules.gsap.set(content, { opacity: 1, y: 0 });
    }
    if (email) {
      email.classList.add('signal__email--pulsing');
    }
    return;
  }

  modules.ScrollTrigger.create({
    trigger: section,
    start: 'top 70%',
    once: true,
    onEnter: () => {
      const tl = modules.gsap.timeline();

      // Brief bright flash
      if (flash) {
        tl.to(flash, {
          opacity: 0.7,
          duration: 0.12,
          ease: 'power2.in',
        })
          .to(flash, {
            opacity: 0,
            duration: 0.6,
            ease: 'power3.out',
          });
      }

      // Content reveals after flash
      if (content) {
        tl.to(
          content,
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power3.out',
          },
          flash ? 0.25 : 0,
        );
      }

      // Add pulsing glow to email after content settles
      if (email) {
        tl.call(
          () => {
            email.classList.add('signal__email--pulsing');
          },
          [],
          '+=0.3',
        );
      }
    },
  });
}

// ─────────────────────────────────────
// Terminal init (unchanged)
// ─────────────────────────────────────

function initTerminal(): Promise<void> {
  if (terminalInitPromise) return terminalInitPromise;

  terminalInitPromise = Promise.all([initScene(), import('./terminal')])
    .then(([, terminalModule]) => {
      if (!retroScene) return;

      try {
        const terminal = new terminalModule.Terminal('#crt-terminal-container', () => {
          retroScene?.updateTexture();
        });

        retroScene.setScreenCanvas(terminal.getCanvas());
      } catch (error) {
        console.warn('Terminal failed to initialize:', error);
      }
    })
    .then(() => undefined);

  return terminalInitPromise;
}

// ─────────────────────────────────────
// Animation stack (updated for chapters)
// ─────────────────────────────────────

async function initAnimationStack(): Promise<void> {
  const modules = await loadAnimationModules();
  initSmoothScroll(modules);
  initMagneticElements(modules);

  // Chapter animations
  initPrologueTimeline(modules);
  initToolkitTimeline(modules);
  initWorkTimeline(modules);
  initSignalTimeline(modules);
}

function initImageModal(): void {
  const modal = document.getElementById('image-modal');
  const modalImg = modal?.querySelector('.image-modal__img') as HTMLImageElement;
  const backdrop = modal?.querySelector('.image-modal__backdrop') as HTMLElement | null;
  const closeBtn = modal?.querySelector('.image-modal__close') as HTMLElement | null;
  const prevBtn = modal?.querySelector('.image-modal__nav--prev') as HTMLButtonElement;
  const nextBtn = modal?.querySelector('.image-modal__nav--next') as HTMLButtonElement;
  const counter = modal?.querySelector('.image-modal__counter');

  if (!modal || !modalImg || !backdrop || !closeBtn || !prevBtn || !nextBtn || !counter) return;

  // State
  let currentImages: string[] = [];
  let currentIndex = 0;
  let triggeringElement: HTMLElement | null = null;

  const updateNav = () => {
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === currentImages.length - 1;
    // Hide nav buttons when only one image
    const showNav = currentImages.length > 1;
    prevBtn.style.display = showNav ? '' : 'none';
    nextBtn.style.display = showNav ? '' : 'none';
    counter.textContent = showNav ? `${currentIndex + 1} / ${currentImages.length}` : '';
  };

  const showImage = (index: number) => {
    currentIndex = Math.max(0, Math.min(index, currentImages.length - 1));
    // Fade out → swap → fade in
    modalImg.style.opacity = '0';
    setTimeout(() => {
      modalImg.src = currentImages[currentIndex];
      modalImg.style.opacity = '1';
    }, 150);
    updateNav();
  };

  const open = (images: string[], startIndex = 0) => {
    triggeringElement = document.activeElement as HTMLElement | null;
    currentImages = images;
    currentIndex = startIndex;
    modalImg.src = images[startIndex];
    updateNav();
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      closeBtn.focus();
    }, 50);
  };

  const close = () => {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      modalImg.src = '';
      currentImages = [];
      if (triggeringElement) {
        triggeringElement.focus();
        triggeringElement = null;
      }
    }, 300);
  };

  // Wire controls
  backdrop.addEventListener('click', close);
  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => showImage(currentIndex - 1));
  nextBtn.addEventListener('click', () => showImage(currentIndex + 1));

  // Add CSS transition for the swap
  modalImg.style.transition = 'opacity 0.15s ease';

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('is-active')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);

    // Focus trapping
    if (e.key === 'Tab') {
      const focusables = Array.from(modal.querySelectorAll<HTMLElement>('button:not([style*="display: none"]):not([disabled]), [tabindex="0"]:not([disabled])'));
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  // Attach click to each project preview, collecting all its images
  const panels = document.querySelectorAll<HTMLElement>('.work__card');
  panels.forEach((panel) => {
    const preview = panel.querySelector('.work__card-media');
    if (!preview) return;

    // Collect all <img> srcs within this preview (base + alt images)
    const imgs = Array.from(preview.querySelectorAll<HTMLImageElement>('img'))
      .map((img) => img.src)
      .filter(Boolean);

    if (imgs.length === 0) return;

    preview.addEventListener('click', () => open(imgs, 0));

    // Keyboard support: Enter / Space on the preview opens the gallery.
    preview.addEventListener('keydown', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
        keyEvent.preventDefault();
        open(imgs, 0);
      }
    });
  });
}

// ═══════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  renderProjectPanels();
  initImageModal();
  initScrollHandlers();

  void Promise.all([initAnimationStack(), initScene(), initTerminal()]);

  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      const appContent = document.getElementById('app-content');

      if (appContent) {
        appContent.style.visibility = 'visible';
        requestAnimationFrame(() => {
          appContent.style.opacity = '1';
          document.body.classList.add('scene-ready');
        });
      }

      if (loader) {
        requestAnimationFrame(() => {
          loader.style.opacity = '0';
          loader.style.visibility = 'hidden';
          loader.style.transform = 'scale(1.02)';
          loader.style.filter = 'blur(10px)';
          loader.style.pointerEvents = 'none';
        });
        setTimeout(() => loader.remove(), 900);
      }
    }, 320);
  });
});
