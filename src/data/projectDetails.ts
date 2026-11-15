// PLACEHOLDER CONTENT — PHASE 1 CLONE (see src/data/clone.ts header).
// Project case-study data lifted from the original's own project pages
// (fyi-mirror/projects/*.html and its project-data chunk). For
// ai-agent-builder and quote-builder the section structure and text are
// the original's; for the other five, the header + opening sections are
// the original's and the rest is marked placeholder where the full
// case-study blocks were not available in the mirror.

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
  | { type: 'snapshots'; source: string; cards: { label: string; title: string; text: string; groups: { label: string; items: string[] }[] }[] }
  | { type: 'slack'; image: string; alt: string }
  | { type: 'link'; href: string; text: string }
  | { type: 'youtube'; id: string; title: string }
  | { type: 'image'; src: string; alt: string; ratio?: number }
  | { type: 'video'; src: string; poster: string; alt: string; ratio?: number }
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

const SENSE = 'https://www.designengineer.fyi/projects/sense';
const QUOTE = 'https://www.designengineer.fyi/projects/quote-builder';

export const PROJECT_DETAILS: Record<string, ProjectDetail> = {
  'ai-agent-builder': {
    slug: 'ai-agent-builder',
    year: '2025',
    headline: 'Designing AI Agents to Help Recruiters Hire Faster',
    summary: 'Reimagining recruiting automation to reduce manual work, simplify setup, and keep recruiters in control.',
    details: [
      { label: 'role', value: 'staff product designer' },
      { label: 'scope', value: 'research, product strategy, interaction design' },
      { label: 'product', value: 'sense · ai agent builder' },
      { label: 'result', value: '75–85% less setup time' },
    ],
    mediaBase: SENSE,
    story: [
      { type: 'heading', text: 'Why this started' },
      {
        type: 'decline',
        eyebrow: 'But what actually happened?',
        text: 'After acquiring Skillate ATS, Sense attempted to unify ATS + AI into a single CRM, but Product / AI adoption and hiring outcomes started to decline.',
        meters: [
          { value: '38%', caption: 'Sense AI adoption stagnated at 38%' },
          { value: '62%', caption: 'Recruiters spent more time on manual tasks (sourcing, tracking, and follow-ups)' },
          { value: '47%', caption: 'Hiring outcomes and momentum declined' },
        ],
      },
      { type: 'p', text: 'We had automation. Recruiters still had to do the work.' },
      { type: 'p', text: 'Recruiters spend a lot of time on the operational side of hiring. Screening candidates, asking initial questions, following up, scheduling interviews, and keeping things moving across multiple open roles.' },
      { type: 'label', text: "A recruiter's day, before agents" },
      {
        type: 'journey',
        ratio: 16 / 9,
        steps: [
          { image: `${SENSE}/journey-1.jpg`, text: 'A recruiter starts their day with a long list of open roles to fill.' },
          { image: `${SENSE}/journey-2.jpg`, text: 'They jump between multiple tools: job boards, spreadsheets, ATS, and emails to find and track candidates.' },
          { image: `${SENSE}/journey-3.jpg`, text: "It's hard to keep track: candidates get lost, statuses are unclear, and follow-ups are missed." },
          { image: `${SENSE}/journey-4.jpg`, text: 'They spend too much time on manual work: screening profiles, writing follow-ups, and scheduling interviews.' },
          { image: `${SENSE}/journey-5.jpg`, text: 'Important candidate information is scattered across tools, making it hard to get a complete picture.' },
          { image: `${SENSE}/journey-6.jpg`, text: 'They have to manually decide the next steps for each candidate, again and again.' },
          { image: `${SENSE}/journey-7.jpg`, text: "By the end of the day, they're exhausted, having spent hours on tasks that could be automated." },
        ],
      },
      { type: 'p', text: 'A lot of this work follows the same patterns. And yet, even when automation was available, recruiters still had to configure it themselves.' },
      { type: 'p', text: 'At Sense, our workflow builder asked recruiters to map fields, set triggers, define rules, and configure every little detail before an automation could go live.' },
      { type: 'label', text: 'Old builder · before' },
      { type: 'p', text: 'fields, triggers, rules · 2.4 hrs to set up one campaign' },
      { type: 'p', text: 'One hiring campaign could take around 2.4 hours to set up. That was the part I wanted to rethink.' },
      { type: 'glass', text: 'What if recruiters could **tell an AI agent what they needed done**, instead of having to **build the entire workflow themselves**?' },
      { type: 'p', text: "The idea wasn't to give recruiters another AI tool to manage. It was to let agents handle more of the repetitive work around hiring, while keeping recruiters in control of how that work got done." },
      { type: 'p', text: "First, I wanted to understand why the existing experience wasn't working." },
      { type: 'p', text: 'We spent a week in a cross-functional war room looking at the recruiting experience from different angles. We looked at how recruiters approached their work, where candidates faced friction, and what made existing automation difficult to adopt. A few things stood out.' },
      {
        type: 'snapshots',
        source: 'From the war room board',
        cards: [
          {
            label: 'Who · primary persona', title: 'Sally the Sourcer',
            text: 'Recruiter and sourcer for marketing talent. 4+ years in the industry, works remote, 9 to 5.',
            groups: [
              { label: 'Attitude', items: ['Too much on her plate', 'Under pressure to perform'] },
              { label: 'Needs', items: ['One system to source and recruit', 'Quick talent pipelines', 'Track interested candidates'] },
              { label: 'Goals', items: ['Find top talent, fast', 'Save time for strategy and interviews'] },
            ],
          },
          {
            label: 'Voice of recruiters', title: 'What we heard in the room',
            text: '',
            groups: [
              { label: 'What we heard', items: ["I don't have a list of tasks to do today. I have to browse through jobs and find what's pending.", 'Repeat same steps all the time. What can be automated? Scheduling, prescreening, reviewing resumes.', "Interviewers don't submit the feedback on time, so the pipeline is stuck. Even 2 days of delay matters.", "Too many candidates to reach out to. I can't get to all of them."] },
            ],
          },
          {
            label: 'What · the problem', title: 'A fragmented, manual experience',
            text: '',
            groups: [
              { label: 'The problem', items: ['Fragmented: multiple systems to find, recruit, communicate, schedule and hire.', 'Manual: searching, reviewing resumes, sending to hiring managers, collecting feedback.', 'No talent pool: lists made for later, with no view of past conversations.', 'Hard to search: no way to enter criteria and see who matches.'] },
            ],
          },
          {
            label: 'Why · success metrics', title: 'What success looks like',
            text: '',
            groups: [
              { label: 'Metrics', items: ['Lead -> applicant conversion', 'Top-of-funnel volume', 'Job match -> hire ratio', 'AI-generated audiences & campaigns', 'ARR + TCV', 'Lower career site bounce rate'] },
            ],
          },
        ],
      },
      { type: 'subheading', text: 'Recruiters think about outcomes, not workflows.' },
      { type: 'p', text: "They want to screen candidates, move faster, and make sure they don't miss good people. They don't wake up wanting to configure triggers and conditional logic." },
      { type: 'subheading', text: 'Much of the setup was repetitive.' },
      { type: 'p', text: 'Around 80% of workflow rules overlapped, and 71% of workflows reused nearly identical rules. We were asking recruiters to spend time recreating logic that often looked very similar from one campaign to the next.' },
      { type: 'subheading', text: 'People were dropping off before they got value.' },
      { type: 'p', text: '64% of workflows were abandoned. Field mapping and trigger selection were major points of friction.' },
      { type: 'glass', text: "The problem wasn't that recruiters needed **more powerful automation**. They needed **a much easier way to get it working**." },
      { type: 'heading', text: 'Version 1' },
      { type: 'p', text: 'My first attempt was to make workflows easier to configure. My initial thinking was that recruiters weren\'t adopting automation because they didn\'t understand what it was doing. So, what if we made everything more transparent?' },
      { type: 'label', text: 'Version 1' },
      { type: 'p', text: 'expose the controls · show the logic · let recruiters customize' },
      { type: 'video', src: `${SENSE}/version-1.mp4`, poster: `${SENSE}/version-1-poster.jpg`, alt: 'Version 1 prototype: expose the controls, show the logic, let recruiters customize' },
      { type: 'p', text: 'But the prototype made me question my own assumption. We were making the system easier to inspect, but not necessarily easier to use. Recruiters still had to make too many decisions before they could get anything done. The AI was beginning to feel like another system they had to manage.' },
      { type: 'p', text: 'I had solved for precision when the bigger problem was getting started. So I asked a different question.' },
      { type: 'glass', text: 'What if recruiters **never had to build workflows at all**?' },
      { type: 'heading', text: 'Version 2' },
      { type: 'p', text: 'I called this the second design bet: momentum over precision. We removed the traditional workflow-building experience and moved toward an agent-led setup. It was a much simpler way to get started.' },
      { type: 'label', text: 'Version 2' },
      { type: 'p', text: 'describe the task · the agent sets it up · momentum over precision' },
      { type: 'video', src: `${SENSE}/version-2.mp4`, poster: `${SENSE}/version-2-poster.jpg`, alt: 'Version 2 prototype: describe the task, the agent sets it up' },
      { type: 'p', text: 'But we had gone too far in the other direction. Without enough visibility into how the agent worked, recruiters had new questions: What is the agent actually doing? Can I change something later? What happens when it makes a mistake?' },
      { type: 'p', text: "We had reduced setup effort, but we had also made the experience feel like a black box. That was the trade-off I needed to solve next." },
      { type: 'heading', text: 'Version 3' },
      { type: 'p', text: "The third version was about finding the balance. I didn't want to bring back the complexity of the original workflow builder. But completely hiding the process wasn't the answer either." },
      { type: 'p', text: '1. Replace complex logic trees with a simple sequence. Rather than asking recruiters to understand workflow logic, we presented the agent as a series of understandable steps.' },
      { type: 'p', text: "2. Make the agent's process visible. We organized the experience into clear stages: Greeting → Data → Schedule → Close. Recruiters could understand how the agent would approach the task without having to build every step themselves." },
      { type: 'label', text: 'Version 3' },
      { type: 'p', text: 'greeting -> data -> schedule -> close · control where it matters' },
      { type: 'video', src: `${SENSE}/version-3.mp4`, poster: `${SENSE}/version-3-poster.jpg`, alt: 'Version 3 prototype: greeting, data, schedule, close' },
      { type: 'p', text: '3. Keep control where it matters. We identified a few important points where recruiters could review or intervene, instead of making them configure everything upfront or leaving them with no way to influence the result.' },
      { type: 'glass', text: "The agent should **do more of the setup**, but the recruiter **shouldn't have to blindly trust it**." },
      { type: 'p', text: 'This was the version we took into a limited pilot.' },
      { type: 'heading', text: 'Getting it in front of users' },
      { type: 'p', text: 'There were legitimate concerns about this direction. Product stakeholders were concerned about losing enterprise control. Engineering raised questions about black-box behavior, and Sales was concerned about how larger customers would respond to an AI system making decisions about their recruiting processes.' },
      { type: 'p', text: 'I pushed for reducing the setup effort without permanently removing control. We started with internal HR and two enterprise customers to keep the pilot contained and learn from actual usage before rolling it out more broadly.' },
      {
        type: 'results',
        label: 'The pilot reported',
        stats: [
          { value: '75–85%', caption: 'less setup time' },
          { value: '1.4×', caption: 'higher setup completion' },
          { value: 'Instant', caption: 'time to first candidate captured' },
        ],
        note: 'And less dependency on external operations and support. The product subsequently went live for all corporate users.',
      },
      { type: 'p', text: 'Kudos to my brilliant team: Jr. PD, Sr. Design System, Lead PD and Shai (Staff)' },
      { type: 'slack', image: `${SENSE}/kudos-slack.jpg`, alt: 'Kudos from the team on Slack, celebrating the AI agent builder launch' },
      { type: 'p', text: "For me, the important part wasn't just that setup became faster. It was that we had found a way to move more of the repetitive work into the agent without making the experience completely opaque." },
      { type: 'label', text: "A recruiter's day, with agents" },
      {
        type: 'journey',
        ratio: 16 / 9,
        start: 8,
        steps: [
          { image: `${SENSE}/journey-8.jpg`, text: 'With AI agents, the repetitive work is handled automatically: screening, scheduling, follow-ups, and updates.' },
          { image: `${SENSE}/journey-9.jpg`, text: 'Now recruiters can focus on what really matters: building relationships and hiring the right people, faster.' },
        ],
      },
      { type: 'heading', text: "What I'd look at next" },
      { type: 'p', text: 'Getting an agent up and running is only the first step. The next question is whether recruiters continue to trust it once it starts doing useful work.' },
      { type: 'p', text: "I'd want to understand how often recruiters override an agent, edit its behavior, pause it, or roll back its actions. I'd also look at how quickly it helps build an interview-ready pipeline." },
      { type: 'p', text: 'These would help us understand whether we had genuinely made recruiting easier, rather than simply making the initial setup faster.' },
      { type: 'heading', text: 'My biggest takeaway' },
      { type: 'p', text: 'When I started this project, I thought the challenge was to make AI automation easier to configure. After working through three versions, I realized that the bigger opportunity was to change how people interacted with automation altogether.' },
      { type: 'p', text: 'The first version exposed too much. The second hid too much. The third tried to give recruiters the outcome they wanted, without taking away their ability to understand and influence what happened.' },
      { type: 'p', text: "That balance is especially important in recruiting. There is a lot of repetitive work that an agent can take on, but recruiters still need to make judgments, build relationships, and handle situations that aren't straightforward." },
      { type: 'glass', text: "My goal was to make the agent **do more of the work**, without making the recruiter feel like they'd **lost control of it**." },
    ],
  },
  'quote-builder': {
    slug: 'quote-builder',
    year: '2024',
    headline: 'Redesigning the Quote Builder at Freshworks',
    summary: 'Making quote creation simpler for 1,900+ enterprise users.',
    details: [
      { label: 'role', value: 'lead product designer' },
      { label: 'team', value: 'product management, staff product design' },
      { label: 'product', value: 'freshsales crm' },
      { label: 'users', value: '1,900+ enterprise users' },
    ],
    mediaBase: QUOTE,
    story: [
      { type: 'heading', text: 'Introduction' },
      { type: 'p', text: 'Freshsales is a CRM that helps sales teams manage leads, track deals, and close business, with tools like email tracking, deal pipelines, and AI-powered insights.' },
      { type: 'p', text: 'The Quote Builder is a central part of that workflow, allowing sales teams to create and share customer quotes.' },
      { type: 'p', text: 'However, the experience lacked intuitive navigation and meaningful customization. I redesigned the Quote Builder to make creating professional, branded quotes simpler and more flexible.' },
      { type: 'heading', text: 'My Role' },
      { type: 'p', text: 'I led product design for this project, collaborating with Product Manager Krutish and Staff Product Designer Gopi throughout the process.' },
      { type: 'heading', text: 'The Problem' },
      { type: 'glass', text: 'The Freshsales quote builder lacks **intuitive navigation** and **personalization**, leading to user frustration, **low adoption**, and missed opportunities for enterprise customers to create **branded, compelling quotes**.' },
      { type: 'label', text: "A sales rep's quote, before the redesign" },
      {
        type: 'journey',
        steps: [
          { image: `${QUOTE}/journey-1.jpg`, text: 'The sales rep opens the Quote Builder, wanting to prepare a quote quickly before a customer call.' },
          { image: `${QUOTE}/journey-2.jpg`, text: 'They face a cluttered, confusing interface with unclear navigation and too many fields.' },
          { image: `${QUOTE}/journey-3.jpg`, text: 'They try to create a quote but struggle to find a starting template, with multiple confusing panels and dropdowns.' },
          { image: `${QUOTE}/journey-4.jpg`, text: "A generated quote appears rigid and generic, with no clear way to match the company's branding or create a polished multi-page document." },
          { image: `${QUOTE}/journey-5.jpg`, text: 'They switch between the editor and preview, losing time and confidence.' },
          { image: `${QUOTE}/journey-6.jpg`, text: 'A messy quote workflow leads to delayed quote delivery, and an unhappy customer waiting on the call.' },
        ],
      },
      { type: 'p', text: "Creating a quote shouldn't feel like a complicated task." },
      { type: 'p', text: 'The existing Quote Builder had two major usability issues:' },
      { type: 'subheading', text: '01. Finding your way around was difficult' },
      { type: 'p', text: 'Users struggled to navigate the interface and understand how to create a quote. This added friction to the workflow and made the feature harder to adopt.' },
      { type: 'label', text: 'Impact' },
      { type: 'p', text: "The unclear interface led to an extremely low adoption rate. Users couldn't make effective use of the feature, which meant disengagement and lower conversion." },
      { type: 'subheading', text: '02. Quotes lacked personalization' },
      { type: 'p', text: "Generated quotes offered limited control over branding and layout. Businesses couldn't easily create professional, multi-page documents that reflected their identity." },
      { type: 'label', text: 'Impact' },
      { type: 'p', text: "Without a way to brand their quotes, companies found it hard to adopt the feature: quotes didn't match their identity or meet their branding needs." },
      { type: 'heading', text: 'What We Wanted to Achieve' },
      { type: 'label', text: 'For the business' },
      { type: 'list', items: ['Adoption and engagement: make the tool intuitive enough that enterprise users actually adopt it, strengthening Freshsales as a CRM for seamless, branded, professional quotes.', "Customer retention: remove the pain points behind drop-offs, so the Quote Builder becomes a vital part of customers' workflow.", 'Operational efficiency: build scalable, reusable design components that keep Freshsales features consistent, streamline development, and future-proof the design.'] },
      { type: 'label', text: 'For users' },
      { type: 'list', items: ['Simpler quote building: create and share quotes quickly, with fewer steps and no confusion.', "Branded quotes: customize quotes to match the company's identity.", 'Professional output: build visually appealing, multi-page quotes without unnecessary complexity.'] },
      { type: 'heading', text: 'The Solution' },
      { type: 'subheading', text: '01. A clearer template library' },
      { type: 'p', text: 'I redesigned the template selection experience to help users find the right starting point quickly.' },
      { type: 'label', text: 'What changed' },
      { type: 'p', text: 'A cleaner, more organized template library: pick a ready-made template or start fresh. Ready-made templates that are easier to browse. Template previews that show exactly what you\'re choosing, saving time and avoiding guesswork.' },
      { type: 'video', src: `${QUOTE}/solution-1-loop.mp4`, poster: `${QUOTE}/solution-1-loop-poster.jpg`, alt: 'Redesigned template library' },
      { type: 'label', text: 'Why it matters' },
      { type: 'p', text: 'Users can choose a starting point with more confidence instead of navigating an unfamiliar interface. New users in particular find it quick to understand, making it far easier to get started than the old version.' },
      { type: 'subheading', text: '02. Branded, multi-page quotes' },
      { type: 'p', text: 'The new Quote Builder gives users more control over the structure and appearance of their quotes.' },
      { type: 'label', text: 'Build quotes your way' },
      { type: 'p', text: 'Users can drag and drop content blocks directly onto the page, including text, images, tables, columns, and pricing blocks.' },
      { type: 'video', src: `${QUOTE}/solution-2-drag.mp4`, poster: `${QUOTE}/solution-2-drag-poster.jpg`, alt: 'Drag and drop content blocks onto the page' },
      { type: 'label', text: 'Rearrange with an outline' },
      { type: 'p', text: "A page outline makes it easier to understand the document's structure and move content into the right position." },
      { type: 'video', src: `${QUOTE}/solution-2-outline.mp4`, poster: `${QUOTE}/solution-2-outline-poster.jpg`, alt: 'Page outline for rearranging content' },
      { type: 'label', text: 'Make it your own' },
      { type: 'p', text: "Users can customize the quote's theme and layout to better reflect their company's brand." },
      { type: 'video', src: `${QUOTE}/solution-2-branding.mp4`, poster: `${QUOTE}/solution-2-branding-poster.jpg`, alt: 'Branding and theme customization' },
      { type: 'label', text: 'The result' },
      { type: 'p', text: 'A more flexible editing experience for creating detailed, professional quotes without being constrained by a rigid template.' },
      { type: 'list', items: ["Personalization: quotes reflect the company's branding and look more professional.", 'Rich formatting: multi-page support and better layout options make for more detailed, visually appealing quotes than the old system allowed.', 'Efficiency: changes happen on the fly, with no time lost in the cumbersome workflows of the old design.'] },
      { type: 'subheading', text: '03. A simpler quote creation workflow' },
      { type: 'p', text: 'I restructured the quote creation experience to make the process easier to follow.' },
      { type: 'label', text: 'What improved' },
      { type: 'p', text: 'Clearer steps: Fields follow a more logical order, helping users understand what to do next. Fewer errors: Contextual guidance helps users avoid mistakes and complete the form with confidence. Faster completion: A cleaner interface removes unnecessary steps, significantly cutting the time it took in the cluttered old workflow.' },
      { type: 'video', src: `${QUOTE}/solution-3-loop.mp4`, poster: `${QUOTE}/solution-3-loop-poster.jpg`, alt: 'Simplified quote creation workflow' },
      { type: 'label', text: 'The goal' },
      { type: 'p', text: 'The goal was to help users focus on creating their quotes rather than figuring out how the tool works.' },
      { type: 'heading', text: 'What I Would Do Next' },
      { type: 'p', text: 'I left Freshworks before I could evaluate the redesigned experience with real users. If I had continued, I would have focused on four areas.' },
      {
        type: 'steps',
        items: [
          { title: 'Fix issues early', glyph: 'fix', text: "Even with thorough testing, a project this size lets a few bugs slip through. I'd work closely with engineering and QA to find and fix them quickly after launch." },
          { title: 'Measure adoption', glyph: 'measure', text: 'Track feature usage and collect feedback to understand whether the redesign improves the experience.' },
          { title: 'Talk to users', glyph: 'talk', text: 'Conduct interviews, surveys, and usability tests to identify remaining pain points.' },
          { title: 'Keep improving', glyph: 'improve', text: 'Monitor adoption, usage patterns, and satisfaction, and use what we learn to prioritize the next round of improvements, so the tool stays useful as needs evolve.' },
        ],
      },
      { type: 'heading', text: 'A Personal Note ✌️' },
      { type: 'p', text: 'This was one of my proudest projects at Freshworks. I\'m grateful to the product managers, designers, engineers, QA team, and everyone who helped bring the redesign to life.' },
      { type: 'p', text: 'Thanks for taking the time to explore my work!' },
    ],
  },
  designfolio: {
    slug: 'designfolio',
    year: '2024',
    headline: 'Designfolio: No-Code Portfolio Builder for 9,000+ Users (An Idea I Brought to Life)',
    summary: 'Helping Product folks build bragworthy portfolio websites.',
    details: [
      { label: 'role', value: 'founder, design & product' },
      { label: 'team', value: '3 developers' },
      { label: 'community', value: '3,000+ on discord' },
      { label: 'users', value: '9,000+' },
    ],
    mediaBase: 'https://www.designengineer.fyi/projects/designfolio',
    story: [
      { type: 'heading', text: 'Introduction' },
      { type: 'p', text: 'Designfolio is a no-code portfolio website builder designed specifically for Designers, Product Managers, and Developers. It helps professionals showcase their work digitally in a way that is super fast to set up and effortless to manage.' },
      { type: 'p', text: 'The primary goal of Designfolio was to empower users to create a brag-worthy portfolio website that could be launched quickly and managed with ease.' },
      { type: 'p', text: 'Despite a crowded market of no-code and low-code tools, I noticed a gap: none of the existing options prioritized simplifying the process of managing and updating portfolios. Designfolio addresses this by focusing on simplicity.' },
      { type: 'heading', text: 'Role' },
      { type: 'p', text: 'As the founder of Designfolio, I led both design and product management efforts. I worked closely with a three-member development team to bring the vision to life and actively engaged with our Discord community of over 3,000 members.' },
      { type: 'p', text: 'One of the biggest challenges was analyzing the continuous flow of feedback while leveraging AI to accelerate development and maintain user-friendliness.' },
      { type: 'heading', text: 'Problem Statement' },
      { type: 'p', text: 'Existing portfolio-building tools failed to meet the needs of professionals due to their rigidity, complexity, and difficulty in updating and maintaining portfolios.' },
      { type: 'link', href: 'https://www.designfolio.me/', text: 'designfolio.me' },
      { type: 'placeholder', text: 'Full case-study sections for Designfolio were not available in the mirror; the header and opening sections above are the original\u2019s.' },
    ],
  },
  'mycaptain-onboarding': {
    slug: 'mycaptain-onboarding',
    year: '2023',
    headline: "Improved Onboarding, reducing drop-off by 30% for 1M learners",
    summary: "At MyCaptain, I led the move from long, discouraging forms to an onboarding that builds a learner's Digital Resume as they go, told through storytelling animation.",
    details: [
      { label: 'role', value: 'design manager' },
      { label: 'industry', value: 'edtech' },
      { label: 'platform', value: 'web' },
      { label: 'tested', value: '30 users on maze' },
    ],
    mediaBase: 'https://www.designengineer.fyi/projects/mycaptain',
    story: [
      { type: 'p', text: 'At MyCaptain, we saw an opportunity to innovate our user onboarding process. The main challenge was the lengthy forms that were discouraging users. This signaled a need for a more engaging and user-friendly onboarding experience. As the Design Manager at MyCaptain, I led an initiative to rethink onboarding from the ground up.' },
      { type: 'heading', text: 'Results' },
      { type: 'p', text: 'After implementing the new onboarding process, we saw a significant improvement in user engagement and satisfaction. Users were more motivated to complete the onboarding process, and they found the new storytelling format far more engaging than the old forms.' },
      { type: 'heading', text: 'Research' },
      { type: 'p', text: "We conducted extensive user research to understand the pain points of the current onboarding process. Here's what users shared:" },
      { type: 'heading', text: 'Goal 1: Simplify Onboarding' },
      { type: 'p', text: 'We aimed to simplify onboarding by splitting it into two parts: user onboarding and course onboarding. This was to prevent users from feeling overwhelmed by the amount of information they had to provide at once.' },
      { type: 'heading', text: 'Goal 2: Engage Users' },
      { type: 'p', text: "We introduced storytelling elements into the onboarding process and a visual animation that created a digital resume as users filled out their form. This made the process more engaging for users." },
      { type: 'heading', text: 'Goal 3: Personalize Course Onboarding' },
      { type: 'p', text: 'We personalized the course onboarding process with a video where the co-founder and mentors welcome the users. Users then take an oath/pledge and choose a track: \u201cupskilling or placements.\u201d' },
      { type: 'youtube', id: 'nkLcSxYdKsU', title: 'MyCaptain onboarding demo' },
      { type: 'heading', text: 'Testing using Maze' },
      { type: 'p', text: 'We conducted testing with 30 participants and received valuable feedback that helped us refine the onboarding process.' },
      { type: 'placeholder', text: 'Full case-study sections for Onboarding were not available in the mirror; the sections above are the original\u2019s.' },
    ],
  },
  'soul-design-system': {
    slug: 'soul-design-system',
    year: '2023',
    headline: 'Designing a scalable Design System to reduce development time by 40%',
    summary: 'As Design Manager at MyCaptain, I led the Soul Design System: one design language and a library of reusable components behind every product.',
    details: [
      { label: 'role', value: 'design manager' },
      { label: 'industry', value: 'edtech' },
      { label: 'platform', value: 'web app' },
      { label: 'adoption', value: '90%+ in six months' },
    ],
    mediaBase: 'https://www.designengineer.fyi/projects/soul-design-system',
    story: [
      { type: 'p', text: 'As a Design Manager at MyCaptain, I recognized the need for a unified design language as we experienced rapid growth and expansion. I led the development of the Soul Design System, a tool aimed at ensuring visually cohesive and user-friendly experiences across all our products and services.' },
      { type: 'heading', text: 'Results' },
      { type: 'p', text: 'The Soul Design System had a transformative impact on our design and development workflow.' },
      { type: 'heading', text: 'Research' },
      { type: 'p', text: 'We recognized the challenge of managing a myriad of functions and outcomes in our design department due to the rapid growth and diversification of MyCaptain. The absence of a consistent design language made it difficult to keep experiences coherent.' },
      { type: 'p', text: 'Our objective was to create the Soul Design System, a tool that could ensure design consistency while facilitating a user-friendly and intuitive design experience. This would enhance overall user satisfaction.' },
      { type: 'heading', text: 'Goal 1: Establishing a Unified Design Language' },
      { type: 'p', text: 'We aimed to create a unified design language that would serve as the foundation for all our products. This involved defining consistent typography, color schemes, and component designs that reflected our brand identity and values.' },
      { type: 'heading', text: 'Goal 2: Creating Reusable Components' },
      { type: 'p', text: 'To reduce redundancy and accelerate our design process, we developed a library of reusable components. These components were designed to be versatile and adaptable, ensuring they could be used in a variety of contexts across our products.' },
      { type: 'heading', text: 'Goal 3: Incorporating Motion Design' },
      { type: 'p', text: 'Recognizing the power of motion design in enhancing user experience, we designed the Soul Design System to support and incorporate motion design. This allowed us to create more dynamic, engaging interfaces, adding another dimension to our design language.' },
      { type: 'youtube', id: 'FtQ909r-BIk', title: 'Soul Design System motion' },
      { type: 'placeholder', text: 'Full case-study sections for Soul were not available in the mirror; the sections above are the original\u2019s.' },
    ],
  },
  damnnnn: {
    slug: 'damnnnn',
    year: '',
    headline: 'Building a bite-sized social learning app from zero to 5K active users',
    summary: 'An app for sharing knowledge nuggets in an intuitive, engaging, and ad-free environment.',
    details: [
      { label: 'role', value: 'founder & lead designer' },
      { label: 'platform', value: 'mobile app' },
      { label: 'users', value: '5,000 active' },
      { label: 'launch', value: 'top on product hunt' },
    ],
    mediaBase: 'https://www.designengineer.fyi/projects/damnnnn',
    story: [
      { type: 'p', text: "Our journey with Damnnnn began with a fascination for bite-sized content, specifically micro-blogs, inspired by the work of Chris Do on Instagram. In today's fast-paced, information-heavy world, we recognized the power of these quick, digestible content pieces. From this insight, Damnnnn was born — an app designed to share knowledge nuggets in an intuitive, engaging, and ad-free environment." },
      { type: 'heading', text: 'Results' },
      { type: 'p', text: 'And yes we made it to the top on Product Hunt!' },
      { type: 'heading', text: 'Research' },
      { type: 'p', text: 'In the conceptualization and execution stages, we focused on creating a platform that not only delivers content but also allows users to create and share their own. The Mighty List — a space where users can curate links to resources — was at the heart of that idea.' },
      { type: 'heading', text: 'Goal 1: Intuitive Content Creation' },
      { type: 'p', text: 'Users should be able to create anything they want from \u201cQuiz, Audio Bite, Video Bite, Image, Text\u201d right inside the app. To address this, we aimed to improve the content creation process, making it more intuitive and user-friendly.' },
      { type: 'heading', text: 'Goal 2: Community Building' },
      { type: 'p', text: 'Users expressed a desire for more interaction with other learners. To solve this, we planned to enhance the community features of the app, allowing users to share and discuss their learning materials more easily.' },
      { type: 'heading', text: 'Goal 3: Introducing the \u201cMighty List\u201d' },
      { type: 'p', text: 'Recognizing the need for a more dynamic and comprehensive learning method, we introduced the \u201cMighty List\u201d. This feature allows creators to curate a list of resources associated with a link, enabling learners to access a wide variety of resources in one place.' },
      { type: 'placeholder', text: 'Full case-study sections for Damnnnn were not available in the mirror; the sections above are the original\u2019s.' },
    ],
  },
  gamification: {
    slug: 'gamification',
    year: '2023',
    headline: 'Improving Learning outcomes by 25% through gamification.',
    summary: "Turning MyCaptain's learning platform from an information repository into an interactive one, with clearer navigation, a weekly task list, a calendar and leaderboards.",
    details: [
      { label: 'role', value: 'design manager & lead' },
      { label: 'industry', value: 'edtech' },
      { label: 'research', value: '40+ interviews' },
      { label: 'platform', value: 'web app' },
    ],
    mediaBase: 'https://www.designengineer.fyi/projects/gamification',
    story: [
      { type: 'p', text: "At MyCaptain, we identified an opportunity to overhaul our Learning Management System (LMS) to better cater to our mentees. The central challenge was the low course completion rates, signalling a need to revamp our user experience to engage our mentees more effectively and foster an improved learning environment." },
      { type: 'p', text: 'As the Design Manager and Lead Designer, my responsibility was to steer my dedicated team towards transforming our LMS into a vibrant, interactive platform. Our vision was not just to serve as an information repository, but as a place learners actually wanted to return to.' },
      { type: 'heading', text: 'Results' },
      { type: 'heading', text: 'Research' },
      { type: 'p', text: "We conducted 40+ user interviews with learners from diverse courses at MyCaptain to gather insights about their experiences with the current LMS. Here's what they shared:" },
      { type: 'heading', text: 'Goal 1: Better Navigation' },
      { type: 'p', text: 'Users found it difficult to navigate through the platform and locate specific learning materials. To address this, we aimed to improve the navigation bar for more intuitive access to different sections of the LMS.' },
      { type: 'p', text: "Additionally, we decided to introduce a separate page for 'Projects', making it easier for users to find and manage their project work." },
      { type: 'heading', text: 'Goal 2: Driving Better Engagement' },
      { type: 'p', text: "The current notice board style layout was not engaging enough for users. We decided to switch to a list view, which would present information in a more organized and digestible manner, thereby driving better engagement." },
      { type: 'heading', text: 'Goal 3: Better Track of the Program' },
      { type: 'placeholder', text: 'Full case-study sections for Gamified LMS were not available in the mirror; the sections above are the original\u2019s.' },
    ],
  },
};

export function slugFor(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
