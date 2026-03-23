import { FailedUpload } from "@/types/admin";
import { fmtDate } from "@/lib/formatters";

export function FailedTab({ failed }: { failed: FailedUpload[] }) {
  if (failed.length === 0) return (
    <p className="p-12 mt-6 text-center text-sm text-gray-500 border border-white/5 border-dashed rounded-xl">No failed uploads.</p>
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 mt-6">
      <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0a0a0a]">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-white/[0.02] border-b border-white/10 tracking-wider">
            <tr>
              <th className="px-6 py-4 font-semibold">File</th>
              <th className="px-6 py-4 font-semibold">User</th>
              <th className="px-6 py-4 font-semibold">Error Message</th>
              <th className="px-6 py-4 font-semibold">Failed At</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {failed.map(f => (
              <tr key={f.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="font-medium text-white block max-w-[200px] truncate" title={f.original_filename}>{f.original_filename}</span>
                  <span className="text-[10px] text-gray-600 font-mono mt-0.5">{f.id}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">{f.user_id}</td>
                <td className="px-6 py-4">
                  <div className="max-w-md text-red-400 text-xs px-2 py-1 bg-red-400/10 border border-red-400/20 rounded">
                    {f.error_message || "Unknown error"}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{fmtDate(f.updated_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
