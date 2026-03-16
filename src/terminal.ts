import { projects } from './projects';

interface FSNode {
  name: string;
  type: 'dir' | 'file';
  children?: Map<string, FSNode>;
  content?: string;
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildFileSystem(): FSNode {
  const root: FSNode = {
    name: '/',
    type: 'dir',
    children: new Map(),
  };

  const aboutFile: FSNode = {
    name: 'about.txt',
    type: 'file',
    content: [
      '===========================================',
      '  About Me',
      '===========================================',
      '',
      'Amro Abedmoosa',
      '4th-year Computer Engineering student',
      'University of Guelph | Expected May 2026',
      'GPA: 3.3 / 4.0 | Scholarships/Bursaries: $6,000',
      '',
      'Focus areas:',
      '  - Software Engineering and Automation',
      '  - AI Workflow Integration (n8n + LLM APIs)',
      '  - Embedded Systems and FPGA Design',
      '  - IT Support and Technical Operations',
    ].join('\n'),
  };

  const contactFile: FSNode = {
    name: 'contact.txt',
    type: 'file',
    content: [
      '===========================================',
      '  Contact Info',
      '===========================================',
      '',
      'Open to full-time new-grad roles (2026).',
      'Target roles: software, embedded, AI automation, IT systems.',
      'Contact details: update with your active email + LinkedIn URL.',
    ].join('\n'),
  };

  const skillsFile: FSNode = {
    name: 'skills.txt',
    type: 'file',
    content: [
      '===========================================',
      '  Technical Skills',
      '===========================================',
      '',
      'Languages:    Python, Java, SQL, VHDL, Verilog, JavaScript',
      'AI/ML:        OpenAI API, ElevenLabs, LangChain, TensorFlow',
      'Automation:   n8n, API integrations, workflow scripting',
      'Embedded:     FPGA design, Vivado HLS, RISC-V (Ripes)',
      'Web/IT:       WordPress, web content systems, technical support',
      'Tools:        Git, Google Cloud OAuth workflows, Telegram bot integration',
    ].join('\n'),
  };

  root.children!.set('about.txt', aboutFile);
  root.children!.set('contact.txt', contactFile);
  root.children!.set('skills.txt', skillsFile);

  const projectsDir: FSNode = {
    name: 'projects',
    type: 'dir',
    children: new Map(),
  };

  for (const project of projects) {
    const slug = slugify(project.title);
    const projectDir: FSNode = {
      name: slug,
      type: 'dir',
      children: new Map(),
    };

    projectDir.children!.set('README.md', {
      name: 'README.md',
      type: 'file',
      content: [
        `# ${project.title}`,
        `> ${project.year} | ${project.category}`,
        '',
        project.description,
        '',
        `Tags: ${project.tags.join(', ')}`,
        ...(project.link ? ['', `Link: ${project.link}`] : []),
      ].join('\n'),
    });

    projectDir.children!.set('tech-stack.txt', {
      name: 'tech-stack.txt',
      type: 'file',
      content: project.tags.map((tag) => `  - ${tag}`).join('\n'),
    });

    projectsDir.children!.set(slug, projectDir);
  }

  root.children!.set('projects', projectsDir);
  return root;
}

function resolvePath(root: FSNode, cwd: string[], pathStr: string): { node: FSNode | null; absPath: string[] } {
  let parts: string[];

  if (pathStr === '/') {
    return { node: root, absPath: [] };
  }

  if (pathStr.startsWith('/')) {
    parts = pathStr.split('/').filter(Boolean);
  } else if (pathStr.startsWith('~/')) {
    parts = pathStr.slice(2).split('/').filter(Boolean);
  } else {
    parts = [...cwd, ...pathStr.split('/').filter(Boolean)];
  }

  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(part);
  }

  let current = root;
  for (const part of resolved) {
    if (current.type !== 'dir' || !current.children?.has(part)) {
      return { node: null, absPath: resolved };
    }
    current = current.children.get(part)!;
  }

  return { node: current, absPath: resolved };
}

function formatCwd(cwd: string[]): string {
  return cwd.length === 0 ? '~' : `~/${cwd.join('/')}`;
}

type TerminalOutput = { text: string; className?: string };

const HELP_TEXT: TerminalOutput[] = [
  { text: '===========================================', className: 'term-dim' },
  { text: '  AMRO-OS 1.0 Available Commands', className: 'term-bright' },
  { text: '===========================================', className: 'term-dim' },
  { text: '' },
  { text: '  ls              List directory contents' },
  { text: '  cd <path>       Change directory' },
  { text: '  cat <section>   Jump to a section or project' },
  { text: '' },
  { text: '  Tip: cd projects then cat <project-name>', className: 'term-dim' },
];

const WELCOME_LINES: TerminalOutput[] = [
  { text: '===========================================', className: 'term-dim' },
  { text: '  SYSTEM INITIALIZATION SUCCESSFUL', className: 'term-bright' },
  { text: '===========================================', className: 'term-dim' },
  { text: '' },
  { text: 'Welcome to the Amro-OS terminal.', className: 'term-bright' },
  { text: "I'm Amro Abedmoosa, a Computer Engineering student." },
  { text: 'Available commands: ls, cd, cat, help', className: 'term-dim' },
  { text: '' },
];

export class Terminal {
  private root: FSNode;
  private cwd: string[] = [];
  private history: string[] = [];
  private historyIndex = -1;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: Array<Array<{ text: string; color: string }>> = [];
  private onRenderCallback: () => void;
  private inputEl: HTMLInputElement;
  private portraitImg: HTMLImageElement | null = null;
  private processedPortraitCanvas: HTMLCanvasElement | null = null;
  private readonly CHAR_H = 30;
  private readonly FRAME_INTERVAL_MS = 1000 / 18;
  private readonly STATIC_WAVE_CYCLE_MS = 1650;
  private lastFrameTime = 0;

  constructor(containerSelector: string, onRender: () => void) {
    this.root = buildFileSystem();
    this.onRenderCallback = onRender;

    const container = document.querySelector(containerSelector) as HTMLElement | null;
    if (!container) {
      throw new Error(`Terminal container not found: ${containerSelector}`);
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 768;
    this.ctx = this.canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.style.position = 'absolute';
    this.inputEl.style.opacity = '0';
    this.inputEl.style.pointerEvents = 'none';
    container.appendChild(this.inputEl);

    document.addEventListener('keydown', () => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        this.inputEl.focus({ preventScroll: true });
      }
    });

    this.inputEl.addEventListener('keydown', (event) => this.handleKeyDown(event));
    this.inputEl.addEventListener('input', () => this.requestRender());

    this.printLines(WELCOME_LINES);
    this.setupPortrait('/portrait.jpg');
    this.render(performance.now());
  }

  private setupPortrait(src: string): void {
    this.portraitImg = new Image();
    this.portraitImg.crossOrigin = 'anonymous';
    this.portraitImg.src = src;
    this.portraitImg.onload = () => {
      this.processPortrait();
    };
  }

  private processPortrait(): void {
    if (!this.portraitImg) return;

    const width = 240;
    const height = 288;
    const pixelSize = 4;
    const cols = Math.floor(width / pixelSize);
    const rows = Math.floor(height / pixelSize);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = cols;
    tempCanvas.height = rows;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(this.portraitImg, 0, 0, cols, rows);

    const imageData = tempCtx.getImageData(0, 0, cols, rows);
    const data = imageData.data;

    this.processedPortraitCanvas = document.createElement('canvas');
    this.processedPortraitCanvas.width = width;
    this.processedPortraitCanvas.height = height;
    const portraitCtx = this.processedPortraitCanvas.getContext('2d')!;

    const bayer = [
      [0, 2],
      [3, 1],
    ];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const idx = (y * cols + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const threshold = (bayer[y % 2][x % 2] + 0.5) / 4;

        let color = 'transparent';
        if (brightness > threshold * 1.2) {
          color = '#cee7d7';
        } else if (brightness > threshold * 0.6) {
          color = '#a4e8be';
        } else if (brightness > threshold * 0.2) {
          color = '#2f8e65';
        }

        if (color !== 'transparent') {
          portraitCtx.fillStyle = color;
          portraitCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private requestRender(): void {
    this.lastFrameTime = 0;
  }

  private parseOutput(output: TerminalOutput): Array<{ text: string; color: string }> {
    let color = '#cee7d7';
    if (output.className === 'term-dim') color = 'rgba(206, 231, 215, 0.56)';
    if (output.className === 'term-bright') color = '#ffffff';
    if (output.className === 'term-error') color = '#ff5b5b';
    if (output.className === 'term-echo') color = '#b8b2a8';

    const segments: Array<{ text: string; color: string }> = [];
    const spanRegex = /<span class="([^"]+)">([^<]*)<\/span>|([^<]+)/g;
    let match: RegExpExecArray | null;

    if (!output.text.includes('<span')) {
      return [{ text: output.text, color }];
    }

    while ((match = spanRegex.exec(output.text)) !== null) {
      if (match[1]) {
        let segmentColor = '#cee7d7';
        if (match[1].includes('term-dir')) segmentColor = '#a9d1bc';
        if (match[1].includes('term-file')) segmentColor = '#d4cfc8';
        if (match[1].includes('term-dim')) segmentColor = 'rgba(206, 231, 215, 0.56)';
        if (match[1].includes('term-bright')) segmentColor = '#ffffff';
        segments.push({ text: match[2], color: segmentColor });
      } else if (match[3]) {
        segments.push({ text: match[3], color });
      }
    }

    return segments;
  }

  private printLine(output: TerminalOutput): void {
    this.buffer.push(this.parseOutput(output));
  }

  private printLines(outputs: TerminalOutput[]): void {
    outputs.forEach((output) => this.printLine(output));
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const command = this.inputEl.value.trim();
      this.inputEl.value = '';

      const prompt = `user@amro-os:${formatCwd(this.cwd)}$ `;
      this.printLine({ text: prompt + command, className: 'term-echo' });

      if (command) {
        this.history.push(command);
        this.historyIndex = this.history.length;
        this.executeCommand(command);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputEl.value = this.history[this.historyIndex];
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.inputEl.value = this.history[this.historyIndex];
      } else {
        this.historyIndex = this.history.length;
        this.inputEl.value = '';
      }
      return;
    }

    if (event.key === 'Tab') {
      event.preventDefault();
      this.autocomplete();
    }
  }

  private executeCommand(input: string): void {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const arg = parts[1];

    switch (cmd) {
      case 'ls':
        this.cmdLs(arg);
        break;
      case 'cd':
        this.cmdCd(arg);
        break;
      case 'cat':
        this.cmdCat(arg);
        break;
      case 'help':
        this.printLines(HELP_TEXT);
        break;
      default:
        this.printLine({ text: `bash: ${cmd}: command not found`, className: 'term-error' });
        this.printLine({ text: 'Available commands: ls, cd, cat, help', className: 'term-dim' });
    }
  }

  private cmdLs(path?: string): void {
    const target = path
      ? resolvePath(this.root, this.cwd, path)
      : resolvePath(this.root, this.cwd, '.');

    if (!target.node) {
      this.printLine({ text: `ls: cannot access '${path}': No such file or directory`, className: 'term-error' });
      return;
    }

    if (target.node.type === 'file') {
      this.printLine({ text: target.node.name });
      return;
    }

    const entries = Array.from(target.node.children!.entries());
    if (entries.length === 0) return;

    const items = entries
      .map(([name, node]) => ({ name, isDir: node.type === 'dir' }))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    if (items.length <= 5) {
      const formatted = items
        .map((item) =>
          item.isDir
            ? `<span class="term-dir">${item.name}/</span>`
            : `<span class="term-file">${item.name}</span>`,
        )
        .join('  ');
      this.printLine({ text: formatted });
      return;
    }

    items.forEach((item) => {
      this.printLine({
        text: item.isDir
          ? `<span class="term-dir">${item.name}/</span>`
          : `<span class="term-file">${item.name}</span>`,
      });
    });
  }

  private cmdCd(path?: string): void {
    if (!path || path === '~' || path === '~/') {
      this.cwd = [];
      return;
    }

    const target = resolvePath(this.root, this.cwd, path);
    if (!target.node) {
      this.printLine({ text: `cd: no such file or directory: ${path}`, className: 'term-error' });
      return;
    }

    if (target.node.type !== 'dir') {
      this.printLine({ text: `cd: not a directory: ${path}`, className: 'term-error' });
      return;
    }

    this.cwd = target.absPath;
  }

  private cmdCat(target?: string): void {
    if (!target) {
      this.printLine({ text: 'cat: missing section name', className: 'term-error' });
      return;
    }

    const cleanTarget = target.replace(/\.txt$/, '');
    const slug = slugify(cleanTarget);
    const project = projects.find((entry) => slugify(entry.title) === slug);

    if (!project) {
      const matches = projects.filter((entry) => slugify(entry.title).includes(slug));
      if (matches.length === 1) {
        this.scrollToProject(matches[0].title);
        return;
      }

      if (['about', 'contact', 'skills', 'home', 'projects'].includes(slug)) {
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth' });
        this.printLine({ text: `cating to ${cleanTarget}...`, className: 'term-dim' });
        return;
      }

      this.printLine({ text: `cat: section '${target}' not found`, className: 'term-error' });
      return;
    }

    this.scrollToProject(project.title);
  }

  private scrollToProject(title: string): void {
    const slug = slugify(title);
    const projectCards = document.querySelectorAll('.project-card');

    for (const card of projectCards) {
      const titlebar = card.querySelector('.project-card__titlebar-text');
      if (titlebar?.textContent?.includes(slug)) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('project-card--highlight');
        setTimeout(() => card.classList.remove('project-card--highlight'), 2000);
        this.printLine({ text: `Opening ${title}...`, className: 'term-dim' });
        return;
      }
    }

    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
  }

  private autocomplete(): void {
    const commands = ['ls', 'cd', 'cat', 'help'];
    const matches = commands.filter((command) => command.startsWith(this.inputEl.value));
    if (matches.length === 1) {
      this.inputEl.value = `${matches[0]} `;
    }
  }

  private render = (timestamp = 0): void => {
    requestAnimationFrame(this.render);

    if (timestamp - this.lastFrameTime < this.FRAME_INTERVAL_MS) {
      return;
    }
    this.lastFrameTime = timestamp;

    const width = this.canvas.width;
    const height = this.canvas.height;
    this.ctx.fillStyle = '#03120b';
    this.ctx.fillRect(0, 0, width, height);

    if (this.processedPortraitCanvas) {
      this.ctx.drawImage(this.processedPortraitCanvas, width - 280, 40);
    } else {
      this.drawDitheredPortrait(this.ctx, width - 280, 40, 240, 288);
    }

    this.ctx.font = 'bold 24px monospace';
    const padding = 40;
    let y = padding + 36;
    const totalLines = this.buffer.length + 1;
    const maxVisibleLines = Math.floor((height - padding * 2) / this.CHAR_H);
    const startIdx = totalLines > maxVisibleLines ? totalLines - maxVisibleLines : 0;

    for (let i = startIdx; i < this.buffer.length; i++) {
      let x = padding;
      for (const chunk of this.buffer[i]) {
        this.ctx.fillStyle = chunk.color;
        this.ctx.fillText(chunk.text, x, y);
        x += this.ctx.measureText(chunk.text).width;
      }
      y += this.CHAR_H;
    }

    const prompt = `user@amro-os:${formatCwd(this.cwd)}$ `;
    this.ctx.fillStyle = '#cee7d7';
    this.ctx.fillText(prompt, padding, y);
    let cursorX = padding + this.ctx.measureText(prompt).width;

    this.ctx.fillStyle = '#eef8f0';
    this.ctx.fillText(this.inputEl.value, cursorX, y);
    cursorX += this.ctx.measureText(this.inputEl.value).width;

    if (Date.now() % 1000 < 500) {
      this.ctx.fillStyle = '#cee7d7';
      this.ctx.fillRect(cursorX, y - 20, 12, 24);
    }

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let scanlineY = 0; scanlineY < height; scanlineY += 3) {
      this.ctx.fillRect(0, scanlineY, width, 1);
    }

    this.drawStaticWave(timestamp, width, height);

    this.ctx.fillStyle = 'rgba(206, 231, 215, 0.01)';
    for (let i = 0; i < 36; i++) {
      const noiseX = Math.floor(Math.random() * width);
      const noiseY = Math.floor(Math.random() * height);
      this.ctx.fillRect(noiseX, noiseY, 2, 2);
    }

    this.onRenderCallback();
  };

    private drawStaticWave(timestamp: number, width: number, height: number): void {
    const progress = (timestamp % this.STATIC_WAVE_CYCLE_MS) / this.STATIC_WAVE_CYCLE_MS;
    const pulse = Math.sin(progress * Math.PI);
    const centerY = progress * (height + 200) - 100;
    const radius = 34 + pulse * 34;

    for (let offset = -radius; offset <= radius; offset += 2) {
      const y = Math.round(centerY + offset);
      if (y < 0 || y >= height) continue;

      const distance = Math.abs(offset) / radius;
      const alpha = (1 - distance * distance) * (0.08 + pulse * 0.14);
      this.ctx.fillStyle = `rgba(120, 255, 170, ${alpha.toFixed(3)})`;
      this.ctx.fillRect(0, y, width, 2);
    }

    this.ctx.fillStyle = `rgba(140, 255, 190, ${(0.045 + pulse * 0.065).toFixed(3)})`;
    for (let i = 0; i < 42; i++) {
      const noiseX = Math.floor(((i * 131) + timestamp * 0.12) % width);
      const noiseY = Math.round(centerY + Math.sin(i * 0.75 + timestamp * 0.006) * radius * 0.8);
      if (noiseY < 0 || noiseY >= height) continue;
      const blockSize = i % 3 === 0 ? 4 : 3;
      this.ctx.fillRect(noiseX, noiseY, blockSize, blockSize);
    }

    this.ctx.fillStyle = `rgba(70, 220, 120, ${(0.02 + pulse * 0.04).toFixed(3)})`;
    this.ctx.fillRect(0, Math.round(centerY - radius * 0.18), width, 1);
    this.ctx.fillRect(0, Math.round(centerY + radius * 0.18), width, 1);
  }
  private drawDitheredPortrait(
    ctx: CanvasRenderingContext2D,
    dx: number,
    dy: number,
    width: number,
    height: number,
  ): void {
    const pixelSize = 4;
    const cols = Math.floor(width / pixelSize);
    const rows = Math.floor(height / pixelSize);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = x / cols - 0.5;
        const cy = y / rows - 0.5;
        const headY = cy + 0.15;
        const isHead = (cx * cx) / 0.04 + (headY * headY) / 0.035 < 1;
        const neckY = cy - 0.05;
        const isNeck = Math.abs(cx) < 0.06 && neckY > 0 && neckY < 0.08;
        const shoulderY = cy - 0.1;
        const isShoulders = Math.abs(cx) < 0.35 && shoulderY > 0 && shoulderY < 0.2;
        const shoulderCurve = isShoulders && shoulderY < 0.1 + (0.35 - Math.abs(cx)) * 0.5;

        if (isHead || isNeck || shoulderCurve) {
          const dither = (x + y) % 2 === 0;
          const innerDither = (x + y) % 3 === 0;
          const dist = Math.sqrt(cx * cx + headY * headY);

          if (isHead) {
            ctx.fillStyle =
              dist < 0.1 ? (dither ? '#cee7d7' : '#a4e8be') : innerDither ? '#cee7d7' : '#4daf84';
          } else {
            ctx.fillStyle = dither ? '#a9d1bc' : '#2f8e65';
          }
          ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, pixelSize, pixelSize);
        } else if (Math.random() < 0.02) {
          ctx.fillStyle = 'rgba(216, 255, 228, 0.04)';
          ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, pixelSize, pixelSize);
        }
      }
    }
  }
}




