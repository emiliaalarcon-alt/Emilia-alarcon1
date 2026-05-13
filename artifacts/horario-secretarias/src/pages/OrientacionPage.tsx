import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Settings,
  User, CalendarDays, Clock, Check, AlertCircle, Pencil,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import { useCurrentUser } from "@/context/UserContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Orientadora {
  id: number; nombre: string; titulo: string; fotoUrl: string;
  activa: number; orden: number;
}

interface HorarioSlot {
  id: number; orientadoraId: number; diaSemana: string; horaInicio: string; activo: number;
}

interface Bloqueo {
  id: number; orientadoraId: number; fechaInicio: string; fechaFin: string;
  horaInicio: string | null; motivo: string | null;
}

interface Cita {
  id: number; orientadoraId: number; nombreEstudiante: string;
  agendadoPor: string; fecha: string; horaInicio: string;
  motivo: string | null; estadoConfirma: string; estadoAsiste: string;
}

interface Slot {
  fecha: string; horaInicio: string;
  status: "available" | "booked" | "blocked";
  cita?: Cita;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DAY_SHORT: Record<string, string> = {
  lunes: "Lun", martes: "Mar", miercoles: "Mié",
  jueves: "Jue", viernes: "Vie", sabado: "Sáb",
};
const CONFIRM_OPTS = ["pendiente","confirma","reagenda","cancela","osorno"];
const ASISTE_OPTS = ["pendiente","asiste","no asiste"];
const CONFIRM_COLORS: Record<string,string> = {
  pendiente: "bg-yellow-100 text-yellow-800",
  confirma:  "bg-green-100 text-green-800",
  reagenda:  "bg-blue-100 text-blue-800",
  cancela:   "bg-red-100 text-red-800",
  osorno:    "bg-purple-100 text-purple-800",
};
const ASISTE_COLORS: Record<string,string> = {
  pendiente:  "bg-gray-100 text-gray-600",
  asiste:     "bg-emerald-100 text-emerald-700",
  "no asiste":"bg-rose-100 text-rose-700",
};

function padZ(n: number) { return String(n).padStart(2, "0"); }
function dateStr(y: number, m: number, d: number) {
  return `${y}-${padZ(m)}-${padZ(d)}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }

interface WeekGroup {
  label: string;
  days: { date: string; dayName: string; dow: string; slots: Slot[] }[];
}

function buildWeeks(year: number, month: number, slots: Slot[]): WeekGroup[] {
  const byDate: Record<string, Slot[]> = {};
  for (const s of slots) {
    if (!byDate[s.fecha]) byDate[s.fecha] = [];
    byDate[s.fecha].push(s);
  }

  const totalDays = daysInMonth(year, month);
  const weeks: WeekGroup[] = [];
  let weekStart = 1;

  while (weekStart <= totalDays) {
    const firstDate = new Date(year, month - 1, weekStart);
    const startDow = firstDate.getDay();
    const daysToSunday = startDow === 0 ? 6 : 7 - startDow;
    const weekEnd = Math.min(weekStart + daysToSunday, totalDays);

    const days: WeekGroup["days"] = [];
    for (let d = weekStart; d <= weekEnd; d++) {
      const dt = dateStr(year, month, d);
      const daySlots = (byDate[dt] || []).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      if (daySlots.length > 0) {
        const date = new Date(year, month - 1, d);
        const DOW_NAMES = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
        days.push({ date: dt, dayName: `${DAY_SHORT[DOW_NAMES[date.getDay()]] ?? DOW_NAMES[date.getDay()]} ${d}`, dow: DOW_NAMES[date.getDay()], slots: daySlots });
      }
    }

    if (days.length > 0) {
      const sd = weekStart;
      const ed = weekEnd;
      weeks.push({ label: `Semana del ${sd} al ${ed} de ${MONTH_NAMES[month - 1]}`, days });
    }
    weekStart = weekEnd + 1;
  }
  return weeks;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ label, color }: { label: string; color: string }) {
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${color}`}>{label}</span>;
}

function Select({
  value, options, onChange, color,
}: { value: string; options: string[]; onChange: (v: string) => void; color: Record<string,string> }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer ${color[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({
  fecha, hora, orientadoraNombre, agendadoPor,
  onConfirm, onClose,
}: {
  fecha: string; hora: string; orientadoraNombre: string; agendadoPor: string;
  onConfirm: (nombre: string, motivo: string) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [motivo, setMotivo] = useState("");
  const [y, m, d] = fecha.split("-").map(Number);
  const displayDate = `${d} de ${MONTH_NAMES[m - 1]} ${y}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Agendar cita</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">{orientadoraNombre}</span>
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> {displayDate}
          </p>
          <p className="text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {hora}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre del estudiante</label>
            <input
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nombre.trim() && onConfirm(nombre.trim(), motivo)}
              placeholder="Apellido, Nombre"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Motivo (opcional)</label>
            <input
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: orientación vocacional"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            disabled={!nombre.trim()}
            onClick={() => nombre.trim() && onConfirm(nombre.trim(), motivo)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["lunes","martes","miercoles","jueves","viernes"];
const HORAS = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];

function AdminPanel({
  orientadora, horario, bloqueos,
  onClose, onRefresh,
}: {
  orientadora: Orientadora;
  horario: HorarioSlot[];
  bloqueos: Bloqueo[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [newDia, setNewDia] = useState("lunes");
  const [newHora, setNewHora] = useState("10:00");
  const [blqInicio, setBlqInicio] = useState("");
  const [blqFin, setBlqFin] = useState("");
  const [blqMotivo, setBlqMotivo] = useState("");

  async function addSlot() {
    await fetch(apiUrl(`/api/orientacion/orientadoras/${orientadora.id}/horario`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diaSemana: newDia, horaInicio: newHora }),
    });
    onRefresh();
  }

  async function removeSlot(id: number) {
    await fetch(apiUrl(`/api/orientacion/horario/${id}`), { method: "DELETE" });
    onRefresh();
  }

  async function addBloqueo() {
    if (!blqInicio || !blqFin) return;
    await fetch(apiUrl(`/api/orientacion/orientadoras/${orientadora.id}/bloqueo`), {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fechaInicio: blqInicio, fechaFin: blqFin, motivo: blqMotivo }),
    });
    setBlqInicio(""); setBlqFin(""); setBlqMotivo("");
    onRefresh();
  }

  async function removeBloqueo(id: number) {
    await fetch(apiUrl(`/api/orientacion/bloqueo/${id}`), { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-6 my-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Configurar — {orientadora.nombre}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Horario habitual */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">Horario semanal habitual</h4>
          <div className="space-y-1.5">
            {horario.length === 0 && <p className="text-xs text-muted-foreground">Sin horario configurado</p>}
            {horario.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-foreground capitalize">
                  {DAY_SHORT[s.diaSemana] ?? s.diaSemana} — {s.horaInicio}
                </span>
                <button onClick={() => removeSlot(s.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Día</label>
              <select value={newDia} onChange={e => setNewDia(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {DIAS_SEMANA.map(d => <option key={d} value={d}>{DAY_SHORT[d] ?? d}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Hora</label>
              <select value={newHora} onChange={e => setNewHora(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <button onClick={addSlot}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bloqueos */}
        <div className="space-y-3 border-t border-border pt-4">
          <h4 className="font-semibold text-sm text-foreground">Bloqueos de fechas</h4>
          <div className="space-y-1.5">
            {bloqueos.length === 0 && <p className="text-xs text-muted-foreground">Sin bloqueos</p>}
            {bloqueos.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
                <span className="text-xs text-foreground">
                  {b.fechaInicio} → {b.fechaFin}
                  {b.motivo && <span className="text-muted-foreground ml-1">({b.motivo})</span>}
                </span>
                <button onClick={() => removeBloqueo(b.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                <input type="date" value={blqInicio} onChange={e => setBlqInicio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta</label>
                <input type="date" value={blqFin} onChange={e => setBlqFin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
            </div>
            <input value={blqMotivo} onChange={e => setBlqMotivo(e.target.value)}
              placeholder="Motivo (vacaciones, feriado…)"
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            <button onClick={addBloqueo} disabled={!blqInicio || !blqFin}
              className="w-full px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
              Agregar bloqueo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Orientadora Modal ────────────────────────────────────────────────────

function NuevaOrientadoraModal({
  onConfirm, onClose,
}: { onConfirm: (nombre: string, titulo: string) => void; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [titulo, setTitulo] = useState("Orientadora");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Nueva orientadora</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre</label>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Título / cargo</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)}
              placeholder="Orientadora / Psicóloga…"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button disabled={!nombre.trim()} onClick={() => nombre.trim() && onConfirm(nombre.trim(), titulo.trim() || "Orientadora")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
            Crear
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Slot Cell ─────────────────────────────────────────────────────────────────

function SlotCell({
  slot, canBook, isCounselor, isAdmin,
  onBook, onUpdateCita, onDeleteCita,
}: {
  slot: Slot;
  canBook: boolean;
  isCounselor: boolean;
  isAdmin: boolean;
  onBook: (fecha: string, hora: string) => void;
  onUpdateCita: (id: number, field: "estadoConfirma" | "estadoAsiste", value: string) => void;
  onDeleteCita: (id: number) => void;
}) {
  if (slot.status === "blocked") {
    return (
      <div className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2 flex items-center justify-center min-h-[60px]">
        <span className="text-[10px] text-gray-400 font-medium">No disponible</span>
      </div>
    );
  }

  if (slot.status === "available") {
    return (
      <button
        onClick={() => canBook && onBook(slot.fecha, slot.horaInicio)}
        disabled={!canBook}
        className={`w-full rounded-lg border border-dashed p-2 flex items-center justify-center min-h-[60px] transition-all text-[11px] font-medium ${
          canBook
            ? "border-primary/40 text-primary/70 hover:bg-primary/5 hover:border-primary hover:text-primary cursor-pointer"
            : "border-border text-muted-foreground cursor-default"
        }`}
      >
        {canBook ? <><Plus className="w-3 h-3 mr-1" />Agendar</> : "Libre"}
      </button>
    );
  }

  // Booked
  const cita = slot.cita!;
  return (
    <div className="rounded-lg bg-card border border-border p-2 space-y-1.5 min-h-[60px] group relative">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-semibold text-foreground leading-tight break-words">
          {cita.nombreEstudiante}
        </span>
        {(isCounselor || isAdmin) && (
          <button
            onClick={() => onDeleteCita(cita.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
      {cita.motivo && (
        <p className="text-[10px] text-muted-foreground truncate">{cita.motivo}</p>
      )}
      {isCounselor || isAdmin ? (
        <div className="flex flex-col gap-1">
          <Select
            value={cita.estadoConfirma}
            options={CONFIRM_OPTS}
            color={CONFIRM_COLORS}
            onChange={v => onUpdateCita(cita.id, "estadoConfirma", v)}
          />
          <Select
            value={cita.estadoAsiste}
            options={ASISTE_OPTS}
            color={ASISTE_COLORS}
            onChange={v => onUpdateCita(cita.id, "estadoAsiste", v)}
          />
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          <StatusBadge label={cita.estadoConfirma} color={CONFIRM_COLORS[cita.estadoConfirma] ?? CONFIRM_COLORS.pendiente} />
          <StatusBadge label={cita.estadoAsiste} color={ASISTE_COLORS[cita.estadoAsiste] ?? ASISTE_COLORS.pendiente} />
        </div>
      )}
      {cita.agendadoPor && (
        <p className="text-[9px] text-muted-foreground/60 truncate">por {cita.agendadoPor}</p>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function OrientacionPage() {
  const { currentUser } = useCurrentUser();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [orientadoras, setOrientadoras] = useState<Orientadora[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [horario, setHorario] = useState<HorarioSlot[]>([]);
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingModal, setBookingModal] = useState<{ fecha: string; hora: string } | null>(null);
  const [adminModal, setAdminModal] = useState(false);
  const [nuevaModal, setNuevaModal] = useState(false);

  const isAdmin = currentUser?.role === "admin";
  const isCounselor = currentUser?.role === "orientadora";
  const canBook = !!currentUser && !isCounselor;

  // My counselor record (if logged in as orientadora)
  const myOrientadora = useMemo(() => {
    if (!isCounselor || !currentUser) return null;
    return orientadoras.find(o => o.nombre.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ?? null;
  }, [isCounselor, currentUser, orientadoras]);

  // Selected orientadora derived
  const selectedOrientadora = useMemo(
    () => orientadoras.find(o => o.id === selectedId) ?? null,
    [orientadoras, selectedId],
  );

  // Load orientadoras
  const loadOrientadoras = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/orientacion/orientadoras"));
      if (!r.ok) return;
      const data: Orientadora[] = await r.json();
      setOrientadoras(data.filter(o => o.activa === 1));
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch { /* API aún no disponible */ }
  }, [selectedId]);

  useEffect(() => { loadOrientadoras(); }, []);

  // Load slots for selected orientadora and month
  const loadSlots = useCallback(async () => {
    if (!selectedId) return;
    setLoadingSlots(true);
    try {
      const r = await fetch(apiUrl(`/api/orientacion/disponibilidad/${selectedId}?año=${year}&mes=${month}`));
      if (!r.ok) { setSlots([]); return; }
      const data: Slot[] = await r.json();
      setSlots(data);
    } catch { setSlots([]); }
    finally { setLoadingSlots(false); }
  }, [selectedId, year, month]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // Load admin data when opening admin modal
  const loadAdminData = useCallback(async () => {
    if (!selectedId) return;
    try {
      const [hr, br] = await Promise.all([
        fetch(apiUrl(`/api/orientacion/orientadoras/${selectedId}/horario`)),
        fetch(apiUrl(`/api/orientacion/orientadoras/${selectedId}/bloqueos`)),
      ]);
      if (hr.ok) setHorario(await hr.json());
      if (br.ok) setBloqueos(await br.json());
    } catch { /* API unavailable */ }
  }, [selectedId]);

  // Month navigation
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  // Book appointment
  async function handleBook(nombre: string, motivo: string) {
    if (!bookingModal || !selectedId || !currentUser) return;
    await fetch(apiUrl("/api/orientacion/citas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orientadoraId: selectedId,
        nombreEstudiante: nombre,
        agendadoPor: currentUser.name,
        fecha: bookingModal.fecha,
        horaInicio: bookingModal.hora,
        motivo: motivo || null,
      }),
    });
    setBookingModal(null);
    await loadSlots();
  }

  // Update cita status
  async function handleUpdateCita(id: number, field: "estadoConfirma" | "estadoAsiste", value: string) {
    await fetch(apiUrl(`/api/orientacion/citas/${id}`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setSlots(prev => prev.map(s =>
      s.cita?.id === id ? { ...s, cita: { ...s.cita!, [field]: value } } : s,
    ));
  }

  // Delete cita
  async function handleDeleteCita(id: number) {
    await fetch(apiUrl(`/api/orientacion/citas/${id}`), { method: "DELETE" });
    await loadSlots();
  }

  // Create new orientadora
  async function handleCrearOrientadora(nombre: string, titulo: string) {
    await fetch(apiUrl("/api/orientacion/orientadoras"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, titulo }),
    });
    setNuevaModal(false);
    await loadOrientadoras();
  }

  const weeks = useMemo(() => buildWeeks(year, month, slots), [year, month, slots]);

  // Count booked slots
  const bookedCount = slots.filter(s => s.status === "booked").length;
  const availableCount = slots.filter(s => s.status === "available").length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Orientación</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Agenda de citas con orientadoras</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setNuevaModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva orientadora
            </button>
          )}
        </div>

        {/* Orientadora tabs */}
        {orientadoras.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <User className="w-12 h-12 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No hay orientadoras configuradas</p>
            {isAdmin && (
              <button onClick={() => setNuevaModal(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Agregar primera orientadora
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {orientadoras.map(o => (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedId === o.id
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {o.nombre[0]}
                  </div>
                  {o.nombre}
                </button>
              ))}
            </div>

            {selectedOrientadora && (
              <>
                {/* Month navigator + stats */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
                    <button onClick={prevMonth}
                      className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="min-w-[160px] text-center font-semibold text-foreground text-sm px-2">
                      {MONTH_NAMES[month - 1]} {year}
                    </span>
                    <button onClick={nextMonth}
                      className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <span className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                      {bookedCount} agendadas
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-semibold">
                      {availableCount} disponibles
                    </span>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium hidden sm:block">
                      {selectedOrientadora.titulo}
                    </span>
                    {(isAdmin || (isCounselor && myOrientadora?.id === selectedId)) && (
                      <button
                        onClick={() => { setAdminModal(true); loadAdminData(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Configurar
                      </button>
                    )}
                  </div>
                </div>

                {/* Calendar grid */}
                {loadingSlots ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : weeks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm">No hay horario configurado para este mes</p>
                    {(isAdmin || (isCounselor && myOrientadora?.id === selectedId)) && (
                      <button
                        onClick={() => { setAdminModal(true); loadAdminData(); }}
                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                      >
                        Configurar horario
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {weeks.map(week => (
                      <div key={week.label} className="bg-card border border-border rounded-2xl overflow-hidden">
                        <div className="bg-muted/40 px-4 py-2.5 border-b border-border">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {week.label}
                          </span>
                        </div>
                        <div className="overflow-x-auto">
                          <div
                            className="grid gap-0 min-w-max"
                            style={{ gridTemplateColumns: `80px repeat(${week.days.length}, minmax(140px, 1fr))` }}
                          >
                            {/* Header row */}
                            <div className="border-b border-r border-border px-3 py-2 bg-muted/20" />
                            {week.days.map(day => (
                              <div key={day.date}
                                className="border-b border-r border-border px-3 py-2 bg-muted/20 text-center">
                                <span className="text-xs font-bold text-foreground">{day.dayName}</span>
                              </div>
                            ))}

                            {/* Time rows */}
                            {(() => {
                              const allHoras = [...new Set(week.days.flatMap(d => d.slots.map(s => s.horaInicio)))].sort();
                              return allHoras.flatMap(hora => [
                                <div key={`h-${hora}`}
                                  className="border-b border-r border-border px-3 py-2 flex items-center bg-muted/10">
                                  <span className="text-xs font-semibold text-muted-foreground">{hora}</span>
                                </div>,
                                ...week.days.map(day => {
                                  const slot = day.slots.find(s => s.horaInicio === hora);
                                  return (
                                    <div key={`${day.date}-${hora}`}
                                      className="border-b border-r border-border p-2">
                                      {slot ? (
                                        <SlotCell
                                          slot={slot}
                                          canBook={canBook}
                                          isCounselor={isCounselor && myOrientadora?.id === selectedId}
                                          isAdmin={isAdmin}
                                          onBook={(f, h) => setBookingModal({ fecha: f, hora: h })}
                                          onUpdateCita={handleUpdateCita}
                                          onDeleteCita={handleDeleteCita}
                                        />
                                      ) : (
                                        <div className="min-h-[60px]" />
                                      )}
                                    </div>
                                  );
                                }),
                              ]);
                            })()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {bookingModal && selectedOrientadora && (
        <BookingModal
          fecha={bookingModal.fecha}
          hora={bookingModal.hora}
          orientadoraNombre={selectedOrientadora.nombre}
          agendadoPor={currentUser?.name ?? ""}
          onConfirm={handleBook}
          onClose={() => setBookingModal(null)}
        />
      )}

      {adminModal && selectedOrientadora && (
        <AdminPanel
          orientadora={selectedOrientadora}
          horario={horario}
          bloqueos={bloqueos}
          onClose={() => { setAdminModal(false); loadSlots(); }}
          onRefresh={loadAdminData}
        />
      )}

      {nuevaModal && (
        <NuevaOrientadoraModal
          onConfirm={handleCrearOrientadora}
          onClose={() => setNuevaModal(false)}
        />
      )}
    </div>
  );
}
