import { useState } from "react";
import { Bell, Trash2, CheckCheck, UserMinus, CalendarCheck, Filter } from "lucide-react";
import { useNotifications, type AppNotification, type NotifType } from "@/context/NotificationContext";
import { useHorario } from "@/context/HorarioContext";

function formatTimestamp(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotifCard({ notif, onRemove, onMarkRead }: {
  notif: AppNotification;
  onRemove: () => void;
  onMarkRead: () => void;
}) {
  const isElim = notif.type === "alumno_eliminado";

  return (
    <div
      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all ${
        notif.read
          ? "bg-muted/30 border-border/40 opacity-70"
          : isElim
            ? "bg-red-50 border-red-200"
            : "bg-green-50 border-green-200"
      }`}
      onClick={() => { if (!notif.read) onMarkRead(); }}
      style={{ cursor: notif.read ? "default" : "pointer" }}
    >
      {!notif.read && (
        <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isElim ? "bg-red-500" : "bg-green-500"}`} />
      )}
      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
        notif.read ? "bg-muted" : isElim ? "bg-red-100" : "bg-green-100"
      }`}>
        {isElim
          ? <UserMinus className={`w-4 h-4 ${notif.read ? "text-muted-foreground" : "text-red-600"}`} />
          : <CalendarCheck className={`w-4 h-4 ${notif.read ? "text-muted-foreground" : "text-green-600"}`} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold uppercase tracking-wide ${
            notif.read ? "text-muted-foreground" : isElim ? "text-red-600" : "text-green-600"
          }`}>
            {notif.type === "alumno_eliminado" ? "Alumno eliminado" : "Cupo disponible"}
          </span>
          <span className="text-xs text-muted-foreground">· {notif.sede}</span>
        </div>
        <p className={`text-sm font-semibold leading-snug ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
          {notif.message}
        </p>
        <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(notif.timestamp)}</p>
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove(); }}
        className="shrink-0 p-1.5 rounded-lg hover:bg-red-100 text-muted-foreground hover:text-red-600 transition-colors"
        title="Eliminar notificación"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

const TYPE_OPTIONS: { value: NotifType | "all"; label: string }[] = [
  { value: "all", label: "Todos los tipos" },
  { value: "alumno_eliminado", label: "Alumno eliminado" },
  { value: "cupo_disponible", label: "Cupo disponible" },
];

export default function NotificationsPage() {
  const { horarioId, horario } = useHorario();
  const { notifications, unreadCount, removeNotification, markRead, markAllRead, clearAll } = useNotifications();
  const [typeFilter, setTypeFilter] = useState<NotifType | "all">("all");
  const [sedeFilter, setSedeFilter] = useState<string>("all");

  const horarioSedes = horario.sedesInfo?.map(s => s.name) ?? horario.sedes;

  const filtered = notifications.filter(n => {
    if (n.horarioId !== horarioId) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (sedeFilter !== "all" && n.sede !== sedeFilter) return false;
    return true;
  });

  const unreadFiltered = filtered.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Notificaciones</h1>
              <p className="text-sm text-muted-foreground">{horario.label}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar leídas
            </button>
          )}
          {notifications.filter(n => n.horarioId === horarioId).length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar todas
            </button>
          )}
        </div>
      </div>

      {unreadFiltered > 0 && (
        <div className="mb-4 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/20 text-sm text-primary font-semibold">
          {unreadFiltered} notificación{unreadFiltered !== 1 ? "es" : ""} sin leer
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as NotifType | "all")}
          className="text-xs border border-border rounded-xl px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {TYPE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {horarioSedes.length > 1 && (
          <select
            value={sedeFilter}
            onChange={e => setSedeFilter(e.target.value)}
            className="text-xs border border-border rounded-xl px-3 py-1.5 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Todas las sedes</option>
            {horarioSedes.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-3xl flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-medium">Sin notificaciones</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Las notificaciones aparecerán aquí cuando se eliminen alumnos o queden cupos disponibles.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <NotifCard
              key={n.id}
              notif={n}
              onRemove={() => removeNotification(n.id)}
              onMarkRead={() => markRead(n.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
