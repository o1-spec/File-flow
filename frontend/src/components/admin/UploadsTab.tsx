import { AdminUpload, ALL_STATUSES } from "@/types/admin";
import { fmtBytes, fmtDate } from "@/lib/formatters";
import { StatusBadge } from "@/components/StatusBadge";
import { EyeDropperIcon as ViewIcon, TrashIcon } from "@heroicons/react/24/outline";

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

export function UploadsTab({ uploads, total, page, status, loading, onStatusChange, onPageChange, onView, onDelete }: UploadsTabProps) {
  const totalPages = Math.ceil(total / ADMIN_UPLOADS_LIMIT);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {loading ? "Loading..." : `${total} Uploads`}
        </h3>
        <select 
          value={status} 
          onChange={e => onStatusChange(e.target.value)}
          className="bg-[#0a0a0a] border border-white/10 text-sm text-white rounded-lg px-3 py-1.5 focus:outline-none focus:border-white/30"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {uploads.length === 0 && !loading ? (
        <p className="p-12 text-center text-sm text-gray-500 border border-white/5 border-dashed rounded-xl">No uploads match the filter.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0a0a0a]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/2 border-b border-white/10 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">File</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Size</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Uploaded</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {uploads.map(u => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-300" title={u.email}>{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-white truncate max-w-50" title={u.original_filename}>{u.original_filename}</span>
                      <span className="text-[10px] text-gray-600 font-mono mt-0.5">{u.id.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-mono text-gray-300">{u.mime_type.split("/")[1] ?? u.mime_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">{fmtBytes(u.size_bytes)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={u.status} /></td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{fmtDate(u.created_at)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onView(u)} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors" title="View details">
                        <ViewIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => onDelete(u)} className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > ADMIN_UPLOADS_LIMIT && (
        <div className="flex justify-between items-center mt-4">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50">Prev</button>
          <span className="text-sm text-gray-500 font-medium">Page {page} of {totalPages}</span>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 disabled:opacity-50">Next</button>
        </div>
      )}
    </div>
  );
}
