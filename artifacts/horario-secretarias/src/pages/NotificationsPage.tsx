import { useState, useEffect } from "react";
import { Bell, Trash2, CheckCheck, CalendarCheck, Filter } from "lucide-react";
import { useNotifications, type AppNotification } from "@/context/NotificationContext";
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
  return (
    <div
      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all ${
        notif.read
          ? "bg-muted/30 border-border/40 opacity-70"
          : "bg-green-50 border-green-200"
      }`}
      onClick={() => { if (!notif.read) onMarkRead(); }}
      style={{ cursor: notif.read ? "default" : "pointer" }}
    >
      {!notif.read && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-green-500" />
      )}
      <div className={`mt-0.5 shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
        notif.read ? "bg-muted" : "bg-green-100"
      }`}>
        <CalendarCheck className={`w-4 h-4 ${notif.read ? "text-muted-foreground" : "text-green-600"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-bold uppercase tracking-wide ${
            notif.read ? "text-muted-foreground" : "text-green-600"
          }`}>
            Cupo disponible
          </span>
          <span className="text-xs text-muted-foreground">· {notif.sede}</span>
        </div>
        <p className={`text-sm font-semibold leading-snug ${notif.read ? "text-muted-foreground" : "text-foreground"}`}>
          {notif.course}
        </p>
        <p className={`text-xs mt-0.5 ${notif.read ? "text-muted-foreground" : "text-muted-foreground"}`}>
          {notif.day} {notif.time}
          {notif.cupos > 0 && (
            <span className={`ml-2 font-semibold ${notif.read ? "text-muted-foreground" : "text-green-700"}`}>
              · {notif.cupos} cupo{notif.cupos !== 1 ? "s" : ""} libre{notif.cupos !== 1 ? "s" : ""}
            </span>
          )}
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

export default function NotificationsPage() {
  const { horarioId, horario } = useHorario();
  const { notifications, removeNotification, markRead } = useNotifications();

  const horarioSedes = horario.sedesInfo?.map(s => s.name) ?? horario.sedes;

  const [sedeFilter, setSedeFilter] = useState<string>(() => {
    const lastSede = sessionStorage.getItem("horario-active-sede");
    if (lastSede && horarioSedes.includes(lastSede)) return lastSede;
    return horarioSedes[0] ?? "all";
  });

  useEffect(() => {
    if (sedeFilter === "all" && horarioSedes.length > 0) {
      const lastSede = sessionStorage.getItem("horario-active-sede");
      setSedeFilter(lastSede && horarioSedes.includes(lastSede) ? lastSede : horarioSedes[0]);
    }
  }, [horarioSedes]);

  const filtered = notifications.filter(n => {
    if (n.horarioId !== horarioId) return false;
    if (sedeFilter !== "all" && n.sede !== sedeFilter) return false;
    return true;
  });

  const unreadFiltered = filtered.filter(n => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-200 to-emerald-200 rounded-2xl flex items-center justify-center">
              <Bell className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Notificaciones</h1>
              <p className="text-sm text-muted-foreground">
                {horario.label}
                {sedeFilter !== "all" && ` · ${sedeFilter.split(" ").map((w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(" ")}`}
                {" — Cupos disponibles"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadFiltered > 0 && (
            <button
              onClick={() => filtered.filter(n => !n.read).forEach(n => markRead(n.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 transition-colors border border-green-200"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar leídas
            </button>
          )}
          {filtered.length > 0 && (
            <button
              onClick={() => filtered.forEach(n => removeNotification(n.id))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar todas
            </button>
          )}
        </div>
      </div>

      {unreadFiltered > 0 && (
        <div className="mb-4 px-4 py-2 rounded-2xl bg-green-50 border border-green-200 text-sm text-green-700 font-semibold">
          {unreadFiltered} cupo{unreadFiltered !== 1 ? "s" : ""} disponible{unreadFiltered !== 1 ? "s" : ""} sin revisar
        </div>
      )}

      {horarioSedes.length > 1 && (
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
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
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-muted/50 rounded-3xl flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-muted-foreground font-medium">Sin notificaciones</p>
          <p className="text-muted-foreground/70 text-sm mt-1">Aparecerán aquí cuando queden cupos disponibles en una clase.</p>
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
