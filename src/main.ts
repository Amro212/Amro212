import './style.css';
import './components/ui/pixelact-ui/styles/styles.css';
import './components/ui/pixelact-ui/button.css';
import { projects, type Project } from './projects';
import { initProjectsPixelTrail } from './projectsPixelTrail';

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
    if (event.key !== 'Escape' || !mobileMenu.classList.contains('active')) return;
    event.preventDefault();
    closeMenu();
    hamburger.focus();
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
// Pixel transitions (preserved for project panels)
// ─────────────────────────────────────

function initProjectPixelTransitions(): void {
  const transitions = document.querySelectorAll<HTMLElement>('[data-pixel-transition]');
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  transitions.forEach((transition) => {
    if (transition.dataset.pixelTransitionReady === 'true') return;
    transition.dataset.pixelTransitionReady = 'true';

    const pixelLayer = transition.querySelector<HTMLElement>('.project-card__pixel-layer');
    const gridSize = Number(transition.dataset.gridSize ?? '19');
    const animationDuration = Number(transition.dataset.animationDuration ?? '0.4');
    const pixelColor = transition.dataset.pixelColor ?? '#ffffff';

    if (pixelLayer) {
      pixelLayer.innerHTML = '';
      const pixelSize = 100 / gridSize;

      for (let row = 0; row < gridSize; row += 1) {
        for (let col = 0; col < gridSize; col += 1) {
          const pixel = document.createElement('span');
          pixel.className = 'project-card__pixel';
          pixel.style.width = `${pixelSize}%`;
          pixel.style.height = `${pixelSize}%`;
          pixel.style.left = `${col * pixelSize}%`;
          pixel.style.top = `${row * pixelSize}%`;
          pixel.style.backgroundColor = pixelColor;
          pixel.style.setProperty('--pixel-burst-duration', `${Math.max(0.1, animationDuration)}s`);
          pixel.addEventListener('animationend', (e: AnimationEvent) => {
            if (e.animationName !== 'projectPixelBurst') return;
            pixel.classList.remove('is-firing');
            pixel.style.removeProperty('animation-delay');
          });
          pixelLayer.appendChild(pixel);
        }
      }
    }

    if (prefersReducedMotion()) return;

    let isActive = false;
    let swapTimer: number | undefined;

    const animateTransition = (activate: boolean) => {
      if (isActive === activate) return;
      isActive = activate;

      if (swapTimer) {
        window.clearTimeout(swapTimer);
      }

      if (!pixelLayer) return;
      const pixels = pixelLayer.querySelectorAll<HTMLElement>('.project-card__pixel');
      const maxDelayMs = Math.max(1, Math.floor(animationDuration * 1000 * 0.7));

      pixels.forEach((pixel) => {
        pixel.classList.remove('is-firing');
        pixel.style.animationDelay = `${Math.floor(Math.random() * maxDelayMs)}ms`;
        void pixel.offsetWidth;
        pixel.classList.add('is-firing');
      });

      swapTimer = window.setTimeout(() => {
        transition.classList.toggle('is-active', activate);
      }, Math.max(100, Math.floor(animationDuration * 1000)));
    };

    if (!isCoarsePointer) {
      transition.addEventListener('mouseenter', () => animateTransition(true));
      transition.addEventListener('mouseleave', () => animateTransition(false));
      transition.addEventListener('focus', () => animateTransition(true));
      transition.addEventListener('blur', () => animateTransition(false));
    } else {
      transition.addEventListener('click', () => animateTransition(!isActive));
    }
  });
}

// ═══════════════════════════════════════════
// CHAPTER 3 — PROJECT PANEL RENDERING
// Full-viewport cinematic panels
// ═══════════════════════════════════════════

function renderProjectPanels(): void {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  container.innerHTML = projects.map((project, index) => createProjectPanel(project, index)).join('');
  initProjectPixelTransitions();
}

function createProjectPanel(project: Project, index: number): string {
  const isPortrait = project.imageResolution && project.imageResolution.height > project.imageResolution.width;
  const portraitClass = isPortrait ? ' work__panel-preview--portrait' : '';

  // Build the image area
  let mediaHtml: string;
  if (project.previewImages && project.previewImages.length >= 2) {
    const [firstImage, secondImage] = project.previewImages;
    const res = project.imageResolution;
    const resStyle = res ? ` style="--img-w:${res.width};--img-h:${res.height}"` : '';

    mediaHtml = `
      <div class="work__panel-preview${portraitClass}">
        <div class="project-card__pixel-transition"${resStyle} data-pixel-transition data-grid-size="19" data-animation-duration="0.4" data-pixel-color="#ffffff" tabindex="0" role="group" aria-label="Two previews for ${project.title}">
          <img class="project-card__transition-image project-card__transition-image--base" src="${firstImage}" alt="${project.title} preview image one" loading="lazy" decoding="async" />
          <img class="project-card__transition-image project-card__transition-image--alt" src="${secondImage}" alt="${project.title} preview image two" loading="lazy" decoding="async" />
          <div class="project-card__pixel-layer" aria-hidden="true"></div>
        </div>
      </div>
    `;
  } else if (project.previewImages && project.previewImages.length === 1) {
    mediaHtml = `
      <div class="work__panel-preview${portraitClass}">
        <img src="${project.previewImages[0]}" alt="${project.title} preview" loading="lazy" decoding="async" style="width:100%;display:block;border-radius:inherit;" />
      </div>
    `;
  } else {
    mediaHtml = `
      <div class="work__panel-placeholder">
        <span class="work__panel-placeholder-label">${project.title}</span>
      </div>
    `;
  }

  // Tags
  const tagsHtml = project.tags
    .map((tag) => `<span class="work__panel-tag">${tag}</span>`)
    .join('');

  // Link
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
    ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="work__panel-cta" aria-label="Open ${project.title} in a new tab">
        <span>${linkLabel}</span>
        <span class="work__panel-cta-arrow" aria-hidden="true">\u2192</span>
      </a>`
    : '';

  // Background image (first preview for the clip-path reveal unless explicitly set)
  const bgImage = project.backgroundImage || project.previewImages?.[0];
  const bgHtml = bgImage
    ? `<div class="work__panel-bg">
        <img src="${bgImage}" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div class="work__panel-scrim"></div>
      </div>`
    : '';

  return `
    <article class="work__panel" data-project-index="${index}" aria-label="Project ${index + 1}: ${project.title}">
      ${bgHtml}
      <div class="work__panel-content">
        <p class="work__panel-index">Project ${String(index + 1).padStart(2, '0')}</p>
        <h3 class="work__panel-title">${project.title}</h3>
        <p class="work__panel-year">${project.year}</p>
        <div class="work__panel-tags" aria-label="Project technologies">${tagsHtml}</div>
        <p class="work__panel-desc">${project.description}</p>
        ${linkHtml}
      </div>
      <div class="work__panel-media">
        ${mediaHtml}
      </div>
    </article>
  `;
}

// ═══════════════════════════════════════════
// CHAPTER ANIMATIONS
// ═══════════════════════════════════════════

// ---------- Chapter 1: Prologue ----------

function initPrologueTimeline(modules: AnimationModules): void {
  if (prologueInitialized || prefersReducedMotion()) return;
  prologueInitialized = true;

  const section = document.querySelector('.chapter--prologue');
  if (!section) return;

  const lines = modules.gsap.utils.toArray<HTMLElement>('.prologue__line');
  const heading = section.querySelector('.prologue__heading');

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

// ---------- Chapter 2: Toolkit ----------

function initToolkitTimeline(modules: AnimationModules): void {
  if (toolkitInitialized || prefersReducedMotion()) return;
  toolkitInitialized = true;

  const section = document.querySelector('.chapter--toolkit');
  const pinWrapper = document.querySelector('.toolkit__pin-wrapper');
  const headingArea = document.querySelector('.toolkit__heading-area');
  const nodes = modules.gsap.utils.toArray<HTMLElement>('.toolkit__node');
  const svgContainer = document.querySelector<SVGSVGElement>('.toolkit__lines');

  if (!section || !pinWrapper || nodes.length === 0) return;

  // Pin the toolkit section during scroll
  modules.ScrollTrigger.create({
    trigger: section,
    start: 'top top',
    end: 'bottom bottom',
    pin: pinWrapper,
    pinSpacing: false,
  });

  // Heading reveal
  if (headingArea) {
    modules.gsap.to(headingArea, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        once: true,
      },
    });
  }

  // Staggered node reveals linked to scroll progress
  const totalNodes = nodes.length;
  const perNodeScrollFraction = 1 / (totalNodes + 1);

  nodes.forEach((node, index) => {
    const start = perNodeScrollFraction * index;
    const end = start + perNodeScrollFraction;

    modules.ScrollTrigger.create({
      trigger: section,
      start: `${Math.round(start * 100)}% top`,
      end: `${Math.round(end * 100)}% top`,
      onEnter: () => {
        // Animate node in
        modules.gsap.to(node, {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
        });
        // Light it up after a brief delay
        setTimeout(() => {
          node.classList.add('is-lit');
        }, 300);
      },
      once: true,
    });
  });

  // Draw SVG connecting lines between adjacent nodes
  if (svgContainer) {
    drawConstellationLines(svgContainer, nodes, modules);
  }
}

function drawConstellationLines(
  svg: SVGSVGElement,
  nodes: HTMLElement[],
  modules: AnimationModules,
): void {
  // Wait a frame for layout
  requestAnimationFrame(() => {
    const pinWrapper = svg.closest('.toolkit__pin-wrapper');
    if (!pinWrapper) return;
    const wrapperRect = pinWrapper.getBoundingClientRect();

    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${wrapperRect.width} ${wrapperRect.height}`);

    // Connect each node to the next, plus some cross-connections for visual interest
    const connections: [number, number][] = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      connections.push([i, i + 1]);
    }
    // Cross-connections: 0-2, 1-4, 3-5
    if (nodes.length >= 3) connections.push([0, 2]);
    if (nodes.length >= 5) connections.push([1, 4]);
    if (nodes.length >= 6) connections.push([3, 5]);

    connections.forEach(([a, b], lineIndex) => {
      const nodeA = nodes[a];
      const nodeB = nodes[b];
      if (!nodeA || !nodeB) return;

      const rectA = nodeA.getBoundingClientRect();
      const rectB = nodeB.getBoundingClientRect();

      const x1 = rectA.left - wrapperRect.left + rectA.width / 2;
      const y1 = rectA.top - wrapperRect.top + rectA.height / 2;
      const x2 = rectB.left - wrapperRect.left + rectB.width / 2;
      const y2 = rectB.top - wrapperRect.top + rectB.height / 2;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      svg.appendChild(line);

      // Animate lines in with stagger
      const delay = Math.max(a, b) * 0.15 + lineIndex * 0.05;
      modules.ScrollTrigger.create({
        trigger: svg.closest('.chapter--toolkit'),
        start: `${Math.round((delay / 2) * 100)}% top`,
        once: true,
        onEnter: () => {
          line.classList.add('is-visible');
        },
      });
    });
  });
}

// ---------- Chapter 3: The Work ----------

function initWorkTimeline(modules: AnimationModules): void {
  if (workInitialized || prefersReducedMotion()) return;
  workInitialized = true;

  // Heading reveal
  const heading = document.querySelector('.work__heading');
  if (heading) {
    modules.gsap.to(heading, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: heading,
        start: 'top 85%',
        once: true,
      },
    });
  }

  // Per-panel cinematic reveals
  const panels = modules.gsap.utils.toArray<HTMLElement>('.work__panel');

  panels.forEach((panel, index) => {
    const bg = panel.querySelector<HTMLElement>('.work__panel-bg');
    const preview = panel.querySelector<HTMLElement>('.work__panel-preview, .work__panel-placeholder');
    const textElements = panel.querySelectorAll<HTMLElement>(
      '.work__panel-index, .work__panel-title, .work__panel-year, .work__panel-tags, .work__panel-desc, .work__panel-cta',
    );
    const isEven = index % 2 === 1;

    // Timeline for each panel
    const tl = modules.gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        start: 'top 75%',
        once: true,
      },
    });

    // 1. Clip-path reveal on the background
    if (bg) {
      const fromClip = isEven ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)';
      const toClip = 'inset(0 0% 0 0%)';

      tl.fromTo(
        bg,
        { clipPath: fromClip },
        {
          clipPath: toClip,
          duration: 1.2,
          ease: 'power3.inOut',
        },
        0,
      );
    }

    // 2. Text elements stagger in
    if (textElements.length > 0) {
      tl.to(
        textElements,
        {
          opacity: 1,
          y: 0,
          stagger: 0.08,
          duration: 0.6,
          ease: 'power3.out',
        },
        bg ? 0.4 : 0,
      );
    }

    // 3. Preview image floats up
    if (preview) {
      tl.to(
        preview,
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: 'power3.out',
        },
        bg ? 0.6 : 0.2,
      );
    }
  });
}

// ---------- Chapter 4: Signal ----------

function initSignalTimeline(modules: AnimationModules): void {
  if (signalInitialized || prefersReducedMotion()) return;
  signalInitialized = true;

  const section = document.querySelector('.chapter--signal');
  const flash = document.querySelector<HTMLElement>('.signal__flash');
  const content = document.querySelector<HTMLElement>('.signal__content');
  const email = document.querySelector<HTMLElement>('.signal__email');

  if (!section) return;

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
  const backdrop = modal?.querySelector('.image-modal__backdrop');
  const closeBtn = modal?.querySelector('.image-modal__close');
  const prevBtn = modal?.querySelector('.image-modal__nav--prev') as HTMLButtonElement;
  const nextBtn = modal?.querySelector('.image-modal__nav--next') as HTMLButtonElement;
  const counter = modal?.querySelector('.image-modal__counter');

  if (!modal || !modalImg || !backdrop || !closeBtn || !prevBtn || !nextBtn || !counter) return;

  // State
  let currentImages: string[] = [];
  let currentIndex = 0;

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
    currentImages = images;
    currentIndex = startIndex;
    modalImg.src = images[startIndex];
    updateNav();
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
  };

  const close = () => {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
    setTimeout(() => { modalImg.src = ''; currentImages = []; }, 300);
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
  });

  // Attach click to each project preview, collecting all its images
  const panels = document.querySelectorAll<HTMLElement>('.work__panel');
  panels.forEach((panel) => {
    const preview = panel.querySelector('.work__panel-preview');
    if (!preview) return;

    // Collect all <img> srcs within this preview (base + alt images)
    const imgs = Array.from(preview.querySelectorAll<HTMLImageElement>('img'))
      .map((img) => img.src)
      .filter(Boolean);

    if (imgs.length === 0) return;

    preview.addEventListener('click', () => open(imgs, 0));
  });
}

// ═══════════════════════════════════════════
// Bootstrap
// ═══════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  renderProjectPanels();
  initProjectsPixelTrail();
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
