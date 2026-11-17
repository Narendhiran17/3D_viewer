export type SupportLevel = "basic" | "partial" | "advanced" | "unsupported" | "failed";

export type RenderMode = "shaded" | "textured" | "wireframe" | "normals" | "matcap";

export type TessellationProfile = "draft" | "balanced" | "high" | "custom";

export type ImportJobState = 
  | "QUEUED"
  | "VALIDATING"
  | "DETECTING"
  | "IMPORTING"
  | "NORMALIZING"
  | "OPTIMIZING"
  | "CACHING"
  | "READY"
  | "CANCELLED"
  | "FAILED"
  | "EVICTED";

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  size: [number, number, number];
  center: [number, number, number];
  diagonal: number;
}

export interface SceneNode {
  id: string;
  name: string;
  parentId?: string | null;
  children: string[];
  meshIndices: number[];
  visible: boolean;
  transform: {
    translation: [number, number, number];
    rotation: [number, number, number, number]; // quaternion x, y, z, w
    scale: [number, number, number];
  };
}

export interface ModelMetadata {
  sourceFormat: string;
  sourceVersion?: string;
  originalUnits: string;
  unitScaleToMeters: number;
  upAxis: "Y" | "Z" | "X";
  author?: string;
  generator?: string;
  cadAssembly?: boolean;
  properties: Record<string, string>;
}

export interface ModelInfo {
  modelId: string;
  fileName: string;
  detectedFormat: string;
  supportLevel: SupportLevel;
  nodeCount: number;
  meshCount: number;
  triangleCount: number;
  vertexCount: number;
  warnings: string[];
  bounds: BoundingBox;
  tessellationProfile?: TessellationProfile;
}

export interface ImportJobEvent {
  jobId: string;
  state: ImportJobState;
  progress: number; // 0.0 to 1.0
  message?: string;
}

export interface RecentModelRecord {
  id: string;
  sourceUri: string;
  displayName: string;
  detectedFormat: string;
  sourceSizeBytes: number;
  importedAt: string;
  lastOpenedAt: string;
  supportLevel: SupportLevel;
  cacheKey: string;
  thumbnailPath?: string;
  isFavorite: boolean;
  triangleCount: number;
  vertexCount: number;
}

export interface UserPreferences {
  defaultRenderMode: RenderMode;
  defaultTessellation: TessellationProfile;
  backgroundColor: "dark" | "studio" | "white" | "blueprint";
  showGrid: boolean;
  showAxes: boolean;
  wireframeColor: string;
  cameraSpeed: number;
  offlineCacheLimitMB: number;
}

export interface ViewerEngine {
  openFile(uri: string, fileData?: ArrayBuffer | string, tessellation?: TessellationProfile): Promise<ModelInfo>;
  closeModel(modelId?: string): Promise<void>;
  cancelImport(jobId: string): Promise<void>;
  resetCamera(): void;
  setRenderMode(mode: RenderMode): void;
  selectNode(nodeId: string | null): void;
  toggleNodeVisibility(nodeId: string): void;
  getHierarchy(): Promise<SceneNode[]>;
  getMetadata(): Promise<ModelMetadata>;
  takeScreenshot(): string;
}
