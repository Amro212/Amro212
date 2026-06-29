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
  category: 'hardware' | 'software' | 'research';
}

export const projects: Project[] = [
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
  },
  {
    title: 'Syllabus Sync',
    year: '2025-2026',
    tags: ['SwiftUI', 'iOS', 'Cloudflare Workers', 'TypeScript', 'Core Data', 'CloudKit'],
    description:
      'iOS and serverless app that reads syllabus PDFs, pulls out dates and tasks, and turns them into editable plans with Apple Calendar sync.',
    link: 'https://github.com/Amro212/Syllabus-Sync',
    previewImages: ['/project-previews/syllabus/syllabus1.png', '/project-previews/syllabus/syllabus2.png'],
    backgroundImage: '/project-previews/syllabus/syllabus-bg-playful.png',
    imageResolution: { width: 1206, height: 2622 },
    category: 'software',
  },
  {
    title: 'LEGEND Community',
    year: '2026',
    tags: ['Next.js', 'Tailwind CSS', 'Solana', 'DexScreener', 'Community UX'],
    description:
      'Community site for LEGEND with token details, chart visibility, media updates, and a clearer path for people trying to understand the project quickly.',
    link: 'https://legend.guru',
    previewImages: ['/project-previews/legend/legend1.png', '/project-previews/legend/legend2.png'],
    category: 'research',
  },
  {
    title: 'BaseMCP',
    year: '2025',
    tags: ['MCP', 'Base Network', 'AgentKit', 'Coinbase', 'Onchain Tools'],
    description:
      'Frontend concept for BaseMCP, shaped around Coinbase-inspired product language and a straightforward explanation of the onchain tooling idea.',
    link: 'https://www.basemcp.xyz',
    previewImages: ['/project-previews/basemcp/basemcp1.png', '/project-previews/basemcp/basemcp2.png'],
    category: 'software',
  },
  {
    title: 'Gerk',
    year: '2025',
    tags: ['Solana', 'DexScreener', 'Community', 'Brand UX', 'Landing Page'],
    description:
      'Character-led landing page for $GERK with buy links, community entry points, live market context, and a brand voice that does not take itself too seriously.',
    link: 'https://gerk.it.com',
    previewImages: ['/project-previews/gerk/gerk1.png', '/project-previews/gerk/gerk2.png'],
    category: 'research',
  },
];
