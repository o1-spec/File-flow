"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { UserFileDetailPanel } from "../../components/upload/UserFileDetailPanel";
import { TrashIcon, ArrowDownTrayIcon, EyeDropperIcon as ViewIcon, DocumentIcon, PhotoIcon, VideoCameraIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface Upload {
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
  });
}

function mimeLabel(mime: string) {
  const sub = mime.split("/")[1] ?? mime;
  if (sub === "jpeg") return "jpg";
  if (sub === "quicktime") return "mov";
  if (sub === "x-matroska") return "mkv";
  return sub.slice(0, 8);
}

function StatusBadge({ status }: { status: Upload["status"] }) {
  if (status === "PROCESSED") return <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Processed</span>;
  if (status === "FAILED") return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Failed</span>;
  if (status === "CREATED") return <span className="bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Created</span>;
  return <span className="bg-white/5 border border-white/10 text-gray-300 animate-pulse px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">{status}</span>;
}

function FileTypeIcon({ mime }: { mime: string }) {
  const type = mime.split("/")[0];
  if (type === "image") return <PhotoIcon className="w-5 h-5" />;
  if (type === "video") return <VideoCameraIcon className="w-5 h-5" />;
  return <DocumentIcon className="w-5 h-5" />;
}

export default function UploadsPage() {
  const router = useRouter();
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Upload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewTarget, setViewTarget] = useState<Upload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
  }, [router]);

  const fetchUploads = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getMyUploads();
      setUploads((res as Record<string, unknown>).uploads as Upload[]);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.error as string) || (err?.message as string) || "Failed to load uploads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUploads(); }, [fetchUploads]);

  async function openDetail(upload: Upload) {
    setViewTarget(upload);
    setPreviewUrl(null);
    if (upload.status !== "PROCESSED") return;
    setPreviewLoading(true);
    try {
      const res = await api.getUploadPreview(upload.id);
      setPreviewUrl((res as Record<string, unknown>).previewUrl as string);
    } catch {
      // preview unavailable
    } finally {
      setPreviewLoading(false);
    }
  }

  function closeDetail() {
    setViewTarget(null);
    setPreviewUrl(null);
  }

  async function handleDownload(upload: Upload) {
    setDownloadingId(upload.id);
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`http://localhost:4000/uploads/${upload.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = upload.original_filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Ignore silently or standard UI logic
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteUpload(deleteTarget.id);
      setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch (e) {
      // Ignoring display toast logic for minimal simplicity
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-6xl mx-auto w-full pt-28 pb-20">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My File Pipelines</h1>
          <p className="text-gray-400 text-sm max-w-lg">
            Review status, download assets, and monitor all pipelines you've provisioned.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors" onClick={fetchUploads}>
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm flex items-start gap-2">
          <span className="mt-0.5">✕</span> {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-white/2 border border-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : uploads.length === 0 && !error ? (
        <div className="flex flex-col items-center justify-center p-12 border border-white/10 border-dashed rounded-2xl bg-white/1">
          <DocumentIcon className="w-12 h-12 text-gray-600 mb-4" />
          <h3 className="text-gray-300 font-medium mb-1">No files yet</h3>
          <p className="text-gray-500 text-sm mb-6">You haven't uploaded or processed any files.</p>
          <button onClick={() => router.push("/upload")} className="px-4 py-2 bg-white text-black font-medium text-sm rounded-lg hover:bg-gray-200 transition-colors">
            Upload a File
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0a0a0a]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/2 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">File</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Size</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {uploads.map(u => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="text-gray-500"><FileTypeIcon mime={u.mime_type} /></div>
                      <span className="font-medium text-white truncate max-w-50" title={u.original_filename}>{u.original_filename}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-mono">{mimeLabel(u.mime_type)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">{fmtBytes(u.size_bytes)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={u.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openDetail(u)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="View Details">
                        <ViewIcon className="w-4 h-4" />
                      </button>
                      {u.status === "PROCESSED" && (
                        <button onClick={() => handleDownload(u)} disabled={downloadingId === u.id} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50" title="Download">
                          {downloadingId === u.id ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowDownTrayIcon className="w-4 h-4" />}
                        </button>
                      )}
                      <button onClick={() => setDeleteTarget(u)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Delete file?</h3>
            <p className="text-gray-400 text-sm mb-6">
              <span className="text-gray-200 font-medium">{deleteTarget.original_filename}</span> will be permanently deleted from your pipelines. This action cannot be reversed.
            </p>
            <div className="flex gap-3 justify-end mt-4">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(viewTarget || previewLoading) && (
        <UserFileDetailPanel
          upload={viewTarget}
          previewUrl={previewUrl}
          loading={previewLoading}
          onClose={closeDetail}
          onDownload={handleDownload}
          downloadingId={downloadingId}
        />
      )}
    </div>
  );
}
