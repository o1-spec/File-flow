"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ago } from "@/lib/formatters";
import {
  AdminMetrics,
  AdminUpload,
  AdminUploadDetail,
  AdminUser,
  DLQJob,
  FailedUpload,
  AdminTab,
} from "@/types/admin";
import {
  IconChart,
  IconWarning,
  IconDLQ,
  IconAllUploads,
  IconUsers,
} from "@/components/admin/AdminIcons";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { FailedTab } from "@/components/admin/FailedTab";
import { DLQTab } from "@/components/admin/DLQTab";
import { UploadsTab } from "@/components/admin/UploadsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { UploadDetailPanel } from "@/components/admin/UploadDetailPanel";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";

const ADMIN_UPLOADS_LIMIT = 50;

export default function AdminPage() {
  const router = useRouter();

  // ── Core data ──────────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const [dlq, setDlq] = useState<DLQJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // ── Tab ────────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<AdminTab>("overview");

  // ── DLQ replay ────────────────────────────────────────────────────────────
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replayMsg, setReplayMsg] = useState<string | null>(null);

  // ── All-uploads tab ────────────────────────────────────────────────────────
  const [adminUploads, setAdminUploads] = useState<AdminUpload[]>([]);
  const [adminUploadsTotal, setAdminUploadsTotal] = useState(0);
  const [adminUploadsPage, setAdminUploadsPage] = useState(1);
  const [adminUploadsStatus, setAdminUploadsStatus] = useState("");
  const [adminUploadsLoading, setAdminUploadsLoading] = useState(false);

  // ── Users tab ──────────────────────────────────────────────────────────────
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);

  // ── Upload detail slide-over ───────────────────────────────────────────────
  const [detailUpload, setDetailUpload] = useState<AdminUploadDetail | null>(null);
  const [detailRawUrl, setDetailRawUrl] = useState<string | null>(null);
  const [detailProcessedUrl, setDetailProcessedUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<AdminUpload | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    if (localStorage.getItem("isAdmin") !== "1") router.push("/upload");
  }, [router]);

  // ── Data fetchers ──────────────────────────────────────────────────────────
  const fetchMetrics = useCallback(async () => {
    try {
      const m = await api.getAdminMetrics();
      setMetrics(m as unknown as AdminMetrics);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setError((err?.error as string) || (err?.message as string) || "Failed to load metrics");
    }
  }, []);

  const fetchFailed = useCallback(async () => {
    try {
      const r = await api.getAdminFailed(50);
      setFailed((r as Record<string, unknown>).failed as FailedUpload[]);
    } catch { /* non-fatal */ }
  }, []);

  const fetchDLQ = useCallback(async () => {
    try {
      const r = await api.getAdminDLQ();
      setDlq((r as Record<string, unknown>).dlq as DLQJob[]);
    } catch { /* non-fatal */ }
  }, []);

  const fetchAdminUploads = useCallback(async (page: number, status: string) => {
    setAdminUploadsLoading(true);
    try {
      const r = await api.getAdminUploads(page, ADMIN_UPLOADS_LIMIT, status || undefined);
      const res = r as Record<string, unknown>;
      setAdminUploads(res.uploads as AdminUpload[]);
      setAdminUploadsTotal(res.total as number);
    } catch { /* non-fatal */ }
    finally { setAdminUploadsLoading(false); }
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    try {
      const r = await api.getAdminUsers();
      setAdminUsers((r as Record<string, unknown>).users as AdminUser[]);
    } catch { /* non-fatal */ }
    finally { setAdminUsersLoading(false); }
  }, []);

  // ── Initial load + auto-refresh every 5 s ─────────────────────────────────
  useEffect(() => {
    fetchMetrics();
    fetchFailed();
    fetchDLQ();
    const id = setInterval(() => fetchMetrics(), 5000);
    return () => clearInterval(id);
  }, [fetchMetrics, fetchFailed, fetchDLQ]);

  // ── DLQ replay ─────────────────────────────────────────────────────────────
  async function handleReplay(jobId: string) {
    setReplayingId(jobId);
    setReplayMsg(null);
    try {
      await api.replayDLQJob(jobId);
      setReplayMsg("Re-enqueued successfully ✓");
      fetchDLQ();
      fetchMetrics();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      setReplayMsg((err?.error as string) || "Replay failed");
    } finally {
      setReplayingId(null);
    }
  }

  // ── Upload detail ──────────────────────────────────────────────────────────
  async function openDetail(upload: AdminUpload) {
    setDetailLoading(true);
    setDetailUpload(null);
    setDetailRawUrl(null);
    setDetailProcessedUrl(null);
    try {
      const r = await api.getAdminUploadDetail(upload.id);
      const res = r as Record<string, unknown>;
      setDetailUpload(res.upload as AdminUploadDetail);
      setDetailRawUrl(res.rawUrl as string | null);
      setDetailProcessedUrl(res.processedUrl as string | null);
    } catch { /* show empty panel */ }
    finally { setDetailLoading(false); }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdminUpload(deleteTarget.id);
      setAdminUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setAdminUploadsTotal((t) => Math.max(0, t - 1));
      if (detailUpload?.id === deleteTarget.id) setDetailUpload(null);
    } catch { /* non-fatal */ }
    finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  // ── Tab switch ─────────────────────────────────────────────────────────────
  function handleTabChange(t: AdminTab) {
    setTab(t);
    if (t === "uploads") fetchAdminUploads(adminUploadsPage, adminUploadsStatus);
    if (t === "users") fetchAdminUsers();
  }

  function handleStatusChange(status: string) {
    setAdminUploadsStatus(status);
    setAdminUploadsPage(1);
    fetchAdminUploads(1, status);
  }

  function handlePageChange(page: number) {
    setAdminUploadsPage(page);
    fetchAdminUploads(page, adminUploadsStatus);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">
      {/* Page header */}
      <div className="admin-header">
        <div>
          <h2>System Dashboard</h2>
          <p className="subtitle">
            Queue depths · Worker health · Processing metrics · DLQ
            {lastRefresh && (
              <span className="admin-refresh-hint">
                {" "}· refreshed {ago(lastRefresh.toISOString())}
              </span>
            )}
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            fetchMetrics();
            fetchFailed();
            fetchDLQ();
            if (tab === "uploads")
              fetchAdminUploads(adminUploadsPage, adminUploadsStatus);
          }}
        >
          ↺ Refresh
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Tab bar */}
      <div className="admin-tabs">
        {(["overview", "failed", "dlq", "uploads", "users"] as const).map((t) => (
          <button
            key={t}
            className={`admin-tab${tab === t ? " active" : ""}`}
            onClick={() => handleTabChange(t)}
          >
            {t === "overview" && <><IconChart />Overview</>}
            {t === "failed" && (
              <><IconWarning />
                {`Failed Uploads${failed.length > 0 ? ` (${failed.length})` : ""}`}
              </>
            )}
            {t === "dlq" && (
              <><IconDLQ />
                {`Dead-Letter Queue${dlq.length > 0 ? ` (${dlq.length})` : ""}`}
              </>
            )}
            {t === "uploads" && (
              <><IconAllUploads />
                {`All Uploads${adminUploadsTotal > 0 ? ` (${adminUploadsTotal})` : ""}`}
              </>
            )}
            {t === "users" && (
              <><IconUsers />
                {`Users${adminUsers.length > 0 ? ` (${adminUsers.length})` : ""}`}
              </>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === "overview" && <OverviewTab metrics={metrics} />}
      {tab === "failed" && <FailedTab failed={failed} />}
      {tab === "dlq" && (
        <DLQTab
          dlq={dlq}
          replayingId={replayingId}
          replayMsg={replayMsg}
          onReplay={handleReplay}
        />
      )}
      {tab === "uploads" && (
        <UploadsTab
          uploads={adminUploads}
          total={adminUploadsTotal}
          page={adminUploadsPage}
          status={adminUploadsStatus}
          loading={adminUploadsLoading}
          onStatusChange={handleStatusChange}
          onPageChange={handlePageChange}
          onView={openDetail}
          onDelete={setDeleteTarget}
        />
      )}
      {tab === "users" && (
        <UsersTab
          users={adminUsers}
          loading={adminUsersLoading}
          onRefresh={fetchAdminUsers}
        />
      )}

      {/* Upload detail slide-over */}
      <UploadDetailPanel
        upload={detailUpload}
        rawUrl={detailRawUrl}
        processedUrl={detailProcessedUrl}
        loading={detailLoading}
        onClose={() => setDetailUpload(null)}
        onDelete={setDeleteTarget}
      />

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          target={deleteTarget}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
