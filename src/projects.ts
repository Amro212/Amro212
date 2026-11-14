export interface Project {
  title: string;
  year: string;
  tags: string[];
  description: string;
  link?: string;
  previewImages?: string[];
  backgroundImage?: string;
  /** Native resolution of the preview images (width × height in px). */
  imageResolution?: { width: number; height: number };
  category: 'software' | 'research';
  /** Short label shown above the title, e.g. the kind of work it proves. */
  focus: string;
}

export const projects: Project[] = [
  {
    title: 'Kareer',
    year: '2025–2026',
    tags: ['TypeScript', 'JavaScript', 'Browser Extension', 'Ashby', 'Greenhouse', 'Lever', 'Workday', 'OpenRouter'],
    description:
      'Browser extension that fills in job applications from a resume, with a clear label for what was verified, saved, or guessed. Local-first with zero telemetry and no external backend, with dedicated adapters for Ashby, Greenhouse, Lever, and Workday. Open source, 640+ unit tests passing.',
    link: 'https://kareer.itsamro.me/',
    // Kareer preview loads from the live Kareer site itself: GitHub's push tools
    // only accept text files, so the two PNGs cannot be uploaded through them.
    // kareer1 is the real Kareer social preview, hosted on kareer.itsamro.me.
    previewImages: ['https://kareer.itsamro.me/assets/kareer-social-preview.png'],
    backgroundImage: '/project-previews/kareer/kareer1.png',
    category: 'software',
    focus: 'Applications Engineering · Software',
  },
  {
    title: 'Syllabus Sync',
    year: '2025–2026',
    tags: ['SwiftUI', 'iOS', 'Supabase', 'Cloudflare Workers', 'TypeScript'],
    description:
      'iOS app that reads syllabus PDFs, pulls out dates and tasks, and turns them into editable plans with an in-app calendar and import tracking.',
    link: 'https://github.com/Amro212/Syllabus-Sync',
    previewImages: ['/project-previews/syllabus/syllabus2.png', '/project-previews/syllabus/syllabus1.png'],
    backgroundImage: '/project-previews/syllabus/syllabus-bg-playful.png',
    imageResolution: { width: 1206, height: 2622 },
    category: 'software',
    focus: 'Software · Mobile',
  },
  {
    title: 'Sahara',
    year: '2026',
    tags: ['Next.js', 'TypeScript', 'Playwright', 'Stripe', 'Queue Management', 'Browser Automation'],
    description:
      'Job-search automation app for tracking roles, reading job boards, tailoring resume drafts, and automating application flows for Greenhouse and Ashby applications.',
    link: 'https://github.com/Amro212/JobAutomation',
    previewImages: ['/project-previews/sahara/sahara1.png', '/project-previews/sahara/sahara2.png'],
    backgroundImage: '/project-previews/sahara/Sahara-background.png',
    category: 'software',
    focus: 'Software · Automation',
  },
  {
    title: 'LEGEND Community',
    year: '2026',
    tags: ['Next.js', 'Tailwind CSS', 'Community UX'],
    description:
      'Community site for LEGEND at legend.guru, with chart visibility, media updates, and a clearer path for people trying to understand the project quickly.',
    link: 'https://legend.guru',
    previewImages: ['/project-previews/legend/legend1.png', '/project-previews/legend/legend2.png'],
    category: 'research',
    focus: 'Software · Community',
  },
];
