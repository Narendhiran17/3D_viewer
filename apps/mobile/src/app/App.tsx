import React, { useState, useEffect } from "react";
import { ViewerEngineService } from "../services/ViewerEngineService";
import { 
  ModelInfo, 
  SceneNode, 
  ModelMetadata, 
  ImportJobState, 
  TessellationProfile, 
  RecentModelRecord 
} from "../types/engine";
import { ViewerScreen } from "../screens/ViewerScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { HierarchyPanel } from "../screens/HierarchyPanel";
import { InspectorPanel } from "../screens/InspectorPanel";
import { SettingsScreen } from "../screens/SettingsScreen";
import { DocumentPickerModal } from "../components/DocumentPickerModal";
import { ImportProgressModal } from "../components/ImportProgressModal";
import { 
  Box, 
  FolderOpen, 
  Layers, 
  Info, 
  Settings, 
  FileBox, 
  PlusCircle, 
  Smartphone,
  Maximize2
} from "lucide-react";

type ActiveTab = "viewer" | "library" | "hierarchy" | "inspector" | "settings";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("viewer");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [nodes, setNodes] = useState<SceneNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Import state machine tracking
  const [importState, setImportState] = useState<ImportJobState>("READY");
  const [importProgress, setImportProgress] = useState(0);
  const [importMessage, setImportMessage] = useState("");
  const [activeJobId, setActiveJobId] = useState("");

  const engine = ViewerEngineService.getInstance();

  useEffect(() => {
    const unsubProgress = engine.onImportProgress((evt) => {
      setImportState(evt.state);
      setImportProgress(evt.progress);
      setImportMessage(evt.message || "");
      setActiveJobId(evt.jobId);
    });

    return () => {
      unsubProgress();
    };
  }, []);

  const handleFileSelected = async (
    fileName: string, 
    data: ArrayBuffer | string, 
    tessellation: TessellationProfile
  ) => {
    try {
      setActiveTab("viewer");
      const info = await engine.openFile(fileName, data, tessellation);
      setModelInfo(info);

      const hier = await engine.getHierarchy();
      setNodes(hier);

      const meta = await engine.getMetadata();
      setMetadata(meta);
      setSelectedNodeId(null);
    } catch (e: any) {
      setImportState("FAILED");
      setImportMessage(e.message || "Import failed");
    }
  };

  const handleSelectSample = (type: "step" | "stl" | "obj" | "ply" | "glb") => {
    if (type === "step") {
      handleFileSelected("bearing_assembly.step", "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('CAD Test Assembly'),'2;1');\nENDSEC;\nDATA;\n#10=APPLICATION_CONTEXT('mechanical design');\n#20=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));\nENDSEC;\nEND-ISO-10303-21;", "balanced");
    } else if (type === "stl") {
      handleFileSelected("bracket.stl", "solid bracket\n  facet normal 0 0 -1\n    outer loop\n      vertex 0 0 0\n      vertex 0 30 0\n      vertex 50 30 0\n    endloop\n  endfacet\nendsolid bracket", "balanced");
    } else if (type === "obj") {
      handleFileSelected("cube.obj", "o Cube\nv 1 1 -1\nv 1 -1 -1\nv 1 1 1\nv 1 -1 1\nv -1 1 -1\nv -1 -1 -1\nv -1 1 1\nv -1 -1 1\nf 5 3 1\nf 5 7 3\nf 3 8 4\nf 3 7 8\nf 7 6 8\nf 7 5 6\nf 2 8 4\nf 2 6 8\nf 1 4 2\nf 1 3 4\nf 5 2 6\nf 5 1 2", "balanced");
    } else if (type === "ply") {
      handleFileSelected("pyramid.ply", "ply\nformat ascii 1.0\nelement vertex 5\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face 6\nproperty list uchar int vertex_indices\nend_header\n0 1.5 0 255 100 100\n-1 0 -1 100 255 100\n1 0 -1 100 100 255\n1 0 1 255 255 100\n-1 0 1 255 100 255\n3 0 1 2\n3 0 2 3\n3 0 3 4\n3 0 4 1\n3 1 4 3\n3 1 3 2", "balanced");
    } else {
      handleFileSelected("drone_prototype.glb", "glTF", "balanced");
    }
  };

  const handleOpenModelRecord = (record: RecentModelRecord) => {
    handleSelectSample(record.detectedFormat.toLowerCase() as any);
  };

  const handleCloseModel = async () => {
    await engine.closeModel();
    setModelInfo(null);
    setMetadata(null);
    setNodes([]);
    setSelectedNodeId(null);
  };

  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    engine.selectNode(nodeId);
  };

  const handleToggleVisibility = (nodeId: string) => {
    engine.toggleNodeVisibility(nodeId);
    setNodes([...engine["currentNodes"]]);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0b0d13] font-sans text-slate-100 select-none">
      {/* Desktop / Tablet Sidebar (hidden on small mobile screens) */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-[#0f121a] shrink-0 p-3 justify-between z-10">
        <div>
          {/* Logo & App Title */}
          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80 mb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-cyan-500/20">
              <Box size={20} />
            </div>
            <div>
              <div className="font-bold text-sm tracking-tight text-white leading-tight">Universal 3D</div>
              <div className="text-[10px] text-cyan-400 font-mono font-medium">OFFLINE VIEWER v1.0</div>
            </div>
          </div>

          {/* Quick Action Button */}
          <button
            onClick={() => setIsPickerOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 mb-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
          >
            <PlusCircle size={16} />
            <span>Open Model</span>
          </button>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("viewer")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "viewer"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Box size={16} />
              <span>3D Viewport</span>
              {modelInfo && (
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("library")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "library"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <FolderOpen size={16} />
              <span>Model Library</span>
            </button>

            <button
              onClick={() => setActiveTab("hierarchy")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "hierarchy"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Layers size={16} />
              <span>Scene Hierarchy</span>
              {nodes.length > 0 && (
                <span className="ml-auto text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {nodes.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("inspector")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "inspector"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Info size={16} />
              <span>Model Inspector</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Settings size={16} />
              <span>Settings & Cache</span>
            </button>
          </nav>
        </div>

        {/* System & Architecture Info Footer */}
        <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-[10px] text-slate-500 font-mono">
          <div className="flex justify-between items-center mb-1">
            <span>Renderer</span>
            <span className="text-cyan-400">Filament/GL</span>
          </div>
          <div className="flex justify-between items-center">
            <span>CAD Engine</span>
            <span className="text-amber-400">OCCT B-Rep</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 relative overflow-hidden">
          {/* Always keep ViewerScreen mounted so WebGL canvas retains GPU context */}
          <div className={`w-full h-full ${activeTab === "viewer" ? "block" : "hidden"}`}>
            <ViewerScreen
              modelInfo={modelInfo}
              onOpenPicker={() => setIsPickerOpen(true)}
              onCloseModel={handleCloseModel}
              onSelectSample={handleSelectSample}
            />
          </div>

          {activeTab === "library" && (
            <LibraryScreen
              onOpenPicker={() => setIsPickerOpen(true)}
              onOpenModelRecord={handleOpenModelRecord}
              onSelectSample={handleSelectSample}
            />
          )}

          {activeTab === "hierarchy" && (
            <HierarchyPanel
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              onToggleVisibility={handleToggleVisibility}
            />
          )}

          {activeTab === "inspector" && (
            <InspectorPanel
              modelInfo={modelInfo}
              metadata={metadata}
              selectedNode={selectedNode}
            />
          )}

          {activeTab === "settings" && <SettingsScreen />}
        </div>

        {/* Mobile Bottom Tab Bar (visible on phones) */}
        <nav className="flex md:hidden items-center justify-around p-2 bg-[#0f121a] border-t border-slate-800/80 shrink-0 z-20">
          <button
            onClick={() => setActiveTab("viewer")}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium ${
              activeTab === "viewer" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Box size={18} />
            <span>Viewer</span>
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium ${
              activeTab === "library" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <FolderOpen size={18} />
            <span>Library</span>
          </button>

          <button
            onClick={() => setIsPickerOpen(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold shadow-lg shadow-cyan-500/30"
          >
            <PlusCircle size={22} />
          </button>

          <button
            onClick={() => setActiveTab("hierarchy")}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium ${
              activeTab === "hierarchy" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Layers size={18} />
            <span>Tree</span>
          </button>

          <button
            onClick={() => setActiveTab("inspector")}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-lg text-[10px] font-medium ${
              activeTab === "inspector" ? "text-cyan-400 font-bold" : "text-slate-400"
            }`}
          >
            <Info size={18} />
            <span>Info</span>
          </button>
        </nav>
      </main>

      {/* Document Picker Modal */}
      <DocumentPickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onFileSelected={handleFileSelected}
      />

      {/* Import Progress & Pipeline State Modal */}
      <ImportProgressModal
        isOpen={importState !== "READY"}
        state={importState}
        progress={importProgress}
        message={importMessage}
        onCancel={() => engine.cancelImport(activeJobId)}
      />
    </div>
  );
};
