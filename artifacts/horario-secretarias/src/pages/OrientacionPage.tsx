import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, Trash2, Settings,
  User, CalendarDays, Clock,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];
const DOW_NAMES = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
const DOW_ES: Record<string, string> = {
  lunes:"Lunes", martes:"Martes", miercoles:"Miércoles",
  jueves:"Jueves", viernes:"Viernes",
};
const DOW_ORDER = ["lunes","martes","miercoles","jueves","viernes"];
const HORAS_DISPONIBLES = [
  "08:00","09:00","10:00","11:00","12:00","13:00","14:00",
  "15:00","16:00","17:00","18:00","19:00","20:00",
];
const CONFIRM_OPTS = ["pendiente","confirma","reagenda","cancela","osorno"];
const ASISTE_OPTS  = ["pendiente","asiste","no asiste"];
const CONFIRM_COLORS: Record<string,string> = {
  pendiente:"bg-yellow-100 text-yellow-800",
  confirma: "bg-green-100 text-green-800",
  reagenda: "bg-blue-100 text-blue-800",
  cancela:  "bg-red-100 text-red-800",
  osorno:   "bg-purple-100 text-purple-800",
};
const ASISTE_COLORS: Record<string,string> = {
  pendiente:  "bg-gray-100 text-gray-600",
  asiste:     "bg-emerald-100 text-emerald-700",
  "no asiste":"bg-rose-100 text-rose-700",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function padZ(n: number) { return String(n).padStart(2, "0"); }
function dateStr(y: number, m: number, d: number) {
  return `${y}-${padZ(m)}-${padZ(d)}`;
}
function parseDateSafe(s: string) {
  // Parse YYYY-MM-DD as local date (avoid UTC shift)
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
}
function getDOW(fecha: string) {
  return DOW_NAMES[parseDateSafe(fecha).getDay()];
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }

// ─── Status Select ────────────────────────────────────────────────────────────

function StatusSelect({
  value, options, colorMap, onChange,
}: { value: string; options: string[]; colorMap: Record<string,string>; onChange:(v:string)=>void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`text-[10px] font-semibold rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer w-full ${colorMap[value] ?? "bg-gray-100 text-gray-600"}`}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ─── Booking Modal ────────────────────────────────────────────────────────────

function BookingModal({
  fecha, hora, orientadoraNombre, agendadoPor, onConfirm, onClose,
}: {
  fecha: string; hora: string; orientadoraNombre: string; agendadoPor: string;
  onConfirm:(nombre:string, motivo:string)=>void; onClose:()=>void;
}) {
  const [nombre, setNombre] = useState("");
  const [motivo, setMotivo] = useState("");
  const dt = parseDateSafe(fecha);
  const display = `${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()]}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Agendar cita</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
          <p className="font-medium text-foreground">{orientadoraNombre}</p>
          <p className="text-muted-foreground flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />{display}</p>
          <p className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{hora}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nombre del estudiante</label>
            <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key==="Enter" && nombre.trim() && onConfirm(nombre.trim(), motivo)}
              placeholder="Apellido, Nombre"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Motivo (opcional)</label>
            <input value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej: orientación vocacional"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button disabled={!nombre.trim()} onClick={() => nombre.trim() && onConfirm(nombre.trim(), motivo)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-40 transition-colors">
            Agendar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin Modal (checkbox grid + feriados) ────────────────────────────────────

function AdminModal({
  orientadora, horario, bloqueos, onClose, onRefresh,
}: {
  orientadora: Orientadora;
  horario: HorarioSlot[];
  bloqueos: Bloqueo[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"horario"|"feriados">("horario");
  const [saving, setSaving] = useState(false);
  // Feriado form
  const [feriadoDesde, setFeriadoDesde] = useState("");
  const [feriadoHasta, setFeriadoHasta] = useState("");
  const [feriadoMotivo, setFeriadoMotivo] = useState("Feriado");

  // Build set of active slots: "diaSemana|horaInicio" → slotId
  const slotMap = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of horario) m[`${s.diaSemana}|${s.horaInicio}`] = s.id;
    return m;
  }, [horario]);

  async function toggleSlot(dia: string, hora: string) {
    setSaving(true);
    const key = `${dia}|${hora}`;
    if (slotMap[key] !== undefined) {
      await fetch(apiUrl(`/api/orientacion/horario/${slotMap[key]}`), { method: "DELETE" });
    } else {
      await fetch(apiUrl(`/api/orientacion/orientadoras/${orientadora.id}/horario`), {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ diaSemana: dia, horaInicio: hora }),
      });
    }
    await onRefresh();
    setSaving(false);
  }

  // Toggle ALL hours for a given day
  async function toggleDay(dia: string) {
    setSaving(true);
    const diaSlots = HORAS_DISPONIBLES.map(h => ({ h, key: `${dia}|${h}` }));
    const allOn = diaSlots.every(({ key }) => slotMap[key] !== undefined);
    if (allOn) {
      // Remove all
      await Promise.all(diaSlots.map(({ key }) =>
        slotMap[key] !== undefined
          ? fetch(apiUrl(`/api/orientacion/horario/${slotMap[key]}`), { method: "DELETE" })
          : Promise.resolve()
      ));
    } else {
      // Add missing
      await Promise.all(diaSlots.map(({ key, h }) =>
        slotMap[key] === undefined
          ? fetch(apiUrl(`/api/orientacion/orientadoras/${orientadora.id}/horario`), {
              method: "POST", headers: {"Content-Type":"application/json"},
              body: JSON.stringify({ diaSemana: dia, horaInicio: h }),
            })
          : Promise.resolve()
      ));
    }
    await onRefresh();
    setSaving(false);
  }

  async function addFeriado() {
    if (!feriadoDesde) return;
    const hasta = feriadoHasta || feriadoDesde;
    await fetch(apiUrl(`/api/orientacion/orientadoras/${orientadora.id}/bloqueo`), {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ fechaInicio: feriadoDesde, fechaFin: hasta, motivo: feriadoMotivo }),
    });
    setFeriadoDesde(""); setFeriadoHasta(""); setFeriadoMotivo("Feriado");
    onRefresh();
  }

  async function removeBloqueo(id: number) {
    await fetch(apiUrl(`/api/orientacion/bloqueo/${id}`), { method: "DELETE" });
    onRefresh();
  }

  // Which hours are active for at least one day?
  const activeHours = useMemo(() => {
    const used = new Set(horario.map(s => s.horaInicio));
    return HORAS_DISPONIBLES.filter(h => used.has(h) || true); // show all, checked = active
  }, [horario]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl p-6 space-y-5 my-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-foreground">Configurar — {orientadora.nombre}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/60 rounded-xl p-1">
          {(["horario","feriados"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab===t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "horario" ? "📅 Horario semanal" : "🚫 Días sin atención"}
            </button>
          ))}
        </div>

        {tab === "horario" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Haz clic en un casillero para activar/desactivar ese horario. Haz clic en el <strong>nombre del día</strong> para marcar o desmarcar todo el día de un golpe.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left py-2 pr-3 text-xs font-semibold text-muted-foreground w-14">Hora</th>
                    {DOW_ORDER.map(d => {
                      const allChecked = HORAS_DISPONIBLES.every(h => slotMap[`${d}|${h}`] !== undefined);
                      const someChecked = HORAS_DISPONIBLES.some(h => slotMap[`${d}|${h}`] !== undefined);
                      return (
                        <th key={d} className="text-center py-1 px-1">
                          <button
                            disabled={saving}
                            onClick={() => toggleDay(d)}
                            className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                              allChecked
                                ? "bg-primary border-primary text-primary-foreground"
                                : someChecked
                                ? "bg-primary/20 border-primary/40 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                            } disabled:opacity-50`}
                          >
                            {d === "miercoles" ? "Mié" : DOW_ES[d]?.slice(0,3)}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {HORAS_DISPONIBLES.map(hora => (
                    <tr key={hora} className="border-t border-border/50">
                      <td className="py-1.5 pr-3 text-xs font-mono text-muted-foreground">{hora}</td>
                      {DOW_ORDER.map(dia => {
                        const key = `${dia}|${hora}`;
                        const checked = slotMap[key] !== undefined;
                        return (
                          <td key={dia} className="py-1.5 px-1 text-center">
                            <button
                              disabled={saving}
                              onClick={() => toggleSlot(dia, hora)}
                              className={`w-9 h-8 rounded-lg border-2 transition-all font-bold text-sm ${
                                checked
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                              } disabled:opacity-50`}
                            >
                              {checked ? "✓" : ""}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
              💡 Los cambios se guardan automáticamente. Si la orientadora trabaja todos los días, haz clic en cada nombre de día. Si solo trabaja Martes, Jueves y Viernes, haz clic solo en esos tres.
            </p>
          </div>
        )}

        {tab === "feriados" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Marca días específicos donde la orientadora NO atenderá (feriados, reuniones, vacaciones, etc.).
            </p>

            {/* Existing blocks */}
            <div className="space-y-2">
              {bloqueos.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Sin días bloqueados</p>
              )}
              {bloqueos.map(b => {
                const dt = parseDateSafe(b.fechaInicio);
                const label = b.fechaInicio === b.fechaFin
                  ? `${dt.getDate()} de ${MONTH_NAMES[dt.getMonth()]} ${dt.getFullYear()}`
                  : `${b.fechaInicio} → ${b.fechaFin}`;
                return (
                  <div key={b.id} className="flex items-center justify-between gap-2 bg-red-50 dark:bg-red-950/20 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {b.motivo && <span className="text-xs text-muted-foreground ml-2">— {b.motivo}</span>}
                    </div>
                    <button onClick={() => removeBloqueo(b.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Add block */}
            <div className="border-t border-border pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Agregar período sin atención</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Desde</label>
                  <input type="date" value={feriadoDesde} onChange={e => {
                    setFeriadoDesde(e.target.value);
                    if (!feriadoHasta || feriadoHasta < e.target.value) setFeriadoHasta(e.target.value);
                  }}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Hasta <span className="text-muted-foreground/60">(mismo día si es 1 día)</span></label>
                  <input type="date" value={feriadoHasta} min={feriadoDesde} onChange={e => setFeriadoHasta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Motivo</label>
                <input value={feriadoMotivo} onChange={e => setFeriadoMotivo(e.target.value)}
                  placeholder="Feriado, Reunión, Vacaciones…"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>
              <button onClick={addFeriado} disabled={!feriadoDesde}
                className="w-full px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-40 transition-colors">
                Marcar como sin atención
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Nueva Orientadora Modal ───────────────────────────────────────────────────

function NuevaOrientadoraModal({ onConfirm, onClose }: {
  onConfirm:(nombre:string, titulo:string)=>void; onClose:()=>void;
}) {
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
            <label className="block text-sm font-medium text-foreground mb-1.5">Cargo</label>
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

// ─── Appointment Cell ──────────────────────────────────────────────────────────

function AppointmentCell({
  slot, canBook, canManage,
  onBook, onUpdateCita, onDeleteCita,
}: {
  slot: Slot | undefined;
  canBook: boolean; canManage: boolean;
  onBook: () => void;
  onUpdateCita: (id: number, field: "estadoConfirma"|"estadoAsiste", value: string) => void;
  onDeleteCita: (id: number) => void;
}) {
  if (!slot) {
    return <div className="h-[90px]" />;
  }

  if (slot.status === "blocked") {
    return (
      <div className="h-[90px] flex items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
        <span className="text-[10px] text-gray-400">Sin atención</span>
      </div>
    );
  }

  if (slot.status === "available") {
    return (
      <button
        onClick={canBook ? onBook : undefined}
        disabled={!canBook}
        className={`w-full h-[90px] rounded-md border border-dashed flex items-center justify-center transition-all text-[11px] font-medium ${
          canBook
            ? "border-primary/30 text-primary/60 hover:border-primary hover:bg-primary/5 hover:text-primary cursor-pointer"
            : "border-border/40 text-muted-foreground/40 cursor-default"
        }`}
      >
        {canBook && <><Plus className="w-3 h-3 mr-1" />Agendar</>}
      </button>
    );
  }

  // Booked
  const cita = slot.cita!;
  return (
    <div className="h-[90px] rounded-md bg-card border border-border p-1.5 flex flex-col gap-1 group relative overflow-hidden">
      <div className="flex items-start justify-between gap-1">
        <span className="text-[10px] font-semibold text-foreground leading-tight line-clamp-2 flex-1">
          {cita.nombreEstudiante}
        </span>
        {canManage && (
          <button onClick={() => onDeleteCita(cita.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 shrink-0">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {canManage ? (
        <div className="flex flex-col gap-0.5 mt-auto">
          <StatusSelect value={cita.estadoConfirma} options={CONFIRM_OPTS} colorMap={CONFIRM_COLORS}
            onChange={v => onUpdateCita(cita.id, "estadoConfirma", v)} />
          <StatusSelect value={cita.estadoAsiste} options={ASISTE_OPTS} colorMap={ASISTE_COLORS}
            onChange={v => onUpdateCita(cita.id, "estadoAsiste", v)} />
        </div>
      ) : (
        <div className="flex flex-col gap-0.5 mt-auto">
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${CONFIRM_COLORS[cita.estadoConfirma] ?? CONFIRM_COLORS.pendiente}`}>
            {cita.estadoConfirma}
          </span>
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${ASISTE_COLORS[cita.estadoAsiste] ?? ASISTE_COLORS.pendiente}`}>
            {cita.estadoAsiste}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Day Section (all Tuesdays, all Thursdays, etc.) ─────────────────────────

function DaySection({
  dow, dates, slotsByDateHora, allHours,
  canBook, canManage,
  onBook, onUpdateCita, onDeleteCita,
}: {
  dow: string;
  dates: string[];
  slotsByDateHora: Record<string, Record<string, Slot>>;
  allHours: string[];
  canBook: boolean; canManage: boolean;
  onBook: (fecha: string, hora: string) => void;
  onUpdateCita: (id: number, field: "estadoConfirma"|"estadoAsiste", value: string) => void;
  onDeleteCita: (id: number) => void;
}) {
  if (dates.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Section header */}
      <div className="bg-primary/5 border-b border-border px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm font-bold text-primary uppercase tracking-wide">{DOW_ES[dow]}</span>
        <span className="text-xs text-muted-foreground">· {dates.length} semanas</span>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse min-w-max">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30 w-16 sticky left-0 z-10">
                Hora
              </th>
              {dates.map(fecha => {
                const dt = parseDateSafe(fecha);
                // Check if whole day is blocked
                const daySlots = slotsByDateHora[fecha] ?? {};
                const allBlocked = allHours.length > 0 && allHours.every(h => daySlots[h]?.status === "blocked");
                return (
                  <th key={fecha} className="px-2 py-2 text-xs font-semibold text-foreground bg-muted/30 text-center min-w-[130px]">
                    <div className="space-y-0.5">
                      <div>{DOW_ES[dow]?.slice(0,3)} {dt.getDate()}</div>
                      {allBlocked && (
                        <div className="text-[10px] font-normal text-red-500 bg-red-50 dark:bg-red-950/20 rounded px-1.5 py-0.5">
                          {Object.values(daySlots)[0]?.status === "blocked" ? "Sin atención" : ""}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {allHours.map(hora => (
              <tr key={hora} className="border-b border-border/50 last:border-0">
                <td className="px-3 py-1.5 text-xs font-mono font-semibold text-muted-foreground bg-muted/10 sticky left-0 z-10">
                  {hora}
                </td>
                {dates.map(fecha => {
                  const slot = slotsByDateHora[fecha]?.[hora];
                  return (
                    <td key={fecha} className="px-2 py-1.5 align-top">
                      <AppointmentCell
                        slot={slot}
                        canBook={canBook}
                        canManage={canManage}
                        onBook={() => onBook(fecha, hora)}
                        onUpdateCita={onUpdateCita}
                        onDeleteCita={onDeleteCita}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrientacionPage() {
  const { currentUser } = useCurrentUser();
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [orientadoras, setOrientadoras] = useState<Orientadora[]>([]);
  const [selectedId, setSelectedId]     = useState<number | null>(null);
  const [slots, setSlots]               = useState<Slot[]>([]);
  const [horario, setHorario]           = useState<HorarioSlot[]>([]);
  const [bloqueos, setBloqueos]         = useState<Bloqueo[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingModal, setBookingModal] = useState<{fecha:string; hora:string}|null>(null);
  const [adminModal, setAdminModal]     = useState(false);
  const [nuevaModal, setNuevaModal]     = useState(false);

  const isAdmin     = currentUser?.role === "admin";
  const isCounselor = currentUser?.role === "orientadora";
  const canBook     = !!currentUser && !isCounselor;

  const selectedOrientadora = useMemo(
    () => orientadoras.find(o => o.id === selectedId) ?? null,
    [orientadoras, selectedId],
  );
  const myOrientadora = useMemo(() => {
    if (!isCounselor || !currentUser) return null;
    return orientadoras.find(o => o.nombre.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ?? null;
  }, [isCounselor, currentUser, orientadoras]);

  const canManage = isAdmin || (isCounselor && !!myOrientadora && myOrientadora.id === selectedId);

  // ── Load orientadoras ────────────────────────────────────────────────────
  const loadOrientadoras = useCallback(async () => {
    try {
      const r = await fetch(apiUrl("/api/orientacion/orientadoras"));
      if (!r.ok) return;
      const data: Orientadora[] = await r.json();
      const active = data.filter(o => o.activa === 1);
      setOrientadoras(active);
      setSelectedId(prev => prev ?? (active[0]?.id ?? null));
    } catch {}
  }, []);

  useEffect(() => { loadOrientadoras(); }, []);

  // ── Load slots ────────────────────────────────────────────────────────────
  const loadSlots = useCallback(async () => {
    if (!selectedId) return;
    setLoadingSlots(true);
    try {
      const r = await fetch(apiUrl(`/api/orientacion/disponibilidad/${selectedId}?año=${year}&mes=${month}`));
      if (!r.ok) { setSlots([]); return; }
      setSlots(await r.json());
    } catch { setSlots([]); }
    finally { setLoadingSlots(false); }
  }, [selectedId, year, month]);

  useEffect(() => { loadSlots(); }, [loadSlots]);

  // ── Load admin data ───────────────────────────────────────────────────────
  const loadAdminData = useCallback(async () => {
    if (!selectedId) return;
    try {
      const [hr, br] = await Promise.all([
        fetch(apiUrl(`/api/orientacion/orientadoras/${selectedId}/horario`)),
        fetch(apiUrl(`/api/orientacion/orientadoras/${selectedId}/bloqueos`)),
      ]);
      if (hr.ok) setHorario(await hr.json());
      if (br.ok) setBloqueos(await br.json());
    } catch {}
  }, [selectedId]);

  // ── Month navigation ─────────────────────────────────────────────────────
  function prevMonth() {
    if (month===1) { setMonth(12); setYear(y => y-1); }
    else setMonth(m => m-1);
  }
  function nextMonth() {
    if (month===12) { setMonth(1); setYear(y => y+1); }
    else setMonth(m => m+1);
  }

  // ── Booking ───────────────────────────────────────────────────────────────
  async function handleBook(nombre: string, motivo: string) {
    if (!bookingModal || !selectedId || !currentUser) return;
    await fetch(apiUrl("/api/orientacion/citas"), {
      method: "POST", headers: {"Content-Type":"application/json"},
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

  async function handleUpdateCita(id: number, field: "estadoConfirma"|"estadoAsiste", value: string) {
    await fetch(apiUrl(`/api/orientacion/citas/${id}`), {
      method: "PATCH", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ [field]: value }),
    });
    setSlots(prev => prev.map(s =>
      s.cita?.id === id ? {...s, cita:{...s.cita!, [field]: value}} : s
    ));
  }

  async function handleDeleteCita(id: number) {
    await fetch(apiUrl(`/api/orientacion/citas/${id}`), { method: "DELETE" });
    await loadSlots();
  }

  async function handleCrearOrientadora(nombre: string, titulo: string) {
    await fetch(apiUrl("/api/orientacion/orientadoras"), {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ nombre, titulo }),
    });
    setNuevaModal(false);
    await loadOrientadoras();
  }

  // ── Build calendar data ───────────────────────────────────────────────────
  // Group slots by: dowName → fecha → hora
  const { workingDows, slotsByDow } = useMemo(() => {
    const dowDates: Record<string, Set<string>> = {};
    const byDowFechaHora: Record<string, Record<string, Record<string, Slot>>> = {};

    for (const slot of slots) {
      const dow = getDOW(slot.fecha);
      if (!dowDates[dow]) { dowDates[dow] = new Set(); byDowFechaHora[dow] = {}; }
      dowDates[dow].add(slot.fecha);
      if (!byDowFechaHora[dow][slot.fecha]) byDowFechaHora[dow][slot.fecha] = {};
      byDowFechaHora[dow][slot.fecha][slot.horaInicio] = slot;
    }

    // Sort dates within each dow
    const working = DOW_ORDER.filter(d => dowDates[d] && dowDates[d].size > 0);
    const result: Record<string, { dates: string[]; byDateHora: Record<string, Record<string, Slot>> }> = {};
    for (const dow of working) {
      result[dow] = {
        dates: [...dowDates[dow]].sort(),
        byDateHora: byDowFechaHora[dow],
      };
    }
    return { workingDows: working, slotsByDow: result };
  }, [slots]);

  // Get all unique hours across all working days (sorted)
  const allHours = useMemo(() => {
    const h = new Set(slots.map(s => s.horaInicio));
    return HORAS_DISPONIBLES.filter(hora => h.has(hora));
  }, [slots]);

  const bookedCount   = slots.filter(s => s.status === "booked").length;
  const availableCount = slots.filter(s => s.status === "available").length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Orientación</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Agenda de citas con orientadoras</p>
          </div>
          {isAdmin && (
            <button onClick={() => setNuevaModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />Nueva orientadora
            </button>
          )}
        </div>

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
            {/* Orientadora tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {orientadoras.map(o => (
                <button key={o.id} onClick={() => setSelectedId(o.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    selectedId===o.id
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {o.nombre[0]}
                  </div>
                  {o.nombre}
                </button>
              ))}
            </div>

            {selectedOrientadora && (
              <>
                {/* Controls row */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1 bg-muted/60 rounded-xl p-1">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="min-w-[160px] text-center font-semibold text-foreground text-sm px-2">
                      {MONTH_NAMES[month-1]} {year}
                    </span>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-background transition-colors text-muted-foreground hover:text-foreground">
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
                    {canManage && (
                      <button
                        onClick={() => { setAdminModal(true); loadAdminData(); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                        <Settings className="w-3.5 h-3.5" />Configurar horario
                      </button>
                    )}
                  </div>
                </div>

                {/* Calendar */}
                {loadingSlots ? (
                  <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : workingDows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                    <CalendarDays className="w-10 h-10 text-muted-foreground/40" />
                    <p className="text-muted-foreground text-sm font-medium">Sin horario configurado para este mes</p>
                    <p className="text-xs text-muted-foreground">Haz clic en "Configurar horario" para definir los días y horas de atención.</p>
                    {canManage && (
                      <button onClick={() => { setAdminModal(true); loadAdminData(); }}
                        className="mt-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                        Configurar horario
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {workingDows.map(dow => (
                      <DaySection
                        key={dow}
                        dow={dow}
                        dates={slotsByDow[dow].dates}
                        slotsByDateHora={slotsByDow[dow].byDateHora}
                        allHours={allHours}
                        canBook={canBook}
                        canManage={canManage}
                        onBook={(fecha, hora) => setBookingModal({ fecha, hora })}
                        onUpdateCita={handleUpdateCita}
                        onDeleteCita={handleDeleteCita}
                      />
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
          fecha={bookingModal.fecha} hora={bookingModal.hora}
          orientadoraNombre={selectedOrientadora.nombre}
          agendadoPor={currentUser?.name ?? ""}
          onConfirm={handleBook} onClose={() => setBookingModal(null)}
        />
      )}

      {adminModal && selectedOrientadora && (
        <AdminModal
          orientadora={selectedOrientadora}
          horario={horario} bloqueos={bloqueos}
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
