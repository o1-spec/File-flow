import { FailedUpload } from "@/types/admin";
import { fmtBytes, fmtDate } from "@/lib/formatters";

export function FailedTab({ failed }: { failed: FailedUpload[] }) {
  return (
    <>
      <div className="admin-section-title">
        {failed.length} failed upload{failed.length !== 1 ? "s" : ""}
      </div>

      {failed.length === 0 ? (
        <p className="admin-empty">No failed uploads — all clear.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>File</th>
              <th>Type</th>
              <th>Size</th>
              <th>Error</th>
              <th>Failed At</th>
            </tr>
          </thead>
          <tbody>
            {failed.map((f) => (
              <tr key={f.id}>
                <td className="admin-filename" title={f.id}>
                  {f.original_filename}
                </td>
                <td>
                  <span className="admin-type-badge">
                    {f.mime_type.split("/")[1]}
                  </span>
                </td>
                <td>{fmtBytes(f.size_bytes)}</td>
                <td
                  className="red admin-error-cell"
                  title={f.error_message}
                >
                  {f.error_message ?? "—"}
                </td>
                <td className="admin-ts">{fmtDate(f.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
