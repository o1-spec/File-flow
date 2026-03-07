export interface JobCounts {
  waiting: number;
  active: number;
  failed: number;
  completed: number;
  delayed?: number;
}

export interface MetricBucket {
  jobs_started: number;
  jobs_completed: number;
  jobs_failed: number;
  jobs_retried: number;
  dlq_moved: number;
  avg_duration_ms: number;
  avg_size_bytes: number;
}

export interface AdminMetrics {
  queues: {
    image: JobCounts;
    pdf: JobCounts;
    video: JobCounts;
    dlq: JobCounts;
  };
  worker: {
    alive: boolean;
    lastSeen: string | null;
    metrics: {
      capturedAt: string;
      buckets: Record<string, MetricBucket>;
    } | null;
  };
}

export interface FailedUpload {
  id: string;
  user_id: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  error_message: string;
  created_at: string;
  updated_at: string;
}

export interface DLQJob {
  dlqJobId: string;
  originalQueue: string;
  uploadId: string;
  mimeType: string;
  failedAt: string;
  errorMessage: string;
  attemptsMade: number;
}

export interface AdminUpload {
  id: string;
  email: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminUploadDetail extends AdminUpload {
  raw_key: string | null;
  processed_key: string | null;
  user_email: string;
}

export interface AdminUser {
  id: string;
  email: string;
  joined_at: string;
  total_uploads: number;
  processed_uploads: number;
  failed_uploads: number;
  storage_bytes: number;
  last_upload_at: string | null;
}

export const ALL_STATUSES = ["CREATED", "UPLOADED", "PROCESSING", "PROCESSED", "FAILED"] as const;

export type AdminTab = "overview" | "failed" | "dlq" | "uploads" | "users";
