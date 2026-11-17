import React from "react";
import { ModelInfo, ModelMetadata, SceneNode } from "../types/engine";
import { Info, ShieldAlert, Cpu, Box, Compass, Layers, CheckCircle2 } from "lucide-react";

interface InspectorPanelProps {
  modelInfo: ModelInfo | null;
  metadata: ModelMetadata | null;
  selectedNode: SceneNode | null;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  modelInfo,
  metadata,
  selectedNode
}) => {
  if (!modelInfo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-500 bg-[#0b0d13]">
        <Info size={36} className="mb-3 text-slate-600" />
        <h3 className="text-sm font-semibold text-slate-400">No Model Selected</h3>
        <p className="text-xs max-w-xs mt-1">Open a 3D model to inspect its technical metadata and geometry properties.</p>
      </div>
    );
  }

  const { bounds } = modelInfo;

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0d13] p-4 text-slate-100 overflow-y-auto pr-1">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 mb-4">
        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          <Info size={18} />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight">Model Inspector</h2>
          <p className="text-[11px] text-slate-400">Technical specifications & geometry metadata</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Support Level & Format Card */}
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Format & Compatibility</span>
            <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              {modelInfo.detectedFormat}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Published Support Level</span>
            <span className="font-mono font-semibold capitalize text-emerald-400">
              {modelInfo.supportLevel} Support
            </span>
          </div>
        </div>

        {/* Geometry Metrics */}
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Box size={14} className="text-cyan-400" />
            Geometry Statistics
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Triangles</div>
              <div className="text-base font-bold text-slate-100">{modelInfo.triangleCount.toLocaleString()}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Vertices</div>
              <div className="text-base font-bold text-slate-100">{modelInfo.vertexCount.toLocaleString()}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Meshes</div>
              <div className="text-base font-bold text-slate-100">{modelInfo.meshCount}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] text-slate-400 mb-0.5">Scene Nodes</div>
              <div className="text-base font-bold text-slate-100">{modelInfo.nodeCount}</div>
            </div>
          </div>
        </div>

        {/* Bounding Box Dimensions */}
        <div className="p-3.5 rounded-2xl glass-panel border border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
            <Compass size={14} className="text-cyan-400" />
            Bounding Dimensions (Normalized)
          </div>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Width (X)</span>
              <span className="text-slate-200">{bounds.size[0].toFixed(3)} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Height (Y)</span>
              <span className="text-slate-200">{bounds.size[1].toFixed(3)} m</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Depth (Z)</span>
              <span className="text-slate-200">{bounds.size[2].toFixed(3)} m</span>
            </div>
            <div className="flex justify-between py-1 pt-1.5">
              <span className="text-slate-400">Diagonal Extent</span>
              <span className="text-cyan-400 font-bold">{bounds.diagonal.toFixed(3)} m</span>
            </div>
          </div>
        </div>

        {/* Selected Node Details */}
        {selectedNode && (
          <div className="p-3.5 rounded-2xl glass-panel border border-cyan-500/40 bg-cyan-950/20">
            <div className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers size={14} />
              Selected Node: {selectedNode.name}
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Node ID</span>
                <span>{selectedNode.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Translation</span>
                <span>[{selectedNode.transform.translation.map(v => v.toFixed(2)).join(", ")}]</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Scale</span>
                <span>[{selectedNode.transform.scale.map(v => v.toFixed(2)).join(", ")}]</span>
              </div>
            </div>
          </div>
        )}

        {/* Capability Warnings */}
        {modelInfo.warnings && modelInfo.warnings.length > 0 && (
          <div className="p-3.5 rounded-2xl glass-panel border border-amber-500/30 bg-amber-950/20">
            <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldAlert size={14} />
              Adapter Warnings ({modelInfo.warnings.length})
            </div>
            <ul className="space-y-1.5 text-xs text-amber-200/90 list-disc list-inside leading-relaxed">
              {modelInfo.warnings.map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};
