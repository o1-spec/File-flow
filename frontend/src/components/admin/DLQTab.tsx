import { DLQJob } from "@/types/admin";
import { fmtDate } from "@/lib/formatters";

interface DLQTabProps {
  dlq: DLQJob[];
  replayingId: string | null;
  replayMsg: string | null;
  onReplay: (jobId: string) => void;
}

export function DLQTab({ dlq, replayingId, replayMsg, onReplay }: DLQTabProps) {
  return (
    <>
      <div className="admin-section-title">
        {dlq.length} job{dlq.length !== 1 ? "s" : ""} in the dead-letter queue
      </div>

      {replayMsg && (
        <div
          className={`alert ${replayMsg.includes("✓") ? "alert-success" : "alert-error"}`}
          style={{ marginBottom: 12 }}
        >
          {replayMsg}
        </div>
      )}

      {dlq.length === 0 ? (
        <p className="admin-empty">Dead-letter queue is empty — all clear.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Upload ID</th>
              <th>Queue</th>
              <th>Type</th>
              <th>Attempts</th>
              <th>Error</th>
              <th>Failed At</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {dlq.map((j) => (
              <tr key={j.dlqJobId}>
                <td className="admin-id" title={j.uploadId}>
                  {j.uploadId?.slice(0, 8)}…
                </td>
                <td>{j.originalQueue}</td>
                <td>
                  <span className="admin-type-badge">
                    {j.mimeType?.split("/")[1] ?? "?"}
                  </span>
                </td>
                <td>{j.attemptsMade}</td>
                <td className="red admin-error-cell" title={j.errorMessage}>
                  {j.errorMessage}
                </td>
                <td className="admin-ts">
                  {j.failedAt ? fmtDate(j.failedAt) : "—"}
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={replayingId === j.dlqJobId}
                    onClick={() => onReplay(j.dlqJobId)}
                  >
                    {replayingId === j.dlqJobId ? "…" : "↺ Replay"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
