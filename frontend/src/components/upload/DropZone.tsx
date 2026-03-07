import { useRef } from "react";
import { ACCEPTED, ACCEPTED_EXT } from "@/types/upload";

interface DropZoneProps {
  hasFiles: boolean;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFilesSelected: (files: FileList) => void;
}

export function DropZone({
  hasFiles,
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesSelected,
}: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) onFilesSelected(e.target.files);
    e.target.value = "";
  }

  return (
    <div
      className={`drop-zone${dragging ? " dragging" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="File drop zone"
    >
      <svg
        className="dz-icon-svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span className="dz-label">
        {hasFiles ? "Add more files" : "Drop files here"}
      </span>
      <span className="dz-sub">
        or click to browse · {ACCEPTED_EXT} · multiple allowed
      </span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        multiple
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}
