// gifuct-js is loaded lazily inside setupAnimatedPortrait()
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
      'Graduate computer engineering student with a',
      'focus on hardware and software systems.',
      '',
      'Focus areas:',
      '  - Embedded Systems and FPGA Design',
      '  - Digital Signal Processing',
      '  - Computer Architecture',
      '  - Machine Learning at the Edge',
      '  - Full-Stack Development',
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
      'Email:    amromousa8@gmail.com',
      'LinkedIn: linkedin.com/in/yourprofile',
      'GitHub:   github.com/yourhandle',
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
      'Languages:    C/C++, Python, Rust, TypeScript',
      'HDL:          Verilog, SystemVerilog, VHDL',
      'Hardware:     FPGA, ARM Cortex-M, STM32, PCB',
      'Frameworks:   React, Node.js, TensorFlow Lite',
      'Tools:        KiCad, Vivado, Git, Docker',
      'Protocols:    MQTT, SPI, UART, AXI-Stream',
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
  { text: '  CE-Linux 1.0 Available Commands', className: 'term-bright' },
  { text: '===========================================', className: 'term-dim' },
  { text: '' },
  { text: '  ls              List directory contents' },
  { text: '  cd <path>       Change directory' },
  { text: '  cat <section>   Jump to a section or project' },
  { text: '' },
  { text: '  Tip: cd projects then cat <project-name>', className: 'term-dim' },
];

const WELCOME_LINES: TerminalOutput[] = [
  { text: 'Hi there!', className: 'term-bright term-header' },
  { text: '<span class="term-inverted term-header"> I\'m Amro Abed Moosa </span>' },
  { text: '' },
  { text: 'A Computer Engineer', className: 'term-bright' },
  { text: '' },
  { text: '' },
  { text: 'Welcome to CE-Linux 1.0 LTS', className: 'term-bright' },
  { text: '>> Scroll or type "help" to get started', className: 'term-dim' },
  { text: '' },
];

export class Terminal {
  private root: FSNode;
  private cwd: string[] = [];
  private history: string[] = [];
  private historyIndex = -1;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private buffer: Array<Array<{ text: string; color: string; inverted?: boolean; large?: boolean }>> = [];
  private onRenderCallback: () => void;
  private inputEl: HTMLInputElement;

  // GIF Animation State
  private gifFrames: any[] = [];
  private gifFrameIndex = 0;
  private lastGifRenderTime = 0;
  private gifReady = false;
  private gifNativeW = 0;
  private gifNativeH = 0;
  private gifFrameDirty = false;

  // Canvases for GIF processing
  private portraitCompositeCanvas: HTMLCanvasElement;
  private portraitCompositeCtx: CanvasRenderingContext2D;
  /** Small canvas where downscaled composite is tinted — this is what gets drawn to the terminal */
  private processedPortraitCanvas: HTMLCanvasElement;
  private processedPortraitCtx: CanvasRenderingContext2D;
  /** Downscale target before pixel manipulation (avoids tinting the full 1920×1920) */
  private tintSourceCanvas: HTMLCanvasElement;
  private tintSourceCtx: CanvasRenderingContext2D;
  private frameTempCanvas: HTMLCanvasElement;
  private frameTempCtx: CanvasRenderingContext2D;

  /** Max dimension for the tint working canvas (keeps pixel loop fast) */
  private readonly TINT_MAX_DIM = 320;
  private tintW = 0;
  private tintH = 0;

  private readonly CHAR_H = 30;
  private readonly FRAME_INTERVAL_MS = 1000 / 18;
  private readonly STATIC_WAVE_CYCLE_MS = 1650;
  private lastFrameTime = 0;

  constructor(containerSelector: string, onRender: () => void) {
    this.root = buildFileSystem();
    this.onRenderCallback = onRender;

    // Full-resolution composite canvas (resized to GIF dimensions later)
    this.portraitCompositeCanvas = document.createElement('canvas');
    this.portraitCompositeCanvas.width = 1;
    this.portraitCompositeCanvas.height = 1;
    this.portraitCompositeCtx = this.portraitCompositeCanvas.getContext('2d')!;

    // Small working canvas for downscale → tint
    this.tintSourceCanvas = document.createElement('canvas');
    this.tintSourceCanvas.width = 1;
    this.tintSourceCanvas.height = 1;
    this.tintSourceCtx = this.tintSourceCanvas.getContext('2d', { willReadFrequently: true })!;

    // Final tinted output (same small size)
    this.processedPortraitCanvas = document.createElement('canvas');
    this.processedPortraitCanvas.width = 1;
    this.processedPortraitCanvas.height = 1;
    this.processedPortraitCtx = this.processedPortraitCanvas.getContext('2d')!;

    this.frameTempCanvas = document.createElement('canvas');
    this.frameTempCanvas.width = 1;
    this.frameTempCanvas.height = 1;
    this.frameTempCtx = this.frameTempCanvas.getContext('2d')!;

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
    this.setupAnimatedPortrait('/amro-gif.gif');
    this.render(performance.now());
  }

  private async setupAnimatedPortrait(src: string): Promise<void> {
    try {
      const [response, { parseGIF, decompressFrames }] = await Promise.all([
        fetch(src),
        import('gifuct-js'),
      ]);
      const buffer = await response.arrayBuffer();
      const gif = parseGIF(buffer);
      const frames = decompressFrames(gif, true);

      // Use the GIF's actual logical screen size
      const gifW = gif.lsd.width;
      const gifH = gif.lsd.height;

      // Full-resolution composite canvas
      this.portraitCompositeCanvas.width = gifW;
      this.portraitCompositeCanvas.height = gifH;
      this.gifNativeW = gifW;
      this.gifNativeH = gifH;

      // Compute a small working size for tinting (max 320px on longest side)
      const scale = Math.min(1, this.TINT_MAX_DIM / Math.max(gifW, gifH));
      this.tintW = Math.round(gifW * scale);
      this.tintH = Math.round(gifH * scale);

      // Size the tint working canvases
      this.tintSourceCanvas.width = this.tintW;
      this.tintSourceCanvas.height = this.tintH;
      this.processedPortraitCanvas.width = this.tintW;
      this.processedPortraitCanvas.height = this.tintH;

      this.gifFrames = frames;
      this.gifFrameIndex = 0;
      this.lastGifRenderTime = performance.now();

      // Clear composite canvas and immediately draw the first frame
      this.portraitCompositeCtx.clearRect(0, 0, gifW, gifH);
      this.compositeFrame(frames[0]);
      this.gifFrameIndex = 1 % frames.length;
      this.gifFrameDirty = true;

      this.gifReady = true;
    } catch (error) {
      console.error('Failed to load GIF:', error);
    }
  }

  /** Draw a single GIF frame patch onto the composite canvas */
  private compositeFrame(frame: any): void {
    const frameImageData = new ImageData(
      frame.patch,
      frame.dims.width,
      frame.dims.height
    );

    if (this.frameTempCanvas.width !== frame.dims.width || this.frameTempCanvas.height !== frame.dims.height) {
      this.frameTempCanvas.width = frame.dims.width;
      this.frameTempCanvas.height = frame.dims.height;
    }
    this.frameTempCtx.putImageData(frameImageData, 0, 0);

    if (frame.disposalType === 2) {
      this.portraitCompositeCtx.clearRect(
        frame.dims.left,
        frame.dims.top,
        frame.dims.width,
        frame.dims.height
      );
    }

    this.portraitCompositeCtx.drawImage(
      this.frameTempCanvas,
      frame.dims.left,
      frame.dims.top
    );

    this.gifFrameDirty = true;
  }

  /** Advance GIF frame and apply amber monochrome tint (only when frame changes) */
  private processCurrentFrame(timestamp: number): void {
    if (!this.gifReady || this.gifFrames.length === 0) return;

    const currentFrame = this.gifFrames[this.gifFrameIndex];
    const delayMs = (currentFrame.delay || 0) * 0.65;

    // Advance to next frame if enough time has passed
    if (delayMs > 0 && timestamp - this.lastGifRenderTime >= delayMs) {
      this.gifFrameIndex = (this.gifFrameIndex + 1) % this.gifFrames.length;
      this.compositeFrame(this.gifFrames[this.gifFrameIndex]);
      this.lastGifRenderTime = timestamp;
    }

    // Only re-tint when the frame actually changed
    if (!this.gifFrameDirty) return;
    this.gifFrameDirty = false;

    const tw = this.tintW;
    const th = this.tintH;
    if (tw === 0 || th === 0) return;

    // Downscale composite → small tint source canvas (browser handles the resize)
    this.tintSourceCtx.clearRect(0, 0, tw, th);
    this.tintSourceCtx.drawImage(this.portraitCompositeCanvas, 0, 0, tw, th);

    // Per-pixel amber tint on the SMALL canvas
    const imageData = this.tintSourceCtx.getImageData(0, 0, tw, th);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a === 0) continue;

      let lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      lum = Math.pow(lum, 0.7);

      data[i] = Math.min(255, 20 + Math.round(lum * 235));
      data[i + 1] = Math.min(255, 14 + Math.round(lum * 170));
      data[i + 2] = Math.min(255, 4 + Math.round(lum * 40));
    }

    this.processedPortraitCtx.clearRect(0, 0, tw, th);
    this.processedPortraitCtx.putImageData(imageData, 0, 0);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  private requestRender(): void {
    this.lastFrameTime = 0;
  }

  private parseOutput(output: TerminalOutput): Array<{ text: string; color: string; inverted?: boolean; large?: boolean }> {
    let color = '#ffbd33';
    let isOutputLarge = false;
    if (output.className?.includes('term-header')) isOutputLarge = true;
    if (output.className?.includes('term-dim')) color = 'rgba(255, 189, 51, 0.56)';
    if (output.className?.includes('term-bright')) color = '#ffeb99';
    if (output.className?.includes('term-error')) color = '#ff5b5b';
    if (output.className?.includes('term-echo')) color = '#b8b2a8';

    const segments: Array<{ text: string; color: string; inverted?: boolean; large?: boolean }> = [];
    const spanRegex = /<span class="([^"]+)">([^<]*)<\/span>|([^<]+)/g;
    let match: RegExpExecArray | null;

    if (!output.text.includes('<span')) {
      return [{ text: output.text, color, large: isOutputLarge }];
    }

    while ((match = spanRegex.exec(output.text)) !== null) {
      if (match[1]) {
        let segmentColor = '#ffbd33';
        let inverted = false;
        let large = isOutputLarge;
        if (match[1].includes('term-dir')) segmentColor = '#ffaa00';
        if (match[1].includes('term-file')) segmentColor = '#ffdd88';
        if (match[1].includes('term-dim')) segmentColor = 'rgba(255, 189, 51, 0.56)';
        if (match[1].includes('term-bright')) segmentColor = '#ffeb99';
        if (match[1].includes('term-inverted')) {
          segmentColor = '#ffbd33';
          inverted = true;
        }
        if (match[1].includes('term-header')) {
          large = true;
        }
        segments.push({ text: match[2], color: segmentColor, inverted, large });
      } else if (match[3]) {
        segments.push({ text: match[3], color, large: isOutputLarge });
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

      const prompt = `user@ce-linux:${formatCwd(this.cwd)}$ `;
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

    // Wrap ls output to terminal width so long project names never clip at the right edge.
    const maxCharsPerLine = this.getMaxCharsPerLine();
    let line = '';
    let lineLength = 0;

    for (const item of items) {
      const plainText = item.isDir ? `${item.name}/` : item.name;
      const htmlText = item.isDir
        ? `<span class="term-dir">${plainText}</span>`
        : `<span class="term-file">${plainText}</span>`;
      const itemLength = plainText.length;
      const separatorLength = lineLength === 0 ? 0 : 2;

      if (lineLength > 0 && lineLength + separatorLength + itemLength > maxCharsPerLine) {
        this.printLine({ text: line });
        line = htmlText;
        lineLength = itemLength;
        continue;
      }

      line += (lineLength === 0 ? '' : '  ') + htmlText;
      lineLength += separatorLength + itemLength;
    }

    if (line) {
      this.printLine({ text: line });
    }
  }

  private getMaxCharsPerLine(): number {
    const padding = 40;
    const availableWidth = Math.max(220, this.canvas.width - padding * 2);
    const approxCharWidth = 16;
    return Math.max(24, Math.floor(availableWidth / approxCharWidth));
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
      const projectMeta = card.querySelector('.project-card__placeholder-meta')?.textContent?.toLowerCase() ?? '';
      const projectName = card.querySelector('.project-card__name')?.textContent?.toLowerCase() ?? '';
      if (projectMeta.includes(slug) || slugify(projectName) === slug) {
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
    this.ctx.fillStyle = '#0a0601';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.font = 'bold 24px monospace';
    const padding = 40;
    let y = padding + 36;
    const totalLines = this.buffer.length + 1;
    const maxVisibleLines = Math.floor((height - padding * 2) / this.CHAR_H);
    const startIdx = totalLines > maxVisibleLines ? totalLines - maxVisibleLines : 0;

    let scrolledY = 0;
    for (let i = 0; i < startIdx; i++) {
      if (i < this.buffer.length) {
        const isLargeLine = this.buffer[i].some((c) => c.large);
        scrolledY += isLargeLine ? 48 : this.CHAR_H;
      } else {
        scrolledY += this.CHAR_H;
      }
    }

    const targetH = Math.round(height * 0.45);  // ~45% of canvas height
    const isGifVisible = (20 - scrolledY + targetH) > 0;

    if (isGifVisible) {
      this.processCurrentFrame(timestamp);
    }

    // Draw the processed portrait, scaled to fit the terminal
    if (this.gifReady && this.tintW > 0 && isGifVisible) {
      const aspectRatio = this.gifNativeW / this.gifNativeH;
      const targetW = Math.round(targetH * aspectRatio);
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(
        this.processedPortraitCanvas,
        0, 0, this.tintW, this.tintH,
        width - targetW - 40, 20 - scrolledY, targetW, targetH
      );
    }

    for (let i = startIdx; i < this.buffer.length; i++) {
      let x = padding;
      const isLargeLine = this.buffer[i].some((c) => c.large);
      const lineH = isLargeLine ? 48 : this.CHAR_H;
      if (isLargeLine) y += 8;

      for (const chunk of this.buffer[i]) {
        this.ctx.font = chunk.large ? 'bold 44px monospace' : 'bold 24px monospace';
        const textWidth = this.ctx.measureText(chunk.text).width;
        if (chunk.inverted) {
          this.ctx.fillStyle = chunk.color;
          const rectH = chunk.large ? 48 : this.CHAR_H - 2;
          const rectY = chunk.large ? y - 36 : y - this.CHAR_H + 8;
          this.ctx.fillRect(x, rectY, textWidth, rectH);
          this.ctx.fillStyle = '#0a0601';
        } else {
          this.ctx.fillStyle = chunk.color;
        }
        this.ctx.fillText(chunk.text, x, y);
        x += textWidth;
      }
      y += lineH - (isLargeLine ? 8 : 0);
    }

    this.ctx.font = 'bold 24px monospace';

    const prompt = `user:~$ `;
    this.ctx.fillStyle = '#ffbd33';
    this.ctx.fillText(prompt, padding, y);
    let cursorX = padding + this.ctx.measureText(prompt).width;

    this.ctx.fillStyle = '#ffeb99';
    this.ctx.fillText(this.inputEl.value, cursorX, y);
    cursorX += this.ctx.measureText(this.inputEl.value).width;

    if (Date.now() % 1000 < 500) {
      this.ctx.fillStyle = '#ffbd33';
      this.ctx.fillRect(cursorX, y - 20, 12, 24);
    }

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let scanlineY = 0; scanlineY < height; scanlineY += 3) {
      this.ctx.fillRect(0, scanlineY, width, 1);
    }

    this.drawStaticWave(timestamp, width, height);

    this.ctx.fillStyle = 'rgba(255, 189, 51, 0.04)';
    for (let i = 0; i < 900; i++) {
      const noiseX = Math.floor(Math.random() * width);
      const noiseY = Math.floor(Math.random() * height);
      this.ctx.fillRect(noiseX, noiseY, 4, 4);
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
      this.ctx.fillStyle = `rgba(255, 189, 51, ${alpha.toFixed(3)})`;
      this.ctx.fillRect(0, y, width, 2);
    }

    this.ctx.fillStyle = `rgba(255, 170, 0, ${(0.045 + pulse * 0.065).toFixed(3)})`;
    for (let i = 0; i < 42; i++) {
      const noiseX = Math.floor(((i * 131) + timestamp * 0.12) % width);
      const noiseY = Math.round(centerY + Math.sin(i * 0.75 + timestamp * 0.006) * radius * 0.8);
      if (noiseY < 0 || noiseY >= height) continue;
      const blockSize = i % 3 === 0 ? 4 : 3;
      this.ctx.fillRect(noiseX, noiseY, blockSize, blockSize);
    }

    this.ctx.fillStyle = `rgba(220, 120, 0, ${(0.02 + pulse * 0.04).toFixed(3)})`;
    this.ctx.fillRect(0, Math.round(centerY - radius * 0.18), width, 1);
    this.ctx.fillRect(0, Math.round(centerY + radius * 0.18), width, 1);
  }
}





