import React, { useState, useEffect } from "react";
import { UserPreferences } from "../types/engine";
import { OfflineStorageService } from "../storage/sqlite";
import { Settings, Database, Trash2, ShieldCheck, Sun, Cpu, Check, Layers, HardDrive } from "lucide-react";

export const SettingsScreen: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [cacheStats, setCacheStats] = useState<{ cachedModelsCount: number; estimatedSizeMB: number }>({
    cachedModelsCount: 0,
    estimatedSizeMB: 0
  });
  const [clearedMessage, setClearedMessage] = useState(false);
  const storage = OfflineStorageService.getInstance();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const prefs = await storage.getPreferences();
    const stats = await storage.getCacheStats();
    setPreferences(prefs);
    setCacheStats(stats);
  };

  const handleUpdatePreference = async (key: keyof UserPreferences, value: any) => {
    if (!preferences) return;
    const updated = await storage.savePreferences({ [key]: value });
    setPreferences(updated);
  };

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear all offline cached models and history?")) {
      await storage.clearCache();
      setClearedMessage(true);
      await loadSettings();
      setTimeout(() => setClearedMessage(false), 3000);
    }
  };

  if (!preferences) return null;

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0d13] p-4 text-slate-100 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Settings size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight">Settings & Preferences</h2>
          <p className="text-[11px] text-slate-400">Offline storage, graphics profiles, and application settings</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Local Storage & Cache Management */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-cyan-400" />
              <span className="text-xs font-semibold text-slate-200">Local Cache & SQLite Storage</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Offline Ready</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Cached Models</div>
              <div className="text-base font-bold text-slate-100">{cacheStats.cachedModelsCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Estimated Storage Footprint</div>
              <div className="text-base font-bold text-slate-100">{cacheStats.estimatedSizeMB} MB</div>
            </div>
          </div>

          <button
            onClick={handleClearCache}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear Local Model Cache & History</span>
          </button>
          {clearedMessage && (
            <div className="mt-2 text-center text-xs text-emerald-400 font-mono">
              ✓ Cache cleared successfully.
            </div>
          )}
        </div>

        {/* CAD Tessellation Default */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={16} className="text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">Default CAD Tessellation Profile</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["draft", "balanced", "high"] as const).map((prof) => (
              <button
                key={prof}
                onClick={() => handleUpdatePreference("defaultTessellation", prof)}
                className={`py-2 px-3 rounded-xl text-xs font-medium border capitalize transition-all ${
                  preferences.defaultTessellation === prof
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {prof}
              </button>
            ))}
          </div>
        </div>

        {/* Default Render Mode */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80">
          <div className="flex items-center gap-2 mb-3">
            <Sun size={16} className="text-cyan-400" />
            <span className="text-xs font-semibold text-slate-200">Default Render Mode</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(["shaded", "textured", "wireframe", "normals"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleUpdatePreference("defaultRenderMode", mode)}
                className={`py-2 px-3 rounded-xl font-medium border capitalize text-left transition-all ${
                  preferences.defaultRenderMode === mode
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-bold"
                    : "bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200"
                }`}
              >
                {mode === "shaded" ? "Shaded (PBR)" : mode}
              </button>
            ))}
          </div>
        </div>

        {/* Security & Offline Policy */}
        <div className="p-4 rounded-2xl glass-panel border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={16} />
            Security & Offline Compliance
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            All 3D files are processed locally on-device. No telemetry containing model geometry is collected, and source models are never mutated or uploaded to external servers.
          </p>
        </div>
      </div>
    </div>
  );
};
