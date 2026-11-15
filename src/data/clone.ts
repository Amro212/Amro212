// AMRO'S CONTENT — PHASE 2 PERSONALIZATION
// Everything in this file is Amro Abed Moosa's own name, roles,
// experience, and projects. The Phase 1 placeholder content from
// the original clone source has been replaced.

export interface ExperienceEntry {
  company: string;
  role: string;
  dates: string;
  duration: string;
}

export const HERO = {
  name: 'Amro Abed Moosa',
  tagline: 'Computer Engineer',
  bio: [
    { text: 'I ', pill: null },
    { text: 'build tools', pill: 'code' },
    { text: ' that take the boring work off your plate, and I like showing people how they work.', pill: null },
  ] as { text: string; pill: 'design' | 'code' | 'ai' | null }[],
  experienceFooter: '5 companies · since 2024',
};

export const EXPERIENCE: ExperienceEntry[] = [
  {
    company: 'Sandbox Software Solutions',
    role: 'Software Developer Intern',
    dates: 'sep 2025 - dec 2025',
    duration: '4 mos',
  },
  {
    company: 'County of Dufferin',
    role: 'IT Technician',
    dates: 'apr 2025 - sep 2025',
    duration: '6 mos',
  },
  {
    company: 'University of Guelph',
    role: 'Web Dev & IT Support Coordinator',
    dates: 'jun 2024 - sep 2024',
    duration: '4 mos',
  },
  {
    company: 'Outlier',
    role: 'Coding Expert',
    dates: 'jan 2024 - sep 2024',
    duration: '9 mos',
  },
  {
    company: 'Camis',
    role: 'QA Analyst',
    dates: 'jan 2024 - may 2024',
    duration: '5 mos',
  },
];

export const EXPERIENCE_ARIA_LABEL =
  'Experience: Software Developer Intern at Sandbox Software Solutions, sep 2025 to dec 2025; ' +
  'IT Technician at County of Dufferin, apr 2025 to sep 2025; ' +
  'Web Dev & IT Support Coordinator at University of Guelph, jun 2024 to sep 2024; ' +
  'Coding Expert at Outlier, jan 2024 to sep 2024; ' +
  'QA Analyst at Camis, jan 2024 to may 2024';

export interface CloneProject {
  title: string;
  kind: string;
  href: string;
  external: boolean;
  eyebrow?: string;
  /** Internal case-study route (/projects/<slug>). External projects with
   * a slug open the viewer on click; external projects without one are
   * plain outbound links. */
  slug?: string;
  media: { type: 'video'; poster: string; mp4: string; av1?: string } | { type: 'image'; src: string; alt: string };
}

export const PROJECTS: CloneProject[] = [
  {
    title: 'Kareer',
    kind: 'Open Source',
    href: 'https://kareer.itsamro.me/',
    external: true,
    slug: 'kareer',
    media: { type: 'image', src: 'https://kareer.itsamro.me/assets/kareer-social-preview.png', alt: 'Kareer' },
  },
  {
    title: 'Syllabus Sync',
    kind: 'iOS App',
    href: 'https://github.com/Amro212/Syllabus-Sync',
    external: true,
    slug: 'syllabus-sync',
    media: { type: 'image', src: 'https://itsamro.me/project-previews/syllabus/syllabus1.png', alt: 'Syllabus Sync' },
  },
  {
    title: 'Sahara',
    kind: 'Automation',
    href: 'https://github.com/Amro212/JobAutomation',
    external: true,
    slug: 'sahara',
    media: { type: 'image', src: 'https://itsamro.me/project-previews/sahara/sahara1.png', alt: 'Sahara' },
  },
  {
    title: 'LEGEND Community',
    kind: 'Community',
    href: 'https://legend.guru',
    external: true,
    slug: 'legend-community',
    media: { type: 'image', src: 'https://itsamro.me/project-previews/legend/legend1.png', alt: 'LEGEND Community' },
  },
];

export const CONTACT = {
  email: 'amromousa8@gmail.com',
  linkedin: 'https://www.linkedin.com/in/amro-abedmoosa/',
  github: 'https://github.com/Amro212',
};
