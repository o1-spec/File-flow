# ⚡️ FileFlow: Distributed Multimedia Pipeline Edge Router 

A highly-concurrent, distributed file processing platform built from the ground up for massive throughput. FileFlow allows users to upload thousands of images, videos, and documents simultaneously and monitors their exact state natively in real-time as background worker nodes process the queue.

## 🏗 System Architecture

FileFlow relies on a distributed microservice architecture to allow the Gateway (Frontend/API) to remain entirely decoupled from the Heavy Compute (Workers).

1. **Next.js Edge Dashboard:** A reactive, polished Next.js interface utilizing Server-Sent Events (SSE) to natively track pipeline states (Queued, Uploading, Processing, Done) with sub-second latency.
2. **Express Edge Gateway:** Manages user authentication, generates S3 Presigned URLs for zero-bottleneck direct-to-storage uploads, and registers jobs securely into the task broker.
3. **BullMQ & Redis:** The lightning-fast asynchronous message broker linking the UI Gateway to the Compute Cluster.
4. **MinIO (S3 Compatible):** High-availability block storage containing the "Raw Ingest" and "Processed Outputs".
5. **Background Workers:** A fleet of parallel, deployable Node instances polling the Redis queue. They securely stream from S3, perform necessary processing operations, push the mutated delta back to S3, and mark job completion.

## 🚀 One-Click "Judge-Ready" Demo

Want to test it out? 

### 1. Boot up Infrastructure (Postgres, Redis, MinIO)
```bash
docker-compose up -d
```

### 2. Start the Backend API (Terminal 1)
```bash
cd backend
npm install
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

**🎬 How to evaluate**: Open **[http://localhost:3000](http://localhost:3000)** and register an account. On the Upload page, click the **Simulate Heavy Load** button. This will automatically inject multiple files into the ecosystem, immediately proving out the distributed S3 upload process, the Redis background queue parsing, the concurrent Node worker computation, and the real-time SSE frontend updates all simultaneously without manual file wrangling!

## 🛠 Hackathon Tech Stack

- **Frontend:** Next.js 15, Tailwind CSS, Built-in Real-time Server Sent Events (SSE).
- **Backend Edge:** Node.js, Express.js, Postgres (`pg`), AWS SDK.
- **Task Queue:** Redis, BullMQ.
- **Background Worker:** Standalone Node.js processes pulling directly from distributed streams.
- **Storage:** MinIO object storage.
