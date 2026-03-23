export function StatusBadge({ status }: { status: string }) {
  if (status === "PROCESSED") return <span className="bg-white text-black px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Processed</span>;
  if (status === "FAILED") return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Failed</span>;
  if (status === "CREATED") return <span className="bg-white/10 text-white border border-white/20 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">Created</span>;
  return <span className="bg-white/5 border border-white/10 text-gray-300 animate-pulse px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase">{status}</span>;
}
