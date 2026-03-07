import React from "react";
import { AdminMetrics, JobCounts, MetricBucket } from "@/types/admin";
import { fmt, fmtMs, fmtBytes, ago } from "@/lib/formatters";
import { IconImage, IconPDF, IconVideo, IconSkull } from "./AdminIcons";

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`aqc-stat${accent ? " accent" : ""}${danger ? " danger" : ""}`}>
      <span className="aqc-stat-val">{value}</span>
      <span className="aqc-stat-lbl">{label}</span>
    </div>
  );
}

// ── Queue card ────────────────────────────────────────────────────────────────
function QueueCard({
  icon,
  name,
  counts,
  completedFromMetrics,
  color,
}: {
  icon: React.ReactNode;
  name: string;
  counts: JobCounts;
  completedFromMetrics?: number;
  color: string;
}) {
  return (
    <div className="admin-queue-card" style={{ borderTopColor: color }}>
      <div className="aqc-name">
        {icon}
        {name}
      </div>
      <div className="aqc-stats">
        <Stat label="waiting" value={fmt(counts?.waiting)} />
        <Stat label="active" value={fmt(counts?.active)} accent />
        <Stat label="done" value={completedFromMetrics ?? 0} />
        <Stat label="failed" value={fmt(counts?.failed)} danger={counts?.failed > 0} />
      </div>
    </div>
  );
}

// ── Worker health banner ──────────────────────────────────────────────────────
function WorkerHealth({ worker }: { worker: AdminMetrics["worker"] }) {
  return (
    <div className={`admin-worker-health${worker.alive ? " alive" : " dead"}`}>
      <span className="awh-dot" />
      <div>
        <span className="awh-status">
          {worker.alive ? "Worker Online" : "Worker Offline"}
        </span>
        <span className="awh-seen">Last heartbeat: {ago(worker.lastSeen)}</span>
      </div>
    </div>
  );
}

// ── Metric table ──────────────────────────────────────────────────────────────
function MetricTable({ buckets }: { buckets: Record<string, MetricBucket> }) {
  const rows = Object.entries(buckets);
  if (rows.length === 0)
    return (
      <p className="admin-empty">No metrics yet — process a file first.</p>
    );

  return (
    <table className="admin-table">
      <thead>
        <tr>
          <th>Type</th>
          <th>Started</th>
          <th>Completed</th>
          <th>Failed</th>
          <th>Retried</th>
          <th>DLQ</th>
          <th>Avg Duration</th>
          <th>Avg File Size</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([type, b]) => (
          <tr key={type}>
            <td>
              <span className="admin-type-badge">{type}</span>
            </td>
            <td>{b.jobs_started}</td>
            <td className="green">{b.jobs_completed}</td>
            <td className={b.jobs_failed > 0 ? "red" : ""}>{b.jobs_failed}</td>
            <td className={b.jobs_retried > 0 ? "yellow" : ""}>{b.jobs_retried}</td>
            <td className={b.dlq_moved > 0 ? "red" : ""}>{b.dlq_moved}</td>
            <td>{fmtMs(b.avg_duration_ms)}</td>
            <td>{fmtBytes(b.avg_size_bytes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Overview tab ──────────────────────────────────────────────────────────────
export function OverviewTab({ metrics }: { metrics: AdminMetrics | null }) {
  const q = metrics?.queues;
  const w = metrics?.worker;
  const buckets = w?.metrics?.buckets ?? {};

  return (
    <>
      {w && <WorkerHealth worker={w} />}

      <div className="admin-section-title">Queue Depths</div>
      <div className="admin-queue-grid">
        <QueueCard
          icon={<IconImage />}
          name="Image"
          counts={q?.image!}
          completedFromMetrics={metrics?.worker.metrics?.buckets?.image?.jobs_completed}
          color="var(--accent)"
        />
        <QueueCard
          icon={<IconPDF />}
          name="PDF"
          counts={q?.pdf!}
          completedFromMetrics={metrics?.worker.metrics?.buckets?.pdf?.jobs_completed}
          color="#f59e0b"
        />
        <QueueCard
          icon={<IconVideo />}
          name="Video"
          counts={q?.video!}
          completedFromMetrics={metrics?.worker.metrics?.buckets?.video?.jobs_completed}
          color="#8b5cf6"
        />
        <QueueCard
          icon={<IconSkull />}
          name="DLQ"
          counts={q?.dlq!}
          color="var(--red)"
        />
      </div>

      <div className="admin-section-title" style={{ marginTop: 32 }}>
        Processing Metrics
        {w?.metrics?.capturedAt && (
          <span className="admin-section-hint">
            {" "}
            · snapshot from {ago(w.metrics.capturedAt)}
          </span>
        )}
      </div>
      <MetricTable buckets={buckets} />
    </>
  );
}
