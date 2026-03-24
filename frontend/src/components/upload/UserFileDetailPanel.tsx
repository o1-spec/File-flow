"use client";
import React from "react";
import { XMarkIcon, ArrowDownTrayIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface UserUpload {
  id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: "CREATED" | "UPLOADED" | "PROCESSING" | "PROCESSED" | "FAILED";
  processed_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface UserFileDetailPanelProps {
  upload: UserUpload | null;
  previewUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onDownload: (upload: UserUpload) => void;
  downloadingId: string | null;
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: UserUpload["status"] }) {
  if (status === "PROCESSED") return <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Processed</span>;
  if (status === "FAILED") return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Failed</span>;
  if (status === "CREATED") return <span className="bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Created</span>;
  return <span className="bg-white/5 border border-white/10 text-gray-300 animate-pulse px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">{status}</span>;
}

export function UserFileDetailPanel({
  upload,
  previewUrl,
  loading,
  onClose,
  onDownload,
  downloadingId,
}: UserFileDetailPanelProps) {
  if (!upload && !loading) return null;

  const isImage = upload?.mime_type.startsWith("image/");
  const isVideo = upload?.mime_type.startsWith("video/");
  const isPdf   = upload?.mime_type === "application/pdf";

  return (
    <div className="fixed inset-0 z-100 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-[#141414] border-l border-white/10 shadow-2xl flex flex-col h-full"
        style={{ animation: "slide-in-right 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/20">
          <h2 className="text-base font-semibold text-white">File Preview & Details</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-white rounded transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin mb-4" />
            <span className="text-sm">Loading details...</span>
          </div>
        ) : upload ? (
          <div className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-6 flex flex-col gap-4">
              <div className="flex justify-between items-start gap-4 pb-4 border-b border-white/5">
                <div className="flex flex-col min-w-0">
                  <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">Filename</span>
                  <span className="text-sm text-white font-medium truncate" title={upload.original_filename}>{upload.original_filename}</span>
                </div>
                <StatusBadge status={upload.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Type</span>
                  <span className="text-xs text-gray-300 truncate">{upload.mime_type}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Size</span>
                  <span className="text-xs text-gray-300">{fmtBytes(upload.size_bytes)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Uploaded</span>
                  <span className="text-xs text-gray-300">{fmtDate(upload.created_at)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Updated</span>
                  <span className="text-xs text-gray-300">{fmtDate(upload.updated_at)}</span>
                </div>
              </div>

              {upload.error_message && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col">
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Error</span>
                  <span className="text-xs text-red-300">{upload.error_message}</span>
                </div>
              )}

              {/* Previews */}
              <div className="mt-2 flex flex-col bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                {previewUrl && isImage && (
                  <img src={previewUrl} alt="Preview" className="w-full h-auto object-contain max-h-64" />
                )}
                {previewUrl && isVideo && (
                  <video src={previewUrl} controls className="w-full max-h-64 bg-black" />
                )}
                {isPdf && upload.status === "PROCESSED" && (
                  <div className="p-6 text-center text-xs text-gray-400">
                    PDF file ready. Download to view.
                  </div>
                )}
                {!previewUrl && upload.status !== "PROCESSED" && (
                  <div className="p-6 text-center text-xs text-gray-500 border-t border-dashed border-white/10">
                    Preview unavailable until processing completes.
                  </div>
                )}
              </div>
            </div>

            {upload.status === "PROCESSED" && (
              <div className="px-6 py-4 border-t border-white/5 bg-[#0a0a0a]">
                <button
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={downloadingId === upload.id}
                  onClick={() => onDownload(upload)}
                >
                  {downloadingId === upload.id ? (
                    <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Downloading...</>
                  ) : (
                    <><ArrowDownTrayIcon className="w-4 h-4" /> Download Result</>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
