import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)]"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-lg border shadow-2xl backdrop-blur-md transition-all ${
            toast.type === 'success'
              ? 'bg-[#1D1A16]/95 border-[#C8A96A]/40 text-[#F4EFE6]'
              : toast.type === 'error'
                ? 'bg-[#261614]/95 border-[#D67C6E]/50 text-[#F4EFE6]'
                : 'bg-[#1A1714]/95 border-[#2E2822] text-[#F4EFE6]'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-[#C8A96A] shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-[#E08A7B] shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-4 h-4 text-[#B8AFA2] shrink-0 mt-0.5" />
          )}
          <p className="text-sm leading-snug flex-1">{toast.message}</p>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="text-[#857B6E] hover:text-[#F4EFE6] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
