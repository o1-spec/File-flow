"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import {
  FileEntry,
  UploadStatus,
  ACCEPTED,
  BASE,
  uid,
  isTerminal,
} from "@/types/upload";
import { FileRow } from "@/components/upload/FileRow";
import { DropZone } from "@/components/upload/DropZone";

export default function UploadPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const sseRefs = useRef<Map<string, EventSource>>(new Map());

  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
    const currentSseMap = sseRefs.current;
    return () => currentSseMap.forEach((es) => es.close());
  }, [router]);

  function patch(localId: string, update: Partial<FileEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, ...update } : e))
    );
  }

  function addFiles(files: FileList | File[]) {
    const valid: FileEntry[] = [];
    const rejected: string[] = [];

    Array.from(files).forEach((f) => {
      if (ACCEPTED.includes(f.type)) {
        valid.push({
          localId: uid(),
          file: f,
          status: "queued",
          uploadId: null,
          error: null,
          progress: 0,
          record: null,
        });
      } else {
        rejected.push(f.name);
      }
    });

    if (rejected.length) {
      setGlobalError(`Skipped unsupported file(s): ${rejected.join(", ")}`);
    } else {
      setGlobalError(null);
    }

    if (valid.length) setEntries((prev) => [...prev, ...valid]);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, []);

  function startSSE(localId: string, uploadId: string) {
    if (sseRefs.current.has(localId)) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    const url = `${BASE}/uploads/${encodeURIComponent(uploadId)}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {
          upload?: Record<string, unknown>;
          done?: boolean;
          error?: string;
        };

        if (msg.error) {
          patch(localId, { status: "error", error: msg.error });
          es.close();
          sseRefs.current.delete(localId);
          return;
        }

        if (msg.upload) {
          const row = msg.upload;
          const s = (row.status as UploadStatus) ?? "processing";
          patch(localId, { status: s, record: row });
          if (s === "FAILED") {
            patch(localId, {
              error: (row.error_message as string) || "Processing failed",
            });
          }
        }

        if (msg.done) {
          es.close();
          sseRefs.current.delete(localId);
        }
      } catch { /* malformed frame */ }
    };

    es.onerror = () => {
      setEntries((prev) => {
        const e = prev.find((x) => x.localId === localId);
        if (e && isTerminal(e.status)) {
          es.close();
          sseRefs.current.delete(localId);
        }
        return prev;
      });
    };

    sseRefs.current.set(localId, es);
  }

  async function uploadEntry(entry: FileEntry) {
    const { localId, file } = entry;
    patch(localId, { status: "uploading", error: null, progress: 0 });

    try {
      const start = await api.startUpload({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });
      const presignedUrl = (start.presignedUrl || start.presigned_url || start.url) as string;
      const newId = (start.uploadId || start.upload_id || start.id) as string;
      if (!presignedUrl || !newId) throw new Error("startUpload missing presignedUrl or uploadId");

      patch(localId, { uploadId: newId });

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            patch(localId, { progress: Math.round((ev.loaded / ev.total) * 100) });
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`S3 PUT failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("S3 network error"));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      });

      patch(localId, { status: "uploaded", progress: 100 });
      await api.completeUpload(newId);
      patch(localId, { status: "processing" });
      startSSE(localId, newId);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, {
        status: "error",
        error: (err?.error as string) || (err?.message as string) || "Upload failed",
      });
    }
  }

  function handleUploadAll() {
    entries.filter((e) => e.status === "queued").forEach((e) => uploadEntry(e));
  }

  function handleRemove(localId: string) {
    sseRefs.current.get(localId)?.close();
    sseRefs.current.delete(localId);
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  }

  async function handleDownload(uploadId: string, localId: string) {
    try {
      const entry = entries.find((e) => e.localId === localId);
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/uploads/${uploadId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = entry?.file.name ?? "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, { error: (err?.error as string) || (err?.message as string) || "Download failed" });
    }
  }

  function handleClearDone() {
    setEntries((prev) => {
      prev.filter((e) => isTerminal(e.status)).forEach((e) => {
        sseRefs.current.get(e.localId)?.close();
        sseRefs.current.delete(e.localId);
      });
      return prev.filter((e) => !isTerminal(e.status));
    });
  }

  function handleSimulateLoad() {
    const dummyFiles: File[] = [];

    // Valid 1x1 PNG binary payload
    const pngBytes = Uint8Array.from(
      atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
      (c) => c.charCodeAt(0)
    );

    // Valid 1x1 JPEG binary payload
    const jpgBytes = Uint8Array.from(
      atob("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="),
      (c) => c.charCodeAt(0)
    );

    // Valid minimal PDF payload
    const pdfContent = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000102 00000 n 
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF`;
    const pdfBytes = new TextEncoder().encode(pdfContent);

    dummyFiles.push(new File([pdfBytes], "financial_report_Q3.pdf", { type: "application/pdf" }));
    dummyFiles.push(new File([jpgBytes], "profile_picture_hi_res.jpg", { type: "image/jpeg" }));
    dummyFiles.push(new File([pdfBytes], "invoice_march_2026.pdf", { type: "application/pdf" }));
    dummyFiles.push(new File([pngBytes], "transparent_logo_bg.png", { type: "image/png" }));
    dummyFiles.push(new File([pdfBytes], "quarterly_analytics.pdf", { type: "application/pdf" }));

    addFiles(dummyFiles);

    // Auto-trigger upload
    setTimeout(() => {
      const btn = document.getElementById("upload-all-btn");
      if (btn) btn.click();
    }, 100);
  }

  const queuedCount = entries.filter((e) => e.status === "queued").length;
  const doneCount = entries.filter((e) => isTerminal(e.status)).length;
  const activeCount = entries.filter((e) => !isTerminal(e.status) && e.status !== "queued").length;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-5xl mx-auto w-full pt-28 pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl font-semibold text-center tracking-tight text-white mb-2">Deploy Pipelines</h1>
          <p className="text-gray-400 text-center text-sm max-w-lg mb-6">
            Drag & drop images, PDFs, or videos to start your distributed job. They process independently in the background.
          </p>
          <button 
            onClick={handleSimulateLoad} 
            className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-bold hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Simulate Heavy Load
          </button>
        </div>

        {entries.length > 0 && (
          <div className="flex gap-3 shrink-0 mt-6 md:mt-0 md:absolute md:right-8">
            {doneCount > 0 && (
              <button onClick={handleClearDone} className="px-4 py-2 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors">
                Clear Done
              </button>
            )}
            {queuedCount > 0 && (
              <button id="upload-all-btn" onClick={handleUploadAll} className="px-4 py-2 bg-white text-black rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
                Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
              </button>
            )}
          </div>
        )}
      </div>

      {globalError && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm flex items-start gap-2">
          <span className="mt-0.5">✕</span> {globalError}
        </div>
      )}

      <DropZone
        hasFiles={entries.length > 0}
        dragging={dragging}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onFilesSelected={addFiles}
      />

      {entries.length > 0 && (
        <div className="mt-12">
          <div className="flex items-center gap-4 mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
            <span>{entries.length} file{entries.length !== 1 ? "s" : ""}</span>
            <div className="flex gap-2">
              {activeCount > 0 && <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{activeCount} active</span>}
              {queuedCount > 0 && <span className="text-gray-400 bg-white/10 px-2 py-0.5 rounded">{queuedCount} queued</span>}
              {doneCount > 0 && <span className="text-green-400 bg-green-400/10 px-2 py-0.5 rounded">{doneCount} done</span>}
            </div>
          </div>
          
          <div className="flex flex-col">
            {entries.map((entry) => (
              <FileRow key={entry.localId} entry={entry} onRemove={handleRemove} onDownload={handleDownload} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
