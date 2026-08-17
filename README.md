# ⚡️ FileFlow: Distributed Multimedia Pipeline Edge Router

**Live Demo:** https://fileflow-frontend.vercel.app/  
**Architecture Deep Dive:** [View ARCHITECTURE.md](./ARCHITECTURE.md)

FileFlow is a distributed, asynchronous file processing platform built to handle multimedia uploads (images, PDFs, videos) without bottlenecking the API gateway. It combines direct-to-storage presigned uploads, asynchronous Redis worker queues, and real-time Server-Sent Events (SSE) status updates.

---

## 🎯 The Problem It Solves

Traditional monolithic file upload pipelines process heavy file transformations directly on the API web server. Under heavy concurrent load:
- Large file uploads consume API thread bandwidth and memory.
- CPU-intensive tasks (image resizing, video transcoding, PDF manipulation) block incoming HTTP requests.
- Polling for job status wastes server resources.

**FileFlow solves this by decoupling ingestion from compute:**
1. **Direct Storage Ingestion:** The browser uploads file bytes directly to S3-compatible object storage via short-lived presigned PUT URLs, completely bypassing the API server for file transfers.
2. **Asynchronous Message Broker:** BullMQ and Redis route processing tasks to dedicated background worker processes with type-specific concurrency limits.
3. **Real-time Push Observability:** Server-Sent Events (SSE) push live state updates to the UI as workers claim, transform, and complete jobs.

---

## 🏗 System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                         │
│   /login  ·  /register  ·  /upload  ·  /uploads  ·  /admin      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP / Server-Sent Events (SSE)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express Backend API (:4000)                  │
│  Auth  · Presigned S3 URLs · Admin & DLQ APIs · SSE Stream      │
└────────┬──────────────────────────────────┬─────────────────────┘
         │ SQL (pg)                         │ BullMQ Jobs
         ▼                                  ▼
┌─────────────────┐              ┌──────────────────────────────┐
│   PostgreSQL    │              │        Redis (:6379)         │
│  users          │              │  image-processing queue      │
│  uploads        │              │  pdf-processing queue        │
└─────────────────┘              │  video-processing queue      │
                                 │  dlq (Dead Letter Queue)     │
                                 │  worker telemetry/heartbeats │
                                 └──────────────┬───────────────┘
                                                │ BullMQ Polling
                                                ▼
                                 ┌──────────────────────────────┐
                                 │    Standalone Worker Node    │
                                 │  imageProcessor (Sharp)      │
                                 │  pdfProcessor (pdf-lib)      │
                                 │  videoProcessor (FFmpeg)     │
                                 └──────────────┬───────────────┘
                                                │ GetObject / PutObject
                                                ▼
                                 ┌──────────────────────────────┐
                                 │   MinIO / S3-Compatible      │
                                 │  raw/{uploadId}/{file}       │
                                 │  processed/{uploadId}/output │
                                 └──────────────────────────────┘
```

### Request Lifecycle
1. **Initiate (`POST /uploads/start`)**: Frontend sends file metadata. The API creates a database row (`CREATED`) and returns an S3 presigned PUT URL.
2. **Direct Upload (`PUT <presignedUrl>`)**: The browser transfers the file payload directly to object storage (`raw/{uploadId}/{filename}`).
3. **Complete & Enqueue (`POST /uploads/complete`)**: The frontend notifies the API. The API verifies object existence in storage, updates status to `UPLOADED`, and enqueues a job into BullMQ.
4. **Worker Execution**: A worker node claims the job using an optimistic lock (`status = 'PROCESSING'`), streams the raw asset from storage, processes it, uploads the output (`processed/{uploadId}/output`), and marks status as `PROCESSED`.
5. **Real-time Push (`GET /uploads/:id/stream`)**: The API streams status transitions to the browser via SSE until completion or failure.

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Server-Sent Events (SSE).
- **Backend API:** Node.js, Express, PostgreSQL (`pg`), AWS SDK v3 (`@aws-sdk/client-s3`), JWT, bcrypt.
- **Task Queue & Telemetry:** Redis, BullMQ.
- **Background Worker:** Standalone Node.js process, Sharp (image processing), pdf-lib (PDF document processing), fluent-ffmpeg (video transcoding & thumbnail extraction).
- **Object Storage:** MinIO (local development) / Cloudflare R2 or AWS S3 (production).

---

## ⚙️ Environment Variables

### Backend (`Backend/.env`)
| Variable | Description | Example (Local) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5433/filepipeline` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | `http://localhost:9000` |
| `S3_REGION` | Storage region | `us-east-1` |
| `S3_ACCESS_KEY` | Storage access key ID | `minio` |
| `S3_SECRET_KEY` | Storage secret access key | `minio123` |
| `S3_BUCKET` | Storage bucket name | `filepipeline` |
| `JWT_SECRET` | Secret key for JWT signing | `super_secret_jwt_key_change_me` |
| `ADMIN_EMAILS` | Admin email allowlist | `admin@example.com` |
| `PORT` | API server port (optional) | `4000` |

### Worker (`worker/.env`)
| Variable | Description | Example (Local) |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5433/filepipeline` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `S3_ENDPOINT` | S3-compatible storage endpoint | `http://localhost:9000` |
| `S3_REGION` | Storage region | `us-east-1` |
| `S3_ACCESS_KEY` | Storage access key ID | `minio` |
| `S3_SECRET_KEY` | Storage secret access key | `minio123` |
| `S3_BUCKET` | Storage bucket name | `filepipeline` |
| `JWT_SECRET` | Secret key for auth verification | `super_secret_jwt_key_change_me` |
| `ADMIN_EMAILS` | Admin email allowlist | `admin@example.com` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Example (Local) |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:4000` |

---

## 🚀 Getting Started

Follow these steps to run the complete environment locally:

### 1. Boot up Infrastructure (PostgreSQL, Redis, MinIO)
```bash
docker-compose up -d
```

### 2. Start the Backend API (Terminal 1)
```bash
cd Backend
npm install
node init-db.js  # Initializes database tables
npm run dev
```

### 3. Start the Background Worker (Terminal 2)
```bash
cd worker
npm install
npm run dev
```

### 4. Start the Frontend Application (Terminal 3)
```bash
cd frontend
npm install
npm run dev
```

### 🎬 How to test
1. Open **[http://localhost:3000](http://localhost:3000)** and register an account.
2. On the `/upload` page, upload an image, PDF, or video to see the live SSE status stream.
3. Click the **Simulate Heavy Load** button to inject multiple concurrent files through the pipeline simultaneously.
4. View processed files and download them on the `/uploads` (My Files) page.

