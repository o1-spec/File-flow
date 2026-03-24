export type UploadStatus =
  | "queued"
  | "uploading"
  | "uploaded"
  | "processing"
  | "PROCESSED"
  | "FAILED"
  | "error";

export interface FileEntry {
  localId: string;
  file: File;
  status: UploadStatus;
  uploadId: string | null;
  error: string | null;
  progress: number;
  record: Record<string, unknown> | null;
}

export const ACCEPTED = [
  "image/png",
  "image/jpeg",
  "application/pdf",
  "video/mp4",
  "video/quicktime",
];
export const ACCEPTED_EXT = ".png, .jpg, .jpeg, .pdf, .mp4, .mov";
export const STEPS = ["Start", "Transfer", "Processing", "Complete"];
export const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function uid(): string {
  return Math.random().toString(36).slice(2);
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export const statusToStep: Record<string, number> = {
  queued: -1,
  uploading: 0,
  uploaded: 1,
  processing: 2,
  PROCESSED: 3,
  FAILED: 2,
  error: 0,
};

export function badgeClass(s: UploadStatus): string {
  return `badge badge-${s.toLowerCase()}`;
}

export function badgeLabel(s: UploadStatus): string {
  const map: Record<UploadStatus, string> = {
    queued: "Queued",
    uploading: "Uploading",
    uploaded: "Uploaded",
    processing: "Processing",
    PROCESSED: "Processed",
    FAILED: "Failed",
    error: "Error",
  };
  return map[s] ?? s;
}

export function isTerminal(s: UploadStatus): boolean {
  return s === "PROCESSED" || s === "FAILED" || s === "error";
}
