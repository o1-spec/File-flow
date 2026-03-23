import { AdminUser } from "@/types/admin";
import { fmtDate } from "@/lib/formatters";
import { ArrowPathIcon, CheckBadgeIcon } from "@heroicons/react/24/outline";

export function UsersTab({ users, loading, onRefresh }: { users: AdminUser[]; loading: boolean; onRefresh: () => void }) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">
          {loading ? "Loading..." : `${users.length} Users`}
        </h3>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-1.5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/5 transition-colors">
          <ArrowPathIcon className="w-4 h-4" /> Refresh
        </button>
      </div>

      {users.length === 0 && !loading ? (
        <p className="p-12 text-center text-sm text-gray-500 border border-white/5 border-dashed rounded-xl">No users found.</p>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0a0a0a]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/2 border-b border-white/10 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">User ID</th>
                <th className="px-6 py-4 font-semibold">Email</th>
                <th className="px-6 py-4 font-semibold">Role</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-mono text-xs">{u.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-white font-medium">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(u as any).is_admin ? (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full border border-purple-400/20">
                        <CheckBadgeIcon className="w-3 h-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400">{fmtDate(u.joined_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
