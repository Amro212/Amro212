// AMRO'S CONTENT — PHASE 2 PERSONALIZATION (see src/data/clone.ts header).
// Case-study data for Amro Abed Moosa's own projects, in the same
// ProjectDetail format the clone's detail viewer already renders.
// Everything here is written from verified facts only: no invented
// metrics and no invented dates.
//
// Supportive UI, not product screenshots: the case studies use the
// viewer's own blocks (journey step cards, sticky-note snapshots,
// results stats, glass pull-quotes) to support the story, the way
// Shai's case studies do. No AI mockups of the product UI, no fake
// screenshots. Real media only (LEGEND photos and video, the
// Transformer chart, the Syllabus Sync screenshot).

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
      {
        type: 'snapshots',
        source: 'Every application asks for the same thing',
        cards: [
          {
            label: 'The repetition',
            title: 'What you type every time',
            text: 'The same details, form after form, with no memory between them.',
            groups: [
              { label: 'Contact', items: ['Full name', 'Email', 'Phone', 'Location'] },
              { label: 'Work', items: ['Job titles', 'Dates', 'Employers', 'Descriptions'] },
              { label: 'Education', items: ['Degree', 'School', 'Graduation year'] },
            ],
          },
          {
            label: 'Where it breaks',
            title: 'The friction',
            text: '',
            groups: [
              {
                label: 'Notes',
                items: [
                  'Full name, email, phone, and location. Every single form, from scratch.',
                  'Work history: titles, dates, employers, descriptions. Typed out again.',
                  'Education: degree, school, graduation year. Again, and again.',
                  'Skills, one box at a time, in whatever order the form wants them.',
                ],
              },
            ],
          },
        ],
      },
      { type: 'heading', text: 'How an application gets filled' },
      {
        type: 'journey',
        steps: [
          { text: 'Open the application. Kareer reads the form and finds every field that needs an answer.' },
          { text: 'Match to your resume. Each question is matched to your profile and saved answers.' },
          { text: 'Fill with a label. Every value carries a provenance label: verified, saved, inferred, guessed, or unresolved.' },
          { text: 'Review before you submit. Auto Submit stays off by default, so you always check and send it yourself.' },
        ],
      },
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
      { type: 'link', href: 'https://chrome.google.com/webstore/detail/gnbkbdbpajlpclicmapjghpodogkgblf', text: 'Chrome Web Store' },
      { type: 'link', href: 'https://addons.mozilla.org/addon/kareer/', text: 'Firefox Add-ons' },
      { type: 'link', href: 'https://github.com/Amro212/kareer', text: 'github.com/Amro212/kareer' },
    ],
  },
  viextra: {
    slug: 'viextra',
    year: '2026',
    headline: 'VI Extra: a GTA 6 hub with a verified map, live prices, guides, and news',
    summary: 'GTA 6 hub at viextra.com: an interactive Leonida map with 771 verified finds, edition prices tracked across keyshops, guides players actually read, and a news page, all kept current by an agent that researches and verifies everything before it goes up. No account, no paywall. Launched November 2026.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'react / typescript / vite / leaflet / tailwind' },
      { label: 'platform', value: 'web' },
      { label: 'launch', value: 'nov 2026' },
    ],
    mediaBase: 'https://viextra.com',
    story: [
      { type: 'link', href: 'https://viextra.com', text: 'viextra.com' },
      { type: 'link', href: 'https://github.com/Amro212/gta6-site', text: 'github.com/Amro212/gta6-site' },
      { type: 'heading', text: 'Why I built it' },
      { type: 'p', text: 'GTA 6 is the most anticipated game of the decade, and players deserve one place they can trust for everything around it. I built VI Extra to be that place: a map you can trust, prices you can check, and guides that actually help, all kept up to date so players keep coming back.' },
      {
        type: 'snapshots',
        source: 'One hub, not just a map',
        cards: [
          {
            label: 'The map',
            title: 'Every find verified before it goes on',
            text: 'The part players come for first.',
            groups: [
              { label: 'What it holds', items: ['771 verified finds with per-pin evidence', '48 curated pins, placed by hand', 'Real-life photos and addresses on every pin'] },
              { label: 'Progress', items: ['Mark places found as you explore', 'Region guides for every part of Leonida'] },
            ],
          },
          {
            label: 'Beyond the map',
            title: 'The rest of the site',
            text: 'The map is the main thing, but it is not the whole site.',
            groups: [
              { label: 'Around the game', items: ['News page, updated as stories break', 'Edition prices tracked across keyshops', 'Guides players actually read, like Strange Totem'] },
              { label: 'For players', items: ['48 news stories on the news page', 'Submit your own finds with a screenshot', 'No account, no paywall, no backend'] },
            ],
          },
        ],
      },
      { type: 'heading', text: 'How a find goes from rumour to pin' },
      {
        type: 'journey',
        steps: [
          { text: 'Watch for what is new. The agent checks for new finds every 6 hours, and news and price drops every 4 hours.' },
          { text: 'Research the find. It digs into the source and checks the evidence behind it.' },
          { text: 'Verify against the map data. Only verified items go up. Anything unconfirmed stays out.' },
          { text: 'Place the pin precisely. The pin lands exactly on the spot, with the supporting image on it so players can find the place.' },
        ],
      },
      { type: 'glass', text: 'VI Extra alone is a brand nobody searches for. Titles and meta have to carry the searchable phrases, like GTA 6 Map, or the page never gets clicked even when it ranks.' },
      { type: 'heading', text: 'How it stays current' },
      { type: 'list', items: ['Leaflet map with clustered pins, built on the same coordinate data as the base map, so every pin lands exactly where the game puts it.', 'An agent keeps the site current: it researches new finds, verifies them, and places the pins itself. It is not a script copying a feed.', 'The editions page tracks prices across keyshops, so players can see the best deal instead of the sticker price.', 'Player submissions at /submit, screenshot required, with no backend, no account, and no paywall anywhere on the site.'] },
      {
        type: 'results',
        label: 'Google Search Console, last 28 days through Nov 23, 2026',
        stats: [
          { value: '56', caption: 'clicks, 51 of them from the Strange Totem guide' },
          { value: '3,049', caption: 'impressions' },
          { value: '1.8%', caption: 'click-through rate' },
          { value: '5.1', caption: 'average position' },
        ],
        note: 'The Trinity Apartments guide has the most impressions at 2,081 but only 3 clicks at 0.1% CTR, position 3.8. That gap is why titles keep getting reworked to carry the searchable phrases.',
      },
      { type: 'heading', text: 'What gets built next' },
      { type: 'p', text: 'Everything is logged, and the data decides what gets built next. The Strange Totem guide pulling 51 of 56 clicks is why more guides like it are coming, and progress tracking shows which finds players actually chase. The site grows toward whatever players pay attention to.' },
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
      { type: 'glass', text: 'Syllabus dates should not have to be retyped by hand.' },
      { type: 'heading', text: 'How an import works' },
      {
        type: 'journey',
        steps: [
          { text: 'Pick the syllabus PDF. Choose the file for the course you want to plan.' },
          { text: 'Extract dates and tasks. The app pulls out deadlines, exams, and assignments.' },
          { text: 'Review the plan. Check the extracted dates and adjust them to your schedule.' },
          { text: 'See it in the calendar. The plan lives in the in-app calendar, next to the dates.' },
          { text: 'Track the import. Every import is recorded, so you can see what came from each syllabus.' },
        ],
      },
      { type: 'heading', text: 'What it does' },
      { type: 'list', items: ['Reads syllabus PDFs and pulls out dates and tasks.', 'Turns them into editable plans you can adjust to your own schedule.', 'Shows them in an in-app calendar, so the plan and the dates live in the same place.', 'Tracks imports, so you can see what came in from each syllabus.'] },
      { type: 'heading', text: 'How it is built' },
      { type: 'p', text: 'A SwiftUI iOS app backed by Supabase. The calendar is in-app, and import tracking keeps the extracted dates accountable to the source document.' },
      { type: 'link', href: 'https://github.com/Amro212/Syllabus-Sync', text: 'github.com/Amro212/Syllabus-Sync' },
    ],
  },
  'transformer-training-optimization': {
    slug: 'transformer-training-optimization',
    year: '2026',
    headline: 'Transformer Training Optimization: benchmarking four ways to train a GPT-style model on one GPU',
    summary: 'Single-GPU benchmark comparing four training setups on a GPT-style model: baseline PyTorch, AMP, gradient checkpointing, and AMP plus checkpointing. Each mode gets a batch-size sweep until out of memory, comparing VRAM use, step time, throughput, and max batch.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'pytorch / python' },
      { label: 'hardware', value: 'rtx 3060 12gb, single gpu' },
      { label: 'model', value: 'gpt-style, ~135m params, seq len 512' },
    ],
    mediaBase: 'https://github.com/Amro212/transformer-training-benchmark',
    story: [
      { type: 'heading', text: 'What I benchmarked' },
      { type: 'p', text: 'Four training setups on the same GPT-style model, about 135M parameters with a sequence length of 512, on a single RTX 3060 with 12GB of VRAM. Each mode gets a batch-size sweep until it runs out of memory, so the comparison is at each mode\'s real limit, not at one arbitrary batch size.' },
      { type: 'list', items: ['Baseline PyTorch.', 'AMP mixed precision.', 'Gradient checkpointing.', 'AMP plus checkpointing.'] },
      { type: 'heading', text: 'How the benchmark runs' },
      {
        type: 'steps',
        items: [
          { title: 'Pick the four modes', text: 'Baseline PyTorch, AMP, gradient checkpointing, and AMP plus checkpointing, all on the same model and GPU.' },
          { title: 'Sweep batch size until it breaks', text: 'Each mode gets a batch-size sweep until it runs out of memory, so the comparison is at each mode\'s real limit.' },
          { title: 'Measure what matters', text: 'VRAM use, step time, throughput, and max batch, recorded at each mode\'s limit.' },
          { title: 'Compare at the limit', text: 'The numbers are read at each mode\'s max batch before out of memory, not at one arbitrary batch size.' },
        ],
      },
      { type: 'heading', text: 'What the numbers say' },
      {
        type: 'results',
        label: 'At each mode\'s max batch before running out of memory',
        stats: [
          { value: '64', caption: 'max batch with AMP plus checkpointing, vs 24 baseline' },
          { value: '8,710', caption: 'tokens per second with AMP plus checkpointing, vs 2,434 baseline' },
          { value: '14,928 MB', caption: 'peak VRAM with AMP plus checkpointing, the lowest of the four' },
        ],
        note: 'Checkpointing alone reaches batch 56 but each step takes 10.08s, the slowest of the four. AMP alone is faster at 4,163 tokens/s but hits the memory wall sooner at batch 36.',
      },
      { type: 'image', src: 'https://raw.githubusercontent.com/Amro212/transformer-training-benchmark/master/test2_3/plots/mode_comparison_overview.png', alt: 'Mode comparison overview chart', ratio: 3 / 2 },
      { type: 'heading', text: 'What I learned' },
      { type: 'list', items: ['AMP was the simplest change and gave a clear speed and memory bump with almost no code changes.', 'Checkpointing saves memory by recomputing activations on backward, so steps take longer.', 'Using both together was the best result on this 12GB card: bigger batches and higher throughput.', 'Sweeping batch size until out of memory matters. A single batch size misses where each mode actually tops out.'] },
      { type: 'link', href: 'https://github.com/Amro212/transformer-training-benchmark', text: 'github.com/Amro212/transformer-training-benchmark' },
    ],
  },
  curlai: {
    slug: 'curlai',
    year: '2026',
    headline: 'CurlAI: a webcam app that counts your bicep curls with a custom-trained model',
    summary: 'Machine learning computer vision app that tracks and counts bicep curls in real time using a custom-trained LinearSVC model, with a live webcam feed and a rep counter.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'stack', value: 'python / opencv / scikit-learn' },
      { label: 'model', value: 'linearsvc, custom-trained' },
      { label: 'platform', value: 'desktop, webcam' },
    ],
    mediaBase: 'https://github.com/Amro212/CurlAI',
    story: [
      { type: 'heading', text: 'What it does' },
      { type: 'p', text: 'CurlAI watches your bicep curls through a webcam and counts your reps automatically. A custom-trained model classifies whether your arm is extended or contracted, and tracking the transitions between those states is what counts a full repetition.' },
      { type: 'glass', text: 'One model, one job, running in real time.' },
      { type: 'heading', text: 'How a rep gets counted' },
      {
        type: 'journey',
        steps: [
          { text: 'Webcam captures frames. OpenCV reads the live feed from your laptop camera.' },
          { text: 'Model classifies the arm. A custom-trained LinearSVC decides whether the arm is extended or contracted.' },
          { text: 'Transition counts a rep. Moving from extended to contracted and back is one full repetition.' },
          { text: 'Counter updates live. The Tkinter interface shows the feed and the current rep count.' },
        ],
      },
      { type: 'heading', text: 'How it works' },
      { type: 'list', items: ['OpenCV captures frames from the webcam.', 'A LinearSVC model from scikit-learn, trained on custom image data, classifies arm extension and contraction.', 'Transitions between extended and contracted states count a completed rep.', 'A Tkinter interface shows the live feed and the current rep count.'] },
      { type: 'heading', text: 'What it is' },
      { type: 'p', text: 'A small, focused computer vision project: one model, one job, running in real time on a laptop webcam. No cloud, no API, the whole thing runs locally.' },
      { type: 'link', href: 'https://github.com/Amro212/CurlAI', text: 'github.com/Amro212/CurlAI' },
    ],
  },
  legend: {
    slug: 'legend',
    year: '2025–2026',
    headline: 'LEGEND: a Solana memecoin whose creator fees built a school in Nigeria',
    summary: 'A memecoin on Solana, a gentleman lizard and "the most polite reply guy on Solana", launched on pump.fun and now trading on PumpSwap. The creator fees helped fund the construction of a school in Nigeria, with the opening celebration documented in the gallery on legend.guru.',
    details: [
      { label: 'role', value: 'creator' },
      { label: 'chain', value: 'solana' },
      { label: 'launch', value: 'pump.fun, dec 2025' },
      { label: 'contract', value: 'J4ixzS…96pump' },
    ],
    mediaBase: 'https://legend.guru',
    story: [
      { type: 'heading', text: 'What it is' },
      { type: 'p', text: 'LEGEND is a memecoin on Solana. The character is a gentleman lizard in a tuxedo, "the most polite reply guy on Solana": no screaming, no begging, no "next 100x" promises, just a calm flex and a community that gets it. It launched on pump.fun in December 2025 and now trades on PumpSwap.' },
      { type: 'image', src: 'https://www.legend.guru/hero-frog.png', alt: 'LEGEND, the gentleman lizard in a tuxedo' },
      { type: 'heading', text: 'The part that matters: a school in Nigeria' },
      { type: 'p', text: 'PumpFun creator fees helped support the construction of a school in Nigeria. The opening celebration is documented in the gallery on legend.guru: children, families, and community leaders at the new school building, under a banner reading "LEGEND COIN BUILD A SCHOOL PROJECT".' },
      { type: 'heading', text: 'How fees became a school' },
      {
        type: 'journey',
        steps: [
          { text: 'Coin launches on pump.fun. LEGEND goes live in December 2025, a gentleman lizard with no screaming and no promises.' },
          { text: 'Creator fees accumulate. Trading on PumpSwap generates creator fees from every trade.' },
          { text: 'Fees fund the school. The creator fees help support construction of a school in Nigeria.' },
          { text: 'School opens. The opening celebration brings children, families, and community leaders to the new building.' },
        ],
      },
      { type: 'video', src: 'https://www.legend.guru/gallery/Children_gathered_outside_the_school_during_the_opening_celebration.mp4', poster: 'https://www.legend.guru/gallery/Guests_and_organizers_posing_together_during_the_school_launch_event.jpeg', alt: 'Children gathered outside the school during the opening celebration', caption: 'Children gathered outside the school during the opening celebration.' },
      { type: 'image', src: 'https://www.legend.guru/gallery/Large_group_photo_of_children_families_and_supporters_at_the_new_school.jpeg', alt: 'Large group photo of children, families, and supporters at the new school' },
      { type: 'image', src: 'https://www.legend.guru/gallery/Community_leaders%20and%20supporters%20standing%20together%20at%20the%20school%20opening_ceremony..jpeg', alt: 'Community leaders and supporters standing together at the school opening ceremony' },
      {
        type: 'results',
        label: 'Where it stands',
        stats: [
          { value: '1', caption: 'school built in Nigeria, funded by creator fees' },
          { value: 'Dec 2025', caption: 'launched on pump.fun, now trading on PumpSwap' },
          { value: '~$278k', caption: 'peak market cap, Nov 15, 2026' },
        ],
        note: 'Market cap is about $25.9k now; 24h volume about $886, liquidity about $15.6k (DexScreener, Nov 15, 2026). Memecoin numbers move fast; the school is the part that stays.',
      },
      { type: 'glass', text: 'The price moves fast. The school is the part that stays.' },
      { type: 'p', text: 'LEGEND is a memecoin with no intrinsic value or expectation of financial return, as the site itself states. The point of the project was never the price: it was a community that turned trading fees into a building full of kids.' },
      { type: 'link', href: 'https://legend.guru', text: 'legend.guru' },
      { type: 'link', href: 'https://dexscreener.com/solana/8Ria12cUpYXAR42Lx4eGPrPFw9VRJ62y2pUpbdMkkWvP', text: 'DexScreener: LEGEND / SOL' },
    ],
  },
};

export function slugFor(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
