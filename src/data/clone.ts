// AMRO'S CONTENT — PHASE 2 PERSONALIZATION
// Everything in this file is Amro Abed Moosa's own name, roles,
// experience, and projects. The Phase 1 placeholder content from
// the original clone source has been replaced.

import {
  KAREER_THUMB_MP4,
  KAREER_THUMB_POSTER,
  SYLLABUSSYNC_THUMB_MP4,
  SYLLABUSSYNC_THUMB_POSTER,
  TRANSFORMER_THUMB_MP4,
  TRANSFORMER_THUMB_POSTER,
  CURLAI_THUMB_MP4,
  CURLAI_THUMB_POSTER,
} from './thumbnails';

export interface ExperienceEntry {
  company: string;
  role: string;
  dates: string;
  duration: string;
}

export const HERO = {
  name: 'Amro Abed Moosa',
  tagline: 'Bachelor of Engineering, Computer',
  roles: ['Software Developer', 'Applications Engineer', 'AI Builder'],
  bio: [
    { text: 'I use ', pill: null },
    { text: 'AI', pill: 'ai' },
    { text: ' to ', pill: null },
    { text: 'build tools', pill: 'code' },
    { text: ' that kill the boring work, then show people how they work.', pill: null },
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
    media: { type: 'video', poster: KAREER_THUMB_POSTER, mp4: KAREER_THUMB_MP4 },
  },
  {
    title: 'Syllabus Sync',
    kind: 'iOS App',
    href: 'https://github.com/Amro212/Syllabus-Sync',
    external: true,
    slug: 'syllabus-sync',
    media: { type: 'video', poster: SYLLABUSSYNC_THUMB_POSTER, mp4: SYLLABUSSYNC_THUMB_MP4 },
  },
  {
    title: 'Transformer Training Optimization',
    kind: 'ML Benchmark',
    href: 'https://github.com/Amro212/transformer-training-benchmark',
    external: true,
    slug: 'transformer-training-optimization',
    media: { type: 'video', poster: TRANSFORMER_THUMB_POSTER, mp4: TRANSFORMER_THUMB_MP4 },
  },
  {
    title: 'CurlAI',
    kind: 'Computer Vision',
    href: 'https://github.com/Amro212/CurlAI',
    external: true,
    slug: 'curlai',
    media: { type: 'video', poster: CURLAI_THUMB_POSTER, mp4: CURLAI_THUMB_MP4 },
  },
  {
    title: 'LEGEND',
    kind: 'Memecoin',
    href: 'https://legend.guru',
    external: true,
    slug: 'legend',
    media: {
      type: 'video',
      poster: 'https://www.legend.guru/gallery/Large_group_photo_of_children_families_and_supporters_at_the_new_school.jpeg',
      mp4: 'https://www.legend.guru/gallery/Front_view_of_the_newly_opened_school_building_with_students_in_the_courtyard.mp4',
    },
  },
];

export const CONTACT = {
  email: 'amromousa8@gmail.com',
  linkedin: 'https://www.linkedin.com/in/amro-abedmoosa/',
  github: 'https://github.com/Amro212',
};
