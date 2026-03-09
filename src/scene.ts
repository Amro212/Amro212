import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
    crtGlassFragmentShader,
    crtGlassVertexShader,
    crtScreenFragmentShader,
    postPassFragmentShader,
    postPassVertexShader,
    screenSurfaceVertexShader,
    synthwaveGridFragmentShader,
    synthwaveGridVertexShader,
} from './sceneShaders';

/**
 * Creates and manages the retro 3D computer scene.
 * The computer geometry stays intact while the environment,
 * lighting, and post-processing shift to a synthwave presentation.
 */
export class RetroComputerScene {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private bloomPass: UnrealBloomPass;
    private container: HTMLElement;
    private computerGroup: THREE.Group;
    private screenMesh!: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    private screenGlowMesh!: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    private crtMaterial!: THREE.ShaderMaterial;
    private glassMaterial!: THREE.ShaderMaterial;
    private gridMaterial!: THREE.ShaderMaterial;
    private screenTexture: THREE.CanvasTexture | null = null;
    private animationId: number | null = null;
    private readonly clock = new THREE.Clock();
    private readonly lookTarget = new THREE.Vector3();
    private readonly backgroundStart = new THREE.Color(0x08020d);
    private readonly backgroundEnd = new THREE.Color(0x16071a);
    private readonly backgroundScratch = new THREE.Color();

    private readonly gridUniforms = {
        uTime: { value: 0 },
    };

    private readonly crtUniforms = {
        uTexture: { value: null as THREE.Texture | null },
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1024, 768) },
    };

    private readonly glassUniforms = {
        uTime: { value: 0 },
    };

    private readonly postUniforms = {
        tDiffuse: { value: null as THREE.Texture | null },
        uAberration: { value: 0.0018 },
    };

    // Scroll animation state
    private scrollProgress = 0;
    private portraitOffset = 0;

    // Camera system
    private readonly CAMERA_FOV = 80;
    private readonly CAM_Z_START = 1.75;
    private readonly CAM_Z_END = 5.0;
    private readonly MODEL_Y_START = 0;
    private readonly MODEL_Y_END = 0;
    private readonly MODEL_ROT_START = 0;
    private readonly MODEL_ROT_END = 0.58;
    private readonly CAM_Y = 1.35;

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container #${containerId} not found`);
        this.container = el;

        this.scene = new THREE.Scene();

        this.updatePortraitOffset();

        this.camera = new THREE.PerspectiveCamera(
            this.CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            100,
        );
        this.camera.position.set(0, this.CAM_Y, this.CAM_Z_START + this.portraitOffset);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(this.getPixelRatio());
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.08;
        this.container.appendChild(this.renderer.domElement);

        this.computerGroup = new THREE.Group();
        this.buildComputer();
        this.scene.add(this.computerGroup);

        this.addLights();
        this.addFloor();
        this.composer = this.setupComposer();
        this.bloomPass = this.composer.passes[1] as UnrealBloomPass;

        window.addEventListener('resize', this.onResize);

        this.animate();
    }

    private buildComputer(): void {
        this.buildBaseUnit();
        this.buildMonitor();
        this.buildKeyboard();
        this.buildCables();

        this.computerGroup.position.y = -0.3;
        this.computerGroup.rotation.y = this.MODEL_ROT_START;
    }

    private buildBaseUnit(): void {
        const baseGeo = new RoundedBoxGeometry(2.4, 0.5, 2.0, 4, 0.05);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0xd4d2d0, roughness: 0.52, metalness: 0.04 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.set(0, 0.25, 0);
        base.castShadow = true;
        base.receiveShadow = true;
        this.computerGroup.add(base);

        const floppyGeo = new RoundedBoxGeometry(0.5, 0.06, 0.02, 2, 0.01);
        const floppyMat = new THREE.MeshStandardMaterial({ color: 0x242433, roughness: 0.2, metalness: 0.08 });

        const floppy1 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy1.position.set(0.7, 0.35, 1.01);
        floppy1.castShadow = true;
        this.computerGroup.add(floppy1);

        const floppy2 = new THREE.Mesh(floppyGeo, floppyMat);
        floppy2.position.set(0.7, 0.22, 1.01);
        floppy2.castShadow = true;
        this.computerGroup.add(floppy2);

        const btnGeo = new RoundedBoxGeometry(0.1, 0.1, 0.02, 2, 0.02);
        const btnMat = new THREE.MeshStandardMaterial({ color: 0xd94d7d, roughness: 0.34, metalness: 0.08 });
        const pwrBtn = new THREE.Mesh(btnGeo, btnMat);
        pwrBtn.position.set(-0.9, 0.25, 1.01);
        pwrBtn.castShadow = true;
        this.computerGroup.add(pwrBtn);

        const badgeGeo = new THREE.BoxGeometry(0.2, 0.05, 0.01);
        const badgeMat = new THREE.MeshStandardMaterial({ color: 0x272333, roughness: 0.5, metalness: 0.08 });
        const badge = new THREE.Mesh(badgeGeo, badgeMat);
        badge.position.set(-0.9, 0.38, 1.01);
        this.computerGroup.add(badge);
    }

    private buildMonitor(): void {
        const beigeMat = new THREE.MeshStandardMaterial({ color: 0xd0cbc7, roughness: 0.58, metalness: 0.03 });
        const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x252235, roughness: 0.32, metalness: 0.08 });
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0xc5c7ce, roughness: 0.54, metalness: 0.03 });

        const tubeW = 1.5;
        const tubeH = 1.3;
        const tubeD = 0.7;
        const tubeGeo = new RoundedBoxGeometry(tubeW, tubeH, tubeD, 4, 0.08);
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.set(0, 1.64, -0.05);
        tube.castShadow = true;
        tube.receiveShadow = true;
        this.computerGroup.add(tube);

        const ventW = tubeW + 0.04;
        const ventH = 0.015;
        const ventD = 0.4;
        const ventGeo = new THREE.BoxGeometry(ventW, ventH, ventD);
        const ventMat = new THREE.MeshStandardMaterial({ color: 0x12111a, roughness: 0.38, metalness: 0.08 });
        for (let i = 0; i < 7; i++) {
            const vent = new THREE.Mesh(ventGeo, ventMat);
            vent.position.set(0, 1.44 + i * 0.06, -0.10);
            this.computerGroup.add(vent);
        }

        const seamGeo = new RoundedBoxGeometry(1.8, 1.55, 0.05, 4, 0.02);
        const seam = new THREE.Mesh(seamGeo, darkTrimMat);
        seam.position.set(0, 1.64, 0.30);
        this.computerGroup.add(seam);

        const mainW = 1.95;
        const mainH = 1.65;
        const mainD = 0.5;
        const mainGeo = new RoundedBoxGeometry(mainW, mainH, mainD, 4, 0.08);
        const mainBody = new THREE.Mesh(mainGeo, beigeMat);
        mainBody.position.set(0, 1.64, 0.55);
        mainBody.castShadow = true;
        mainBody.receiveShadow = true;
        this.computerGroup.add(mainBody);

        const innerBezelW = 1.6;
        const innerBezelH = 1.2;
        const innerBezelD = 0.06;
        const innerBezelGeo = new RoundedBoxGeometry(innerBezelW, innerBezelH, innerBezelD, 4, 0.02);
        const innerBezel = new THREE.Mesh(innerBezelGeo, darkTrimMat);
        innerBezel.position.set(0, 1.64, 0.79);
        this.computerGroup.add(innerBezel);

        const frameD = 0.15;
        const frameThick = 0.175;
        const topBotW = innerBezelW + frameThick * 2;

        const tFrameGeo = new THREE.BoxGeometry(topBotW, frameThick, frameD);
        const tFrame = new THREE.Mesh(tFrameGeo, beigeMat);
        tFrame.position.set(0, 1.64 + innerBezelH / 2 + frameThick / 2, 0.87);
        tFrame.castShadow = true;
        this.computerGroup.add(tFrame);

        const bFrameGeo = new THREE.BoxGeometry(topBotW, frameThick, frameD);
        const bFrame = new THREE.Mesh(bFrameGeo, beigeMat);
        bFrame.position.set(0, 1.64 - innerBezelH / 2 - frameThick / 2, 0.87);
        bFrame.castShadow = true;
        this.computerGroup.add(bFrame);

        const lFrameGeo = new THREE.BoxGeometry(frameThick, innerBezelH, frameD);
        const lFrame = new THREE.Mesh(lFrameGeo, beigeMat);
        lFrame.position.set(-innerBezelW / 2 - frameThick / 2, 1.64, 0.87);
        lFrame.castShadow = true;
        this.computerGroup.add(lFrame);

        const rFrameGeo = new THREE.BoxGeometry(frameThick, innerBezelH, frameD);
        const rFrame = new THREE.Mesh(rFrameGeo, beigeMat);
        rFrame.position.set(innerBezelW / 2 + frameThick / 2, 1.64, 0.87);
        rFrame.castShadow = true;
        this.computerGroup.add(rFrame);

        const screenW = 1.5;
        const screenH = 1.1;
        const screenGeo = new THREE.PlaneGeometry(screenW, screenH);
        this.crtMaterial = new THREE.ShaderMaterial({
            uniforms: this.crtUniforms,
            vertexShader: screenSurfaceVertexShader,
            fragmentShader: crtScreenFragmentShader,
            toneMapped: false,
        });
        const screen = new THREE.Mesh(screenGeo, this.crtMaterial);
        screen.position.set(0, 1.65, 0.83);
        this.screenMesh = screen;
        this.computerGroup.add(screen);

        const glowGeo = new THREE.PlaneGeometry(screenW * 0.96, screenH * 0.96);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x69ffc7,
            transparent: true,
            opacity: 0.045,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
        });
        const glowOverlay = new THREE.Mesh(glowGeo, glowMat);
        glowOverlay.position.set(0, 1.65, 0.835);
        this.screenGlowMesh = glowOverlay;
        this.computerGroup.add(glowOverlay);

        this.glassMaterial = new THREE.ShaderMaterial({
            uniforms: this.glassUniforms,
            vertexShader: crtGlassVertexShader,
            fragmentShader: crtGlassFragmentShader,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            toneMapped: false,
        });
        const glassPlane = new THREE.Mesh(new THREE.PlaneGeometry(screenW * 1.015, screenH * 1.015), this.glassMaterial);
        glassPlane.position.set(0, 1.65, 0.842);
        this.computerGroup.add(glassPlane);

        const standBaseW = 1.2;
        const standBaseD = 1.2;
        const standBaseGeo = new RoundedBoxGeometry(standBaseW, 0.06, standBaseD, 4, 0.02);
        const standBase = new THREE.Mesh(standBaseGeo, beigeMat);
        standBase.position.set(0, 0.62, 0.35);
        standBase.castShadow = true;
        standBase.receiveShadow = true;
        this.computerGroup.add(standBase);

        const neckGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.15, 16);
        const neckMat = new THREE.MeshStandardMaterial({ color: 0x8e8fa0, roughness: 0.48, metalness: 0.12 });
        const neck = new THREE.Mesh(neckGeo, neckMat);
        neck.position.set(0, 0.69, 0.35);
        neck.castShadow = true;
        neck.receiveShadow = true;
        this.computerGroup.add(neck);

        const stepGeo = new RoundedBoxGeometry(mainW * 0.6, 0.06, 0.6, 4, 0.02);
        const step = new THREE.Mesh(stepGeo, beigeMat);
        step.position.set(0, 1.64 - mainH / 2 - 0.03, 0.40);
        step.castShadow = true;
        this.computerGroup.add(step);

        const pwrGeo = new RoundedBoxGeometry(0.08, 0.04, 0.02, 2, 0.01);
        const pwrMat = new THREE.MeshStandardMaterial({ color: 0xa2a3b3, roughness: 0.38, metalness: 0.12 });
        const pwr = new THREE.Mesh(pwrGeo, pwrMat);
        pwr.position.set(mainW / 2 - 0.3, 1.64 - mainH / 2 + 0.12, 0.80);
        this.computerGroup.add(pwr);

        const ledGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.01, 8);
        const ledMat = new THREE.MeshBasicMaterial({ color: 0x7dff9f, toneMapped: false });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.rotation.x = Math.PI / 2;
        led.position.set(mainW / 2 - 0.45, 1.64 - mainH / 2 + 0.12, 0.805);
        this.computerGroup.add(led);
    }

    private buildKeyboard(): void {
        const caseW = 2.2;
        const caseD = 0.85;
        const caseH = 0.14;
        const caseGeo = new RoundedBoxGeometry(caseW, caseH, caseD, 4, 0.04);
        const caseMat = new THREE.MeshStandardMaterial({ color: 0xcbc6c3, roughness: 0.6, metalness: 0.04 });
        const kbCase = new THREE.Mesh(caseGeo, caseMat);
        kbCase.position.set(0, 0.07, 1.7);
        kbCase.rotation.x = -0.06;
        kbCase.castShadow = true;
        kbCase.receiveShadow = true;
        this.computerGroup.add(kbCase);

        const alphaCapMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d7, roughness: 0.68, metalness: 0.02 });
        const modCapMat = new THREE.MeshStandardMaterial({ color: 0xb0a9a2, roughness: 0.72, metalness: 0.03 });
        const alphaTopMat = new THREE.MeshStandardMaterial({ color: 0xf2eee4, roughness: 0.58, metalness: 0.02 });
        const modTopMat = new THREE.MeshStandardMaterial({ color: 0xc0b9b1, roughness: 0.64, metalness: 0.03 });

        const U = 0.115;
        const keyH = 0.065;
        const keyD = 0.10;
        const gap = 0.012;
        const keyTopInset = 0.015;
        const kbRotX = -0.06;
        const baseY = 0.145;
        const originX = -1.02;
        const originZ = 1.35;

        const addKey = (col: number, row: number, widthU: number, isMod: boolean) => {
            const w = widthU * U - gap;
            const xOffset = col * U + (widthU * U) / 2;
            const zOffset = row * (keyD + gap * 0.5);

            const bodyGeo = new RoundedBoxGeometry(w, keyH, keyD, 2, 0.012);
            const bodyMat = isMod ? modCapMat : alphaCapMat;
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.set(originX + xOffset, baseY, originZ + zOffset);
            body.rotation.x = kbRotX;
            body.castShadow = true;
            this.computerGroup.add(body);

            const topW = w - keyTopInset * 2;
            const topD = keyD - keyTopInset * 2;
            const topGeo = new RoundedBoxGeometry(topW, 0.01, topD, 2, 0.006);
            const top = new THREE.Mesh(topGeo, isMod ? modTopMat : alphaTopMat);
            top.position.set(originX + xOffset, baseY + keyH / 2 + 0.003, originZ + zOffset);
            top.rotation.x = kbRotX;
            this.computerGroup.add(top);
        };

        addKey(0, 0, 1, true);
        for (let i = 0; i < 4; i++) addKey(1.5 + i, 0, 1, true);
        for (let i = 0; i < 4; i++) addKey(6 + i, 0, 1, true);
        for (let i = 0; i < 4; i++) addKey(10.5 + i, 0, 1, true);
        addKey(15, 0, 1, true);
        addKey(16, 0, 1, true);
        addKey(17, 0, 1, true);

        const row1 = 1.15;
        for (let i = 0; i < 13; i++) addKey(i, row1, 1, i === 0);
        addKey(13, row1, 2, true);
        addKey(15.5, row1, 1, true);
        addKey(16.5, row1, 1, true);
        addKey(17.5, row1, 1, true);

        const row2 = row1 + 1;
        addKey(0, row2, 1.5, true);
        for (let i = 0; i < 12; i++) addKey(1.5 + i, row2, 1, false);
        addKey(13.5, row2, 1.5, true);
        addKey(15.5, row2, 1, true);
        addKey(16.5, row2, 1, true);
        addKey(17.5, row2, 1, true);

        const row3 = row2 + 1;
        addKey(0, row3, 1.75, true);
        for (let i = 0; i < 11; i++) addKey(1.75 + i, row3, 1, false);
        addKey(12.75, row3, 2.25, true);

        const row4 = row3 + 1;
        addKey(0, row4, 2.25, true);
        for (let i = 0; i < 10; i++) addKey(2.25 + i, row4, 1, false);
        addKey(12.25, row4, 2.75, true);
        addKey(16.5, row4, 1, true);

        const row5 = row4 + 1;
        addKey(0, row5, 1.25, true);
        addKey(1.25, row5, 1.25, true);
        addKey(2.5, row5, 1.25, true);
        addKey(3.75, row5, 6.25, false);
        addKey(10, row5, 1.25, true);
        addKey(11.25, row5, 1.25, true);
        addKey(12.5, row5, 1.25, true);
        addKey(13.75, row5, 1.25, true);
        addKey(15.5, row5, 1, true);
        addKey(16.5, row5, 1, true);
        addKey(17.5, row5, 1, true);
    }

    private buildCables(): void {
        const mat = new THREE.MeshStandardMaterial({ color: 0x21212d, roughness: 0.58, metalness: 0.04 });
        const kbCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 0.06, 1.3),
            new THREE.Vector3(-0.2, 0.02, 1.1),
            new THREE.Vector3(0, 0.1, 0.9),
        ]);
        const kbCableGeo = new THREE.TubeGeometry(kbCurve, 10, 0.02, 8, false);
        const kbCable = new THREE.Mesh(kbCableGeo, mat);
        kbCable.castShadow = true;
        this.computerGroup.add(kbCable);
    }

    private addLights(): void {
        const ambient = new THREE.AmbientLight(0x35193d, 0.46);
        this.scene.add(ambient);

        const fillLight = new THREE.DirectionalLight(0x55d7ff, 1.15);
        fillLight.position.set(-5.5, 2.8, 5.8);
        this.scene.add(fillLight);

        const keyLight = new THREE.SpotLight(0xff4ea3, 22, 16, Math.PI / 5.2, 0.42, 1.35);
        keyLight.position.set(4.4, 4.8, 5.2);
        keyLight.target.position.set(0.15, 1.3, 0.75);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.radius = 4;
        keyLight.shadow.bias = -0.00025;
        keyLight.shadow.camera.near = 0.5;
        keyLight.shadow.camera.far = 20;
        this.scene.add(keyLight);
        this.scene.add(keyLight.target);

        const rimLight = new THREE.PointLight(0xff5ec6, 2.8, 12, 2);
        rimLight.position.set(-1.0, 2.7, -2.4);
        this.scene.add(rimLight);
    }

    private addFloor(): void {
        this.gridMaterial = new THREE.ShaderMaterial({
            uniforms: this.gridUniforms,
            vertexShader: synthwaveGridVertexShader,
            fragmentShader: synthwaveGridFragmentShader,
            side: THREE.DoubleSide,
            depthWrite: false,
            toneMapped: false,
        });

        const gridFloor = new THREE.Mesh(new THREE.PlaneGeometry(72, 72), this.gridMaterial);
        gridFloor.rotation.x = -Math.PI / 2;
        gridFloor.position.y = -0.5;
        gridFloor.renderOrder = -5;
        this.scene.add(gridFloor);

        const shadowFloorMat = new THREE.ShadowMaterial({ opacity: 0.18 });
        shadowFloorMat.color.set(0x150512);
        const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), shadowFloorMat);
        shadowFloor.rotation.x = -Math.PI / 2;
        shadowFloor.position.y = -0.495;
        shadowFloor.receiveShadow = true;
        shadowFloor.renderOrder = 1;
        this.scene.add(shadowFloor);
    }

    private setupComposer(): EffectComposer {
        const composer = new EffectComposer(this.renderer);
        composer.setSize(window.innerWidth, window.innerHeight);
        composer.setPixelRatio(this.getPixelRatio());

        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.65,
            0.55,
            0.18,
        );
        composer.addPass(bloomPass);

        const finalPass = new ShaderPass({
            uniforms: this.postUniforms,
            vertexShader: postPassVertexShader,
            fragmentShader: postPassFragmentShader,
        });
        composer.addPass(finalPass);
        composer.addPass(new OutputPass());

        this.applyPostProfile(bloomPass);
        return composer;
    }

    private applyPostProfile(bloomPass: UnrealBloomPass): void {
        const isCompact = this.isCompactViewport();
        bloomPass.strength = isCompact ? 0.34 : 0.52;
        bloomPass.radius = isCompact ? 0.4 : 0.5;
        bloomPass.threshold = isCompact ? 0.28 : 0.24;
        this.postUniforms.uAberration.value = isCompact ? 0.0009 : 0.00135;
    }

    private getPixelRatio(): number {
        return Math.min(window.devicePixelRatio, this.isCompactViewport() ? 1.5 : 1.75);
    }

    private isCompactViewport(): boolean {
        return window.innerWidth < 768;
    }

    /** Update scroll progress (0 = zoomed in, 1 = zoomed out) */
    setScrollProgress(progress: number): void {
        this.scrollProgress = Math.max(0, Math.min(1, progress));
    }

    /** Project screen mesh corners to 2D viewport coords */
    getScreenRect(): { left: number; top: number; width: number; height: number } {
        this.computerGroup.updateWorldMatrix(true, true);

        const hw = 0.75;
        const hh = 0.55;
        const corners = [
            new THREE.Vector3(-hw, hh, 0),
            new THREE.Vector3(hw, hh, 0),
            new THREE.Vector3(-hw, -hh, 0),
            new THREE.Vector3(hw, -hh, 0),
        ];

        const w = this.renderer.domElement.clientWidth;
        const h = this.renderer.domElement.clientHeight;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const corner of corners) {
            corner.applyMatrix4(this.screenMesh.matrixWorld);
            corner.project(this.camera);
            const px = (corner.x * 0.5 + 0.5) * w;
            const py = (-corner.y * 0.5 + 0.5) * h;
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
        }

        return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
    }

    /** Update screen texture from an external canvas */
    setScreenCanvas(canvas: HTMLCanvasElement): void {
        this.screenTexture?.dispose();

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        this.screenTexture = texture;
        this.crtUniforms.uTexture.value = texture;
        this.crtUniforms.uResolution.value.set(canvas.width, canvas.height);
    }

    /** Called on render loop by external terminal to flag texture update */
    updateTexture(): void {
        if (this.screenTexture) {
            this.screenTexture.needsUpdate = true;
        }
    }

    /** Interpolate background color for page sync while the canvas uses a shader backdrop */
    getBackgroundColor(): THREE.Color {
        return this.backgroundStart.clone().lerp(this.backgroundEnd, 0.15 + this.scrollProgress * 0.5);
    }

    /** Aspect-ratio-aware portrait offset */
    private updatePortraitOffset(): void {
        const ratio = window.innerHeight / window.innerWidth;
        this.portraitOffset = Math.max(0, Math.min(2.5, (ratio - 0.5) * 2.0));
    }

    private lerp(a: number, b: number, t: number): number {
        return a + (b - a) * t;
    }

    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const elapsed = this.clock.getElapsedTime();
        const easedT = this.easeInOutCubic(this.scrollProgress);

        const camZ = this.lerp(
            this.CAM_Z_START + this.portraitOffset,
            this.CAM_Z_END + this.portraitOffset,
            easedT,
        );
        this.camera.position.set(0, this.CAM_Y, camZ);

        const modelY = this.lerp(this.MODEL_Y_START, this.MODEL_Y_END, easedT);
        this.computerGroup.position.y = -0.3 + modelY;

        const modelRot = this.lerp(this.MODEL_ROT_START, this.MODEL_ROT_END, easedT);
        this.computerGroup.rotation.y = modelRot + Math.sin(elapsed * 0.8) * 0.015;

        this.lookTarget.set(0, this.computerGroup.position.y + 1.6, 0);
        this.camera.lookAt(this.lookTarget);

        this.backgroundScratch.copy(this.backgroundStart).lerp(this.backgroundEnd, 0.08 + this.scrollProgress * 0.18);
        this.renderer.setClearColor(this.backgroundScratch, 1);

        this.gridUniforms.uTime.value = elapsed;
        this.crtUniforms.uTime.value = elapsed;
        this.glassUniforms.uTime.value = elapsed;

        this.screenGlowMesh.material.opacity = 0.04 + Math.sin(elapsed * 2.6) * 0.008;
        this.screenGlowMesh.scale.setScalar(1 + Math.sin(elapsed * 1.8) * 0.0015);

        this.composer.render();
    };

    private easeInOutCubic(t: number): number {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    private onResize = (): void => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.updatePortraitOffset();
        this.camera.updateProjectionMatrix();

        const pixelRatio = this.getPixelRatio();
        this.renderer.setPixelRatio(pixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setPixelRatio(pixelRatio);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
        this.applyPostProfile(this.bloomPass);
    };

    private disposeMaterial(material: THREE.Material): void {
        const maybeTextured = material as THREE.Material & {
            map?: THREE.Texture | null;
            emissiveMap?: THREE.Texture | null;
        };

        maybeTextured.map?.dispose();
        maybeTextured.emissiveMap?.dispose();
        material.dispose();
    }

    destroy(): void {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        window.removeEventListener('resize', this.onResize);

        this.screenTexture?.dispose();
        this.scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) return;
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => this.disposeMaterial(material));
        });

        this.composer.dispose();
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}



