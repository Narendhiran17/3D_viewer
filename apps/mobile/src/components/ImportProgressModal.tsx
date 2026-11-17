import React from "react";
import { ImportJobState } from "../types/engine";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface ImportProgressModalProps {
  isOpen: boolean;
  state: ImportJobState;
  progress: number;
  message?: string;
  onCancel: () => void;
}

const STAGES: { key: ImportJobState; label: string }[] = [
  { key: "QUEUED", label: "Queued" },
  { key: "VALIDATING", label: "Validating" },
  { key: "DETECTING", label: "Detecting" },
  { key: "IMPORTING", label: "Importing" },
  { key: "NORMALIZING", label: "Normalizing" },
  { key: "OPTIMIZING", label: "Optimizing" },
  { key: "CACHING", label: "Caching" },
  { key: "READY", label: "Ready" }
];

export const ImportProgressModal: React.FC<ImportProgressModalProps> = ({
  isOpen,
  state,
  progress,
  message,
  onCancel
}) => {
  if (!isOpen || state === "READY") return null;

  const currentIdx = STAGES.findIndex(s => s.key === state);
  const isFailed = state === "FAILED" || state === "CANCELLED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md p-6 rounded-2xl glass-panel border border-slate-700/80 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            {isFailed ? (
              <XCircle className="text-rose-400" size={22} />
            ) : (
              <Loader2 className="text-cyan-400 animate-spin" size={22} />
            )}
            <h3 className="font-bold text-base tracking-tight">
              {isFailed ? "Import Failed" : "Processing 3D Asset"}
            </h3>
          </div>
          <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
            {Math.round(progress * 100)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden mb-4 border border-slate-700/40">
          <div
            className={`h-full transition-all duration-300 ease-out ${
              isFailed ? "bg-rose-500" : "bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
            }`}
            style={{ width: `${Math.max(5, Math.min(100, progress * 100))}%` }}
          />
        </div>

        {/* Pipeline Stage Indicators */}
        <div className="grid grid-cols-4 gap-1.5 mb-5 text-[10px] font-mono">
          {STAGES.map((s, idx) => {
            const isDone = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            return (
              <div
                key={s.key}
                className={`py-1 px-1.5 rounded text-center border transition-all ${
                  isCurrent
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-semibold"
                    : isDone
                    ? "bg-slate-800/70 text-slate-400 border-slate-700/40"
                    : "bg-slate-900/40 text-slate-600 border-slate-800/40"
                }`}
              >
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 mb-5 flex items-start gap-2">
          <span className="text-cyan-400 font-mono mt-0.5">&gt;</span>
          <span className="leading-relaxed">{message || "Working..."}</span>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition-colors"
          >
            Cancel Import
          </button>
        </div>
      </div>
    </div>
  );
};
