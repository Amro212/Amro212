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
let animationModules: AnimationModules | null = null;
let animationModulesPromise: Promise<AnimationModules> | null = null;
let sceneInitPromise: Promise<void> | null = null;
let terminalInitPromise: Promise<void> | null = null;
let smoothScrollInitialized = false;
let magneticElementsInitialized = false;
let textRevealsInitialized = false;
let parallaxInitialized = false;
let projectCardRevealTriggers: Array<{ kill: () => void }> = [];

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
      animationModules = modules;
      return modules;
    });
  }

  return animationModulesPromise;
}

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

function initNavigation(): void {
  const hamburger = document.getElementById('nav-hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuLinks = mobileMenu?.querySelectorAll('.mobile-menu__link');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
  });

  menuLinks?.forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
    });
  });
}

function renderProjects(filter = 'all'): void {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const filtered =
    filter === 'all'
      ? projects
      : projects.filter((project) => project.category === filter);

  grid.innerHTML = filtered.map((project) => createProjectCard(project)).join('');
  initProjectPixelTransitions();

  if (animationModules) {
    observeRevealElements(animationModules);
  }
}

function createProjectCard(project: Project): string {
  const projectIndex = projects.indexOf(project) + 1;
  const projectSlug = project.title.toLowerCase().replace(/\s+/g, '-');
  const mediaHtml = createProjectMedia(project, projectSlug);
  const tagsHtml = project.tags
    .map((tag) => `<span class="project-card__tag">${tag}</span>`)
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
    ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="project-card__cta pixel__button pixel-default__button pixel-font box-shadow-margin" aria-label="Open ${project.title} in a new tab"><span>${linkLabel}</span><span aria-hidden="true" class="project-card__cta-arrow">-></span></a>`
    : '';

  return `
    <article class="project-card" data-category="${project.category}" aria-label="Project ${projectIndex}: ${project.title}">
      <div class="project-card__layout">
        <figure class="project-card__media" aria-label="Project preview for ${project.title}">
          ${mediaHtml}
        </figure>

        <div class="project-card__body">
          <p class="project-card__eyebrow">Project ${String(projectIndex).padStart(2, '0')}</p>
          <h3 class="project-card__name">${project.title}</h3>
          <p class="project-card__year">${project.year}</p>
          <div class="project-card__tags" aria-label="Project technologies">${tagsHtml}</div>
          <p class="project-card__desc">${project.description}</p>
          ${linkHtml}
        </div>
      </div>
    </article>
  `;
}

function createProjectMedia(project: Project, projectSlug: string): string {
  if (project.previewImages && project.previewImages.length >= 2) {
    const [firstImage, secondImage] = project.previewImages;
    return `
      <div class="project-card__pixel-transition" data-pixel-transition data-grid-size="19" data-animation-duration="0.4" data-pixel-color="#ffffff" tabindex="0" role="group" aria-label="Two previews for ${project.title}">
        <img class="project-card__transition-image project-card__transition-image--base" src="${firstImage}" alt="${project.title} preview image one" loading="lazy" decoding="async" />
        <img class="project-card__transition-image project-card__transition-image--alt" src="${secondImage}" alt="${project.title} preview image two" loading="lazy" decoding="async" />
        <div class="project-card__pixel-layer" aria-hidden="true"></div>
      </div>
    `;
  }

  return `
    <div class="project-card__placeholder" role="img" aria-label="Placeholder screenshot for ${project.title}">
      <span class="project-card__placeholder-label">Screenshot Placeholder</span>
      <span class="project-card__placeholder-title">${project.title}</span>
      <span class="project-card__placeholder-meta">/project-previews/${projectSlug}</span>
    </div>
  `;
}

function initProjectPixelTransitions(): void {
  const transitions = document.querySelectorAll<HTMLElement>('[data-pixel-transition]');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
          pixelLayer.appendChild(pixel);
        }
      }
    }

    if (prefersReducedMotion) return;

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

    transition.addEventListener('mouseenter', () => animateTransition(true));
    transition.addEventListener('mouseleave', () => animateTransition(false));
    transition.addEventListener('focus', () => animateTransition(true));
    transition.addEventListener('blur', () => animateTransition(false));

    if (isCoarsePointer) {
      transition.addEventListener('click', () => animateTransition(!isActive));
    }
  });
}

function initSmoothScroll(modules: AnimationModules): void {
  if (smoothScrollInitialized) return;
  smoothScrollInitialized = true;

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

function observeRevealElements(modules: AnimationModules): void {
  projectCardRevealTriggers.forEach((trigger) => trigger.kill());
  projectCardRevealTriggers = [];

  const cards = modules.gsap.utils.toArray<HTMLElement>('.project-card');
  if (cards.length === 0) return;

  modules.gsap.set(cards, { y: 60, opacity: 0 });

  projectCardRevealTriggers = modules.ScrollTrigger.batch(cards, {
    start: 'top 85%',
    onEnter: (elements) => {
      modules.gsap.to(elements, {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
        overwrite: true,
      });
    },
    once: true,
  }) as Array<{ kill: () => void }>;

  modules.ScrollTrigger.refresh();
}

function initTextReveals(modules: AnimationModules): void {
  if (textRevealsInitialized) return;
  textRevealsInitialized = true;

  const revealElements = document.querySelectorAll<HTMLElement>('.reveal-text');

  revealElements.forEach((element) => {
    const text = (element.textContent || '').trim();
    if (!text) return;

    element.setAttribute('aria-label', text);
    element.innerHTML = '';

    const textSpan = document.createElement('span');
    element.appendChild(textSpan);

    modules.ScrollTrigger.create({
      trigger: element,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        const state = { length: 0 };

        modules.gsap.to(state, {
          length: text.length,
          duration: text.length * 0.05,
          ease: 'none',
          onUpdate: () => {
            textSpan.textContent = text.substring(0, Math.floor(state.length));
          },
        });
      },
    });
  });
}

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

function initParallax(modules: AnimationModules): void {
  if (parallaxInitialized) return;
  parallaxInitialized = true;

  const parallaxElements = document.querySelectorAll<HTMLElement>('[data-parallax]');
  parallaxElements.forEach((element) => {
    const speed = parseFloat(element.getAttribute('data-parallax') || '1');

    modules.gsap.to(element, {
      yPercent: speed * 30,
      ease: 'none',
      scrollTrigger: {
        trigger: element,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });
  });
}

async function initAnimationStack(): Promise<void> {
  const modules = await loadAnimationModules();
  initSmoothScroll(modules);
  initMagneticElements(modules);
  initTextReveals(modules);
  initParallax(modules);
  observeRevealElements(modules);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  renderProjects();
  initProjectsPixelTrail();
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
