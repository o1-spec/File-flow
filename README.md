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
