import { AdminUser } from "@/types/admin";
import { fmtBytes, fmtDate, ago } from "@/lib/formatters";

interface UsersTabProps {
  users: AdminUser[];
  loading: boolean;
  onRefresh: () => void;
}

export function UsersTab({ users, loading, onRefresh }: UsersTabProps) {
  return (
    <>
      <div className="admin-uploads-toolbar">
        <div className="admin-section-title" style={{ margin: 0 }}>
          {loading
            ? "Loading…"
            : `${users.length} registered user${users.length !== 1 ? "s" : ""}`}
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
          ↺ Refresh
        </button>
      </div>

      {users.length === 0 && !loading ? (
        <p className="admin-empty">No users yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Joined</th>
              <th>Total</th>
              <th>Processed</th>
              <th>Failed</th>
              <th>Storage Used</th>
              <th>Last Upload</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 500 }}>{u.email}</td>
                <td className="admin-ts">{fmtDate(u.joined_at)}</td>
                <td>{u.total_uploads}</td>
                <td className="green">{u.processed_uploads}</td>
                <td className={u.failed_uploads > 0 ? "red" : ""}>
                  {u.failed_uploads}
                </td>
                <td className="admin-ts">{fmtBytes(u.storage_bytes)}</td>
                <td className="admin-ts">
                  {u.last_upload_at ? ago(u.last_upload_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
