import { X, CalendarCheck } from "lucide-react";
import { useNotifications, type AppNotification } from "@/context/NotificationContext";

function ToastCard({ toast, onDismiss }: { toast: AppNotification; onDismiss: () => void }) {
  return (
    <div className="flex items-start gap-3 w-80 rounded-2xl border border-green-200 shadow-lg p-4 bg-green-50 animate-in slide-in-from-right-full duration-300">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl bg-green-100 flex items-center justify-center">
        <CalendarCheck className="w-4 h-4 text-green-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide">Cupo disponible</p>
          {toast.sede && (
            <span className="text-xs text-green-600/70">· {toast.sede}</span>
          )}
        </div>
        <p className="text-sm font-bold text-green-900 leading-tight">{toast.course}</p>
        <p className="text-xs text-green-700 mt-0.5">
          {toast.day} {toast.time}
          {toast.cupos > 0 && (
            <span className="ml-1 font-semibold">· {toast.cupos} cupo{toast.cupos !== 1 ? "s" : ""}</span>
          )}
        </p>
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
