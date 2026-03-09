import { projects } from './projects';

// ───────────────────────────────────────────────────
//  Virtual File System & Interactive Terminal
//  Builds a Linux-style directory tree from projects
// ───────────────────────────────────────────────────

/** Represents a node in the virtual file system */
interface FSNode {
    name: string;
    type: 'dir' | 'file';
    children?: Map<string, FSNode>;
    content?: string;
}

/** Slugify a project title for use as a directory name */
function slugify(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Build the complete virtual file system from project data */
function buildFileSystem(): FSNode {
    const root: FSNode = {
        name: '/',
        type: 'dir',
        children: new Map(),
    };

    // ~/about.txt
    const aboutFile: FSNode = {
        name: 'about.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  About Me',
            '═══════════════════════════════════════════',
            '',
            'Graduate computer engineering student with a',
            'passion for bridging hardware and software.',
            '',
            'Focus areas:',
            '  • Embedded Systems & FPGA Design',
            '  • Digital Signal Processing',
            '  • Computer Architecture',
            '  • Machine Learning at the Edge',
            '  • Full-Stack Development',
            '',
            'Currently pursuing an M.S. in Computer',
            'Engineering.',
        ].join('n'),
    };

    // ~/contact.txt
    const contactFile: FSNode = {
        name: 'contact.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  Contact Info',
            '═══════════════════════════════════════════',
            '',
            'Email:    you@example.com',
            'LinkedIn: linkedin.com/in/yourprofile',
            'GitHub:   github.com/yourhandle',
        ].join('n'),
    };

    // ~/skills.txt
    const skillsFile: FSNode = {
        name: 'skills.txt',
        type: 'file',
        content: [
            '═══════════════════════════════════════════',
            '  Technical Skills',
            '═══════════════════════════════════════════',
            '',
            'Languages:    C/C++, Python, Rust, TypeScript',
            'HDL:          Verilog, SystemVerilog, VHDL',
            'Hardware:     FPGA, ARM Cortex-M, STM32, PCB',
            'Frameworks:   React, Node.js, TensorFlow Lite',
            'Tools:        KiCad, Vivado, Git, Docker',
            'Protocols:    MQTT, SPI, UART, AXI-Stream',
        ].join('n'),
    };

    root.children!.set('about.txt', aboutFile);
    root.children!.set('contact.txt', contactFile);
    root.children!.set('skills.txt', skillsFile);

    // ~/projects/ directory
    const projectsDir: FSNode = {
        name: 'projects',
        type: 'dir',
        children: new Map(),
    };

    // Populate each project as a subdirectory with files
    for (const project of projects) {
        const slug = slugify(project.title);
        const projDir: FSNode = {
            name: slug,
            type: 'dir',
            children: new Map(),
        };

        // README.md for each project
        const readme: FSNode = {
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
            ].join('n'),
        };

        // tech-stack.txt
        const techStack: FSNode = {
            name: 'tech-stack.txt',
            type: 'file',
            content: project.tags.map((t) => `  • ${t}`).join('n'),
        };

        projDir.children!.set('README.md', readme);
        projDir.children!.set('tech-stack.txt', techStack);

        projectsDir.children!.set(slug, projDir);
    }

    root.children!.set('projects', projectsDir);

    return root;
}

/** Resolve a path relative to the current working directory */
function resolvePath(root: FSNode, cwd: string[], pathStr: string): { node: FSNode | null; absPath: string[] } {
    let parts: string[];

    if (pathStr === '/') {
        return { node: root, absPath: [] };
    }

    if (pathStr.startsWith('/')) {
        // Absolute path
        parts = pathStr.split('/').filter(Boolean);
    } else if (pathStr.startsWith('~/')) {
        parts = pathStr.slice(2).split('/').filter(Boolean);
    } else {
        // Relative path
        parts = [...cwd, ...pathStr.split('/').filter(Boolean)];
    }

    // Resolve . and ..
    const resolved: string[] = [];
    for (const part of parts) {
        if (part === '.') continue;
        if (part === '..') {
            resolved.pop();
        } else {
            resolved.push(part);
        }
    }

    // Walk the tree
    let current = root;
    for (const part of resolved) {
        if (current.type !== 'dir' || !current.children?.has(part)) {
            return { node: null, absPath: resolved };
        }
        current = current.children.get(part)!;
    }

    return { node: current, absPath: resolved };
}

/** Format the current working directory as a string */
function formatCwd(cwd: string[]): string {
    return cwd.length === 0 ? '~' : `~/${cwd.join('/')}`;
}

// ───────────────────────────────────────────────────
//  Terminal State & Commands
// ───────────────────────────────────────────────────

type TerminalOutput = { text: string; className?: string };

const HELP_TEXT: TerminalOutput[] = [
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: '  CE-Linux 1.0 — Available Commands', className: 'term-bright' },
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: '' },
    { text: '  ls               List directory contents' },
    { text: '  cd  <path>       Change directory' },
    { text: '  cat <section>   cat to project section' },
    { text: '' },
    { text: '  Tip: Navigate with cd projects/', className: 'term-dim' },
    { text: '  then use cat <project-name>', className: 'term-dim' },
];

const WELCOME_LINES: TerminalOutput[] = [
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: ' **   SYSTEM INITIALIZATION SUCCESSFUL   **', className: 'term-bright' },
    { text: '═══════════════════════════════════════════', className: 'term-dim' },
    { text: '' },
    { text: 'Welcome to the CE-Linux terminal!', className: 'term-bright' },
    { text: "I'm [Name], a Computer Engineer." },
    { text: 'Ready to build hardware & software solutions.' },
    { text: '' },
    { text: ' * Available commands: ls, cd, cat', className: 'term-dim' },
    { text: ' * Example: cat <project-name>', className: 'term-dim' },
    { text: '' },
];

export class Terminal {
    private root: FSNode;
    private cwd: string[] = [];
    private history: string[] = [];
    private historyIndex = -1;

    // Canvas Engine State
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private buffer: { text: string, color: string }[][] = [];
    private onRenderCallback: () => void;
    private inputEl: HTMLInputElement;

    private portraitImg: HTMLImageElement | null = null;
    private processedPortraitCanvas: HTMLCanvasElement | null = null;
    private readonly CHAR_H = 30;

    constructor(containerSelector: string, onRender: () => void) {
        this.root = buildFileSystem();
        this.onRenderCallback = onRender;

        const container = document.querySelector(containerSelector) as HTMLElement;
        if (!container) throw new Error(`Terminal container not found: ${containerSelector}`);

        // Create Canvas for Render-to-Texture (RTT)
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 768;
        this.ctx = this.canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D;

        // Hidden input for keystrokes
        this.inputEl = document.createElement('input');
        this.inputEl.type = 'text';
        this.inputEl.style.position = 'absolute';
        this.inputEl.style.opacity = '0';
        this.inputEl.style.pointerEvents = 'none';
        container.appendChild(this.inputEl);

        // Keep input focused when user types anywhere, to feel seamless
        document.addEventListener('keydown', () => {
            if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                this.inputEl.focus({ preventScroll: true });
            }
        });

        this.inputEl.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.inputEl.addEventListener('input', () => this.requestRender());

        // Initialize greeting
        this.printLines(WELCOME_LINES);

        // Setup Portrait Image
        this.setupPortrait('/portrait.jpg'); // PLACEHOLDER: User should place their image here

        // Start Render Loop
        this.render();
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

        const w = 240;
        const h = 288;
        const pixelSize = 4;
        const cols = Math.floor(w / pixelSize);
        const rows = Math.floor(h / pixelSize);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cols;
        tempCanvas.height = rows;
        const tempCtx = tempCanvas.getContext('2d')!;
        tempCtx.drawImage(this.portraitImg, 0, 0, cols, rows);

        const imageData = tempCtx.getImageData(0, 0, cols, rows);
        const data = imageData.data;

        this.processedPortraitCanvas = document.createElement('canvas');
        this.processedPortraitCanvas.width = w;
        this.processedPortraitCanvas.height = h;
        const pCtx = this.processedPortraitCanvas.getContext('2d')!;

        // Simple 2x2 Bayer Matrix for dithering
        const bayer = [
            [0, 2],
            [3, 1]
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
                    color = '#d8ffe4';
                } else if (brightness > threshold * 0.6) {
                    color = '#a4e8be';
                } else if (brightness > threshold * 0.2) {
                    color = '#2f8e65';
                }

                if (color !== 'transparent') {
                    pCtx.fillStyle = color;
                    pCtx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    }

    public getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    private requestRender(): void {
        // Just rely on the animation frame, but we could trigger it here if static
    }

    private parseOutput(output: TerminalOutput): { text: string, color: string }[] {
        let color = '#d8ffe4';
        if (output.className === 'term-dim') color = 'rgba(216, 255, 228, 0.58)';
        if (output.className === 'term-bright') color = '#ffffff';
        if (output.className === 'term-error') color = '#ff5b5b';
        if (output.className === 'term-echo') color = '#b8b2a8';

        // Parse simplified HTML spans used from original code
        const segments: { text: string, color: string }[] = [];
        const spanRegex = /<span class="([^"]+)">([^<]*)<\/span>|([^<]+)/g;
        let match;

        if (!output.text.includes('<span')) {
            return [{ text: output.text, color }];
        }

        while ((match = spanRegex.exec(output.text)) !== null) {
            if (match[1]) {
                const className = match[1];
                let c = '#d8ffe4';
                if (className.includes('term-dir')) c = '#b8f2d0';
                if (className.includes('term-file')) c = '#d4cfc8';
                if (className.includes('term-dim')) c = 'rgba(216, 255, 228, 0.58)';
                if (className.includes('term-bright')) c = '#ffffff';
                segments.push({ text: match[2], color: c });
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
        outputs.forEach(o => this.printLine(o));
    }

    // ── Command Parsing ───────────────────────
    private handleKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            const cmd = this.inputEl.value.trim();
            this.inputEl.value = '';

            const prompt = `user@ce-linux:${formatCwd(this.cwd)}$ `;
            this.printLine({ text: prompt + cmd, className: 'term-echo' });

            if (cmd) {
                this.history.push(cmd);
                this.historyIndex = this.history.length;
                this.executeCommand(cmd);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.inputEl.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.inputEl.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.inputEl.value = '';
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            this.autocomplete();
        }
    }

    private executeCommand(input: string): void {
        const parts = input.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        switch (cmd) {
            case 'ls': this.cmdLs(args[0]); break;
            case 'cd': this.cmdCd(args[0]); break;
            case 'cat': this.cmdcat(args[0]); break;
            case 'help': this.printLines(HELP_TEXT); break; // Keep help silently available
            default:
                this.printLine({ text: `bash: ${cmd}: command not found`, className: 'term-error' });
                this.printLine({ text: 'Available commands: ls, cd, cat', className: 'term-dim' });
        }
    }

    // ── Command Implementation (Adapted from Original) ──
    private cmdLs(path?: string): void {
        const target = path ? resolvePath(this.root, this.cwd, path) : resolvePath(this.root, this.cwd, '.');
        if (!target.node) { this.printLine({ text: `ls: cannot access '${path}': No such file or directory`, className: 'term-error' }); return; }
        if (target.node.type === 'file') { this.printLine({ text: target.node.name }); return; }
        const entries = Array.from(target.node.children!.entries());
        if (entries.length === 0) return;
        const items = entries.map(([name, node]) => ({ name, isDir: node.type === 'dir' }));
        items.sort((a, b) => { if (a.isDir !== b.isDir) return a.isDir ? -1 : 1; return a.name.localeCompare(b.name); });

        if (items.length <= 5) {
            const formatted = items.map(i => (i.isDir ? `<span class="term-dir">${i.name}/</span>` : `<span class="term-file">${i.name}</span>`)).join('  ');
            this.printLine({ text: formatted });
        } else {
            for (const item of items) {
                const formatted = item.isDir ? `<span class="term-dir">${item.name}/</span>` : `<span class="term-file">${item.name}</span>`;
                this.printLine({ text: formatted });
            }
        }
    }

    private cmdCd(path?: string): void {
        if (!path || path === '~' || path === '~/') { this.cwd = []; return; }
        const target = resolvePath(this.root, this.cwd, path);
        if (!target.node) { this.printLine({ text: `cd: no such file or directory: ${path}`, className: 'term-error' }); return; }
        if (target.node.type !== 'dir') { this.printLine({ text: `cd: not a directory: ${path}`, className: 'term-error' }); return; }
        this.cwd = target.absPath;
    }

    private cmdcat(target?: string): void {
        if (!target) {
            this.printLine({ text: 'cat: missing section name', className: 'term-error' });
            return;
        }

        // Remove .txt extension if user typed it based on 'ls' output
        const cleanTarget = target.replace(/\.txt$/, '');
        const slug = slugify(cleanTarget);

        const project = projects.find((p) => slugify(p.title) === slug);
        if (!project) {
            const matches = projects.filter((p) => slugify(p.title).includes(slug));
            if (matches.length === 1) { this.scrollToProject(matches[0].title); return; }
            if (['about', 'contact', 'skills', 'home', 'projects'].includes(slug)) {
                const el = document.getElementById(slug);
                if (el) el.scrollIntoView({ behavior: 'smooth' });
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
        // basic autocomplete
        const commands = ['ls', 'cd', 'cat', 'help'];
        const matches = commands.filter(c => c.startsWith(this.inputEl.value));
        if (matches.length === 1) this.inputEl.value = matches[0] + ' ';
    }

    // ── Renderer ────────────────────────────────

    private render = () => {
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Background
        this.ctx.fillStyle = '#03120b';
        this.ctx.fillRect(0, 0, w, h);

        // Portrait Dither (Top Right)
        if (this.processedPortraitCanvas) {
            this.ctx.drawImage(this.processedPortraitCanvas, w - 280, 40);
        } else {
            // Fallback to the procedural one if image hasn't loaded
            this.drawDitheredPortrait(this.ctx, w - 280, 40, 240, 288);
        }

        // Draw Buffer
        this.ctx.font = 'bold 24px monospace';
        const PADDING = 40;
        let y = PADDING + 36;

        // Determine scroll offset to keep input at bottom
        const totalLines = this.buffer.length + 1; // buffer + prompt area
        const maxVisibleLines = Math.floor((h - PADDING * 2) / this.CHAR_H);

        let startIdx = 0;
        if (totalLines > maxVisibleLines) {
            startIdx = totalLines - maxVisibleLines;
        }

        // Draw output
        for (let i = startIdx; i < this.buffer.length; i++) {
            let x = PADDING;
            for (const chunk of this.buffer[i]) {
                this.ctx.fillStyle = chunk.color;
                this.ctx.fillText(chunk.text, x, y);
                x += this.ctx.measureText(chunk.text).width;
            }
            y += this.CHAR_H;
        }

        // Draw input prompt
        const prompt = `user@ce-linux:${formatCwd(this.cwd)}$ `;
        this.ctx.fillStyle = '#d8ffe4';
        this.ctx.fillText(prompt, PADDING, y);
        let cursorX = PADDING + this.ctx.measureText(prompt).width;

        this.ctx.fillStyle = '#f5fff7';
        this.ctx.fillText(this.inputEl.value, cursorX, y);
        cursorX += this.ctx.measureText(this.inputEl.value).width;

        // Blinking Cursor
        if (Date.now() % 1000 < 500) {
            this.ctx.fillStyle = '#d8ffe4';
            this.ctx.fillText('█', cursorX, y);
        }

        // Scanlines overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        for (let sy = 0; sy < h; sy += 3) {
            this.ctx.fillRect(0, sy, w, 1);
        }

        // Medium static effect (adding random noise pixels)
        this.ctx.fillStyle = 'rgba(216, 255, 228, 0.016)';
        for (let i = 0; i < 160; i++) {
            const nx = Math.random() * w;
            const ny = Math.random() * h;
            this.ctx.fillRect(nx, ny, 2, 2);
        }

        // Notify scene to update texture
        this.onRenderCallback();

        requestAnimationFrame(this.render);
    }

    // Canvas Dithered Portrait Logic Migrated from main.ts
    private drawDitheredPortrait(ctx: CanvasRenderingContext2D, dx: number, dy: number, w: number, h: number): void {
        const pixelSize = 4;
        const cols = Math.floor(w / pixelSize);
        const rows = Math.floor(h / pixelSize);

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
                        ctx.fillStyle = dist < 0.1
                            ? (dither ? '#d8ffe4' : '#a4e8be')
                            : (innerDither ? '#d8ffe4' : '#4daf84');
                    } else {
                        ctx.fillStyle = dither ? '#b8f2d0' : '#2f8e65';
                    }
                    ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, pixelSize, pixelSize);
                } else {
                    if (Math.random() < 0.02) {
                        ctx.fillStyle = 'rgba(216, 255, 228, 0.04)';
                        ctx.fillRect(dx + x * pixelSize, dy + y * pixelSize, pixelSize, pixelSize);
                    }
                }
            }
        }
    }
}



