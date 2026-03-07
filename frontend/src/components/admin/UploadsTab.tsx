import { AdminUpload, ALL_STATUSES } from "@/types/admin";
import { fmtBytes, fmtDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";

const ADMIN_UPLOADS_LIMIT = 50;

interface UploadsTabProps {
  uploads: AdminUpload[];
  total: number;
  page: number;
  status: string;
  loading: boolean;
  onStatusChange: (status: string) => void;
  onPageChange: (page: number) => void;
  onView: (upload: AdminUpload) => void;
  onDelete: (upload: AdminUpload) => void;
}

export function UploadsTab({
  uploads,
  total,
  page,
  status,
  loading,
  onStatusChange,
  onPageChange,
  onView,
  onDelete,
}: UploadsTabProps) {
  const totalPages = Math.ceil(total / ADMIN_UPLOADS_LIMIT);

  return (
    <>
      {/* Toolbar */}
      <div className="admin-uploads-toolbar">
        <div className="admin-section-title" style={{ margin: 0 }}>
          {loading
            ? "Loading…"
            : `${total} total upload${total !== 1 ? "s" : ""}`}
        </div>
        <div className="admin-uploads-filters">
          <label className="admin-filter-label">Status</label>
          <select
            className="admin-filter-select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
          >
            <option value="">All</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {uploads.length === 0 && !loading ? (
        <p className="admin-empty">No uploads match the current filter.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Status</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id}>
                <td className="admin-id" title={u.id}>
                  {u.id.slice(0, 8)}…
                </td>
                <td className="admin-email" title={u.email}>
                  {u.email}
                </td>
                <td className="admin-filename" title={u.original_filename}>
                  {u.original_filename}
                </td>
                <td>
                  <span className="admin-type-badge">
                    {u.mime_type.split("/")[1] ?? u.mime_type}
                  </span>
                </td>
                <td className="admin-ts">{fmtBytes(u.size_bytes)}</td>
                <td>
                  <StatusBadge status={u.status} />
                </td>
                <td className="admin-ts">{fmtDate(u.created_at)}</td>
                <td>
                  <div className="uploads-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => onView(u)}
                      title="View details"
                    >
                      View
                    </button>
                    <button
                      className="btn btn-ghost btn-sm uploads-delete-btn"
                      onClick={() => onDelete(u)}
                      title="Delete upload"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        width="13"
                        height="13"
                        aria-hidden="true"
                      >
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {total > ADMIN_UPLOADS_LIMIT && (
        <div className="admin-uploads-pagination">
          <button
            className="btn btn-ghost btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <span className="admin-pagination-info">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </>
  );
}
