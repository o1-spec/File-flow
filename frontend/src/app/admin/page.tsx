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
import { OverviewTab } from "@/components/admin/OverviewTab";
import { FailedTab } from "@/components/admin/FailedTab";
import { DLQTab } from "@/components/admin/DLQTab";
import { UploadsTab } from "@/components/admin/UploadsTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { UploadDetailPanel } from "@/components/admin/UploadDetailPanel";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";
import { ChartBarIcon, ExclamationTriangleIcon, BriefcaseIcon, CircleStackIcon, UsersIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const ADMIN_UPLOADS_LIMIT = 50;

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [failed, setFailed] = useState<FailedUpload[]>([]);
  const [dlq, setDlq] = useState<DLQJob[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [tab, setTab] = useState<AdminTab>("overview");
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [replayMsg, setReplayMsg] = useState<string | null>(null);
  const [adminUploads, setAdminUploads] = useState<AdminUpload[]>([]);
  const [adminUploadsTotal, setAdminUploadsTotal] = useState(0);
  const [adminUploadsPage, setAdminUploadsPage] = useState(1);
  const [adminUploadsStatus, setAdminUploadsStatus] = useState("");
  const [adminUploadsLoading, setAdminUploadsLoading] = useState(false);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [detailUpload, setDetailUpload] = useState<AdminUploadDetail | null>(null);
  const [detailRawUrl, setDetailRawUrl] = useState<string | null>(null);
  const [detailProcessedUrl, setDetailProcessedUrl] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUpload | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("token")) { router.push("/login"); return; }
    if (localStorage.getItem("isAdmin") !== "1") router.push("/upload");
  }, [router]);

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
    } catch { /* ignored */ }
  }, []);

  const fetchDLQ = useCallback(async () => {
    try {
      const r = await api.getAdminDLQ();
      setDlq((r as Record<string, unknown>).dlq as DLQJob[]);
    } catch { /* ignored */ }
  }, []);

  const fetchAdminUploads = useCallback(async (page: number, status: string) => {
    setAdminUploadsLoading(true);
    try {
      const r = await api.getAdminUploads(page, ADMIN_UPLOADS_LIMIT, status || undefined);
      const res = r as Record<string, unknown>;
      setAdminUploads(res.uploads as AdminUpload[]);
      setAdminUploadsTotal(res.total as number);
    } catch { /* ignored */ }
    finally { setAdminUploadsLoading(false); }
  }, []);

  const fetchAdminUsers = useCallback(async () => {
    setAdminUsersLoading(true);
    try {
      const r = await api.getAdminUsers();
      setAdminUsers((r as Record<string, unknown>).users as AdminUser[]);
    } catch { /* ignored */ }
    finally { setAdminUsersLoading(false); }
  }, []);

  useEffect(() => {
    fetchMetrics();
    fetchFailed();
    fetchDLQ();
    const id = setInterval(() => fetchMetrics(), 5000);
    return () => clearInterval(id);
  }, [fetchMetrics, fetchFailed, fetchDLQ]);

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
    } catch { /* ignored */ }
    finally { setDetailLoading(false); }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.deleteAdminUpload(deleteTarget.id);
      setAdminUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setAdminUploadsTotal((t) => Math.max(0, t - 1));
      if (detailUpload?.id === deleteTarget.id) setDetailUpload(null);
    } catch { /* ignored */ }
    finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

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

  const tabs = [
    { id: "overview", name: "Overview", icon: ChartBarIcon, count: null },
    { id: "failed", name: "Failed Uploads", icon: ExclamationTriangleIcon, count: failed.length },
    { id: "dlq", name: "Dead-Letter Queue", icon: BriefcaseIcon, count: dlq.length },
    { id: "uploads", name: "Global Logs", icon: CircleStackIcon, count: adminUploadsTotal },
    { id: "users", name: "Users", icon: UsersIcon, count: adminUsers.length },
  ] as const;

  return (
    <div className="flex-1 flex flex-col p-6 max-w-350 mx-auto w-full pt-28 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">System Control</h1>
          <p className="text-gray-400 text-sm max-w-lg flex items-center gap-2">
            Global metrics, queue depth, and worker observability.
            {lastRefresh && (
              <span className="text-gray-500 text-xs tracking-wider">
                (Synced {ago(lastRefresh.toISOString())})
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => {
            fetchMetrics();
            fetchFailed();
            fetchDLQ();
            if (tab === "uploads") fetchAdminUploads(adminUploadsPage, adminUploadsStatus);
          }}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" /> Sync Now
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm flex items-start gap-2">
          <span className="mt-0.5">✕</span> {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 mb-8 border-b border-white/10 pb-0.5 no-scrollbar">
        {tabs.map(t => {
          const isActive = tab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as AdminTab)}
              className={`flex items-center gap-2 shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                isActive ? "text-white border-white" : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.name}
              {t.count !== null && t.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full ${
                  isActive ? "bg-white text-black" : "bg-white/10 text-gray-400"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Panel */}
      <div className="flex flex-col flex-1">
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
      </div>

      {detailUpload && (
        <UploadDetailPanel
          upload={detailUpload}
          onClose={() => setDetailUpload(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          email={deleteTarget.email}
          isDeleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
