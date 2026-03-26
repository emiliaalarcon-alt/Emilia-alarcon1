import { X, UserMinus, CalendarCheck } from "lucide-react";
import { useNotifications, type AppNotification } from "@/context/NotificationContext";

function ToastCard({ toast, onDismiss }: { toast: AppNotification; onDismiss: () => void }) {
  const isElim = toast.type === "alumno_eliminado";

  return (
    <div
      className={`flex items-start gap-3 w-80 rounded-2xl border shadow-lg p-4 bg-card animate-in slide-in-from-right-full duration-300 ${
        isElim
          ? "border-red-200 bg-red-50"
          : "border-green-200 bg-green-50"
      }`}
    >
      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
        isElim ? "bg-red-100" : "bg-green-100"
      }`}>
        {isElim
          ? <UserMinus className="w-4 h-4 text-red-600" />
          : <CalendarCheck className="w-4 h-4 text-green-600" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold leading-tight ${isElim ? "text-red-800" : "text-green-800"}`}>
          {toast.title}
        </p>
        <p className={`text-xs mt-0.5 leading-snug ${isElim ? "text-red-700" : "text-green-700"}`}>
          {toast.message}
        </p>
      </div>
      <button
        onClick={onDismiss}
        className={`shrink-0 p-1 rounded-lg transition-colors ${
          isElim ? "hover:bg-red-100 text-red-500" : "hover:bg-green-100 text-green-500"
        }`}
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
