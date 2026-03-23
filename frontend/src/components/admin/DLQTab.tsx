import { DLQJob } from "@/types/admin";
import { fmtDate } from "@/lib/formatters";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

interface DLQTabProps {
  dlq: DLQJob[];
  replayingId: string | null;
  replayMsg: string | null;
  onReplay: (jobId: string) => void;
}

export function DLQTab({ dlq, replayingId, replayMsg, onReplay }: DLQTabProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-white">Dead-Letter Queue</h3>
        {replayMsg && (
          <div className={`px-3 py-1.5 text-xs rounded-lg border ${
            replayMsg.includes("success") ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
          }`}>
            {replayMsg}
          </div>
        )}
      </div>

      {dlq.length === 0 ? (
        <div className="p-12 text-center border border-white/5 border-dashed rounded-xl bg-white/1">
          <p className="text-sm text-gray-500 m-0">The DLQ is empty.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 overflow-hidden overflow-x-auto bg-[#0a0a0a]">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white/2 border-b border-white/10 tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Job ID</th>
                <th className="px-6 py-4 font-semibold">Queue</th>
                <th className="px-6 py-4 font-semibold">Error Message</th>
                <th className="px-6 py-4 font-semibold">Failed At</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {dlq.map((j) => (
                <tr key={j.dlqJobId} className="hover:bg-white/2 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono text-xs">{j.dlqJobId}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-mono text-gray-300">{j.originalQueue}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs text-red-400 text-xs truncate px-2 py-1 bg-red-400/10 border border-red-400/20 rounded" title={j.errorMessage}>
                      {j.errorMessage}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">{fmtDate(j.failedAt)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                      disabled={replayingId === j.dlqJobId}
                      onClick={() => onReplay(j.dlqJobId)}
                    >
                      {replayingId === j.dlqJobId ? (
                        <><ArrowPathIcon className="w-3 h-3 animate-spin" /> Replaying...</>
                      ) : (
                        <><ArrowPathIcon className="w-3 h-3" /> Replay</>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
