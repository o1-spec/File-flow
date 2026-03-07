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
  /** map localId → EventSource */
  const sseRefs = useRef<Map<string, EventSource>>(new Map());

  /* Auth guard — also close all SSE connections on unmount */
  useEffect(() => {
    if (!localStorage.getItem("token")) router.push("/login");
    return () => sseRefs.current.forEach((es) => es.close());
  }, [router]);

  /* ── Entry state helper ────────────────────────────────── */
  function patch(localId: string, update: Partial<FileEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.localId === localId ? { ...e, ...update } : e))
    );
  }

  /* ── Add files ─────────────────────────────────────────── */
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

  /* ── Drag & Drop ───────────────────────────────────────── */
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /* ── SSE: subscribe for one upload ────────────────────── */
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
      } catch { /* malformed frame — ignore */ }
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

  /* ── Upload one file ───────────────────────────────────── */
  async function uploadEntry(entry: FileEntry) {
    const { localId, file } = entry;
    patch(localId, { status: "uploading", error: null, progress: 0 });

    try {
      // 1 — start
      const start = await api.startUpload({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });
      const presignedUrl = (
        start.presignedUrl ||
        start.presigned_url ||
        start.url
      ) as string;
      const newId = (start.uploadId || start.upload_id || start.id) as string;
      if (!presignedUrl || !newId)
        throw new Error("startUpload missing presignedUrl or uploadId");

      patch(localId, { uploadId: newId });

      // 2 — PUT to S3 with XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            patch(localId, {
              progress: Math.round((ev.loaded / ev.total) * 100),
            });
          }
        };
        xhr.onload = () =>
          xhr.status >= 200 && xhr.status < 300
            ? resolve()
            : reject(new Error(`S3 PUT failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error("S3 network error"));
        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader(
          "Content-Type",
          file.type || "application/octet-stream"
        );
        xhr.send(file);
      });

      patch(localId, { status: "uploaded", progress: 100 });

      // 3 — complete
      await api.completeUpload(newId);
      patch(localId, { status: "processing" });

      // 4 — open SSE stream
      startSSE(localId, newId);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, {
        status: "error",
        error:
          (err?.error as string) ||
          (err?.message as string) ||
          "Upload failed",
      });
    }
  }

  /* ── Bulk upload all queued ────────────────────────────── */
  function handleUploadAll() {
    entries.filter((e) => e.status === "queued").forEach((e) => uploadEntry(e));
  }

  /* ── Remove entry ──────────────────────────────────────── */
  function handleRemove(localId: string) {
    sseRefs.current.get(localId)?.close();
    sseRefs.current.delete(localId);
    setEntries((prev) => prev.filter((e) => e.localId !== localId));
  }

  /* ── Download ──────────────────────────────────────────── */
  async function handleDownload(uploadId: string, localId: string) {
    try {
      const res = await api.getDownload(uploadId);
      const url = res.downloadUrl as string;
      if (!url) throw new Error("No downloadUrl returned");
      window.open(url, "_blank");
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      patch(localId, {
        error:
          (err?.error as string) ||
          (err?.message as string) ||
          "Download failed",
      });
    }
  }

  /* ── Clear completed ───────────────────────────────────── */
  function handleClearDone() {
    setEntries((prev) => {
      prev.filter((e) => isTerminal(e.status)).forEach((e) => {
        sseRefs.current.get(e.localId)?.close();
        sseRefs.current.delete(e.localId);
      });
      return prev.filter((e) => !isTerminal(e.status));
    });
  }

  const queuedCount = entries.filter((e) => e.status === "queued").length;
  const doneCount = entries.filter((e) => isTerminal(e.status)).length;
  const activeCount = entries.filter(
    (e) => !isTerminal(e.status) && e.status !== "queued"
  ).length;

  return (
    <div className="upload-page">
      {/* Header */}
      <div className="up-header">
        <div>
          <h2>Upload Files</h2>
          <p className="subtitle">
            Drag &amp; drop any mix of images, PDFs, and videos — each processes
            independently.
          </p>
        </div>
        {entries.length > 0 && (
          <div className="up-header-actions">
            {queuedCount > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={handleUploadAll}
              >
                Upload {queuedCount} file{queuedCount !== 1 ? "s" : ""}
              </button>
            )}
            {doneCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={handleClearDone}>
                Clear done
              </button>
            )}
          </div>
        )}
      </div>

      {/* Global error */}
      {globalError && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          ✕ {globalError}
        </div>
      )}

      {/* Drop zone */}
      <DropZone
        hasFiles={entries.length > 0}
        dragging={dragging}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onFilesSelected={addFiles}
      />

      {/* File queue */}
      {entries.length > 0 && (
        <div className="fq-list" style={{ marginTop: 24 }}>
          <div className="fq-summary">
            <span>
              {entries.length} file{entries.length !== 1 ? "s" : ""}
            </span>
            {activeCount > 0 && (
              <span className="badge badge-processing">{activeCount} active</span>
            )}
            {queuedCount > 0 && (
              <span className="badge badge-idle">{queuedCount} queued</span>
            )}
            {doneCount > 0 && (
              <span className="badge badge-processed">{doneCount} done</span>
            )}
          </div>

          {entries.map((entry) => (
            <FileRow
              key={entry.localId}
              entry={entry}
              onRemove={handleRemove}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  );
}
