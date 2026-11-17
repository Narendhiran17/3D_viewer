import { RecentModelRecord, UserPreferences, ImportJobState } from "../types/engine";

const STORAGE_KEYS = {
  MODELS: "u3d_sqlite_models",
  FAVORITES: "u3d_sqlite_favorites",
  JOBS: "u3d_sqlite_jobs",
  PREFS: "u3d_sqlite_preferences",
  CACHE: "u3d_sqlite_cache_manifests"
};

const DEFAULT_PREFERENCES: UserPreferences = {
  defaultRenderMode: "shaded",
  defaultTessellation: "balanced",
  backgroundColor: "dark",
  showGrid: true,
  showAxes: true,
  wireframeColor: "#00d2ff",
  cameraSpeed: 1.0,
  offlineCacheLimitMB: 500
};

export class OfflineStorageService {
  private static instance: OfflineStorageService;

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  constructor() {
    this.initDatabase();
  }

  private initDatabase(): void {
    if (!localStorage.getItem(STORAGE_KEYS.PREFS)) {
      localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(DEFAULT_PREFERENCES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MODELS)) {
      localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.FAVORITES)) {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([]));
    }
    if (!localStorage.getItem(STORAGE_KEYS.JOBS)) {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify([]));
    }
  }

  async getRecentModels(): Promise<RecentModelRecord[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.MODELS);
    const favorites = await this.getFavoriteIds();
    const list: RecentModelRecord[] = raw ? JSON.parse(raw) : [];
    return list.map(m => ({
      ...m,
      isFavorite: favorites.includes(m.id)
    })).sort((a, b) => new Date(b.lastOpenedAt).getTime() - new Date(a.lastOpenedAt).getTime());
  }

  async saveModel(record: RecentModelRecord): Promise<void> {
    const models = await this.getRecentModels();
    const existingIndex = models.findIndex(m => m.id === record.id || m.sourceUri === record.sourceUri);
    if (existingIndex >= 0) {
      models[existingIndex] = { ...models[existingIndex], ...record, lastOpenedAt: new Date().toISOString() };
    } else {
      models.unshift(record);
    }
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(models));
  }

  async getFavoriteIds(): Promise<string[]> {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    return raw ? JSON.parse(raw) : [];
  }

  async toggleFavorite(modelId: string): Promise<boolean> {
    let favs = await this.getFavoriteIds();
    const exists = favs.includes(modelId);
    if (exists) {
      favs = favs.filter(id => id !== modelId);
    } else {
      favs.push(modelId);
    }
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
    return !exists;
  }

  async deleteModel(modelId: string): Promise<void> {
    const models = await this.getRecentModels();
    const updated = models.filter(m => m.id !== modelId);
    localStorage.setItem(STORAGE_KEYS.MODELS, JSON.stringify(updated));

    let favs = await this.getFavoriteIds();
    favs = favs.filter(id => id !== modelId);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favs));
  }

  async getPreferences(): Promise<UserPreferences> {
    const raw = localStorage.getItem(STORAGE_KEYS.PREFS);
    return raw ? { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) } : DEFAULT_PREFERENCES;
  }

  async savePreferences(prefs: Partial<UserPreferences>): Promise<UserPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...prefs };
    localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(updated));
    return updated;
  }

  async recordJob(jobId: string, modelId: string, state: ImportJobState, warnings: string[] = []): Promise<void> {
    const raw = localStorage.getItem(STORAGE_KEYS.JOBS);
    const jobs = raw ? JSON.parse(raw) : [];
    jobs.unshift({
      id: jobId,
      model_id: modelId,
      state,
      warning_json: JSON.stringify(warnings),
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs.slice(0, 50)));
  }

  async getCacheStats(): Promise<{ cachedModelsCount: number; estimatedSizeMB: number }> {
    const models = await this.getRecentModels();
    const totalBytes = models.reduce((acc, m) => acc + (m.sourceSizeBytes || 500000), 0);
    return {
      cachedModelsCount: models.length,
      estimatedSizeMB: Math.round((totalBytes / (1024 * 1024)) * 10) / 10
    };
  }

  async clearCache(): Promise<void> {
    localStorage.removeItem(STORAGE_KEYS.MODELS);
    localStorage.removeItem(STORAGE_KEYS.FAVORITES);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    this.initDatabase();
  }
}
