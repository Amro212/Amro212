export interface Project {
  title: string;
  year: string;
  tags: string[];
  description: string;
  link?: string;
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
    category: 'research',
  },
  {
    title: 'BaseMCP',
    year: '2025',
    tags: ['MCP', 'Base Network', 'AgentKit', 'Coinbase', 'Onchain Tools'],
    description:
      'Developer-facing MCP workflow product that gives AI agents a unified interface for onchain actions across wallets, contracts, NFTs, and integrations on Base infrastructure.',
    link: 'https://www.basemcp.xyz',
    category: 'software',
  },
  {
    title: 'Gerk',
    year: '2026',
    tags: ['Solana', 'DexScreener', 'Community', 'Brand UX', 'Landing Page'],
    description:
      'Character-driven web product for $GERK that streamlines buy/community entry points and reinforces brand voice with live market context and social touchpoints.',
    link: 'https://gerk.it.com',
    category: 'research',
  },
];
