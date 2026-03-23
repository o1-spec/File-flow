import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export function DeleteConfirmModal({ email, onConfirm, onCancel, isDeleting }: Props) {
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white tracking-tight">Revoke Access</h2>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 -mr-1 text-gray-500 hover:text-white rounded-full transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-400">
            Are you sure you want to revoke access for <span className="text-white font-medium">{email}</span>?
          </p>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-xs text-red-400">
              <strong>Warning:</strong> This action is irreversible. The user will be immediately logged out and their API tokens will be invalidated.
            </p>
          </div>
        </div>

        <div className="p-5 flex justify-end gap-3 bg-white/2 border-t border-white/10">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-500 transition-colors disabled:opacity-50 min-w-25"
          >
            {isDeleting ? "Revoking..." : "Revoke Access"}
          </button>
        </div>
      </div>
    </div>
  );
}
