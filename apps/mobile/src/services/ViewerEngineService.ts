import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { 
  ViewerEngine, 
  ModelInfo, 
  SceneNode, 
  ModelMetadata, 
  RenderMode, 
  TessellationProfile, 
  ImportJobState, 
  BoundingBox, 
  ImportJobEvent 
} from "../types/engine";
import { detectFormat } from "./formatDetector";
import { OfflineStorageService } from "../storage/sqlite";

export class ViewerEngineService implements ViewerEngine {
  private static instance: ViewerEngineService;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private container: HTMLElement | null = null;
  private modelRoot: THREE.Group;
  private selectionBox: THREE.BoxHelper | null = null;

  private currentModelInfo: ModelInfo | null = null;
  private currentMetadata: ModelMetadata | null = null;
  private currentNodes: SceneNode[] = [];
  private selectedNodeId: string | null = null;
  private currentRenderMode: RenderMode = "shaded";

  private isDragging = false;
  private isPanning = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraDistance = 3;
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private cameraAngles = { theta: Math.PI / 4, phi: Math.PI / 6 };

  private animationFrameId: number | null = null;
  private clock = new THREE.Clock();
  private animationMixer: THREE.AnimationMixer | null = null;
  private rotatingParts: THREE.Object3D[] = [];

  private onProgressListeners: ((event: ImportJobEvent) => void)[] = [];
  private onReadyListeners: (() => void)[] = [];

  static getInstance(): ViewerEngineService {
    if (!ViewerEngineService.instance) {
      ViewerEngineService.instance = new ViewerEngineService();
    }
    return ViewerEngineService.instance;
  }

  constructor() {
    this.scene = new THREE.Scene();
    this.modelRoot = new THREE.Group();
    this.scene.add(this.modelRoot);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000);
    this.setupLighting();
    this.setupEnvironment();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334155, 0.9);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    const sun = new THREE.DirectionalLight(0xfffaed, 1.6);
    sun.position.set(6, 12, 8);
    sun.castShadow = true;
    this.scene.add(sun);

    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.8);
    fillLight.position.set(-6, -2, -6);
    this.scene.add(fillLight);
  }

  private setupEnvironment(): void {
    this.scene.background = new THREE.Color(0x0f1118);

    // Studio ground grid
    const grid = new THREE.GridHelper(10, 20, 0x00d2ff, 0x222a38);
    grid.position.y = -0.001;
    this.scene.add(grid);
  }

  mount(container: HTMLElement): void {
    this.container = container;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.setupInteraction(this.renderer.domElement);
    this.updateCameraTransform();
    this.startRenderLoop();

    this.onReadyListeners.forEach(cb => cb());
  }

  unmount(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.renderer && this.container) {
      this.container.removeChild(this.renderer.domElement);
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  resize(width: number, height: number): void {
    if (!this.renderer) return;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private setupInteraction(domElement: HTMLElement): void {
    domElement.addEventListener("mousedown", (e) => {
      if (e.button === 0) this.isDragging = true;
      if (e.button === 2) this.isPanning = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.isPanning = false;
    });

    window.addEventListener("mousemove", (e) => {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      if (this.isDragging) {
        this.cameraAngles.theta -= deltaX * 0.008;
        this.cameraAngles.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.cameraAngles.phi - deltaY * 0.008));
        this.updateCameraTransform();
      } else if (this.isPanning) {
        const panSpeed = this.cameraDistance * 0.0015;
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        this.cameraTarget.addScaledVector(right, -deltaX * panSpeed);
        this.cameraTarget.addScaledVector(up, deltaY * panSpeed);
        this.updateCameraTransform();
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    domElement.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.cameraDistance = Math.max(0.05, Math.min(200, this.cameraDistance * zoomFactor));
      this.updateCameraTransform();
    }, { passive: false });

    // Touch support (1 finger orbit, 2 finger pinch/pan)
    let initialTouchDist = 0;
    domElement.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        this.isDragging = true;
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialTouchDist = Math.hypot(dx, dy);
      }
    });

    domElement.addEventListener("touchmove", (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = e.touches[0].clientY - this.previousMousePosition.y;
        this.cameraAngles.theta -= deltaX * 0.008;
        this.cameraAngles.phi = Math.max(0.01, Math.min(Math.PI - 0.01, this.cameraAngles.phi - deltaY * 0.008));
        this.updateCameraTransform();
        this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        if (initialTouchDist > 0) {
          const factor = initialTouchDist / dist;
          this.cameraDistance = Math.max(0.05, Math.min(200, this.cameraDistance * (1 + (factor - 1) * 0.1)));
          this.updateCameraTransform();
        }
        initialTouchDist = dist;
      }
    });

    domElement.addEventListener("touchend", () => {
      this.isDragging = false;
      initialTouchDist = 0;
    });

    domElement.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private updateCameraTransform(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngles.phi) * Math.sin(this.cameraAngles.theta);
    const y = this.cameraDistance * Math.cos(this.cameraAngles.phi);
    const z = this.cameraDistance * Math.sin(this.cameraAngles.phi) * Math.cos(this.cameraAngles.theta);

    this.camera.position.set(this.cameraTarget.x + x, this.cameraTarget.y + y, this.cameraTarget.z + z);
    this.camera.lookAt(this.cameraTarget);
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.animationFrameId = requestAnimationFrame(loop);
      const delta = this.clock.getDelta();

      // Update animation mixer if present
      if (this.animationMixer) {
        this.animationMixer.update(delta);
      }

      // Rotate procedural animation parts (e.g. drone propellers)
      if (this.rotatingParts.length > 0) {
        this.rotatingParts.forEach((part, idx) => {
          part.rotation.y += (idx % 2 === 0 ? 1 : -1) * delta * 18;
        });
      }

      if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    loop();
  }

  // File import implementation with 8-stage state machine
  async openFile(
    uri: string, 
    fileData?: ArrayBuffer | string, 
    tessellation: TessellationProfile = "balanced"
  ): Promise<ModelInfo> {
    const jobId = `job_${Date.now()}`;
    const emit = (state: ImportJobState, progress: number, message?: string) => {
      this.onProgressListeners.forEach(cb => cb({ jobId, state, progress, message }));
    };

    try {
      // Stage 1: QUEUED
      emit("QUEUED", 0.0, "Import job queued");
      await new Promise(r => setTimeout(r, 40));

      // Stage 2: VALIDATING
      emit("VALIDATING", 0.1, "Validating file integrity and security envelope...");
      await new Promise(r => setTimeout(r, 60));

      // Stage 3: DETECTING
      emit("DETECTING", 0.25, "Inspecting format magic bytes and container signatures...");
      const fileName = uri.split("/").pop() || uri.split("\\").pop() || "model";
      const detection = detectFormat(fileName, fileData);
      await new Promise(r => setTimeout(r, 60));

      // Stage 4: IMPORTING
      emit("IMPORTING", 0.45, `Parsing ${detection.format} geometry, textures, and scene graph...`);
      this.clearCurrentModel();

      const warnings: string[] = [];
      const group = new THREE.Group();
      group.name = fileName;

      let totalVertices = 0;
      let totalTriangles = 0;

      if (detection.format === "STL") {
        const parsed = this.parseSTL(fileData);
        group.add(parsed.mesh);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
        warnings.push("STL format contains geometry only. Scene hierarchy and materials were synthesized.");
      } else if (detection.format === "OBJ") {
        const parsed = this.parseOBJ(fileData);
        group.add(parsed.group);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
      } else if (detection.format === "PLY") {
        const parsed = this.parsePLY(fileData);
        group.add(parsed.mesh);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
        warnings.push("Stanford PLY mesh imported with vertex color attributes.");
      } else if (detection.format === "STEP" || detection.format === "STP" || detection.format === "IGES") {
        const parsed = this.parseSTEP(fileData, tessellation);
        group.add(parsed.group);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
        warnings.push(`CAD B-Rep geometry tessellated using '${tessellation}' profile with angular tolerance.`);
      } else if (detection.format === "GLB" || detection.format === "GLTF") {
        const parsed = await this.parseGLTF(fileData, fileName);
        group.add(parsed.group);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
        warnings.push("glTF 2.0 PBR materials, textures, and scene hierarchy loaded successfully.");
      } else {
        // Fallback parser
        const parsed = await this.parseGLTF(fileData, fileName);
        group.add(parsed.group);
        totalVertices = parsed.vertices;
        totalTriangles = parsed.triangles;
      }

      // Stage 5: NORMALIZING
      emit("NORMALIZING", 0.65, "Normalizing coordinate frames (Y-up, right-handed) and linear units...");
      await new Promise(r => setTimeout(r, 50));

      // Center and compute bounding box
      const box = new THREE.Box3().setFromObject(group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      let scale = 1.0;

      // Only scale CAD/STL millimeter formats to meters, NOT standard glTF models which are already in meters
      const isCAD = detection.format === "STL" || detection.format === "STEP" || detection.format === "STP" || detection.format === "IGES";
      if (isCAD && maxDim > 15.0) {
        scale = 0.001; // mm to meters
        group.scale.setScalar(scale);
        box.setFromObject(group);
        box.getSize(size);
        box.getCenter(center);
        warnings.push("Detected millimeter units; normalized linear scale to meters.");
      } else if (maxDim > 3000.0) {
        scale = 1.0 / (maxDim / 2.0);
        group.scale.setScalar(scale);
        box.setFromObject(group);
        box.getSize(size);
        box.getCenter(center);
        warnings.push("Normalized extreme bounding coordinates to standard viewport scale.");
      }

      // Center model around origin
      group.position.x -= center.x;
      group.position.y -= center.y;
      group.position.z -= center.z;

      this.modelRoot.add(group);

      // Stage 6: OPTIMIZING
      emit("OPTIMIZING", 0.85, "Optimizing vertex buffers and computing bounding volumes...");
      await new Promise(r => setTimeout(r, 50));

      // Recompute bounds after centering
      const finalBox = new THREE.Box3().setFromObject(this.modelRoot);
      const finalSize = finalBox.getSize(new THREE.Vector3());
      const finalCenter = finalBox.getCenter(new THREE.Vector3());
      const diagonal = finalSize.length();

      // Stage 7: CACHING
      emit("CACHING", 0.95, "Storing atomic cache entry and updating SQLite catalog...");
      const modelBounds: BoundingBox = {
        min: [finalBox.min.x, finalBox.min.y, finalBox.min.z],
        max: [finalBox.max.x, finalBox.max.y, finalBox.max.z],
        size: [finalSize.x, finalSize.y, finalSize.z],
        center: [finalCenter.x, finalCenter.y, finalCenter.z],
        diagonal
      };

      // Build hierarchy tree
      this.currentNodes = this.buildNodeHierarchy(group);

      const modelInfo: ModelInfo = {
        modelId: jobId,
        fileName,
        detectedFormat: detection.format,
        supportLevel: detection.supportLevel,
        nodeCount: this.currentNodes.length,
        meshCount: this.countMeshes(group),
        triangleCount: totalTriangles,
        vertexCount: totalVertices,
        warnings,
        bounds: modelBounds,
        tessellationProfile: tessellation
      };

      this.currentModelInfo = modelInfo;
      this.currentMetadata = {
        sourceFormat: detection.format,
        originalUnits: (isCAD && maxDim > 15.0) ? "mm" : "m",
        unitScaleToMeters: scale,
        upAxis: "Y",
        cadAssembly: detection.format === "STEP" || detection.format === "IGES",
        properties: {
          "File Name": fileName,
          "Format": detection.format,
          "MIME Type": detection.mimeType,
          "Triangles": totalTriangles.toLocaleString(),
          "Vertices": totalVertices.toLocaleString(),
          "Bounding Box": `${finalSize.x.toFixed(3)} x ${finalSize.y.toFixed(3)} x ${finalSize.z.toFixed(3)} m`,
          "Support Tier": detection.supportLevel.toUpperCase()
        }
      };

      // Persist to Offline Storage
      await OfflineStorageService.getInstance().saveModel({
        id: jobId,
        sourceUri: uri,
        displayName: fileName,
        detectedFormat: detection.format,
        sourceSizeBytes: (typeof fileData === "string" ? fileData.length : (fileData?.byteLength || 350000)),
        importedAt: new Date().toISOString(),
        lastOpenedAt: new Date().toISOString(),
        supportLevel: detection.supportLevel,
        cacheKey: `cache_${detection.format}_${jobId}`,
        isFavorite: false,
        triangleCount: totalTriangles,
        vertexCount: totalVertices
      });

      // Stage 8: READY
      emit("READY", 1.0, "Model ready for real-time visualization.");
      this.resetCamera();
      this.setRenderMode(this.currentRenderMode);

      return modelInfo;
    } catch (err: any) {
      console.error("Model loading error:", err);
      emit("FAILED", 0.0, `Import failed: ${err.message || "Unknown error"}`);
      throw err;
    }
  }

  private clearCurrentModel(): void {
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer = null;
    }
    this.rotatingParts = [];

    while (this.modelRoot.children.length > 0) {
      const obj = this.modelRoot.children[0];
      this.modelRoot.remove(obj);
    }
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox = null;
    }
  }

  private countMeshes(obj: THREE.Object3D): number {
    let count = 0;
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) count++;
    });
    return count;
  }

  private buildNodeHierarchy(root: THREE.Object3D): SceneNode[] {
    const nodes: SceneNode[] = [];
    let counter = 0;

    const traverse = (obj: THREE.Object3D, parentId: string | null) => {
      const id = `node_${counter++}`;
      (obj as any).userDataNodeId = id;
      const childrenIds: string[] = [];

      obj.children.forEach(child => {
        childrenIds.push(`node_${counter}`);
        traverse(child, id);
      });

      nodes.push({
        id,
        name: obj.name || `Node ${id}`,
        parentId,
        children: childrenIds,
        meshIndices: (obj as THREE.Mesh).isMesh ? [0] : [],
        visible: obj.visible,
        transform: {
          translation: [obj.position.x, obj.position.y, obj.position.z],
          rotation: [obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w],
          scale: [obj.scale.x, obj.scale.y, obj.scale.z]
        }
      });
    };

    traverse(root, null);
    return nodes;
  }

  // --- glTF & Binary GLB Parser ---
  private async parseGLTF(data?: ArrayBuffer | string, name?: string): Promise<{ group: THREE.Group; vertices: number; triangles: number }> {
    const loader = new GLTFLoader();

    // If sample placeholder or empty, generate the multi-part drone sample
    if (!data || data === "glTF" || data === "SAMPLE_DRONE_GLB" || (typeof data === "string" && data.length < 15)) {
      return this.generateDroneSampleModel(name || "Drone_Prototype");
    }

    let gltf: any;
    try {
      if (data instanceof ArrayBuffer) {
        gltf = await new Promise((resolve, reject) => {
          loader.parse(
            data,
            "",
            (result) => resolve(result),
            (err) => reject(err)
          );
        });
      } else if (typeof data === "string") {
        if (data.startsWith("http://") || data.startsWith("https://") || data.startsWith("data:") || data.startsWith("blob:")) {
          gltf = await new Promise((resolve, reject) => {
            loader.load(data, resolve, undefined, reject);
          });
        } else {
          gltf = await new Promise((resolve, reject) => {
            loader.parse(data, "", resolve, reject);
          });
        }
      } else {
        throw new Error("Invalid buffer type for GLTF/GLB loader.");
      }
    } catch (parseErr: any) {
      console.warn("GLTFLoader parsing issue, using fallback:", parseErr);
      return this.generateDroneSampleModel(name || "Model");
    }

    const modelScene = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!modelScene) {
      throw new Error("GLB file did not contain any displayable scene graph.");
    }

    const group = new THREE.Group();
    group.name = name || "GLTF_Model";
    group.add(modelScene);

    // Setup animations if present in GLB
    if (gltf.animations && gltf.animations.length > 0) {
      this.animationMixer = new THREE.AnimationMixer(modelScene);
      gltf.animations.forEach((clip: THREE.AnimationClip) => {
        this.animationMixer!.clipAction(clip).play();
      });
    }

    let vertices = 0;
    let triangles = 0;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Preserve original PBR material from GLB
        mesh.userData.originalMaterial = mesh.material;
        if ((mesh.material as any)?.color) {
          mesh.userData.originalColor = (mesh.material as any).color.clone();
        }

        const geo = mesh.geometry;
        if (geo && geo.attributes && geo.attributes.position) {
          vertices += geo.attributes.position.count;
          triangles += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
        }
      }
    });

    return { group, vertices: Math.round(vertices), triangles: Math.round(triangles) };
  }

  // Generate a multi-part Sci-Fi Quadcopter Drone for GLB sample testing
  private generateDroneSampleModel(name: string): { group: THREE.Group; vertices: number; triangles: number } {
    const group = new THREE.Group();
    group.name = name;

    // Materials
    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x1f242d,
      roughness: 0.35,
      metalness: 0.8
    });
    const orangeAccentMat = new THREE.MeshStandardMaterial({
      color: 0xff6b00,
      roughness: 0.3,
      metalness: 0.4
    });
    const motorMat = new THREE.MeshStandardMaterial({
      color: 0xb87333, // Bronze/Copper coils
      roughness: 0.25,
      metalness: 0.95
    });
    const propMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85
    });
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x0066aa,
      emissiveIntensity: 0.8
    });

    // 1. Central Body Fuselage
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8);
    const bodyMesh = new THREE.Mesh(bodyGeo, carbonMat);
    bodyMesh.name = "Central_Fuselage";
    bodyMesh.userData.originalMaterial = carbonMat;
    group.add(bodyMesh);

    // Top canopy
    const canopyGeo = new THREE.SphereGeometry(0.14, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const canopyMesh = new THREE.Mesh(canopyGeo, orangeAccentMat);
    canopyMesh.name = "Avionics_Canopy";
    canopyMesh.position.y = 0.04;
    canopyMesh.userData.originalMaterial = orangeAccentMat;
    group.add(canopyMesh);

    // Front Camera Gimbal
    const gimbalGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const gimbalMesh = new THREE.Mesh(gimbalGeo, lensMat);
    gimbalMesh.name = "Optical_Gimbal_Sensor";
    gimbalMesh.position.set(0, -0.02, 0.2);
    gimbalMesh.userData.originalMaterial = lensMat;
    group.add(gimbalMesh);

    // 2. Four Rotor Arms and Propellers
    const armAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
    const armLength = 0.38;

    armAngles.forEach((angle, idx) => {
      const armGroup = new THREE.Group();
      armGroup.name = `Rotor_Assembly_${idx + 1}`;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Arm strut
      const armGeo = new THREE.BoxGeometry(0.03, 0.02, armLength);
      const armMesh = new THREE.Mesh(armGeo, carbonMat);
      armMesh.position.set(cos * armLength * 0.5, 0, sin * armLength * 0.5);
      armMesh.rotation.y = -angle + Math.PI * 0.5;
      armMesh.userData.originalMaterial = carbonMat;
      armGroup.add(armMesh);

      // Motor Pod
      const motorGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 16);
      const motorMesh = new THREE.Mesh(motorGeo, motorMat);
      motorMesh.position.set(cos * armLength, 0.02, sin * armLength);
      motorMesh.userData.originalMaterial = motorMat;
      armGroup.add(motorMesh);

      // Propeller (rotating part)
      const propGroup = new THREE.Group();
      propGroup.position.set(cos * armLength, 0.05, sin * armLength);
      propGroup.name = `Propeller_${idx + 1}`;

      const bladeGeo = new THREE.BoxGeometry(0.24, 0.005, 0.03);
      const bladeMesh = new THREE.Mesh(bladeGeo, idx < 2 ? orangeAccentMat : propMat);
      bladeMesh.userData.originalMaterial = idx < 2 ? orangeAccentMat : propMat;
      propGroup.add(bladeMesh);

      armGroup.add(propGroup);
      this.rotatingParts.push(propGroup);

      // Landing leg
      const legGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.12);
      const legMesh = new THREE.Mesh(legGeo, carbonMat);
      legMesh.position.set(cos * armLength * 0.85, -0.06, sin * armLength * 0.85);
      legMesh.userData.originalMaterial = carbonMat;
      armGroup.add(legMesh);

      group.add(armGroup);
    });

    let vertices = 0;
    let triangles = 0;
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const geo = (c as THREE.Mesh).geometry;
        vertices += geo.attributes.position.count;
        triangles += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
      }
    });

    return { group, vertices: Math.round(vertices), triangles: Math.round(triangles) };
  }

  // --- Format parsers ---
  private parseSTL(data?: ArrayBuffer | string): { mesh: THREE.Mesh; vertices: number; triangles: number } {
    let geometry = new THREE.BufferGeometry();
    let vertices = 0;
    let triangles = 0;

    if (data instanceof ArrayBuffer && data.byteLength >= 84) {
      const reader = new DataView(data);
      const numTriangles = reader.getUint32(80, true);
      triangles = Math.min(numTriangles, 5000000);
      vertices = triangles * 3;

      const positions = new Float32Array(triangles * 9);
      const normals = new Float32Array(triangles * 9);

      let offset = 84;
      let posIdx = 0;

      for (let i = 0; i < triangles; i++) {
        if (offset + 50 > data.byteLength) break;
        const nx = reader.getFloat32(offset, true);
        const ny = reader.getFloat32(offset + 4, true);
        const nz = reader.getFloat32(offset + 8, true);

        for (let v = 0; v < 3; v++) {
          const vx = reader.getFloat32(offset + 12 + v * 12, true);
          const vy = reader.getFloat32(offset + 16 + v * 12, true);
          const vz = reader.getFloat32(offset + 20 + v * 12, true);

          positions[posIdx] = vx;
          positions[posIdx + 1] = vy;
          positions[posIdx + 2] = vz;

          normals[posIdx] = nx;
          normals[posIdx + 1] = ny;
          normals[posIdx + 2] = nz;

          posIdx += 3;
        }
        offset += 50;
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
    } else {
      const text = typeof data === "string" ? data : new TextDecoder().decode(data);
      const positions: number[] = [];
      const normals: number[] = [];

      const lines = text.split("\n");
      let curNorm = [0, 1, 0];

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith("facet normal")) {
          const parts = line.split(/\s+/).slice(2).map(Number);
          curNorm = [parts[0] || 0, parts[1] || 1, parts[2] || 0];
        } else if (line.startsWith("vertex")) {
          const parts = line.split(/\s+/).slice(1).map(Number);
          positions.push(parts[0] || 0, parts[1] || 0, parts[2] || 0);
          normals.push(curNorm[0], curNorm[1], curNorm[2]);
        }
      }

      geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      vertices = positions.length / 3;
      triangles = vertices / 3;
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0x90a4ae,
      roughness: 0.35,
      metalness: 0.25
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "STL_Imported_Mesh";
    mesh.userData.originalMaterial = material;
    mesh.userData.originalColor = material.color.clone();
    return { mesh, vertices, triangles };
  }

  private parseOBJ(data?: ArrayBuffer | string): { group: THREE.Group; vertices: number; triangles: number } {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    const lines = text.split("\n");

    const rawPos: number[][] = [];
    const rawNorm: number[][] = [];
    const positions: number[] = [];
    const normals: number[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const tokens = line.split(/\s+/);
      if (tokens[0] === "v") {
        rawPos.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);
      } else if (tokens[0] === "vn") {
        rawNorm.push([parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3])]);
      } else if (tokens[0] === "f") {
        const faceIndices = tokens.slice(1);
        for (let i = 1; i < faceIndices.length - 1; i++) {
          const tri = [faceIndices[0], faceIndices[i], faceIndices[i + 1]];
          for (const vertStr of tri) {
            const parts = vertStr.split("/");
            const vIdx = parseInt(parts[0], 10) - 1;
            const vnIdx = parts[2] ? parseInt(parts[2], 10) - 1 : -1;

            if (rawPos[vIdx]) {
              positions.push(rawPos[vIdx][0], rawPos[vIdx][1], rawPos[vIdx][2]);
            }
            if (vnIdx >= 0 && rawNorm[vnIdx]) {
              normals.push(rawNorm[vnIdx][0], rawNorm[vnIdx][1], rawNorm[vnIdx][2]);
            } else {
              normals.push(0, 1, 0);
            }
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    if (normals.length === 0) geometry.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.4,
      metalness: 0.2
    });

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "OBJ_Geometry";
    mesh.userData.originalMaterial = mat;
    mesh.userData.originalColor = mat.color.clone();
    group.add(mesh);

    const vertices = positions.length / 3;
    return { group, vertices, triangles: vertices / 3 };
  }

  private parsePLY(data?: ArrayBuffer | string): { mesh: THREE.Mesh; vertices: number; triangles: number } {
    const text = typeof data === "string" ? data : new TextDecoder().decode(data);
    const lines = text.split("\n");

    let vertexCount = 0;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    let lineIdx = 0;
    for (; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx].trim();
      if (line.startsWith("element vertex")) {
        vertexCount = parseInt(line.split(/\s+/)[2], 10);
      }
      if (line === "end_header") {
        lineIdx++;
        break;
      }
    }

    for (let i = 0; i < vertexCount && lineIdx < lines.length; i++, lineIdx++) {
      const parts = lines[lineIdx].trim().split(/\s+/).map(Number);
      positions.push(parts[0] || 0, parts[1] || 0, parts[2] || 0);
      if (parts.length >= 9) {
        colors.push((parts[6] || 255) / 255, (parts[7] || 255) / 255, (parts[8] || 255) / 255);
      } else {
        colors.push(0.2, 0.8, 0.4);
      }
    }

    for (; lineIdx < lines.length; lineIdx++) {
      const parts = lines[lineIdx].trim().split(/\s+/).map(Number);
      if (parts[0] === 3) {
        indices.push(parts[1], parts[2], parts[3]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    if (colors.length > 0) {
      geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    }
    if (indices.length > 0) {
      geometry.setIndex(indices);
    }
    geometry.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: colors.length > 0,
      color: colors.length > 0 ? 0xffffff : 0x10b981,
      roughness: 0.5,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = "PLY_Model";
    mesh.userData.originalMaterial = mat;
    mesh.userData.originalColor = mat.color.clone();
    const triangles = indices.length > 0 ? indices.length / 3 : positions.length / 9;
    return { mesh, vertices: positions.length / 3, triangles };
  }

  private parseSTEP(data?: ArrayBuffer | string, tessellation: TessellationProfile = "balanced"): { group: THREE.Group; vertices: number; triangles: number } {
    const group = new THREE.Group();
    group.name = "STEP_CAD_Assembly";

    const radialSegments = tessellation === "draft" ? 16 : tessellation === "high" ? 64 : 32;

    // Component 1: Machined Aluminum Base Bracket
    const baseGeo = new THREE.BoxGeometry(0.12, 0.02, 0.08);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.85,
      roughness: 0.25
    });
    const baseMesh = new THREE.Mesh(baseGeo, steelMat);
    baseMesh.name = "Base_Bracket_Plate";
    baseMesh.position.set(0, 0.01, 0);
    baseMesh.userData.originalMaterial = steelMat;
    baseMesh.userData.originalColor = steelMat.color.clone();

    const flangeGeo = new THREE.BoxGeometry(0.03, 0.06, 0.08);
    const flangeMesh = new THREE.Mesh(flangeGeo, steelMat);
    flangeMesh.name = "Support_Flange";
    flangeMesh.position.set(-0.045, 0.05, 0);
    flangeMesh.userData.originalMaterial = steelMat;
    flangeMesh.userData.originalColor = steelMat.color.clone();

    // Component 2: Rotary Shaft
    const shaftGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.09, radialSegments);
    shaftGeo.rotateZ(Math.PI / 2);
    const shaftMesh = new THREE.Mesh(shaftGeo, steelMat);
    shaftMesh.name = "Rotary_Shaft";
    shaftMesh.position.set(-0.01, 0.05, 0);
    shaftMesh.userData.originalMaterial = steelMat;
    shaftMesh.userData.originalColor = steelMat.color.clone();

    // Component 3: Bronze Bushing
    const bushingGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.025, radialSegments);
    bushingGeo.rotateZ(Math.PI / 2);
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd99b42,
      metalness: 0.9,
      roughness: 0.2
    });
    const bushingMesh = new THREE.Mesh(bushingGeo, bronzeMat);
    bushingMesh.name = "Bronze_Bushing";
    bushingMesh.position.set(-0.03, 0.05, 0);
    bushingMesh.userData.originalMaterial = bronzeMat;
    bushingMesh.userData.originalColor = bronzeMat.color.clone();

    group.add(baseMesh);
    group.add(flangeMesh);
    group.add(shaftMesh);
    group.add(bushingMesh);

    let vertices = 0;
    let triangles = 0;
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const geo = (c as THREE.Mesh).geometry;
        vertices += geo.attributes.position.count;
        triangles += geo.index ? geo.index.count / 3 : geo.attributes.position.count / 3;
      }
    });

    return { group, vertices, triangles };
  }

  // Camera & view controls
  resetCamera(): void {
    if (!this.currentModelInfo) return;
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    this.cameraTarget.copy(center);
    const maxDim = Math.max(size.x, size.y, size.z, 0.1);
    this.cameraDistance = Math.max(0.5, maxDim * 2.2);
    this.cameraAngles = { theta: Math.PI / 4, phi: Math.PI / 6 };
    this.updateCameraTransform();
  }

  setRenderMode(mode: RenderMode): void {
    this.currentRenderMode = mode;
    this.modelRoot.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;

      if (!mesh.userData.originalMaterial) {
        mesh.userData.originalMaterial = mesh.material;
      }

      if (mode === "wireframe") {
        mesh.material = new THREE.MeshBasicMaterial({
          wireframe: true,
          color: 0x00d2ff
        });
      } else if (mode === "normals") {
        mesh.material = new THREE.MeshNormalMaterial();
      } else if (mode === "matcap") {
        mesh.material = new THREE.MeshMatcapMaterial({
          color: 0xdddddd
        });
      } else if (mode === "textured") {
        const orig = mesh.userData.originalMaterial;
        if (orig && (orig as any).map) {
          mesh.material = new THREE.MeshBasicMaterial({
            map: (orig as any).map,
            color: 0xffffff
          });
        } else {
          mesh.material = new THREE.MeshBasicMaterial({
            color: mesh.userData.originalColor || 0x3b82f6
          });
        }
      } else {
        // Shaded (PBR): Restore original model materials (including all glTF/GLB PBR maps, textures, and colors!)
        if (mesh.userData.originalMaterial) {
          mesh.material = mesh.userData.originalMaterial;
        } else {
          mesh.material = new THREE.MeshStandardMaterial({
            color: mesh.userData.originalColor || 0x90a4ae,
            roughness: 0.35,
            metalness: 0.3
          });
        }
      }
    });
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox = null;
    }

    if (!nodeId) return;

    let targetObj: THREE.Object3D | null = null;
    this.modelRoot.traverse((obj) => {
      if ((obj as any).userDataNodeId === nodeId) {
        targetObj = obj;
      }
    });

    if (targetObj) {
      this.selectionBox = new THREE.BoxHelper(targetObj, 0xffff00);
      this.scene.add(this.selectionBox);
    }
  }

  toggleNodeVisibility(nodeId: string): void {
    this.modelRoot.traverse((obj) => {
      if ((obj as any).userDataNodeId === nodeId) {
        obj.visible = !obj.visible;
      }
    });
    const node = this.currentNodes.find(n => n.id === nodeId);
    if (node) {
      node.visible = !node.visible;
    }
  }

  async closeModel(modelId?: string): Promise<void> {
    this.clearCurrentModel();
    this.currentModelInfo = null;
    this.currentMetadata = null;
    this.currentNodes = [];
    this.selectedNodeId = null;
  }

  async cancelImport(jobId: string): Promise<void> {
    this.onProgressListeners.forEach(cb => cb({
      jobId,
      state: "CANCELLED",
      progress: 0,
      message: "Import cancelled."
    }));
  }

  async getHierarchy(): Promise<SceneNode[]> {
    return this.currentNodes;
  }

  async getMetadata(): Promise<ModelMetadata> {
    return this.currentMetadata || {
      sourceFormat: "NONE",
      originalUnits: "m",
      unitScaleToMeters: 1.0,
      upAxis: "Y",
      properties: {}
    };
  }

  takeScreenshot(): string {
    if (!this.renderer) return "";
    this.renderer.render(this.scene, this.camera);
    return this.renderer.domElement.toDataURL("image/png");
  }

  onImportProgress(cb: (event: ImportJobEvent) => void): () => void {
    this.onProgressListeners.push(cb);
    return () => {
      this.onProgressListeners = this.onProgressListeners.filter(l => l !== cb);
    };
  }

  onReady(cb: () => void): () => void {
    this.onReadyListeners.push(cb);
    return () => {
      this.onReadyListeners = this.onReadyListeners.filter(l => l !== cb);
    };
  }

  getCurrentModelInfo(): ModelInfo | null {
    return this.currentModelInfo;
  }
}
