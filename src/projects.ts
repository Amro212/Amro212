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
      'Job automation SaaS that helps users track their job hunt, parse job boards, tailor resumes, and automate application workflows for platforms like Greenhouse and Ashby.',
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
      'Hybrid iOS and serverless app that turns syllabus PDFs into structured student plans, with editable timelines and one-tap Apple Calendar sync for cleaner semester planning.',
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
      'Branded community web experience for LEGEND that combines narrative storytelling, contract and chart visibility, and media-backed updates tied to real-world school-support efforts.',
    link: 'https://legend.guru',
    previewImages: ['/project-previews/legend/legend1.png', '/project-previews/legend/legend2.png'],
    category: 'research',
  },
  {
    title: 'BaseMCP',
    year: '2025',
    tags: ['MCP', 'Base Network', 'AgentKit', 'Coinbase', 'Onchain Tools'],
    description:
      'Frontend concept site for BaseMCP, built as a passion project inspired by Coinbase, focused on presenting the product clearly through a polished, developer-friendly interface.',
    link: 'https://www.basemcp.xyz',
    previewImages: ['/project-previews/basemcp/basemcp1.png', '/project-previews/basemcp/basemcp2.png'],
    category: 'software',
  },
  {
    title: 'Gerk',
    year: '2025',
    tags: ['Solana', 'DexScreener', 'Community', 'Brand UX', 'Landing Page'],
    description:
      'Character-driven web product for $GERK that streamlines buy/community entry points and reinforces brand voice with live market context and social touchpoints.',
    link: 'https://gerk.it.com',
    previewImages: ['/project-previews/gerk/gerk1.png', '/project-previews/gerk/gerk2.png'],
    category: 'research',
  },
];
