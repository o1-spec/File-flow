import { AdminUpload } from "@/types/admin";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { StatusBadge } from "@/components/StatusBadge";
import { fmtDate } from "@/lib/formatters";

interface Props {
  upload: AdminUpload;
  onClose: () => void;
}

export function UploadDetailPanel({ upload, onClose }: Props) {
  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-120 bg-[#0a0a0a] border-l border-white/10 shadow-2xl shadow-black/50 z-50 flex flex-col transform transition-transform duration-300 animate-in slide-in-from-right">
      <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight break-all">{upload.original_filename}</h2>
          <p className="text-sm font-mono text-gray-500 mt-1">{upload.id}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Status */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Status</h3>
          <div className="bg-white/2 border border-white/5 rounded-lg p-4 flex items-center justify-between">
            <StatusBadge status={upload.status} />
            <span className="text-sm text-gray-400">{fmtDate(upload.created_at)}</span>
          </div>
        </section>

        {/* User Info */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">User</h3>
          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-300">{upload.email}</span>
            </div>
          </div>
        </section>

        {/* Processing Details */}
        <section>
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Processing Details</h3>
          <div className="bg-white/2 border border-white/5 rounded-lg p-4 space-y-3">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-gray-500">MIME Type</span>
              <span className="text-gray-300 bg-white/5 w-fit px-2 py-0.5 rounded text-xs font-mono">{upload.mime_type}</span>
            </div>
            {(upload as any).processed_url && (
              <div className="flex flex-col gap-1 text-sm mt-3 pt-3 border-t border-white/10">
                <span className="text-gray-500">Processed URL</span>
                <a href={(upload as any).processed_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline break-all text-xs">
                  {(upload as any).processed_url}
                </a>
              </div>
            )}
            {upload.error_message && (
              <div className="flex flex-col gap-1 text-sm mt-3 pt-3 border-t border-red-500/20">
                <span className="text-red-500 font-medium">Error Message</span>
                <span className="text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20 wrap-break-word font-mono text-xs">
                  {upload.error_message}
                </span>
              </div>
            )}
            {(upload as any).metadata && typeof (upload as any).metadata === 'object' && Object.keys((upload as any).metadata).length > 0 && (
              <div className="flex flex-col gap-1 text-sm mt-3 pt-3 border-t border-white/10">
                <span className="text-gray-500 mb-1">Metadata</span>
                <pre className="text-xs text-gray-400 bg-black/40 p-3 rounded-lg border border-white/5 overflow-x-auto">
                  {JSON.stringify((upload as any).metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
