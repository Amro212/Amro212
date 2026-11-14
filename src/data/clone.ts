// PLACEHOLDER CONTENT — PHASE 1 CLONE
// Everything in this file is copied from designengineer.fyi (Shai Krishna's
// portfolio) purely as design-reference placeholder content for the clone.
// It is NOT Amro's content. Phase 2 (separate step) replaces every entry
// here with Amro's own name, roles, experience, and projects. Nothing in
// this file should ever ship as the live portfolio's real content.

export interface ExperienceEntry {
  company: string;
  role: string;
  dates: string;
  duration: string;
}

export const HERO = {
  name: 'Shai Krishna',
  tagline: 'Staff Product Designer & Design Engineer',
  bio: [
    { text: 'I ', pill: null },
    { text: 'design products', pill: 'design' },
    { text: ', ', pill: null },
    { text: 'write code', pill: 'code' },
    { text: ', and occasionally build things with ', pill: null },
    { text: 'AI', pill: 'ai' },
    { text: ' that nobody asked for.', pill: null },
  ] as { text: string; pill: 'design' | 'code' | 'ai' | null }[],
  experienceFooter: '5 companies · since 2018',
};

export const EXPERIENCE: ExperienceEntry[] = [
  {
    company: 'servicenow',
    role: 'staff product designer, ai',
    dates: 'mar 2026 - sep 2026',
    duration: '7 mos',
  },
  {
    company: 'sense',
    role: 'staff product designer, ai & new initiatives',
    dates: 'jul 2024 - mar 2026',
    duration: '1 yr 9 mos',
  },
  {
    company: 'freshworks',
    role: 'lead product designer, crm (freshsales)',
    dates: 'dec 2023 - jul 2024',
    duration: '8 mos',
  },
  {
    company: 'mycaptain',
    role: 'head of design',
    dates: 'nov 2022 - sep 2023',
    duration: '11 mos',
  },
  {
    company: 'alfheimr.tech',
    role: 'lead product designer / founder (acquired)',
    dates: 'oct 2018 - nov 2022',
    duration: '4 yrs 2 mos',
  },
];

export const EXPERIENCE_ARIA_LABEL =
  'Experience: staff product designer, ai at servicenow, mar 2026 to sep 2026; ' +
  'staff product designer, ai & new initiatives at sense, jul 2024 to mar 2026; ' +
  'lead product designer, crm (freshsales) at freshworks, dec 2023 to jul 2024; ' +
  'head of design at mycaptain, nov 2022 to sep 2023; ' +
  'lead product designer / founder (acquired) at alfheimr.tech, oct 2018 to nov 2022';

export interface CloneProject {
  title: string;
  kind: string;
  href: string;
  external: boolean;
  eyebrow?: string;
  media: { type: 'video'; poster: string; mp4: string; av1?: string } | { type: 'image'; src: string; alt: string };
}

export const PROJECTS: CloneProject[] = [
  {
    title: 'AI Agent Builder',
    kind: 'Sense',
    href: '/projects/ai-agent-builder',
    external: false,
    media: {
      type: 'video',
      poster: 'https://www.designengineer.fyi/projects/sense/thumb-loop-poster.jpg',
      mp4: 'https://www.designengineer.fyi/projects/sense/thumb-loop.mp4',
      av1: 'https://www.designengineer.fyi/projects/sense/thumb-loop.av1.mp4',
    },
  },
  {
    title: 'People of Bengaluru',
    kind: 'built with Claude',
    href: 'https://peopleofbengaluru.com/',
    external: true,
    eyebrow: '~/live · things nobody asked for',
    media: {
      type: 'video',
      poster: 'https://www.designengineer.fyi/projects/vibecoded/people-of-bengaluru-poster.jpg',
      mp4: 'https://www.designengineer.fyi/projects/vibecoded/people-of-bengaluru.mp4',
      av1: 'https://www.designengineer.fyi/projects/vibecoded/people-of-bengaluru.av1.mp4',
    },
  },
  {
    title: 'Tapaway',
    kind: 'built with Claude',
    href: 'https://tapaway.today/',
    external: true,
    eyebrow: '~/live · things nobody asked for',
    media: {
      type: 'video',
      poster: 'https://www.designengineer.fyi/projects/vibecoded/tapaway-poster.jpg',
      mp4: 'https://www.designengineer.fyi/projects/vibecoded/tapaway.mp4',
    },
  },
  {
    title: 'Quote Builder',
    kind: 'Freshworks',
    href: '/projects/quote-builder',
    external: false,
    media: {
      type: 'video',
      poster: 'https://www.designengineer.fyi/projects/quote-builder/thumb-loop-poster.jpg',
      mp4: 'https://www.designengineer.fyi/projects/quote-builder/thumb-loop.mp4',
      av1: 'https://www.designengineer.fyi/projects/quote-builder/thumb-loop.av1.mp4',
    },
  },
  {
    title: 'Designfolio',
    kind: 'Founder',
    href: '/projects/designfolio',
    external: false,
    media: { type: 'image', src: 'https://www.designengineer.fyi/projects/designfolio/thumb.webp', alt: 'Designfolio' },
  },
  {
    title: 'Onboarding',
    kind: 'MyCaptain',
    href: '/projects/mycaptain-onboarding',
    external: false,
    media: { type: 'image', src: 'https://www.designengineer.fyi/projects/mycaptain/thumb.webp', alt: 'Onboarding' },
  },
  {
    title: 'Soul Design System',
    kind: 'MyCaptain',
    href: '/projects/soul-design-system',
    external: false,
    media: { type: 'image', src: 'https://www.designengineer.fyi/projects/soul-design-system/thumb.webp', alt: 'Soul Design System' },
  },
  {
    title: 'Damnnnn',
    kind: 'Founder',
    href: '/projects/damnnnn',
    external: false,
    media: { type: 'image', src: 'https://www.designengineer.fyi/projects/damnnnn/thumb.webp', alt: 'Damnnnn' },
  },
  {
    title: 'Gamified LMS',
    kind: 'MyCaptain',
    href: '/projects/gamification',
    external: false,
    media: { type: 'image', src: 'https://www.designengineer.fyi/projects/gamification/thumb.webp', alt: 'Gamified LMS' },
  },
];

export const CONTACT = {
  email: 'shai@gmail.com',
  linkedin: 'https://www.linkedin.com/in/shaiii/',
  mentorship: 'https://topmate.io/shai',
};
