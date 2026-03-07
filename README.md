# ⚡ FileFlow — File Processing Pipeline

> **System Design Practice Project**
>
> A scalable, asynchronous file processing pipeline built to practice real-world distributed system design principles.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Worker Processing](#worker-processing)
- [Admin Panel](#admin-panel)
- [Running the Project](#running-the-project)
- [System Design Concepts Practiced](#system-design-concepts-practiced)
- [Future Improvements](#future-improvements)
- [Purpose](#purpose)

---

## Overview

The goal of this project is not just to build an application, but to practice applying system design principles in a working implementation:

- Asynchronous processing
- Queue-based architectures
- Object storage patterns
- Idempotency & retry mechanisms
- Worker services
- Separation of concerns
- Scalable processing pipelines
- Role-based access control
- Dead-letter queue handling
- Server-sent events for real-time status

The system allows users to upload files, process them asynchronously via background workers, and retrieve the processed outputs. Admins get a full operational dashboard for managing uploads, users, queues, and failed jobs.

This architecture mirrors real-world systems used by:

| Platform | Use Case |
|---|---|
| **YouTube** | Video transcoding pipeline |
| **Dropbox** | File preview generation |
| **Cloudinary** | Image transformation |
| **Google Photos** | Image processing pipelines |

---

## Architecture

The system follows a **queue-based asynchronous architecture**. Clients upload files directly to object storage while processing is handled independently by background workers.

```
┌─────────────┐
│   Browser   │  (Next.js frontend)
└──────┬──────┘
       │  REST + presigned PUT + SSE
       ▼
┌─────────────────┐
│   API Server    │  (Express / Node.js)
│  :4000          │
└──────┬──────────┘
       │  Presigned URL generation
       ▼
┌─────────────────┐
│  Object Storage │  (MinIO / S3-compatible)
│  :9000          │
└──────┬──────────┘
       │  Job enqueued on /uploads/complete
       ▼
┌──────────────────────────────┐
│  BullMQ Queues (Redis :6379) │
│  ┌──────────────────────┐    │
│  │  image-processing    │ c=10│
│  │  pdf-processing      │ c=5 │
│  │  video-processing    │ c=2 │
│  │  dlq (dead-letter)   │     │
│  └──────────────────────┘    │
└──────┬───────────────────────┘
       │  Job consumed
       ▼
┌──────────────────────────────┐
│  Worker Service              │
│  Sharp · pdf-lib · FFmpeg    │
└──────┬───────────────────────┘
       │  Uploads processed output + publishes metrics to Redis
       ▼
┌──────────────────────────────┐
│  Output Storage              │
│  processed/<uploadId>/...    │
└──────────────────────────────┘
```

---

## Key Architectural Decisions

### Direct-to-object-storage uploads
Files are uploaded directly to MinIO/S3 using **presigned URLs**, completely bypassing the API server for the file payload. This keeps the API server lightweight and avoids memory/bandwidth bottlenecks for large files.

### Queue-based processing with type routing
File processing tasks are pushed to **type-specific BullMQ queues** backed by Redis. Images, PDFs and videos each have their own queue with appropriate concurrency limits, and all consume from a shared worker process.

| Queue | Concurrency | Processor |
|---|---|---|
| `image-processing` | 10 | Sharp — resize, convert, compress |
| `pdf-processing` | 5 | pdf-lib — page count, compression, metadata |
| `video-processing` | 2 | FFmpeg — H.264/AAC 720p + thumbnail |
| `dlq` | — | Dead-letter holding queue |

### Dead-letter queue (DLQ)
Jobs that exhaust all retry attempts are moved to the DLQ instead of being silently dropped. Admins can inspect, replay, or discard them from the dashboard.

### Server-Sent Events (SSE) for real-time status
The upload page subscribes to `GET /uploads/:id/stream` which holds a persistent connection and pushes status-change events as they happen. This replaces the previous polling loop, reducing unnecessary database queries.

### Worker health & metrics via Redis
The worker publishes a heartbeat every 10 seconds (`worker:heartbeat` key, TTL 30s) and a full metrics snapshot every 10 seconds (`worker:metrics`, TTL 60s). The admin dashboard reads these to show live worker health and per-type processing statistics.

### Role-based admin access
Admin status is controlled server-side by the `ADMIN_EMAILS` environment variable — a comma-separated list of email addresses. On login, the API checks membership and embeds `isAdmin: true` in the JWT. Every admin route is protected by both `requireAuth` and `requireAdmin` middleware. The frontend additionally hides admin UI from non-admin sessions.

### S3 timeout wrapper
All S3 operations go through an `AbortController`-based wrapper (`s3WithTimeout.js`) with a configurable timeout (default 30s), preventing worker processes from hanging on a stalled storage connection.

---

## Features

### Authentication
JWT-based auth protects all upload and admin operations. Tokens expire after 1 hour.

| Endpoint | Body | Response |
|---|---|---|
| `POST /auth/register` | `{ email, password }` | `{ userId }` |
| `POST /auth/login` | `{ email, password }` | `{ token, isAdmin }` |

---

### File Upload Flow

#### 1 — Start Upload
```http
POST /uploads/start
Authorization: Bearer <token>

{ "filename": "photo.jpg", "mimeType": "image/jpeg", "size": 204800 }
```
Response includes a presigned `PUT` URL valid for 10 minutes.

#### 2 — Direct Upload to Storage
The client PUTs the file straight to the presigned URL — the API server never touches the bytes.

#### 3 — Complete Upload
```http
POST /uploads/complete
Authorization: Bearer <token>

{ "uploadId": "uuid" }
```
Verifies the object exists in MinIO, transitions `CREATED → UPLOADED`, enqueues the processing job.

#### 4 — Real-time Status via SSE
```http
GET /uploads/:id/stream?token=<jwt>
```
Holds a persistent connection. Pushes `{ upload }` on every status change and `{ done: true }` on terminal states (`PROCESSED` / `FAILED`). Closed automatically when processing finishes or the client disconnects.

#### 5 — Download Processed Output
```http
GET /uploads/:id/download
Authorization: Bearer <token>
```
Returns a 10-minute presigned download URL for the processed file.

---

### User Upload History (`/uploads`)

Logged-in users can view all their own uploads at `/uploads`:

- Full history table: filename, type badge, size, colour-coded status badge, upload date
- **Download** button for `PROCESSED` files (opens presigned URL)
- **Delete** button — confirmation modal → removes files from MinIO and the database row
- Empty state with CTA when no uploads exist
- Skeleton loader and bottom-right toast notifications

---

### Supported File Types

| Type | Accepted MIME types | Max size |
|---|---|---|
| Image | `image/png`, `image/jpeg` | 100 MB |
| Document | `application/pdf` | 100 MB |
| Video | `video/mp4`, `video/quicktime` | 100 MB |

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS v4 |
| **Backend** | Node.js, Express (ESM) |
| **Database** | PostgreSQL |
| **Queue** | Redis + BullMQ (3 typed queues + DLQ) |
| **Object Storage** | MinIO (S3-compatible, `@aws-sdk/client-s3`) |
| **Worker — Images** | Sharp (resize, format conversion) |
| **Worker — PDFs** | pdf-lib (page count, compression, metadata) |
| **Worker — Videos** | fluent-ffmpeg + @ffmpeg-installer/ffmpeg (H.264/AAC transcode + thumbnail) |
| **Auth** | bcrypt + jsonwebtoken (JWT) |
| **Real-time** | Server-Sent Events (SSE) |
| **Containerisation** | Docker, Docker Compose |

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | VARCHAR | Unique, lowercase |
| `password_hash` | VARCHAR | bcrypt (12 rounds) |
| `created_at` | TIMESTAMP | |

### `uploads`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `original_filename` | VARCHAR | |
| `mime_type` | VARCHAR | |
| `size_bytes` | BIGINT | |
| `status` | VARCHAR | See lifecycle below |
| `raw_key` | VARCHAR | MinIO path `raw/<id>/<filename>` |
| `processed_key` | VARCHAR | MinIO path `processed/<id>/...` |
| `error_message` | TEXT | Populated on failure |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Upload status lifecycle:**

```
CREATED → UPLOADED → PROCESSING → PROCESSED
                              ↘
                              FAILED → (DLQ if retries exhausted)
```

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | — | Register new user |
| `POST` | `/auth/login` | — | Login, returns JWT + isAdmin flag |

### Uploads (user)
| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/uploads/start` | User | Create upload session, get presigned PUT URL |
| `POST` | `/uploads/complete` | User | Mark upload done, enqueue processing job |
| `GET` | `/uploads/:id` | Owner | Get upload status |
| `GET` | `/uploads/:id/stream` | Owner (token param) | SSE stream of status changes |
| `GET` | `/uploads/:id/download` | Owner | Get presigned download URL |
| `GET` | `/uploads` | User | List all own uploads |
| `DELETE` | `/uploads/:id` | Owner | Delete upload + files from storage |

### Admin
| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/metrics` | Admin | Queue depths + worker health + processing metrics |
| `GET` | `/admin/failed` | Admin | Last 50 failed uploads from DB |
| `GET` | `/admin/dlq` | Admin | Inspect jobs in the dead-letter queue |
| `POST` | `/admin/dlq/:jobId/replay` | Admin | Re-enqueue a DLQ job |
| `GET` | `/admin/uploads` | Admin | All uploads (paginated, status filter) |
| `GET` | `/admin/uploads/:id` | Admin | Full upload detail + presigned raw & processed URLs |
| `DELETE` | `/admin/uploads/:id` | Admin | Hard delete upload + MinIO files + DB row |
| `GET` | `/admin/users` | Admin | All users with upload stats & storage usage |

---

## Worker Processing

The worker is a standalone Node.js process that consumes jobs from all three BullMQ queues simultaneously.

### Image processor (`imageProcessor.js`)
- Downloads raw file from MinIO
- Resizes to max 1920px, converts to WebP, quality 80
- Uploads to `processed/<uploadId>/output.webp`

### PDF processor (`pdfProcessor.js`)
- Loads PDF with `pdf-lib`
- Reads page count, saves with `useObjectStreams: true` (compression)
- Stamps producer metadata, uploads with `x-page-count` S3 metadata header
- Output: `processed/<uploadId>/output.pdf`

### Video processor (`videoProcessor.js`)
- Transcodes to H.264/AAC 720p with `-preset fast -crf 23 -movflags +faststart`
- Extracts thumbnail JPEG at 1-second mark
- Writes to `os.tmpdir()`, uploads both files, cleans up temp files
- Output: `processed/<uploadId>/output.mp4` + `processed/<uploadId>/thumbnail.jpg`

### Resilience
- Configurable retry attempts with exponential backoff
- On retry exhaustion → job moved to DLQ via `moveToDLQ()` shared module
- Worker publishes heartbeat + metrics snapshots to Redis every 10 seconds
- `s3WithTimeout` wrapper prevents indefinite hangs on S3 operations (30s default)

---

## Admin Panel

The admin dashboard (`/admin`) is accessible only to users whose email is listed in `ADMIN_EMAILS`. It has five tabs:

### Overview
- Worker online/offline indicator with last heartbeat timestamp
- Live queue depth cards: waiting / active / done / failed for each queue
- Processing metrics table: started, completed, failed, retried, DLQ moves, avg duration, avg file size per type

### Failed Uploads
- All uploads in `FAILED` status from the database
- Columns: filename, type, size, error message, failed timestamp

### Dead-Letter Queue
- All jobs currently in the DLQ
- Columns: upload ID, original queue, type, attempts made, error, failed timestamp
- **↺ Replay** button to re-enqueue a job

### All Uploads
- Every upload across all users, paginated (50/page)
- Status filter dropdown
- Columns: ID, user email, filename, type, size, status, uploaded date
- **View** button → opens upload detail slide-over panel
- **Delete** button → confirmation modal → hard deletes from MinIO + DB

### Users
- All registered users
- Columns: email, joined date, total / processed / failed uploads, storage used, last upload
- Failed count highlighted in red when > 0

### Upload Detail Slide-over
Clicking **View** on any upload row opens a right-side panel with:
- Full metadata: filename, uploader email, MIME type, size, status badge, timestamps, error message
- **Inline image preview** for raw and processed images
- **Video player** for processed videos
- **Download links** for raw and processed files (presigned 15-min URLs)
- **Delete button** to remove the upload

---

## Running the Project

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js ≥ 18

### 1 — Start infrastructure
```bash
docker compose up -d
```

Services started:

| Service | Port |
|---|---|
| PostgreSQL | `5432` |
| Redis | `6379` |
| MinIO | `9000` (API) / `9001` (console) |

### 2 — Configure environment

**`Backend/.env`**
```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fileflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_here
S3_BUCKET=fileflow
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
ADMIN_EMAILS=your@email.com
PORT=4000
```

**`worker/.env`**
```env
REDIS_URL=redis://localhost:6379
S3_BUCKET=fileflow
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fileflow
```

### 3 — Start the backend
```bash
cd Backend
npm install
npm run dev
```

API available at `http://localhost:4000`

### 4 — Start the worker
```bash
cd worker
npm install
node index.js
```

### 5 — Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`

### End-to-end test flow

1. Open `http://localhost:3000/register` → create a user
2. Go to `/login` → authenticate
3. Drop a PNG / JPG / PDF / MP4 file on the upload page
4. Watch the live SSE status: *Uploading → Uploaded → Processing → Processed*
5. Click **Download** to retrieve the processed output
6. Visit `/uploads` to see your full upload history
7. Log in as an admin email → visit `/admin` for the full operations dashboard

---

## System Design Concepts Practiced

| Concept | Implementation |
|---|---|
| **Asynchronous processing** | API returns immediately; worker processes in the background |
| **Queue-based architecture** | BullMQ + Redis decouples upload from processing |
| **Type-specific queues** | Separate queues per MIME category with independent concurrency |
| **Dead-letter queue** | Failed jobs preserved for inspection and replay |
| **Object storage patterns** | Presigned URLs for direct client ↔ storage transfers |
| **Worker services** | Standalone Node.js worker, horizontally scalable |
| **Server-Sent Events** | Real-time status push without polling; connection held until terminal state |
| **Idempotent operations** | Status transitions are guarded; deterministic storage keys |
| **Deterministic storage keys** | `raw/<id>/file`, `processed/<id>/output.*`, `processed/<id>/thumbnail.jpg` |
| **Retry & backoff strategies** | BullMQ job retries with exponential backoff |
| **Role-based access control** | `ADMIN_EMAILS` env var → `requireAdmin` middleware → JWT claim |
| **Worker observability** | Redis heartbeat + metrics snapshot published every 10s |
| **S3 timeout / circuit breaking** | AbortController wrapper on all S3 calls (30s default) |
| **Separation of concerns** | API, worker, storage and queue are fully independent layers |
| **Admin operational tooling** | Queue depths, worker health, DLQ replay, upload management, user stats |

---

## Future Improvements

- [ ] Soft delete (`deleted_at`) before hard delete
- [ ] Per-user storage quotas and plan enforcement (Free / Pro tiers)
- [ ] Webhook / email notification on job completion
- [ ] Search and filter on user upload history (`/uploads`)
- [ ] Audit log for admin actions (who deleted what, when)
- [ ] Worker autoscaling (e.g. KEDA on Kubernetes)
- [ ] CDN integration for processed file downloads
- [ ] Chunked / multipart uploads for files > 100 MB
- [ ] Prometheus metrics endpoint + Grafana dashboard
- [ ] OpenTelemetry distributed tracing across API → queue → worker
- [ ] Password reset / account settings pages

---

## Purpose

This project was built primarily for **system design learning and practice**.

It serves as a practical, working implementation of concepts studied in:

> 📖 *System Design Interview* — Alex Xu (Volume 1 & 2)

The goal is to move beyond theoretical understanding and build real distributed system components — from the queue worker to the presigned URL flow to the SSE status stream to the admin operations panel.

---

<div align="center">
  <sub>Built for learning · Inspired by YouTube, Dropbox, Cloudinary · Powered by BullMQ + MinIO + Sharp + FFmpeg + pdf-lib</sub>
</div>


---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Key Architectural Decisions](#key-architectural-decisions)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Worker Processing](#worker-processing)
- [Running the Project](#running-the-project)
- [System Design Concepts Practiced](#system-design-concepts-practiced)
- [Future Improvements](#future-improvements)
- [Purpose](#purpose)

---

## Overview

The goal of this project is not just to build an application, but to practice applying system design principles in a working implementation:

- Asynchronous processing
- Queue-based architectures
- Object storage patterns
- Idempotency & retry mechanisms
- Worker services
- Separation of concerns
- Scalable processing pipelines

The system allows users to upload files, process them asynchronously via background workers, and retrieve the processed outputs.

This architecture mirrors real-world systems used by:

| Platform | Use Case |
|---|---|
| **YouTube** | Video transcoding pipeline |
| **Dropbox** | File preview generation |
| **Cloudinary** | Image transformation |
| **Google Photos** | Image processing pipelines |

---

## Architecture

The system follows a **queue-based asynchronous architecture**. Clients upload files directly to object storage while processing is handled independently by background workers.

```
┌─────────────┐
│   Browser   │  (Next.js frontend)
└──────┬──────┘
       │  REST + presigned PUT
       ▼
┌─────────────────┐
│   API Server    │  (Express / Node.js)
│  :4000          │
└──────┬──────────┘
       │  Presigned URL generation
       ▼
┌─────────────────┐
│  Object Storage │  (MinIO / S3-compatible)
│  :9000          │
└──────┬──────────┘
       │  Job enqueued on /uploads/complete
       ▼
┌─────────────────┐
│  Queue          │  (Redis + BullMQ)
│  :6379          │
└──────┬──────────┘
       │  Job consumed
       ▼
┌─────────────────┐
│  Worker Service │  (Sharp image processing)
└──────┬──────────┘
       │  Uploads processed output
       ▼
┌─────────────────┐
│  Output Storage │  processed/<uploadId>/output.png
└─────────────────┘
```

---

## Key Architectural Decisions

### Direct-to-object-storage uploads
Files are uploaded directly to MinIO/S3 using **presigned URLs**, completely bypassing the API server for the file payload. This keeps the API server lightweight and avoids memory/bandwidth bottlenecks for large files.

### Queue-based processing
File processing tasks are pushed to a **BullMQ queue** backed by Redis and consumed asynchronously by workers. The API server and the worker service scale independently.

### Worker services
Workers are standalone Node.js processes that consume jobs from the queue and perform processing tasks (e.g. image resizing with Sharp). They can be horizontally scaled without touching the API layer.

### Deterministic storage keys
Each upload generates predictable, traceable storage paths:

```
raw/<uploadId>/<filename>          ← original file
processed/<uploadId>/output.png    ← processed output
```

This improves traceability, simplifies debugging, and enables idempotent re-processing.

---

## Features

### Authentication
JWT-based auth protects all upload operations.

| Endpoint | Body | Response |
|---|---|---|
| `POST /auth/register` | `{ email, password }` | `{ userId }` |
| `POST /auth/login` | `{ email, password }` | `{ token }` |

---

### File Upload Flow

#### 1 — Start Upload
Client requests an upload session from the API.

```http
POST /uploads/start
Authorization: Bearer <token>
Content-Type: application/json

{ "filename": "photo.jpg", "mimeType": "image/jpeg", "size": 204800 }
```

Response:
```json
{
  "uploadId": "uuid",
  "rawKey": "raw/uuid/photo.jpg",
  "presignedUrl": "https://...",
  "expiresInSeconds": 300
}
```

#### 2 — Direct Upload to Storage
The client PUTs the file straight to the presigned URL — the API server never touches the bytes.

```http
PUT <presignedUrl>
Content-Type: image/jpeg

<file binary>
```

#### 3 — Complete Upload
Client notifies the API that the upload is finished. This triggers a status update and enqueues a processing job.

```http
POST /uploads/complete
Authorization: Bearer <token>

{ "uploadId": "uuid" }
```

#### 4 — Asynchronous Processing
The worker service automatically:
1. Retrieves the raw file from MinIO
2. Processes it (e.g. resizes the image with Sharp)
3. Uploads the processed result to `processed/<uploadId>/output.png`
4. Updates the database status to `PROCESSED` (or `FAILED` on error)

#### 5 — Poll Status
```http
GET /uploads/:id
Authorization: Bearer <token>
```

#### 6 — Download Processed Output
```http
GET /uploads/:id/download
Authorization: Bearer <token>
```

Returns a short-lived presigned download URL for the processed file.

---

## Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript |
| **Backend** | Node.js, Express |
| **Database** | PostgreSQL |
| **Queue** | Redis + BullMQ |
| **Object Storage** | MinIO (S3-compatible) |
| **Worker Processing** | Sharp (image resizing) |
| **Containerisation** | Docker, Docker Compose |

---

## Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | VARCHAR | Unique |
| `password_hash` | VARCHAR | bcrypt |
| `created_at` | TIMESTAMP | |

### `uploads`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users |
| `original_filename` | VARCHAR | |
| `mime_type` | VARCHAR | |
| `size_bytes` | BIGINT | |
| `status` | VARCHAR | See below |
| `raw_key` | VARCHAR | MinIO path |
| `processed_key` | VARCHAR | MinIO path |
| `error_message` | TEXT | Populated on failure |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

**Upload status lifecycle:**

```
CREATED → UPLOADED → PROCESSING → PROCESSED
                              ↘
                              FAILED
```

---

## Worker Processing

Workers consume jobs from the BullMQ queue.

**Processing flow:**

```
1. Fetch upload record from DB
2. Lock status transition → PROCESSING
3. Download raw file from MinIO
4. Process with Sharp (resize / convert)
5. Upload processed file to MinIO
6. Update DB status → PROCESSED
```

**Resilience:**
- Configurable retry attempts
- Exponential backoff on failure
- `FAILED` status + `error_message` written on exhausted retries

---

## Running the Project

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Node.js ≥ 18

### 1 — Start infrastructure
```bash
docker compose up -d
```

Services started:

| Service | Port |
|---|---|
| PostgreSQL | `5432` |
| Redis | `6379` |
| MinIO | `9000` / `9001` (console) |

### 2 — Start the backend
```bash
cd backend
npm install
npm run dev
```

API available at `http://localhost:4000`

### 3 — Start the worker
```bash
cd worker
npm install
node index.js
```

Expected output:
```
Worker running: file-processing queue
```

### 4 — Start the frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend available at `http://localhost:3000`

### End-to-end test flow

1. Open `http://localhost:3000/register` → create a user
2. Go to `/login` → authenticate and get redirected to `/upload`
3. Pick a PNG / JPG / PDF / MP4 file and click **Start Upload**
4. Watch the step tracker: *Uploading → Uploaded → Processing → Processed*
5. Click **Download Processed File** to retrieve the output

---

## System Design Concepts Practiced

| Concept | Implementation |
|---|---|
| **Asynchronous processing** | API returns immediately; worker processes in the background |
| **Queue-based architecture** | BullMQ + Redis decouples upload from processing |
| **Object storage patterns** | Presigned URLs for direct client ↔ storage transfers |
| **Worker services** | Standalone Node.js worker, horizontally scalable |
| **Idempotent operations** | Status transitions are guarded; deterministic storage keys |
| **Deterministic storage keys** | `raw/<id>/file` and `processed/<id>/output.png` |
| **Retry & backoff strategies** | BullMQ job retries with exponential backoff |
| **Separation of concerns** | API, worker, storage and queue are fully independent layers |

---

## Future Improvements

- [ ] Video processing pipeline using FFmpeg
- [ ] PDF preview generation
- [ ] Multi-file batch processors
- [ ] Worker autoscaling (e.g. KEDA on Kubernetes)
- [ ] Dead-letter queues for failed jobs
- [ ] Observability: metrics (Prometheus) + tracing (OpenTelemetry)
- [ ] Rate limiting on upload endpoints
- [ ] Chunked / multipart uploads for large files
- [ ] CDN integration for processed file downloads
- [ ] Webhook notifications on job completion

---

## Purpose

This project was built primarily for **system design learning and practice**.

It serves as a practical, working implementation of concepts studied in:

> 📖 *System Design Interview* — Alex Xu (Volume 1 & 2)

The goal is to move beyond theoretical understanding and build real distributed system components — from the queue worker to the presigned URL flow to the status polling loop.

---

<div align="center">
  <sub>Built for learning · Inspired by YouTube, Dropbox, Cloudinary · Powered by BullMQ + MinIO + Sharp</sub>
</div>
