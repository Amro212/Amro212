// AMRO'S CONTENT — PHASE 2 PERSONALIZATION (see src/data/clone.ts header).
// Case-study data for Amro Abed Moosa's own projects, in the same
// ProjectDetail format the clone's detail viewer already renders.
// Everything here is written from verified facts only: no invented
// metrics and no invented dates.

export type StoryBlock =
  | { type: 'heading'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'p'; text: string }
  | { type: 'label'; text: string }
  | { type: 'glass'; text: string; tint?: string }
  | { type: 'list'; items: string[] }
  | { type: 'journey'; steps: { image?: string; text: string }[]; ratio?: number; start?: number }
  | { type: 'steps'; items: { title: string; glyph?: string; text: string }[] }
  | { type: 'results'; label?: string; stats: { value: string; caption: string }[]; note?: string }
  | { type: 'decline'; eyebrow: string; text: string; meters: { value: string; caption: string }[] }
  | { type: 'snapshots'; source: string; cards: { label: string; title: string; text: string; groups: { label: string; items: string[] }[]; quote?: string }[] }
  | { type: 'slack'; image: string; alt: string; callout?: string }
  | { type: 'link'; href: string; text: string }
  | { type: 'youtube'; id: string; title: string }
  | { type: 'image'; src: string; alt: string; ratio?: number }
  | { type: 'video'; src: string; poster: string; alt: string; ratio?: number; badge?: string; badgeKind?: 'legacy' | 'version'; caption?: string }
  | { type: 'placeholder'; text: string };

export interface ProjectDetail {
  slug: string;
  year: string;
  headline: string;
  summary: string;
  details: { label: string; value: string }[];
  story: StoryBlock[];
  mediaBase: string;
}

export const PROJECT_DETAILS: Record<string, ProjectDetail> = {
  kareer: {
    slug: 'kareer',
    year: '2025–2026',
    headline: 'Kareer: a browser extension that fills in job applications from a resume',
    summary: 'Browser extension that fills in job applications from a resume, with a clear label for what was verified, saved, or guessed. Local-first with zero telemetry and no external backend, with dedicated adapters for Ashby, Greenhouse, Lever, and Workday. Open source, 640+ unit tests passing.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'javascript / typescript' },
      { label: 'platform', value: 'chrome, firefox, tampermonkey' },
      { label: 'license', value: 'mit, open source' },
    ],
    mediaBase: 'https://kareer.itsamro.me',
    story: [
      { type: 'heading', text: 'Why I built it' },
      { type: 'p', text: 'Applying to jobs means typing the same resume details into form after form. I built Kareer to take that repetition off the job seeker, so an application takes seconds instead of another round of copy-pasting.' },
      { type: 'p', text: 'Kareer scans the application form, matches each question to the resume and profile, and fills inputs, comboboxes, dropdowns, radio buttons, and textareas. Auto Submit stays off by default, so the applicant always reviews and submits.' },
      { type: 'glass', text: 'Every filled value carries a clear label: **verified, saved, inferred, guessed, or unresolved**, so you always know what came from your resume and what was guessed.' },
      { type: 'heading', text: 'How it works' },
      { type: 'list', items: ['Dedicated adapters for Ashby, Greenhouse, Lever, and Workday, plus a generic fallback for other forms.', 'Three-tier resolution: deterministic profile fields first, then exact saved answers for repeat questions, then a contextual AI fallback.', 'Bring your own key via OpenRouter, so you use the model of your choice. The API key is isolated in sandboxed extension storage and never exposed to page scripts.', 'Local-first with zero telemetry and no external backend. Everything runs in the browser.'] },
      {
        type: 'results',
        label: 'What it ships with',
        stats: [
          { value: '640+', caption: 'unit tests passing (646 as of PR #12)' },
          { value: '4', caption: 'dedicated ATS adapters: Ashby, Greenhouse, Lever, Workday' },
          { value: '0', caption: 'telemetry, no external backend' },
        ],
      },
      { type: 'heading', text: 'What I would look at next' },
      { type: 'p', text: 'Autofill you cannot trust is worse than no autofill. The provenance labels are the feature I care most about, and the next work is making more fields resolve as verified instead of guessed, and covering more ATS edge cases with captured fixtures.' },
      { type: 'link', href: 'https://kareer.itsamro.me/', text: 'kareer.itsamro.me' },
      { type: 'link', href: 'https://github.com/Amro212/kareer', text: 'github.com/Amro212/kareer' },
    ],
  },
  'syllabus-sync': {
    slug: 'syllabus-sync',
    year: '2025–2026',
    headline: 'Syllabus Sync: turning syllabus PDFs into editable plans',
    summary: 'iOS app that reads syllabus PDFs, pulls out dates and tasks, and turns them into editable plans with an in-app calendar and import tracking.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'platform', value: 'ios' },
      { label: 'stack', value: 'swiftui' },
      { label: 'backend', value: 'supabase' },
    ],
    mediaBase: 'https://github.com/Amro212/Syllabus-Sync',
    story: [
      { type: 'heading', text: 'The problem' },
      { type: 'p', text: 'Course dates and deadlines live buried inside syllabus PDFs, and students retype them by hand into calendars and to-do lists. Syllabus Sync reads the PDF and does that extraction for you.' },
      { type: 'heading', text: 'What it does' },
      { type: 'list', items: ['Reads syllabus PDFs and pulls out dates and tasks.', 'Turns them into editable plans you can adjust to your own schedule.', 'Shows them in an in-app calendar, so the plan and the dates live in the same place.', 'Tracks imports, so you can see what came in from each syllabus.'] },
      { type: 'heading', text: 'How it is built' },
      { type: 'p', text: 'A SwiftUI iOS app backed by Supabase. The calendar is in-app, and import tracking keeps the extracted dates accountable to the source document.' },
      { type: 'link', href: 'https://github.com/Amro212/Syllabus-Sync', text: 'github.com/Amro212/Syllabus-Sync' },
    ],
  },
  sahara: {
    slug: 'sahara',
    year: '2026',
    headline: 'Sahara: job-search automation that tracks roles and drafts applications',
    summary: 'Job-search automation app for tracking roles, reading job boards, tailoring resume drafts, and automating application flows for Greenhouse and Ashby applications.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'next.js / typescript / playwright' },
      { label: 'scope', value: 'job-search automation' },
      { label: 'flows', value: 'greenhouse and ashby applications' },
    ],
    mediaBase: 'https://github.com/Amro212/JobAutomation',
    story: [
      { type: 'heading', text: 'What it does' },
      { type: 'list', items: ['Tracks roles across the job search in one place.', 'Reads job boards to keep the list current.', 'Tailors resume drafts to each role.', 'Automates application flows for Greenhouse and Ashby applications.'] },
      { type: 'heading', text: 'How it is built' },
      { type: 'p', text: 'A Next.js and TypeScript app using Playwright browser automation, with queue management to work through application flows in order.' },
      { type: 'link', href: 'https://github.com/Amro212/JobAutomation', text: 'github.com/Amro212/JobAutomation' },
    ],
  },
  'legend-community': {
    slug: 'legend-community',
    year: '2026',
    headline: 'LEGEND Community: a clearer front door for the LEGEND project',
    summary: 'Community site for LEGEND at legend.guru, with chart visibility, media updates, and a clearer path for people trying to understand the project quickly.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'next.js / tailwind css' },
      { label: 'site', value: 'legend.guru' },
      { label: 'scope', value: 'community site' },
    ],
    mediaBase: 'https://legend.guru',
    story: [
      { type: 'heading', text: 'What it is' },
      { type: 'p', text: 'A community site for LEGEND at legend.guru. It puts charts front and centre, keeps media updates in one place, and gives newcomers a clearer path to understanding the project quickly instead of digging through scattered links.' },
      { type: 'heading', text: 'How it is built' },
      { type: 'p', text: 'A Next.js site styled with Tailwind CSS, focused on community UX: what a visitor needs to see first, and how fast they can get oriented.' },
      { type: 'link', href: 'https://legend.guru', text: 'legend.guru' },
    ],
  },
};

export function slugFor(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
