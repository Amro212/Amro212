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
    title: 'AI Receptionist Automation for Dental Offices',
    year: '2025',
    tags: ['n8n', 'ElevenLabs', 'OpenAI API', 'Google Cloud OAuth', 'Workflow Automation'],
    description:
      'Built an AI voice workflow to handle after-hours dental office calls, capture patient intent, and automate calendar booking steps. Integrated voice generation, LLM response handling, and OAuth-secured scheduling flow to reduce missed bookings and manual follow-up.',
    category: 'software',
  },
  {
    title: 'Solana Sentiment Signal Bot',
    year: '2025',
    tags: ['Python', 'Telegram Bot API', 'Twitter/X Data', 'Signal Filtering', 'Automation'],
    description:
      'Developed a Python bot that tracked selected influencer activity and market sentiment for memecoin monitoring, then pushed filtered real-time alerts to Telegram. Tuned scoring and filtering logic for higher signal relevance and practical day-to-day use.',
    category: 'software',
  },
  {
    title: 'Solana Wallet Pattern Tracker (Reverse Engineering)',
    year: '2025',
    tags: ['Python', 'Blockchain Data', 'Pattern Analysis', 'Scripting', 'Solana'],
    description:
      'Built a reverse-engineering workflow to analyze on-chain wallet behavior and flag potential insider activity patterns in Solana memecoin trading. Focused on improving signal quality through repeatable heuristics and cleaner data handling.',
    category: 'research',
  },
  {
    title: 'Emotion-Aware Quran Reflection Generator',
    year: '2025',
    tags: ['Python', 'LangChain', 'TensorFlow', 'Flask', 'Quran API'],
    description:
      'Designed and prototyped an AI-assisted reflection tool that maps user emotion input to relevant Quran verses and contextual reflections. Project focus is reliable retrieval and respectful, context-aware response generation in a user-facing flow.',
    category: 'research',
  },
  {
    title: 'FPGA Merge Sort Accelerator',
    year: '2024',
    tags: ['VHDL/Verilog', 'FPGA', 'Vivado HLS', '7-Segment Display', 'Performance Timing'],
    description:
      'Implemented an FPGA-based merge sort design for 1000 random values and displayed elapsed execution time on a 7-segment interface. Explored hardware acceleration tradeoffs and timing visibility as part of embedded digital design coursework.',
    category: 'hardware',
  },
  {
    title: 'Single-Cycle RISC-V CPU in Ripes',
    year: '2024',
    tags: ['RISC-V', 'Ripes', 'Computer Architecture', 'Datapath Design', 'Digital Logic'],
    description:
      'Constructed and tested a single-cycle RISC-V processor model in Ripes to reinforce datapath, control logic, and instruction execution fundamentals. Used simulation to validate instruction flow and low-level system behavior.',
    category: 'hardware',
  },
  {
    title: 'TradingSim Market Systems (Roblox)',
    year: '2025',
    tags: ['Game Systems', 'Simulation Design', 'Server-Authoritative Logic', 'Technical Planning'],
    description:
      'Engineered core simulation systems for a server-authoritative trading game, including coin launch cycles, meta rotation behavior, contract events, and challenge mechanics. Emphasis was on robust state design, repeatable balancing loops, and structured spec-driven implementation.',
    category: 'software',
  },
];
