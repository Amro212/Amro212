import './style.css';
import './components/ui/pixelact-ui/styles/styles.css';
import { projects, type Project } from './projects';

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

  if (animationModules) {
    observeRevealElements(animationModules);
  }
}

function createProjectCard(project: Project): string {
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
    ? `<a href="${project.link}" target="_blank" rel="noopener noreferrer" class="project-card__link" aria-label="Open ${project.title} in a new tab">${linkLabel} -></a>`
    : '';

  return `
    <article class="project-card" data-category="${project.category}">
      <div class="project-card__titlebar">
        <span class="project-card__dot project-card__dot--red"></span>
        <span class="project-card__dot project-card__dot--yellow"></span>
        <span class="project-card__dot project-card__dot--green"></span>
        <span class="project-card__titlebar-text">~/projects/${project.title.toLowerCase().replace(/\s+/g, '-')}</span>
      </div>
      <div class="project-card__body">
        <h3 class="project-card__name">${project.title}</h3>
        <p class="project-card__year">${project.year}</p>
        <div class="project-card__tags">${tagsHtml}</div>
        <p class="project-card__desc">${project.description}</p>
        ${linkHtml}
      </div>
    </article>
  `;
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
