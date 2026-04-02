export interface Project {
  title: string;
  year: string;
  tags: string[];
  description: string;
  link?: string;
  previewImages?: string[];
  category: 'hardware' | 'software' | 'research';
}

export const projects: Project[] = [
  {
    title: 'Job Application Automation Workflow',
    year: '2026',
    tags: ['TypeScript', 'Node.js', 'Playwright', 'Stagehand', 'SQLite', 'Next.js'],
    description:
      'Local-first job pipeline that discovers roles from ATS sources, generates tailored resume and cover-letter artifacts, and automates repetitive form-filling with browser + AI workflow logic.',
    link: 'https://github.com/Amro212/JobAutomation',
    category: 'software',
  },
  {
    title: 'Syllabus Sync',
    year: '2025-2026',
    tags: ['SwiftUI', 'iOS', 'Cloudflare Workers', 'TypeScript', 'Core Data', 'CloudKit'],
    description:
      'Hybrid iOS and serverless app that turns syllabus PDFs into structured student plans, with editable timelines and one-tap Apple Calendar sync for cleaner semester planning.',
    link: 'https://github.com/Amro212/Syllabus-Sync',
    category: 'software',
  },
  {
    title: 'LEGEND Community Impact Platform',
    year: '2026',
    tags: ['Next.js', 'Tailwind CSS', 'Solana', 'DexScreener', 'Community UX'],
    description:
      'Branded community web experience for LEGEND that combines narrative storytelling, contract and chart visibility, and media-backed updates tied to real-world school-support efforts.',
    link: 'https://legend.guru',
    previewImages: ['/project-previews/legend1.png', '/project-previews/legend2.png'],
    category: 'research',
  },
  {
    title: 'BaseMCP',
    year: '2025',
    tags: ['MCP', 'Base Network', 'AgentKit', 'Coinbase', 'Onchain Tools'],
    description:
      'Frontend concept site for BaseMCP, built as a passion project inspired by Coinbase, focused on presenting the product clearly through a polished, developer-friendly interface.',
    link: 'https://www.basemcp.xyz',
    previewImages: ['/project-previews/basemcp1.png', '/project-previews/basemcp2.png'],
    category: 'software',
  },
  {
    title: 'Gerk',
    year: '2025',
    tags: ['Solana', 'DexScreener', 'Community', 'Brand UX', 'Landing Page'],
    description:
      'Character-driven web product for $GERK that streamlines buy/community entry points and reinforces brand voice with live market context and social touchpoints.',
    link: 'https://gerk.it.com',
    previewImages: ['/project-previews/gerk1.png', '/project-previews/gerk2.png'],
    category: 'research',
  },
];
