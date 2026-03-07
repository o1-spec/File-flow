// Minimal API helper for the file-processing backend
// Attaches Authorization header from localStorage when available.

const BASE = 'http://localhost:4000';

function authHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function handleJSONResponse(res: Response) {
  const text = await res.text();
  let json: Record<string, unknown> = {};

  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    // body is not JSON
    if (!res.ok) throw { message: text || res.statusText };
    return {};
  }

  // Throw the parsed JSON so callers see { error: "..." } from the backend
  if (!res.ok) throw json;

  return json;
}

export async function register(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleJSONResponse(res);
}

export async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return handleJSONResponse(res);
}

export async function startUpload(payload: { filename: string; mimeType: string; size: number }) {
  const res = await fetch(`${BASE}/uploads/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  return handleJSONResponse(res);
}

export async function completeUpload(uploadId: string) {
  const res = await fetch(`${BASE}/uploads/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ uploadId }),
  });
  return handleJSONResponse(res);
}

export async function getUpload(uploadId: string) {
  const res = await fetch(`${BASE}/uploads/${encodeURIComponent(uploadId)}`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export async function getDownload(uploadId: string) {
  const res = await fetch(`${BASE}/uploads/${encodeURIComponent(uploadId)}/download`, {
    method: 'GET',
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export function logout() {
  if (typeof window !== 'undefined') localStorage.removeItem('token');
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminMetrics() {
  const res = await fetch(`${BASE}/admin/metrics`, {
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export async function getAdminFailed(limit = 50) {
  const res = await fetch(`${BASE}/admin/failed?limit=${limit}`, {
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export async function getAdminDLQ() {
  const res = await fetch(`${BASE}/admin/dlq`, {
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export async function replayDLQJob(jobId: string) {
  const res = await fetch(`${BASE}/admin/dlq/${encodeURIComponent(jobId)}/replay`, {
    method: 'POST',
    headers: { ...authHeaders() },
  });
  return handleJSONResponse(res);
}

export default {
  register,
  login,
  startUpload,
  completeUpload,
  getUpload,
  getDownload,
  logout,
  getAdminMetrics,
  getAdminFailed,
  getAdminDLQ,
  replayDLQJob,
};
