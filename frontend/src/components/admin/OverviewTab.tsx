import React from "react";
import { AdminMetrics, JobCounts, MetricBucket } from "@/types/admin";
import { fmt, fmtMs, fmtBytes, ago } from "@/lib/formatters";
import { PhotoIcon, DocumentIcon, VideoCameraIcon, BugAntIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

function Stat({ label, value, accent, danger }: { label: string; value: number | string; accent?: boolean; danger?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-xl font-semibold tracking-tight ${danger ? "text-red-400" : accent ? "text-white" : "text-gray-300"}`}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mt-0.5">{label}</span>
    </div>
  );
}

function QueueCard({
  icon: Icon, name, counts, completedFromMetrics,
}: {
  icon: any; name: string; counts: JobCounts; completedFromMetrics?: number;
}) {
  return (
    <div className="flex flex-col p-6 rounded-xl border border-white/10 bg-[#0a0a0a]">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="p-2 rounded bg-white/5 text-gray-400"><Icon className="w-5 h-5" /></div>
        <span className="text-sm font-semibold text-white tracking-wide">{name}</span>
      </div>
      <div className="grid grid-cols-2 gap-y-6 gap-x-4">
        <Stat label="Waiting" value={fmt(counts?.waiting)} />
        <Stat label="Active" value={fmt(counts?.active)} accent />
        <Stat label="Done" value={completedFromMetrics ?? 0} />
        <Stat label="Failed" value={fmt(counts?.failed)} danger={counts?.failed > 0} />
      </div>
    </div>
  );
}

function WorkerHealth({ worker }: { worker: AdminMetrics["worker"] }) {
  return (
    <div className={`mb-8 p-4 rounded-xl border flex items-center gap-4 ${
      worker.alive ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"
    }`}>
      {worker.alive ? <CheckCircleIcon className="w-6 h-6 text-green-500" /> : <XCircleIcon className="w-6 h-6 text-red-500" />}
      <div className="flex flex-col">
        <span className={`text-sm font-semibold ${worker.alive ? "text-green-500" : "text-red-500"}`}>
          {worker.alive ? "Worker Online" : "Worker Offline"}
        </span>
        <span className="text-xs text-gray-400">Last heartbeat: {ago(worker.lastSeen)}</span>
      </div>
    </div>
  );
}

function MetricTable({ buckets }: { buckets: Record<string, MetricBucket> }) {
  const rows = Object.entries(buckets);
  if (rows.length === 0)
    return <p className="p-12 text-center text-sm text-gray-500 border border-white/5 border-dashed rounded-xl">No metrics yet.</p>;

  return (
    <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#0a0a0a]">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-white/2 border-b border-white/10 tracking-wider">
          <tr>
            <th className="px-6 py-4 font-semibold">Type</th>
            <th className="px-6 py-4 font-semibold">Started</th>
            <th className="px-6 py-4 font-semibold">Completed</th>
            <th className="px-6 py-4 font-semibold">Failed</th>
            <th className="px-6 py-4 font-semibold">Retried</th>
            <th className="px-6 py-4 font-semibold">DLQ</th>
            <th className="px-6 py-4 font-semibold">Avg Duration</th>
            <th className="px-6 py-4 font-semibold">Avg Size</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map(([type, b]) => (
            <tr key={type} className="hover:bg-white/2 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] uppercase font-mono text-gray-300">{type}</span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-300 font-mono">{b.jobs_started}</td>
              <td className="px-6 py-4 whitespace-nowrap text-white font-mono">{b.jobs_completed}</td>
              <td className={`px-6 py-4 whitespace-nowrap font-mono ${b.jobs_failed > 0 ? "text-red-400" : "text-gray-400"}`}>{b.jobs_failed}</td>
              <td className={`px-6 py-4 whitespace-nowrap font-mono ${b.jobs_retried > 0 ? "text-yellow-400" : "text-gray-400"}`}>{b.jobs_retried}</td>
              <td className={`px-6 py-4 whitespace-nowrap font-mono ${b.dlq_moved > 0 ? "text-red-400" : "text-gray-400"}`}>{b.dlq_moved}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono">{fmtMs(b.avg_duration_ms)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-400 font-mono">{fmtBytes(b.avg_size_bytes)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function OverviewTab({ metrics }: { metrics: AdminMetrics | null }) {
  const q = metrics?.queues;
  const w = metrics?.worker;
  const buckets = w?.metrics?.buckets ?? {};

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
      {w && <WorkerHealth worker={w} />}

      <div>
        <h3 className="text-lg font-semibold tracking-tight text-white mb-4">Queue Depths</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QueueCard icon={PhotoIcon} name="Image" counts={q?.image!} completedFromMetrics={buckets?.image?.jobs_completed} />
          <QueueCard icon={DocumentIcon} name="PDF" counts={q?.pdf!} completedFromMetrics={buckets?.pdf?.jobs_completed} />
          <QueueCard icon={VideoCameraIcon} name="Video" counts={q?.video!} completedFromMetrics={buckets?.video?.jobs_completed} />
          <QueueCard icon={BugAntIcon} name="DLQ" counts={q?.dlq!} completedFromMetrics={0} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-3 mb-4">
          <h3 className="text-lg font-semibold tracking-tight text-white">Processing Metrics</h3>
          {w?.metrics?.capturedAt && <span className="text-xs text-gray-500 uppercase tracking-widest">(Snapshot {ago(w.metrics.capturedAt)})</span>}
        </div>
        <MetricTable buckets={buckets} />
      </div>
    </div>
  );
}
