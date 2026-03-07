import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Creates and manages the retro 3D computer scene.
 * The computer is built entirely from Three.js box geometries
 * (monitor, base unit, keyboard) with scroll-synced camera animation.
 */

export class RetroComputerScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private container: HTMLElement;
    private computerGroup: THREE.Group;
    private screenMesh!: THREE.Mesh;
    private animationId: number | null = null;

    // Scroll animation state
    private scrollProgress = 0;
    private portraitOffset = 0;

    // ── Camera system (edh.dev technique) ─────────────────────────
    // Wide FOV + close camera Z = screen fills viewport
    // Scroll moves camera Z back AND transforms the computer group
    // Math: screen at z=0.73, height=1.1, FOV=75
    //   distance = (0.55) / tan(37.5°) ≈ 0.72 → camera z ≈ 1.45
    private readonly CAMERA_FOV = 80;
    private readonly CAM_Z_START = 1.60;   // Exact distance for screen to fill viewport
    private readonly CAM_Z_END = 5.0;      // Pulled back (full computer visible, not too small)

    // Model position at scroll progress
    private readonly MODEL_Y_START = 0;     // At origin
    private readonly MODEL_Y_END = 0;    // Moves DOWN to reveal keyboard
    private readonly MODEL_ROT_START = 0;   // No rotation
    private readonly MODEL_ROT_END = 0.6;   // ~22 degrees rotation

    // Camera Y offset — screen center
    private readonly CAM_Y = 1.35;          // Center of screen mesh (1.65 - 0.3 group offset)

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container #${containerId} not found`);
        this.container = el;

        // Scene setup
        this.scene = new THREE.Scene();

        // Calculate portrait offset (aspect ratio compensation)
        // Ensures screen fills viewport on both wide and narrow screens
        this.updatePortraitOffset();

        // Camera — wide FOV, close Z (edh.dev technique)
        this.camera = new THREE.PerspectiveCamera(
            this.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );
        this.camera.position.set(0, this.CAM_Y, this.CAM_Z_START + this.portraitOffset);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // Build
        this.computerGroup = new THREE.Group();
        this.buildComputer();
        this.scene.add(this.computerGroup);

        this.addLights();
        this.addFloor();

        // Events
        window.addEventListener('resize', this.onResize);

        // Start rendering
        this.animate();
    }

    private buildComputer(): void {
        this.buildBaseUnit();
        this.buildMonitor();
        this.buildKeyboard();
        this.buildCables();

        // Position the whole group — slightly raised so nothing clips
        this.computerGroup.position.y = -0.3;
        this.computerGroup.rotation.y = 0;
    }

    private buildBaseUnit(): void {
        // Base Unit
        const baseGeo = new RoundedBoxGeometry(2.4, 0.5, 2.0, 4, 0.05);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xd4cfc8, roughness: 0.65, metalness: 0.05 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.25, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        this.computerGroup.add(base);

        // Floppy drive bays (stacked on the right)
        const floppyGeo = new RoundedBoxGeometry(0.5, 0.06, 0.02, 2, 0.01);
        const floppyMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.3 });

        const floppy1 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy1.position.set(0.7, 0.35, 1.01);
        this.computerGroup.add(floppy1);

        const floppy2 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy2.position.set(0.7, 0.22, 1.01);
        this.computerGroup.add(floppy2);

        // Power button
        const btnGeo = new RoundedBoxGeometry(0.1, 0.1, 0.02, 2, 0.02);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xcc4444, roughness: 0.4 });
        const pwrBtn = new THREE.Mesh(btnGeo, btnMat);
        pwrBtn.position.set(-0.9, 0.25, 1.01);
        this.computerGroup.add(pwrBtn);

        // Badge
        const badgeGeo = new THREE.BoxGeometry(0.2, 0.05, 0.01);
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(-0.9, 0.38, 1.01);
        this.computerGroup.add(badge);
    }

    private buildMonitor(): void {
        const beigeMat = new THREE.MeshStandardMaterial({ color: 0xc8c3b9, roughness: 0.85, metalness: 0.05 });
        const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8, metalness: 0.1 });
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0xbdb7ab, roughness: 0.9, metalness: 0.02 });

        // 1. Monitor Rear Housing (The tapered/smaller back 'tube')
        const tubeW = 1.5;
        const tubeH = 1.3;
        const tubeD = 0.7;
        const tubeGeo = new RoundedBoxGeometry(tubeW, tubeH, tubeD, 4, 0.08);
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0, 1.64, -0.05);
        tube.castShadow = true;
        this.computerGroup.add(tube);

        // 2. Air vents on the sides of the rear housing
        const ventW = tubeW + 0.04; // Slightly wider to intersect and show on sides
        const ventH = 0.015;
        const ventD = 0.4;
        const ventGeo = new THREE.BoxGeometry(ventW, ventH, ventD);
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        for (let i = 0; i < 7; i++) {
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.position.set(0, 1.44 + i * 0.06, -0.10);
            this.computerGroup.add(vent);
        }

        // 3. Central Seam Divider
        const seamGeo = new RoundedBoxGeometry(1.8, 1.55, 0.05, 4, 0.02);
        const seam = new THREE.Mesh(seamGeo, darkTrimMat);
        seam.position.set(0, 1.64, 0.30);
        this.computerGroup.add(seam);

        // 4. Main Front Housing (Chunky beige casing)
        const mainW = 1.95;
        const mainH = 1.65;
        const mainD = 0.5;
        const mainGeo = new RoundedBoxGeometry(mainW, mainH, mainD, 4, 0.08);
        const mainBody = new THREE.Mesh(mainGeo, beigeMat);
        mainBody.position.set(0, 1.64, 0.55);
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        this.computerGroup.add(mainBody);

        // 5. Inner Dark Grey Bezel Frame
        const innerBezelW = 1.6;
        const innerBezelH = 1.2;
        const innerBezelD = 0.06;
        const innerBezelGeo = new RoundedBoxGeometry(innerBezelW, innerBezelH, innerBezelD, 4, 0.02);
        const innerBezel = new THREE.Mesh(innerBezelGeo, darkTrimMat);
        innerBezel.position.set(0, 1.64, 0.79);
        this.computerGroup.add(innerBezel);

        // Frame to make the cavernous set-in CRT look (beige)
        const frameD = 0.15;
        const frameThick = 0.175; // (1.95 - 1.6) / 2 = 0.175
        const topBotW = innerBezelW + frameThick * 2;

        // Top Frame (beige)
        const tFrameGeo = new THREE.BoxGeometry(topBotW, frameThick, frameD);
        const tFrame = new THREE.Mesh(tFrameGeo, beigeMat);
        tFrame.position.set(0, 1.64 + innerBezelH / 2 + frameThick / 2, 0.87);
        this.computerGroup.add(tFrame);

        // Bottom Frame (beige)
        const bFrameGeo = new THREE.BoxGeometry(topBotW, frameThick, frameD);
        const bFrame = new THREE.Mesh(bFrameGeo, beigeMat);
        bFrame.position.set(0, 1.64 - innerBezelH / 2 - frameThick / 2, 0.87);
        this.computerGroup.add(bFrame);

        // Left Frame (beige)
        const lFrameGeo = new THREE.BoxGeometry(frameThick, innerBezelH, frameD);
        const lFrame = new THREE.Mesh(lFrameGeo, beigeMat);
        lFrame.position.set(-innerBezelW / 2 - frameThick / 2, 1.64, 0.87);
        this.computerGroup.add(lFrame);

        // Right Frame (beige)
        const rFrameGeo = new THREE.BoxGeometry(frameThick, innerBezelH, frameD);
        const rFrame = new THREE.Mesh(rFrameGeo, beigeMat);
        rFrame.position.set(innerBezelW / 2 + frameThick / 2, 1.64, 0.87);
        this.computerGroup.add(rFrame);

        // 6. CRT Screen (Set exactly at original position to preserve coordinate projection)
        const screenW = 1.5;
        const screenH = 1.1;
        const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
        const screenMat = new THREE.MeshStandardMaterial({
            color: 0x111111, roughness: 0.2, metalness: 0.4,
            emissive: 0x00ffcc, emissiveIntensity: 0.15,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.65, 0.83);
        this.screenMesh = screen;
        this.computerGroup.add(screen);

        const glowGeo = new THREE.PlaneGeometry(screenW * 0.95, screenH * 0.95);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.06 });
        const glowOverlay = new THREE.Mesh(glowGeo, glowMat);
        glowOverlay.position.set(0, 1.65, 0.835);
        this.computerGroup.add(glowOverlay);

        // 7. Base Stand (Retro rectangular swivel stand instead of round)
        const standBaseW = 1.2;
        const standBaseD = 1.2;
        const standBaseGeo = new RoundedBoxGeometry(standBaseW, 0.06, standBaseD, 4, 0.02);
        const standBase = new THREE.Mesh(standBaseGeo, beigeMat);
        standBase.position.set(0, 0.62, 0.35);
        this.computerGroup.add(standBase);

        // Short rigid neck
        const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.15, 16);
        const neckMat = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.7 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.set(0, 0.69, 0.35);
        neck.castShadow = true;
        this.computerGroup.add(neck);

        // 8. Bottom Stepped Casing (Detail below main monitor body)
        const stepGeo = new RoundedBoxGeometry(mainW * 0.6, 0.06, 0.6, 4, 0.02);
        const step = new THREE.Mesh(stepGeo, beigeMat);
        step.position.set(0, 1.64 - mainH / 2 - 0.03, 0.40);
        this.computerGroup.add(step);

        // 9. Buttons / Details
        const pwrGeo = new RoundedBoxGeometry(0.08, 0.04, 0.02, 2, 0.01);
        const pwrMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pwr = new THREE.Mesh(pwrGeo, pwrMat);
        pwr.position.set(mainW / 2 - 0.3, 1.64 - mainH / 2 + 0.12, 0.80);
        this.computerGroup.add(pwr);

        const ledGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.rotation.x = Math.PI / 2;
        led.position.set(mainW / 2 - 0.45, 1.64 - mainH / 2 + 0.12, 0.805);
        this.computerGroup.add(led);
    }

    private buildKeyboard(): void {
        // ── Keyboard Case ──────────────────────────────────────────────
        // Retro-style case with raised back edge (wedge shape)
        const caseW = 2.2;
        const caseD = 0.85;
        const caseH = 0.14;
        const caseGeo = new RoundedBoxGeometry(caseW, caseH, caseD, 4, 0.04);
        const caseMat = new THREE.MeshStandardMaterial({
            color: 0xc8c3b9, roughness: 0.85, metalness: 0.05
        });
        const kbCase = new THREE.Mesh(caseGeo, caseMat);
        kbCase.position.set(0, 0.07, 1.7);
        kbCase.rotation.x = -0.06;
        kbCase.castShadow = true;
        kbCase.receiveShadow = true;
        this.computerGroup.add(kbCase);

        // ── Materials ──────────────────────────────────────────────────
        // Alpha keys — light warm cream
        const alphaCapMat = new THREE.MeshStandardMaterial({
            color: 0xe8e3d5, roughness: 0.75, metalness: 0.02
        });
        // Modifier keys — darker warm grey
        const modCapMat = new THREE.MeshStandardMaterial({
            color: 0xb0aa9e, roughness: 0.8, metalness: 0.03
        });

        // ── Key Dimensions ─────────────────────────────────────────────
        const U = 0.115;           // 1U key pitch (key width + gap)
        const keyH = 0.065;        // key cap body height
        const keyD = 0.10;         // key cap depth (front→back)
        const gap = 0.012;         // gap between keys
        const keyTopInset = 0.015; // inset for sculpted top
        const kbRotX = -0.06;      // match case tilt
        const baseY = 0.145;       // key placement Y

        // Origin for the keyboard layout (top-left corner of Esc key)
        const originX = -1.02;
        const originZ = 1.35;

        // Helper: create a single key at grid position with width in units
        const addKey = (col: number, row: number, widthU: number, isMod: boolean) => {
            const w = widthU * U - gap;
            const xOffset = col * U + (widthU * U) / 2;
            const zOffset = row * (keyD + gap * 0.5);

            // Key body
            const bodyGeo = new RoundedBoxGeometry(w, keyH, keyD, 2, 0.012);
            const bodyMat = isMod ? modCapMat : alphaCapMat;
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(
                originX + xOffset,
                baseY,
                originZ + zOffset
            );
            body.rotation.x = kbRotX;
            body.castShadow = true;
            this.computerGroup.add(body);

            // Sculpted top face (slightly inset, flat) for the keycap dish look
            const topW = w - keyTopInset * 2;
            const topD = keyD - keyTopInset * 2;
            const topGeo = new RoundedBoxGeometry(topW, 0.01, topD, 2, 0.006);
            const topMat = isMod
                ? new THREE.MeshStandardMaterial({ color: 0xbab4a8, roughness: 0.7, metalness: 0.02 })
                : new THREE.MeshStandardMaterial({ color: 0xf0ece0, roughness: 0.65, metalness: 0.01 });
            const top = new THREE.Mesh(topGeo, topMat);
            top.position.set(
                originX + xOffset,
                baseY + keyH / 2 + 0.003,
                originZ + zOffset
            );
            top.rotation.x = kbRotX;
            this.computerGroup.add(top);
        };

        // ── ROW 0: Function Row (Esc, gap, F1–F4, gap, F5–F8, gap, F9–F12, gap, PrtSc, ScrLk, Pause) ──


        addKey(0, 0, 1, true);              // Esc

        // F1–F4
        for (let i = 0; i < 4; i++) addKey(1.5 + i, 0, 1, true);
        // F5–F8
        for (let i = 0; i < 4; i++) addKey(6 + i, 0, 1, true);
        // F9–F12
        for (let i = 0; i < 4; i++) addKey(10.5 + i, 0, 1, true);

        // PrtSc, ScrLk, Pause
        addKey(15, 0, 1, true);
        addKey(16, 0, 1, true);
        addKey(17, 0, 1, true);

        // ── ROW 1: Number Row (`, 1-0, -, =, Backspace, | Ins, Home, PgUp) ──
        const row1 = 1.15; // extra gap after function row
        for (let i = 0; i < 13; i++) addKey(i, row1, 1, i === 0); // ` through =
        addKey(13, row1, 2, true);           // Backspace (2U)

        addKey(15.5, row1, 1, true);         // Ins
        addKey(16.5, row1, 1, true);         // Home
        addKey(17.5, row1, 1, true);         // PgUp

        // ── ROW 2: QWERTY row (Tab, Q-], \, | Del, End, PgDn) ──
        const row2 = row1 + 1;
        addKey(0, row2, 1.5, true);          // Tab (1.5U)
        for (let i = 0; i < 12; i++) addKey(1.5 + i, row2, 1, false); // Q through ]
        addKey(13.5, row2, 1.5, true);       // \ (1.5U)

        addKey(15.5, row2, 1, true);         // Del
        addKey(16.5, row2, 1, true);         // End
        addKey(17.5, row2, 1, true);         // PgDn

        // ── ROW 3: Home row (Caps, A-', Enter) ──
        const row3 = row2 + 1;
        addKey(0, row3, 1.75, true);         // CapsLock (1.75U)
        for (let i = 0; i < 11; i++) addKey(1.75 + i, row3, 1, false); // A through '
        addKey(12.75, row3, 2.25, true);     // Enter (2.25U)

        // ── ROW 4: Shift row (LShift, Z-/, RShift, | Up) ──
        const row4 = row3 + 1;
        addKey(0, row4, 2.25, true);         // Left Shift (2.25U)
        for (let i = 0; i < 10; i++) addKey(2.25 + i, row4, 1, false); // Z through /
        addKey(12.25, row4, 2.75, true);     // Right Shift (2.75U)

        addKey(16.5, row4, 1, true);         // Up Arrow

        // ── ROW 5: Bottom row (Ctrl, Win, Alt, Space, Alt, Fn, Menu, Ctrl, | Left, Down, Right) ──
        const row5 = row4 + 1;
        addKey(0, row5, 1.25, true);         // Left Ctrl
        addKey(1.25, row5, 1.25, true);      // Win/Super
        addKey(2.5, row5, 1.25, true);       // Left Alt
        addKey(3.75, row5, 6.25, false);     // Spacebar (6.25U)
        addKey(10, row5, 1.25, true);        // Right Alt
        addKey(11.25, row5, 1.25, true);     // Fn
        addKey(12.5, row5, 1.25, true);      // Menu
        addKey(13.75, row5, 1.25, true);     // Right Ctrl

        addKey(15.5, row5, 1, true);         // Left Arrow
        addKey(16.5, row5, 1, true);         // Down Arrow
        addKey(17.5, row5, 1, true);         // Right Arrow
    }

    private buildCables(): void {
        const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });

        // Keyboard cable (exits back-center of keyboard, curves into base unit)
        const kbCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.06, 1.3),
            new THREE.Vector3(-0.2, 0.02, 1.1),
            new THREE.Vector3(0, 0.1, 0.9)
        ]);
        const kbCableGeo = new THREE.TubeGeometry(kbCurve, 10, 0.02, 8, false);
        const kbCable = new THREE.Mesh(kbCableGeo, mat);
        this.computerGroup.add(kbCable);
    }

    private addLights(): void {
        // Ambient
        const ambient = new THREE.AmbientLight(0xfff0e8, 0.4);
        this.scene.add(ambient);

        // Main directional (warm)
        const dirLight = new THREE.DirectionalLight(0xfff5ee, 1.0);
        dirLight.position.set(3, 5, 4);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 20;
        dirLight.shadow.camera.left = -5;
        dirLight.shadow.camera.right = 5;
        dirLight.shadow.camera.top = 5;
        dirLight.shadow.camera.bottom = -5;
        this.scene.add(dirLight);

        // Fill light (cool, from left)
        const fillLight = new THREE.DirectionalLight(0xb0d4f1, 0.3);
        fillLight.position.set(-3, 3, 2);
        this.scene.add(fillLight);

        // Rim light from behind the screen
        const rimLight = new THREE.PointLight(0x00ffcc, 0.5, 10);
        rimLight.position.set(0, 2, -1);
        this.scene.add(rimLight);
    }

    private addFloor(): void {
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.ShadowMaterial({
            opacity: 0.15,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.5;
        floor.receiveShadow = true;
        this.scene.add(floor);
    }

    /** Update scroll progress (0 = zoomed in, 1 = zoomed out) */
    setScrollProgress(progress: number): void {
        this.scrollProgress = Math.max(0, Math.min(1, progress));
    }

    /** Project screen mesh corners to 2D viewport coords */
    getScreenRect(): { left: number; top: number; width: number; height: number } {
        this.computerGroup.updateWorldMatrix(true, true);

        const hw = 0.8, hh = 0.55; // half-extents of PlaneGeometry(1.6, 1.1)
        const corners = [
            new THREE.Vector3(-hw, hh, 0),
            new THREE.Vector3(hw, hh, 0),
            new THREE.Vector3(-hw, -hh, 0),
            new THREE.Vector3(hw, -hh, 0),
        ];

        const w = this.renderer.domElement.clientWidth;
        const h = this.renderer.domElement.clientHeight;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const c of corners) {
            c.applyMatrix4(this.screenMesh.matrixWorld);
            c.project(this.camera);
            const px = (c.x * 0.5 + 0.5) * w;
            const py = (-c.y * 0.5 + 0.5) * h;
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
        }

        return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    }

    /** Update screen texture from an external canvas */
    setScreenCanvas(canvas: HTMLCanvasElement): void {
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        (this.screenMesh.material as THREE.MeshStandardMaterial).map = texture;
        (this.screenMesh.material as THREE.MeshStandardMaterial).emissiveMap = texture;
        (this.screenMesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
    }

    /** Called on render loop by external terminal to flag texture update */
    updateTexture(): void {
        const mat = this.screenMesh.material as THREE.MeshStandardMaterial;
        if (mat.map) {
            mat.map.needsUpdate = true;
        }
    }

    /** Interpolate background color from dark to slate blue */
    getBackgroundColor(): THREE.Color {
        const darkColor = new THREE.Color(0x0a0f14);
        const slateColor = new THREE.Color(0x1a2332);
        return darkColor.clone().lerp(slateColor, this.scrollProgress);
    }

    /** Aspect-ratio-aware portrait offset (edh.dev technique)
     *  Maps the height/width ratio to a camera Z offset so the screen
     *  fills the viewport on both landscape monitors and portrait phones.
     */
    private updatePortraitOffset(): void {
        const ratio = window.innerHeight / window.innerWidth;
        // Linear interpolation: ratio 0.5 → offset 0, ratio 1.5 → offset 2.0
        this.portraitOffset = Math.max(0, Math.min(2.5, (ratio - 0.5) * 2.0));
    }

    /** Utility: linear interpolation */
    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const t = this.scrollProgress;
        const easedT = this.easeInOutCubic(t);

        // ── Camera Z-axis zoom (NOT FOV animation) ──
        // Start close (screen fills viewport) → pull back (reveal full computer)
        const camZ = this.lerp(
            this.CAM_Z_START + this.portraitOffset,
            this.CAM_Z_END + this.portraitOffset,
            easedT
        );
        this.camera.position.set(0, this.CAM_Y, camZ);

        // ── Object transforms on scroll ──
        // Move computer group DOWN so we look "down" at it
        const modelY = this.lerp(this.MODEL_Y_START, this.MODEL_Y_END, easedT);
        this.computerGroup.position.y = -0.3 + modelY;

        // Rotate computer on scroll for dimensional reveal
        const modelRot = this.lerp(this.MODEL_ROT_START, this.MODEL_ROT_END, easedT);
        this.computerGroup.rotation.y = modelRot;

        // Subtle continuous wobble
        const time = performance.now() * 0.0005;
        this.computerGroup.rotation.y += Math.sin(time) * 0.015;

        // Camera always looks at the center of the computer group
        this.camera.lookAt(new THREE.Vector3(0, this.computerGroup.position.y + 1.6, 0));

        // Update background
        const bgColor = this.getBackgroundColor();
        this.renderer.setClearColor(bgColor, 1);

        this.renderer.render(this.scene, this.camera);
    };

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private onResize = (): void => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.updatePortraitOffset();
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    destroy(): void {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}
