import React, { useState } from "react";
import {
  FileEntry,
  STEPS,
  statusToStep,
  badgeClass,
  badgeLabel,
  isTerminal,
  formatSize,
} from "@/types/upload";
import { FileIcon } from "./FileIcon";

interface FileRowProps {
  entry: FileEntry;
  onRemove: (localId: string) => void;
  onDownload: (uploadId: string, localId: string) => void;
}

export function FileRow({ entry, onRemove, onDownload }: FileRowProps) {
  const [expanded, setExpanded] = useState(false);
  const currentStep = statusToStep[entry.status] ?? -1;
  const terminal = isTerminal(entry.status);

  const hasRecord =
    entry.record !== null && typeof entry.record === "object";
  const recordEntries = hasRecord
    ? Object.entries(entry.record as Record<string, unknown>).filter(
        ([, v]) => v !== null && v !== undefined && v !== ""
      )
    : [];

  return (
    <div
      className={`fq-item${
        terminal
          ? entry.status === "PROCESSED"
            ? " fq-done"
            : " fq-failed"
          : ""
      }`}
    >
      {/* Row header */}
      <div className="fq-header">
        <span className="fq-icon">
          <FileIcon type={entry.file.type} />
        </span>
        <div className="fq-meta">
          <span className="fq-name" title={entry.file.name}>
            {entry.file.name}
          </span>
          <span className="fq-size">{formatSize(entry.file.size)}</span>
        </div>
        <span className={badgeClass(entry.status)}>{badgeLabel(entry.status)}</span>
        {hasRecord && (
          <button
            className="btn btn-ghost btn-sm fq-toggle"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "Hide details" : "Show details"}
          >
            {expanded ? "▲" : "▼"}
          </button>
        )}
        {(entry.status === "queued" || terminal) && (
          <button
            className="btn btn-ghost btn-sm fq-remove"
            onClick={() => onRemove(entry.localId)}
            title="Remove"
          >
            ✕
          </button>
        )}
      </div>

      {/* Progress bar (uploading only) */}
      {entry.status === "uploading" && (
        <div className="fq-progress-track">
          <div
            className="fq-progress-bar"
            style={{ width: `${entry.progress}%` }}
          />
          <span className="fq-progress-pct">{entry.progress}%</span>
        </div>
      )}

      {/* Steps tracker */}
      {entry.status !== "queued" && (
        <div className="steps fq-steps-full" style={{ marginTop: 16 }}>
          {STEPS.map((label, i) => {
            const isDone =
              entry.status === "PROCESSED" ? true : currentStep > i;
            const isActive = !isDone && currentStep === i;
            const isFail = entry.status === "FAILED" && i === 2;
            return (
              <React.Fragment key={label}>
                {i > 0 && (
                  <div
                    className={`step-connector${
                      entry.status === "PROCESSED" || currentStep > i - 1
                        ? " done"
                        : ""
                    }`}
                  />
                )}
                <div
                  className={`step${isActive ? " active" : ""}${
                    isDone ? " done" : ""
                  }${isFail ? " failed" : ""}`}
                >
                  <div className="step-circle">
                    {isFail ? "✕" : isDone ? "✓" : i + 1}
                  </div>
                  <span className="step-label">{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* SSE live indicator */}
      {!terminal &&
        entry.status !== "queued" &&
        entry.status !== "uploading" && (
          <div className="fq-polling-hint">
            <span className="sse-dot" /> Live updates via SSE
          </div>
        )}

      {/* Error message */}
      {entry.error && (
        <div className="alert alert-error fq-alert">✕ {entry.error}</div>
      )}

      {/* Download button */}
      {entry.status === "PROCESSED" && entry.uploadId && (
        <button
          className="btn btn-success btn-sm fq-download"
          onClick={() => onDownload(entry.uploadId!, entry.localId)}
        >
          Download Processed File
        </button>
      )}

      {/* Collapsible record details */}
      {hasRecord && expanded && (
        <div className="fq-record">
          <div className="fq-record-title">Upload Record</div>
          {recordEntries.map(([k, v]) => (
            <div key={k} className="record-row">
              <span className="rr-key">{k}</span>
              <span className="rr-val">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
