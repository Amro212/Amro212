import './style.css';
import { RetroComputerScene } from './scene';
import { projects, type Project } from './projects';
import { Terminal } from './terminal';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// Register GSAP Plugins
gsap.registerPlugin(ScrollTrigger);

// ─────────────────────────────────────────
// 1. Initialize Three.js Scene
// ─────────────────────────────────────────
let retroScene: RetroComputerScene | null = null;

function initScene(): void {
  try {
    retroScene = new RetroComputerScene('three-container');
  } catch (e) {
    console.warn('Three.js scene failed to initialize:', e);
  }
}

// ─────────────────────────────────────────
// 2. Navigation
// ─────────────────────────────────────────
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

// ─────────────────────────────────────────
// 4. Projects Rendering
// ─────────────────────────────────────────
function renderProjects(filter: string = 'all'): void {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  const filtered =
    filter === 'all'
      ? projects
      : projects.filter((p) => p.category === filter);

  grid.innerHTML = filtered.map((p) => createProjectCard(p)).join('');

  // Re-observe for scroll animations
  observeRevealElements();
}

function createProjectCard(project: Project): string {
  const tagsHtml = project.tags
    .map((tag) => `<span class="project-card__tag">${tag}</span>`)
    .join('');

  const linkHtml = project.link
    ? `<a href="${project.link}" target="_blank" rel="noopener" class="project-card__link">${project.link}</a>`
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

function initProjectFilters(): void {
  const buttons = document.querySelectorAll('.projects__side-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = (btn as HTMLElement).dataset.filter || 'all';
      renderProjects(filter);
    });
  });
}

// ─────────────────────────────────────────
// 5. Smooth Scrolling (Lenis + GSAP)
// ─────────────────────────────────────────
function initSmoothScroll(): void {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

// ─────────────────────────────────────────
// 6. Scroll Handling (Three.js Sync)
// ─────────────────────────────────────────
function initScrollHandlers(): void {
  const threeContainer = document.getElementById('three-container');
  const blurOverlay = document.getElementById('three-blur-overlay');
  const aboutSection = document.getElementById('about');
  const projectsSideNav = document.getElementById('projects-side-nav');
  const projectsSection = document.getElementById('projects');
  const body = document.body;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;

    // ----- Three.js scroll sync -----
    if (threeContainer && retroScene) {
      const containerTop = threeContainer.offsetTop;
      const containerHeight = threeContainer.offsetHeight;
      const scrollRange = containerHeight - windowHeight;
      const progress = (scrollY - containerTop) / scrollRange;
      retroScene.setScrollProgress(progress);

      // ----- Progressive blur on the 3D model -----
      // Phase 1: Blur ramps up from 0 to initialMax within three-container (progress 0.65→1.0)
      // Phase 2: Blur continues increasing through about section (14→30px)
      // Phase 3: Canvas fades out near the end of about section
      if (blurOverlay) {
        const blurStart = 0.65;      // When blur begins (65% through three-container scroll)
        const initialMaxBlur = 14;   // Blur at end of three-container range
        const finalMaxBlur = 30;     // Maximum blur deep in the about section

        // Calculate how far past three-container we are (into about section)
        const containerEnd = containerTop + containerHeight;
        const pastContainer = scrollY - (containerEnd - windowHeight);

        if (progress <= blurStart) {
          // Before blur zone — no blur
          blurOverlay.style.backdropFilter = 'blur(0px)';
          (blurOverlay.style as any).webkitBackdropFilter = 'blur(0px)';
          blurOverlay.style.opacity = '0';
        } else if (progress < 1.0) {
          // Phase 1: Within three-container, ramp blur from 0 to initialMaxBlur
          const blurProgress = (progress - blurStart) / (1.0 - blurStart);
          const eased = blurProgress * blurProgress;
          const blurValue = eased * initialMaxBlur;
          blurOverlay.style.backdropFilter = `blur(${blurValue.toFixed(1)}px)`;
          (blurOverlay.style as any).webkitBackdropFilter = `blur(${blurValue.toFixed(1)}px)`;
          blurOverlay.style.opacity = '1';
        } else {
          // Phase 2: Past three-container, continue increasing blur through about section
          // Calculate how far into the about section we are
          const aboutHeight = aboutSection ? aboutSection.offsetHeight : windowHeight;
          const aboutProgress = Math.min(1, pastContainer / aboutHeight);
          const blurValue = initialMaxBlur + (finalMaxBlur - initialMaxBlur) * aboutProgress;
          blurOverlay.style.backdropFilter = `blur(${blurValue.toFixed(1)}px)`;
          (blurOverlay.style as any).webkitBackdropFilter = `blur(${blurValue.toFixed(1)}px)`;
          blurOverlay.style.opacity = '1';
        }

        // Fade the canvas out towards end of about section so it doesn't bleed into projects
        const canvas = threeContainer.querySelector('canvas') as HTMLCanvasElement;
        if (canvas) {
          if (projectsSection) {
            const projectsTop = projectsSection.offsetTop;
            const fadeStart = projectsTop - windowHeight * 1.5;
            const fadeEnd = projectsTop - windowHeight * 0.5;

            if (scrollY <= fadeStart) {
              canvas.style.opacity = '1';
            } else if (scrollY >= fadeEnd) {
              canvas.style.opacity = '0';
              blurOverlay.style.opacity = '0';
            } else {
              const fadeProgress = (scrollY - fadeStart) / (fadeEnd - fadeStart);
              canvas.style.opacity = `${(1 - fadeProgress).toFixed(2)}`;
            }
          }
        }
      }

      // Update body background to match Three.js background
      const bgColor = retroScene.getBackgroundColor();
      const r = Math.round(bgColor.r * 255);
      const g = Math.round(bgColor.g * 255);
      const b = Math.round(bgColor.b * 255);
      body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;

    }

    // ----- Projects side nav visibility -----
    if (projectsSideNav && projectsSection) {
      const sectionTop = projectsSection.offsetTop;
      const sectionBottom = sectionTop + projectsSection.offsetHeight;
      const inView = scrollY + windowHeight > sectionTop + 100 && scrollY < sectionBottom;
      projectsSideNav.classList.toggle('visible', inView);
    }
  });
}

// ─────────────────────────────────────────
// 7. Universal Magnetic Elements
// ─────────────────────────────────────────
function initMagneticElements(): void {
  const magnetics = document.querySelectorAll<HTMLElement>('[data-magnetic]');

  magnetics.forEach((el) => {
    // Optional inner content to drag further
    const content = el.querySelector<HTMLElement>('[data-magnetic-content]') || el;

    // Create highly optimized spring physics followers
    const xTo = gsap.quickTo(el, 'x', { duration: 1, ease: 'elastic.out(1, 0.3)' });
    const yTo = gsap.quickTo(el, 'y', { duration: 1, ease: 'elastic.out(1, 0.3)' });

    const contentXTo = gsap.quickTo(content, 'x', { duration: 0.8, ease: 'power4.out' });
    const contentYTo = gsap.quickTo(content, 'y', { duration: 0.8, ease: 'power4.out' });

    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const hw = rect.width / 2;
      const hh = rect.height / 2;

      const x = e.clientX - rect.left - hw;
      const y = e.clientY - rect.top - hh;

      // Move the container slightly
      xTo(x * 0.4);
      yTo(y * 0.4);

      // Move the inner content more for parallax depth
      if (content !== el) {
        contentXTo(x * 0.6);
        contentYTo(y * 0.6);
      }
    });

    el.addEventListener('mouseleave', () => {
      xTo(0);
      yTo(0);
      if (content !== el) {
        contentXTo(0);
        contentYTo(0);
      }
    });
  });
}

// ─────────────────────────────────────────
// 8. Scroll Reveal Observer & Stagger (Projects)
// ─────────────────────────────────────────
function observeRevealElements(): void {
  // We use GSAP batch to animate project cards in groups as they enter
  const cards = gsap.utils.toArray<HTMLElement>('.project-card');

  // Set initial invisible state manually rather than CSS to ensure ScrollTrigger handles it
  gsap.set(cards, { y: 60, opacity: 0 });

  ScrollTrigger.batch(cards, {
    start: 'top 85%',
    onEnter: (elements) => {
      gsap.to(elements, {
        y: 0,
        opacity: 1,
        stagger: 0.15,
        duration: 0.8,
        ease: 'power3.out',
        overwrite: true
      });
    },
    // Optional: animate out when scrolling back up past them, or just leave them
    once: true // Only animate in once
  });
}

// ─────────────────────────────────────────
// 9. Advanced Text Stagger Reveals (GSAP)
// ─────────────────────────────────────────
function initTextReveals(): void {
  const revealElements = document.querySelectorAll<HTMLElement>('.reveal-text');

  revealElements.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (!text) return;

    // Accessibility: keep the original text readable by screen readers
    el.setAttribute('aria-label', text);
    el.innerHTML = ''; // Start empty

    // Create a container for the typed text
    const textSpan = document.createElement('span');
    el.appendChild(textSpan);

    ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        // Animate the length property to simulate typewriter effect
        const obj = { length: 0 };
        gsap.to(obj, {
          length: text.length,
          // Calculate duration based on text length - slowed down from 0.02
          duration: text.length * 0.05,
          ease: 'none',
          onUpdate: () => {
            textSpan.textContent = text.substring(0, Math.floor(obj.length));
          },
          onComplete: () => {
            // Keep cursor blinking indefinitely after typing is done
          }
        });
      }
    });
  });
}

// ─────────────────────────────────────────
// 10. Interactive Terminal on Canvas
// ─────────────────────────────────────────
function initTerminal(): void {
  if (retroScene) {
    try {
      const terminal = new Terminal('#crt-terminal-container', () => {
        // Trigger texture update in scene when terminal rerenders
        retroScene!.updateTexture();
      });
      retroScene.setScreenCanvas(terminal.getCanvas());
    } catch (e) {
      console.warn('Terminal failed to initialize:', e);
    }
  }
}
// (Removed legacy addRevealClasses function)
// ─────────────────────────────────────────
// 11. Section Parallax (GSAP Scrub)
// ─────────────────────────────────────────
function initParallax(): void {
  const parallaxElements = document.querySelectorAll<HTMLElement>('[data-parallax]');

  parallaxElements.forEach((el) => {
    const speed = parseFloat(el.getAttribute('data-parallax') || '1');

    gsap.to(el, {
      yPercent: speed * 30, // Move up/down by up to 30% of its height based on speed attribute
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom', // Start when top of element hits bottom of viewport
        end: 'bottom top',   // End when bottom of element hits top of viewport
        scrub: true          // Tie directly to scrollbar position
      }
    });
  });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSmoothScroll();
  initMagneticElements();
  initTextReveals();
  initParallax();
  initScene();
  initNavigation();
  renderProjects();
  initProjectFilters();
  observeRevealElements();
  initScrollHandlers();
  initTerminal();

  // Overlap the loader fade with the hero reveal so the model eases in
  // instead of popping in after the boot screen disappears.
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
