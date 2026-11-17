import React, { useState, useRef } from "react";
import { Upload, FileBox, X, Layers, AlertCircle, Sparkles, Cpu } from "lucide-react";
import { TessellationProfile } from "../types/engine";

interface DocumentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelected: (fileName: string, data: ArrayBuffer | string, tessellation: TessellationProfile) => void;
}

export const DocumentPickerModal: React.FC<DocumentPickerModalProps> = ({
  isOpen,
  onClose,
  onFileSelected
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [tessellation, setTessellation] = useState<TessellationProfile>("balanced");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isTextFormat = ext === "obj" || ext === "step" || ext === "stp" || ext === "iges" || ext === "igs";

    if (isTextFormat) {
      const text = await file.text();
      onFileSelected(file.name, text, tessellation);
    } else {
      const buffer = await file.arrayBuffer();
      onFileSelected(file.name, buffer, tessellation);
    }
    onClose();
  };

  const loadSample = async (sampleType: "step" | "stl" | "obj" | "ply" | "glb") => {
    if (sampleType === "step") {
      onFileSelected("bearing_assembly.step", "ISO-10303-21;\nHEADER;\nFILE_DESCRIPTION(('CAD Test Assembly'),'2;1');\nENDSEC;\nDATA;\n#10=APPLICATION_CONTEXT('mechanical design');\n#20=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));\nENDSEC;\nEND-ISO-10303-21;", tessellation);
    } else if (sampleType === "stl") {
      onFileSelected("bracket.stl", "solid bracket\n  facet normal 0 0 -1\n    outer loop\n      vertex 0 0 0\n      vertex 0 30 0\n      vertex 50 30 0\n    endloop\n  endfacet\nendsolid bracket", tessellation);
    } else if (sampleType === "obj") {
      onFileSelected("cube.obj", "o Cube\nv 1 1 -1\nv 1 -1 -1\nv 1 1 1\nv 1 -1 1\nv -1 1 -1\nv -1 -1 -1\nv -1 1 1\nv -1 -1 1\nf 5 3 1\nf 5 7 3\nf 3 8 4\nf 3 7 8\nf 7 6 8\nf 7 5 6\nf 2 8 4\nf 2 6 8\nf 1 4 2\nf 1 3 4\nf 5 2 6\nf 5 1 2", tessellation);
    } else if (sampleType === "ply") {
      onFileSelected("pyramid.ply", "ply\nformat ascii 1.0\nelement vertex 5\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nelement face 6\nproperty list uchar int vertex_indices\nend_header\n0 1.5 0 255 100 100\n-1 0 -1 100 255 100\n1 0 -1 100 100 255\n1 0 1 255 255 100\n-1 0 1 255 100 255\n3 0 1 2\n3 0 2 3\n3 0 3 4\n3 0 4 1\n3 1 4 3\n3 1 3 2", tessellation);
    } else {
      onFileSelected("drone_prototype.glb", "SAMPLE_DRONE_GLB", tessellation);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl p-6 rounded-2xl glass-panel shadow-2xl border border-slate-700/60 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <FileBox size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Open 3D Model</h2>
            <p className="text-xs text-slate-400">Select local files from device storage or choose a sample</p>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragging
              ? "border-cyan-400 bg-cyan-500/10 scale-[1.01]"
              : "border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/60"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glb,.gltf,.obj,.stl,.ply,.step,.stp,.iges,.igs,.3mf,.usdz"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <div className="p-4 rounded-full bg-slate-800 text-cyan-400 mb-3 border border-slate-700">
            <Upload size={28} />
          </div>
          <span className="text-sm font-semibold text-slate-200">Drop your 3D or CAD model here</span>
          <span className="text-xs text-slate-400 mt-1">or click to browse local files</span>
          <div className="flex flex-wrap justify-center gap-1.5 mt-4 text-[10px] text-slate-400 font-mono">
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.GLB / .glTF</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.STEP / .STP</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.OBJ</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.STL</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.PLY</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700">.IGES</span>
          </div>
        </div>

        {/* CAD Tessellation Setting */}
        <div className="mt-5 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu size={14} className="text-amber-400" />
              CAD Tessellation Quality Profile
            </span>
            <span className="text-[11px] text-slate-400 capitalize">{tessellation}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(["draft", "balanced", "high"] as TessellationProfile[]).map((prof) => (
              <button
                key={prof}
                type="button"
                onClick={() => setTessellation(prof)}
                className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  tessellation === prof
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-800/60 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {prof.charAt(0).toUpperCase() + prof.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* One-Click Sample Models */}
        <div className="mt-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-2.5">
            <Sparkles size={14} className="text-cyan-400" />
            Quick Test Sample Corpus:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => loadSample("step")}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                CAD
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Bearing Assembly</div>
                <div className="text-[10px] text-slate-400">STEP B-Rep</div>
              </div>
            </button>

            <button
              onClick={() => loadSample("stl")}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-[10px] font-bold">
                STL
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Mount Bracket</div>
                <div className="text-[10px] text-slate-400">3D Printing</div>
              </div>
            </button>

            <button
              onClick={() => loadSample("obj")}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 font-mono text-[10px] font-bold">
                OBJ
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Cube & Normal</div>
                <div className="text-[10px] text-slate-400">Wavefront PBR</div>
              </div>
            </button>

            <button
              onClick={() => loadSample("ply")}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all"
            >
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                PLY
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Color Pyramid</div>
                <div className="text-[10px] text-slate-400">Stanford PLY</div>
              </div>
            </button>

            <button
              onClick={() => loadSample("glb")}
              className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/40 text-left transition-all col-span-2 sm:col-span-1"
            >
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 font-mono text-[10px] font-bold">
                GLB
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">Drone Prototype</div>
                <div className="text-[10px] text-slate-400">Binary glTF PBR</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
