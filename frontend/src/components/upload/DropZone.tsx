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
      className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors w-full max-w-2xl mx-auto
        ${
          dragging
            ? "border-white/40 bg-white/5"
            : "border-white/10 bg-white/2 hover:border-white/20 hover:bg-white/4"
        }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      aria-label="File drop zone"
    >
      <div className="mb-4 text-white opacity-80">
        <svg
          className="w-8 h-8 mx-auto stroke-current"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="text-sm font-medium text-white mb-2">
        {hasFiles ? "Add more files" : "Click to deploy or drag and drop"}
      </div>
      <div className="text-xs text-gray-500 text-center max-w-sm">
        {ACCEPTED_EXT} — multiple formats allowed. Files are processed asynchronously.
      </div>
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
