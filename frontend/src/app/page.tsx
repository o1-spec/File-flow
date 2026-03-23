import Link from "next/link";
import { 
  ServerIcon, 
  ShieldCheckIcon, 
  BoltIcon, 
  CpuChipIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] w-full bg-[#0a0a0a] text-white selection:bg-indigo-500/30 font-sans">
      
      <section className="relative flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/3 border border-white/10 text-xs font-medium text-gray-300 backdrop-blur-md mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            DevCareers × Raenest Hackathon 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-bold max-w-5xl tracking-tighter leading-[1.1] mb-6">
            Scale KYC & Media Pipelines <br className="hidden md:block" />
            <span className="text-gray-400">Without Crashing Your API</span>
          </h1>
          
          <p className="max-w-2xl text-lg text-gray-400 mb-10 leading-relaxed font-light">
            FileFlow is an enterprise architecture pattern for massive file uploads. Direct-to-S3 routing, asynchronous Redis worker queues, and real-time SSE observability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-lg">
            <Link href="/register" className="group flex items-center justify-center gap-2 h-12 px-6 rounded-lg bg-white text-black font-semibold hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Deploy Your Pipeline
              <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="flex items-center justify-center h-12 px-6 rounded-lg bg-white/5 text-white font-medium border border-white/10 hover:bg-white/10 transition-all">
              View Admin Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-10 relative z-10 w-full flex justify-center">
        <div className="w-full max-w-5xl backdrop-blur-md bg-white/2 border border-white/10 rounded-2xl grid grid-cols-2 md:grid-cols-4 p-8 gap-y-8 divide-x divide-white/5 shadow-2xl">
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl font-bold tracking-tight text-white mb-2">99.9%</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">Queue Delivery</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4">
            <div className="text-4xl font-bold tracking-tight text-white mb-2">&lt;50ms</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">SSE Latency</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 border-t border-white/5 md:border-t-0 mt-8 md:mt-0 pt-8 md:pt-0">
            <div className="text-4xl font-bold tracking-tight text-white mb-2">0B</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">Node Payload</div>
          </div>
          <div className="flex flex-col items-center justify-center text-center px-4 border-t border-white/5 md:border-t-0 mt-8 md:mt-0 pt-8 md:pt-0">
            <div className="text-4xl font-bold tracking-tight text-white mb-2">∞</div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-widest">File Size Limit</div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 mx-auto max-w-5xl w-full">
        <div className="mb-16 text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">Architecture That Scales</h2>
          <p className="text-gray-400 max-w-xl text-lg font-light leading-relaxed mx-auto md:mx-0">
            Stop blocking the Node.js event loop with massive file stream parsing. FileFlow offloads storage directly to S3 and relies entirely on decoupled Redis workers for CPU-intensive tasks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Box 1 */}
          <div className="md:col-span-2 flex flex-col justify-between bg-white/2 border border-white/10 rounded-3xl p-8 hover:bg-white/4 transition-colors group">
            <ShieldCheckIcon className="w-8 h-8 text-gray-400 mb-12 group-hover:text-white transition-colors" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Direct-to-S3 Presigned Uploads</h3>
              <p className="text-gray-400 font-light leading-relaxed text-sm">
                Bypass your Node server completely. Generate secure 15-minute presigned URLs allowing massive file streams straight to AWS/MinIO without API bottlenecking.
              </p>
            </div>
          </div>
          
          <div className="md:col-span-1 flex flex-col justify-between bg-white/2 border border-white/10 rounded-3xl p-8 hover:bg-white/4 transition-colors group">
            <BoltIcon className="w-8 h-8 text-gray-400 mb-12 group-hover:text-white transition-colors" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Real-time SSE</h3>
              <p className="text-gray-400 font-light leading-relaxed text-sm">
                Live Server-Sent Events push progress naturally to the UI without any polling latency.
              </p>
            </div>
          </div>

          <div className="md:col-span-1 flex flex-col justify-between bg-white/2 border border-white/10 rounded-3xl p-8 hover:bg-white/4 transition-colors group">
            <ServerIcon className="w-8 h-8 text-gray-400 mb-12 group-hover:text-white transition-colors" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">DLQ & Retries</h3>
              <p className="text-gray-400 font-light leading-relaxed text-sm">
                Dead Letter Queues automatically catch failing workflows to prevent dropped payloads or data loss.
              </p>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col justify-between bg-white/2 border border-white/10 rounded-3xl p-8 hover:bg-white/4 transition-colors group">
            <CpuChipIcon className="w-8 h-8 text-gray-400 mb-12 group-hover:text-white transition-colors" />
            <div>
              <h3 className="text-xl font-semibold text-white mb-2 tracking-tight">Background Queue Processing</h3>
              <p className="text-gray-400 font-light leading-relaxed text-sm">
                Enterprise-grade async processing powered by BullMQ & Redis. Image resizing, PDF extraction, and Video encoding happen securely in decoupled Worker nodes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 w-full flex flex-col items-center pt-24 pb-32 border-t border-white/5 bg-linear-to-b from-white/2 to-transparent">
        <h2 className="text-3xl md:text-5xl font-bold text-center tracking-tighter mb-6">
          Ready to integrate <span className="text-gray-500">FileFlow?</span>
        </h2>
        <p className="text-gray-400 text-lg mb-10 text-center max-w-md font-light leading-relaxed">
          Experience the enterprise-grade file pipeline built for developers. Secure, asynchronous, and remarkably fast.
        </p>
        <Link href="/register" className="group h-12 inline-flex items-center justify-center gap-2 px-8 rounded-full bg-white text-black font-semibold hover:bg-gray-200 transition-all">
          Start Building Now
          <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </section>

      <footer className="w-full pb-16 px-6 text-sm flex flex-col items-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center mb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-white font-bold text-2xl tracking-tighter">FileFlow</span>
          </div>
          <p className="text-gray-500 max-w-md mb-8 font-light leading-relaxed">
            The high-performance asynchronous file processing engine built for next-generation platforms.
          </p>
          <div className="flex justify-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" /></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer transition-colors">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" /></svg>
            </a>
          </div>
        </div>
        
        <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center text-gray-600 font-light border-t border-white/10 pt-8">
          <p className="mb-4 sm:mb-0">© 2026 FileFlow & DevCareers Hackathon.</p>
          <div className="flex gap-4">
            <span className="flex items-center gap-2 text-xs font-medium tracking-wide text-gray-500">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              All systems operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
