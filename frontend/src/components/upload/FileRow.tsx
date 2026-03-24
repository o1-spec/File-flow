import React, { useState } from "react";
import {
  FileEntry,
  STEPS,
  statusToStep,
  badgeLabel,
  isTerminal,
  formatSize,
} from "@/types/upload";
import { FileIcon } from "./FileIcon";
import { ChevronDownIcon, ChevronUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface FileRowProps {
  entry: FileEntry;
  onRemove: (localId: string) => void;
  onDownload: (uploadId: string, localId: string) => void;
}

export function FileRow({ entry, onRemove, onDownload }: FileRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Fetch preview when record opens if it is ready
  React.useEffect(() => {
    if (expanded && entry.status === "PROCESSED" && entry.uploadId && !previewUrl && !previewLoading) {
      setPreviewLoading(true);
      import('@/lib/api').then((api) => {
        api.default.getUploadPreview(entry.uploadId!)
          .then((res: Record<string, unknown>) => setPreviewUrl(res.previewUrl as string))
          .catch(() => {})
          .finally(() => setPreviewLoading(false));
      });
    }
  }, [expanded, entry.status, entry.uploadId, previewUrl, previewLoading]);

  const currentStep = statusToStep[entry.status] ?? -1;
  const terminal = isTerminal(entry.status);

  const hasRecord = entry.record !== null && typeof entry.record === "object";
  const recordEntries = hasRecord
    ? Object.entries(entry.record as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    : [];

  const isFailed = entry.status === "FAILED";
  const isProcessed = entry.status === "PROCESSED";

  const isImage = entry.file.type.startsWith("image/");
  const isVideo = entry.file.type.startsWith("video/");
  const isPdf   = entry.file.type === "application/pdf";

  const getBadgeStyling = () => {
    if (isProcessed) return "bg-white text-black font-semibold";
    if (isFailed) return "bg-red-500/10 text-red-500 border border-red-500/20";
    if (entry.status === "queued") return "bg-white/10 text-white border border-white/20";
    return "bg-white/5 border border-white/10 text-gray-300 animate-pulse";
  };

  return (
    <div
      className={`relative w-full border rounded-xl overflow-hidden mb-3 transition-colors ${
        isFailed
          ? "border-red-500/30 bg-red-500/[0.02]"
          : "border-white/10 bg-[#0a0a0a]"
      }`}
    >
      <div className="flex items-center px-4 py-3 gap-4">
        <div className="flex-shrink-0 text-gray-400 opacity-60">
          <FileIcon type={entry.file.type} />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="text-sm font-medium text-white truncate" title={entry.file.name}>
            {entry.file.name}
          </div>
          <div className="text-xs text-gray-500">
            {formatSize(entry.file.size)}
          </div>
        </div>

        <div className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase ${getBadgeStyling()}`}>
          {badgeLabel(entry.status)}
        </div>

        <div className="flex items-center gap-1">
          {hasRecord && (
            <button
              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "Hide details" : "Show details"}
            >
              {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          )}
          {(entry.status === "queued" || terminal) && (
            <button
              className="p-1 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
              onClick={() => onRemove(entry.localId)}
              title="Remove"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {entry.status === "uploading" && (
        <div className="px-4 pb-3">
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ width: `${entry.progress}%` }}
            />
          </div>
        </div>
      )}

      {entry.status !== "queued" && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => {
              const isDone = entry.status === "PROCESSED" ? true : currentStep > i;
              const isActive = !isDone && currentStep === i;
              const isFail = entry.status === "FAILED" && i === 2;
              
              const stepColor = isFail 
                ? "bg-red-500/20 text-red-500 border-red-500/50" 
                : isDone 
                  ? "bg-white text-black border-transparent" 
                  : isActive 
                    ? "bg-white/10 text-white border-white/50 animate-pulse" 
                    : "bg-transparent text-gray-600 border-white/10";

              return (
                <React.Fragment key={label}>
                  <div
                    className={`flex items-center gap-2 text-xs font-medium border rounded-md px-2 py-1 ${stepColor}`}
                  >
                    {isFail ? "✕" : isDone ? "✓" : i + 1}
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px grow ${isDone ? "bg-white/30" : "bg-white/10"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {entry.error && (
        <div className="mx-4 mb-4 px-3 py-2 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-md flex items-start gap-2">
          <span className="mt-0.5">✕</span> {entry.error}
        </div>
      )}

      {entry.status === "PROCESSED" && entry.uploadId && (
        <div className="px-4 pb-4">
          <button
            className="w-full sm:w-auto px-4 py-1.5 bg-white text-black text-xs font-semibold rounded-md hover:bg-gray-200 transition-colors"
            onClick={() => onDownload(entry.uploadId!, entry.localId)}
          >
            Download Final File
          </button>
        </div>
      )}

      {hasRecord && expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-4 bg-white/[0.01]">
          {entry.status === "PROCESSED" && (
            <div className="mb-4 flex flex-col bg-black/20 rounded-xl border border-white/5 overflow-hidden">
              {previewLoading ? (
                <div className="p-6 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-xs animate-pulse">Loading preview...</span>
                </div>
              ) : previewUrl ? (
                isImage ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-64" />
                ) : isVideo ? (
                  <video src={previewUrl} controls className="w-full max-h-64 bg-black" />
                ) : isPdf ? (
                  <div className="p-6 text-center text-xs text-gray-400">
                    PDF ready. Download to view.
                  </div>
                ) : null
              ) : (
                <div className="p-6 text-center text-xs text-gray-500">
                  Preview unavailable.
                </div>
              )}
            </div>
          )}

          <div className="text-xs font-semibold text-gray-300 mb-3 uppercase tracking-wider">Upload Record Details</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
            {recordEntries.map(([k, v]) => (
              <div key={k} className="flex flex-col">
                <span className="text-[10px] text-gray-500 uppercase">{k}</span>
                <span className="text-xs text-gray-300 font-mono break-all">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
