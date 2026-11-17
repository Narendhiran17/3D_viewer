import React, { useEffect, useRef, useState } from "react";
import { 
  ViewerEngineService 
} from "../services/ViewerEngineService";
import { 
  ModelInfo, 
  RenderMode, 
  TessellationProfile 
} from "../types/engine";
import { 
  RotateCcw, 
  Camera, 
  Layers, 
  Box, 
  Maximize2, 
  AlertTriangle, 
  Eye, 
  Sun, 
  Sparkles,
  FileBox,
  Cpu
} from "lucide-react";

interface ViewerScreenProps {
  modelInfo: ModelInfo | null;
  onOpenPicker: () => void;
  onCloseModel: () => void;
  onSelectSample: (type: "step" | "stl" | "obj" | "ply" | "glb") => void;
}

export const ViewerScreen: React.FC<ViewerScreenProps> = ({
  modelInfo,
  onOpenPicker,
  onCloseModel,
  onSelectSample
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderMode, setRenderMode] = useState<RenderMode>("shaded");
  const [showWarnings, setShowWarnings] = useState(true);
  const engine = ViewerEngineService.getInstance();

  useEffect(() => {
    if (containerRef.current) {
      engine.mount(containerRef.current);
    }
    const handleResize = () => {
      if (containerRef.current) {
        engine.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      engine.unmount();
    };
  }, []);

  const handleRenderModeChange = (mode: RenderMode) => {
    setRenderMode(mode);
    engine.setRenderMode(mode);
  };

  const handleResetCamera = () => {
    engine.resetCamera();
  };

  const handleScreenshot = () => {
    const dataUrl = engine.takeScreenshot();
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${modelInfo?.fileName || "snapshot"}.png`;
    a.click();
  };

  const getSupportBadgeColor = (level: string) => {
    switch (level) {
      case "advanced": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      case "partial": return "bg-amber-500/20 text-amber-400 border-amber-500/40";
      case "basic": return "bg-blue-500/20 text-blue-400 border-blue-500/40";
      default: return "bg-slate-700 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0b0d13] overflow-hidden select-none">
      {/* 3D Viewport Canvas Container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Top Header Bar */}
      {modelInfo ? (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2.5 p-2 px-3.5 rounded-2xl glass-panel pointer-events-auto shadow-xl">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-xs font-bold">
              {modelInfo.detectedFormat}
            </div>
            <div>
              <div className="font-semibold text-sm text-slate-100 max-w-[200px] sm:max-w-xs truncate">
                {modelInfo.fileName}
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className={`px-1.5 py-0.2 rounded border font-mono uppercase ${getSupportBadgeColor(modelInfo.supportLevel)}`}>
                  {modelInfo.supportLevel}
                </span>
                <span className="text-slate-400 font-mono">
                  {modelInfo.triangleCount.toLocaleString()} △
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              onClick={onOpenPicker}
              className="p-2.5 rounded-xl glass-panel text-slate-300 hover:text-white hover:border-cyan-500/40 shadow-xl transition-all"
              title="Open another model"
            >
              <FileBox size={18} />
            </button>
            <button
              onClick={onCloseModel}
              className="px-3 py-2 rounded-xl glass-panel text-xs font-medium text-slate-300 hover:text-rose-400 hover:border-rose-500/40 shadow-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6">
          <div className="p-8 rounded-3xl glass-panel max-w-md text-center pointer-events-auto shadow-2xl border border-slate-800">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4 border border-cyan-500/30">
              <Box size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">No Model Loaded</h2>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Open any 3D or CAD model from your device storage, or try one of the built-in sample assets.
            </p>
            <button
              onClick={onOpenPicker}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all mb-4"
            >
              Open 3D Model
            </button>

            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-400 mb-2.5 flex items-center justify-center gap-1.5">
                <Sparkles size={12} className="text-cyan-400" />
                Quick Test Samples:
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={() => onSelectSample("step")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-amber-300 border border-slate-700 text-xs font-mono font-medium transition-colors"
                >
                  CAD (STEP)
                </button>
                <button
                  onClick={() => onSelectSample("stl")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-blue-300 border border-slate-700 text-xs font-mono font-medium transition-colors"
                >
                  STL Bracket
                </button>
                <button
                  onClick={() => onSelectSample("obj")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-purple-300 border border-slate-700 text-xs font-mono font-medium transition-colors"
                >
                  OBJ Cube
                </button>
                <button
                  onClick={() => onSelectSample("ply")}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300 border border-slate-700 text-xs font-mono font-medium transition-colors"
                >
                  PLY Pyramid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Right Controls Toolbar */}
      {modelInfo && (
        <div className="absolute right-4 top-20 flex flex-col gap-2">
          {/* Render Mode Group */}
          <div className="p-1 rounded-2xl glass-panel shadow-xl flex flex-col gap-1">
            <button
              onClick={() => handleRenderModeChange("shaded")}
              className={`p-2.5 rounded-xl transition-all ${
                renderMode === "shaded"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Shaded (Filament PBR)"
            >
              <Sun size={18} />
            </button>

            <button
              onClick={() => handleRenderModeChange("textured")}
              className={`p-2.5 rounded-xl transition-all ${
                renderMode === "textured"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Textured Mode"
            >
              <Eye size={18} />
            </button>

            <button
              onClick={() => handleRenderModeChange("wireframe")}
              className={`p-2.5 rounded-xl transition-all ${
                renderMode === "wireframe"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Wireframe Topology"
            >
              <Box size={18} />
            </button>

            <button
              onClick={() => handleRenderModeChange("normals")}
              className={`p-2.5 rounded-xl transition-all ${
                renderMode === "normals"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
              title="Surface Normals Visualization"
            >
              <Layers size={18} />
            </button>
          </div>

          {/* Camera Reset & Snapshot */}
          <div className="p-1 rounded-2xl glass-panel shadow-xl flex flex-col gap-1">
            <button
              onClick={handleResetCamera}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Reset Camera (Fit View)"
            >
              <RotateCcw size={18} />
            </button>

            <button
              onClick={handleScreenshot}
              className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              title="Take High-Res Screenshot"
            >
              <Camera size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bottom HUD & Warnings */}
      {modelInfo && (
        <div className="absolute bottom-20 left-4 right-4 flex flex-col gap-2 pointer-events-none">
          {/* Warnings Alert */}
          {showWarnings && modelInfo.warnings.length > 0 && (
            <div className="p-2.5 px-3 rounded-xl glass-panel border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between pointer-events-auto max-w-lg shadow-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
                <span className="truncate">{modelInfo.warnings[0]}</span>
              </div>
              <button
                onClick={() => setShowWarnings(false)}
                className="ml-2 text-slate-400 hover:text-white text-[10px]"
              >
                ✕
              </button>
            </div>
          )}

          {/* Technical HUD Stats */}
          <div className="flex items-center gap-3 p-2 px-3 rounded-xl glass-panel text-[11px] font-mono text-slate-400 pointer-events-auto w-fit shadow-lg">
            <span>Vertices: <strong className="text-slate-200">{modelInfo.vertexCount.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Triangles: <strong className="text-slate-200">{modelInfo.triangleCount.toLocaleString()}</strong></span>
            <span>•</span>
            <span>Size: <strong className="text-slate-200">{modelInfo.bounds.size[0].toFixed(2)}x{modelInfo.bounds.size[1].toFixed(2)}x{modelInfo.bounds.size[2].toFixed(2)}m</strong></span>
          </div>
        </div>
      )}
    </div>
  );
};
