import React, { useState, useEffect } from "react";
import { RecentModelRecord } from "../types/engine";
import { OfflineStorageService } from "../storage/sqlite";
import { 
  FolderOpen, 
  Heart, 
  Trash2, 
  Clock, 
  Search, 
  Plus, 
  Box, 
  Sparkles,
  Layers,
  ChevronRight
} from "lucide-react";

interface LibraryScreenProps {
  onOpenPicker: () => void;
  onOpenModelRecord: (record: RecentModelRecord) => void;
  onSelectSample: (type: "step" | "stl" | "obj" | "ply" | "glb") => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  onOpenPicker,
  onOpenModelRecord,
  onSelectSample
}) => {
  const [models, setModels] = useState<RecentModelRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const storage = OfflineStorageService.getInstance();

  const loadModels = async () => {
    const list = await storage.getRecentModels();
    setModels(list);
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleToggleFavorite = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await storage.toggleFavorite(id);
    await loadModels();
  };

  const handleDeleteModel = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await storage.deleteModel(id);
    await loadModels();
  };

  const filteredModels = models.filter(m => {
    const matchesFilter = filter === "all" || (filter === "favorites" && m.isFavorite);
    const matchesSearch = m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.detectedFormat.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0d13] p-4 text-slate-100 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">Local Model Library</h1>
          <p className="text-xs text-slate-400">Offline-first local cache & recent models</p>
        </div>
        <button
          onClick={onOpenPicker}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Plus size={16} />
          <span>Open File</span>
        </button>
      </div>

      {/* Quick Test Samples Shelf */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
          <Sparkles size={14} className="text-cyan-400" />
          Quick Test Sample Models:
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => onSelectSample("step")}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all"
          >
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
              CAD
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Bearing Assembly</div>
              <div className="text-[10px] text-slate-400">STEP B-Rep</div>
            </div>
          </button>

          <button
            onClick={() => onSelectSample("stl")}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition-all"
          >
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold">
              STL
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Mount Bracket</div>
              <div className="text-[10px] text-slate-400">3D Printing</div>
            </div>
          </button>

          <button
            onClick={() => onSelectSample("obj")}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 text-left transition-all"
          >
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 font-mono text-[10px] font-bold">
              OBJ
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Cube & UV</div>
              <div className="text-[10px] text-slate-400">Wavefront PBR</div>
            </div>
          </button>

          <button
            onClick={() => onSelectSample("ply")}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 text-left transition-all"
          >
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
              PLY
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Pyramid</div>
              <div className="text-[10px] text-slate-400">Stanford Colors</div>
            </div>
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-2.5 mb-4 justify-between">
        <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900/80 border border-slate-800 w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "all"
                ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All Recents ({models.length})
          </button>
          <button
            onClick={() => setFilter("favorites")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
              filter === "favorites"
                ? "bg-rose-500/20 text-rose-300 font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Heart size={13} className={filter === "favorites" ? "fill-rose-400" : ""} />
            Favorites
          </button>
        </div>

        <div className="relative min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-slate-500" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search recent files..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Recent Model Cards */}
      <div className="flex-1 space-y-2">
        {filteredModels.length === 0 ? (
          <div className="p-12 text-center text-slate-500 glass-panel rounded-2xl border border-slate-800/80">
            <Box size={36} className="mx-auto mb-3 text-slate-600" />
            <h3 className="text-sm font-semibold text-slate-400">No Models in Library</h3>
            <p className="text-xs mt-1">Open a model from your device storage or try one of the samples above.</p>
          </div>
        ) : (
          filteredModels.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenModelRecord(item)}
              className="flex items-center justify-between p-3.5 rounded-2xl glass-panel-interactive cursor-pointer border border-slate-800/80 shadow-md group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold shrink-0">
                  {item.detectedFormat}
                </div>
                <div className="overflow-hidden">
                  <div className="text-sm font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                    {item.displayName}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    <span>{formatFileSize(item.sourceSizeBytes)}</span>
                    <span>•</span>
                    <span>{item.triangleCount.toLocaleString()} △</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleToggleFavorite(e, item.id)}
                  className={`p-2 rounded-xl transition-colors ${
                    item.isFavorite
                      ? "text-rose-400 bg-rose-500/10"
                      : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                  }`}
                  title={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart size={16} className={item.isFavorite ? "fill-rose-400" : ""} />
                </button>
                <button
                  onClick={(e) => handleDeleteModel(e, item.id)}
                  className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Remove from history"
                >
                  <Trash2 size={16} />
                </button>
                <ChevronRight size={18} className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
