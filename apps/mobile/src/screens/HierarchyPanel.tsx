import React, { useState } from "react";
import { SceneNode } from "../types/engine";
import { Layers, Eye, EyeOff, Box, ChevronRight, ChevronDown, Search } from "lucide-react";

interface HierarchyPanelProps {
  nodes: SceneNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onToggleVisibility: (nodeId: string) => void;
}

export const HierarchyPanel: React.FC<HierarchyPanelProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onToggleVisibility
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredNodes = nodes.filter(n =>
    n.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-[#0b0d13] p-4 text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Layers size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">Scene Hierarchy</h2>
            <p className="text-[11px] text-slate-400">{nodes.length} nodes in scene graph</p>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-2.5 text-slate-500" size={15} />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search scene nodes..."
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {/* Node Tree List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {filteredNodes.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {nodes.length === 0 ? "No model hierarchy loaded" : "No nodes match your filter"}
          </div>
        ) : (
          filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = expandedNodes[node.id] ?? true;

            return (
              <div
                key={node.id}
                onClick={() => onSelectNode(isSelected ? null : node.id)}
                className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                  isSelected
                    ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                    : "bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60 text-slate-300"
                }`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {hasChildren ? (
                    <button
                      onClick={(e) => toggleExpand(node.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-white"
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <Box size={14} className="text-slate-500 shrink-0 ml-1" />
                  )}

                  <span className="text-xs font-medium truncate font-mono">
                    {node.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {node.meshIndices.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      Mesh
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility(node.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white"
                    title={node.visible ? "Hide node" : "Show node"}
                  >
                    {node.visible ? <Eye size={15} /> : <EyeOff size={15} className="text-slate-600" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
