import { X, CalendarCheck } from "lucide-react";
import { useNotifications, type AppNotification } from "@/context/NotificationContext";

function ToastCard({ toast, onDismiss }: { toast: AppNotification; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 w-72 rounded-2xl border border-green-200 shadow-lg p-3.5 bg-green-50 animate-in slide-in-from-right-full duration-300">
      <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
        <CalendarCheck className="w-3.5 h-3.5 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide leading-none mb-1">
          Cupo disponible{toast.sede ? ` · ${toast.sede}` : ""}
        </p>
        <p className="text-sm font-bold text-green-900 font-mono leading-tight tracking-wide">
          {toast.classCode || toast.message}
        </p>
        {toast.cupos > 0 && (
          <p className="text-xs text-green-700 mt-0.5">
            {toast.cupos} cupo{toast.cupos !== 1 ? "s" : ""} libre{toast.cupos !== 1 ? "s" : ""}
          </p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 rounded-lg hover:bg-green-100 text-green-500 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
