import { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, Users, CheckCircle, RefreshCw, XCircle, Clock } from "lucide-react";
import { apiUrl } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cita {
  id: number;
  orientadoraId: number;
  nombreEstudiante: string;
  agendadoPor: string;
  fecha: string;
  horaInicio: string;
  motivo: string | null;
  estadoConfirma: string;
  estadoAsiste: string;
  notaRapida: string | null;
}

interface Orientadora { id: number; nombre: string; titulo: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DOW_LABELS: Record<string, string> = {
  lunes:"Lun", martes:"Mar", miercoles:"Mié", jueves:"Jue", viernes:"Vie",
};
const DOW_NAMES = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];

const CONFIRM_PALETTE: Record<string, string> = {
  pendiente: "#f59e0b",
  confirma:  "#10b981",
  reagenda:  "#3b82f6",
  cancela:   "#ef4444",
  osorno:    "#8b5cf6",
};
const ASISTE_PALETTE: Record<string, string> = {
  pendiente:  "#94a3b8",
  asiste:     "#10b981",
  "no asiste":"#f43f5e",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, total: number) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function getDOW(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return DOW_NAMES[new Date(y, m - 1, d).getDay()];
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color, icon: Icon,
}: { label: string; value: string | number; sub?: string; color: string; icon: React.ElementType }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 flex items-start gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-foreground leading-none">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground mt-1">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3 py-2 text-sm">
      {label !== undefined && <p className="font-bold text-foreground mb-1">{String(label)}</p>}
      {payload.map((p: { name: string; value: number; color: string }, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="font-black">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {children}
    </div>
  );
}

// ─── Main Stats Component ─────────────────────────────────────────────────────

export default function OrientacionStats({
  orientadoras,
  selectedId,
  onSelectId,
}: {
  orientadoras: Orientadora[];
  selectedId: number | null;
  onSelectId: (id: number) => void;
}) {
  const currentYear = new Date().getFullYear();
  const [año, setAño] = useState(String(currentYear));
  const [citas, setCitas] = useState<Cita[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    const params = new URLSearchParams({ orientadoraId: String(selectedId) });
    if (año !== "todas") params.set("año", año);
    fetch(apiUrl(`/api/orientacion/citas/all?${params}`))
      .then(r => r.ok ? r.json() : [])
      .then(data => { setCitas(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedId, año]);

  // ── Computed stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = citas.length;

    // Estado confirma
    const confirmaCount: Record<string, number> = {};
    const asisteCount: Record<string, number> = {};
    const byMes: Record<string, number> = {};
    const byDow: Record<string, number> = {};
    const byHora: Record<string, number> = {};
    const byQuien: Record<string, number> = {};

    for (const c of citas) {
      confirmaCount[c.estadoConfirma] = (confirmaCount[c.estadoConfirma] ?? 0) + 1;
      asisteCount[c.estadoAsiste] = (asisteCount[c.estadoAsiste] ?? 0) + 1;

      const [, m] = c.fecha.split("-");
      const mesLabel = MONTH_NAMES[parseInt(m) - 1];
      byMes[c.fecha.slice(0, 7)] = (byMes[c.fecha.slice(0, 7)] ?? 0) + 1;

      const dow = getDOW(c.fecha);
      byDow[dow] = (byDow[dow] ?? 0) + 1;
      byHora[c.horaInicio] = (byHora[c.horaInicio] ?? 0) + 1;

      const quien = c.agendadoPor?.trim() || "Sin registrar";
      byQuien[quien] = (byQuien[quien] ?? 0) + 1;
    }

    const asisten = asisteCount["asiste"] ?? 0;
    const noAsisten = asisteCount["no asiste"] ?? 0;
    const confirman = confirmaCount["confirma"] ?? 0;
    const reagendan = confirmaCount["reagenda"] ?? 0;
    const cancelan = confirmaCount["cancela"] ?? 0;
    const asistenBase = asisten + noAsisten;

    // By month sorted
    const byMesData = Object.entries(byMes)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, count]) => ({
        mes: MONTH_NAMES[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2),
        citas: count,
      }));

    // By DOW sorted
    const dowOrder = ["lunes","martes","miercoles","jueves","viernes"];
    const byDowData = dowOrder
      .filter(d => byDow[d])
      .map(d => ({ dia: DOW_LABELS[d] ?? d, citas: byDow[d] }));

    // By hora sorted
    const byHoraData = Object.entries(byHora)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hora, citas]) => ({ hora, citas }));

    // By quien sorted desc
    const byQuienData = Object.entries(byQuien)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([nombre, citas]) => ({ nombre: nombre.split(" ")[0], citas }));

    // Pie data
    const confirmaData = Object.entries(confirmaCount).map(([name, value]) => ({ name, value }));
    const asisteData = Object.entries(asisteCount).map(([name, value]) => ({ name, value }));

    return {
      total, asisten, noAsisten, confirman, reagendan, cancelan,
      tasaAsistencia: asistenBase ? pct(asisten, asistenBase) : "—",
      tasaConfirmacion: total ? pct(confirman, total) : "—",
      byMesData, byDowData, byHoraData, byQuienData,
      confirmaData, asisteData,
    };
  }, [citas]);

  const años = Array.from(
    { length: 3 },
    (_, i) => String(currentYear - i)
  );

  return (
    <div className="space-y-5">
      {/* Orientadora selector + año */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 overflow-x-auto">
          {orientadoras.map(o => (
            <button
              key={o.id}
              onClick={() => onSelectId(o.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                selectedId === o.id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted border border-transparent"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {o.nombre[0]}
              </div>
              {o.nombre}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">Año:</span>
          <select
            value={año}
            onChange={e => setAño(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="todas">Todos</option>
            {años.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : citas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
          <TrendingUp className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground font-medium">Sin datos para mostrar</p>
          <p className="text-xs text-muted-foreground/70">
            Aún no hay citas registradas para esta orientadora{año !== "todas" ? ` en ${año}` : ""}.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total citas" value={stats.total} color="bg-primary/10 text-primary" icon={Users} />
            <StatCard label="Asistencia" value={stats.tasaAsistencia}
              sub={`${stats.asisten} de ${stats.asisten + stats.noAsisten} resueltas`}
              color="bg-emerald-100 text-emerald-700" icon={CheckCircle} />
            <StatCard label="Confirman" value={stats.tasaConfirmacion}
              sub={`${stats.confirman} confirmadas`}
              color="bg-green-100 text-green-700" icon={CheckCircle} />
            <StatCard label="Reagendan" value={stats.reagendan}
              color="bg-blue-100 text-blue-700" icon={RefreshCw} />
            <StatCard label="Cancelan" value={stats.cancelan}
              color="bg-red-100 text-red-700" icon={XCircle} />
            <StatCard label="No asisten" value={stats.noAsisten}
              color="bg-rose-100 text-rose-700" icon={XCircle} />
          </div>

          {/* ── Distribución estado confirma + asiste ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Section title="📋 Estado de confirmación">
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={stats.confirmaData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={3} dataKey="value">
                      {stats.confirmaData.map((e, i) => (
                        <Cell key={i} fill={CONFIRM_PALETTE[e.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {stats.confirmaData.map(e => (
                    <div key={e.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: CONFIRM_PALETTE[e.name] ?? "#94a3b8" }} />
                        <span className="text-xs text-foreground capitalize">{e.name}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {e.value} <span className="text-muted-foreground font-normal">({pct(e.value, stats.total)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="✅ Estado de asistencia">
              <div className="flex gap-4 items-center">
                <ResponsiveContainer width="55%" height={160}>
                  <PieChart>
                    <Pie data={stats.asisteData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                      paddingAngle={3} dataKey="value">
                      {stats.asisteData.map((e, i) => (
                        <Cell key={i} fill={ASISTE_PALETTE[e.name] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {stats.asisteData.map(e => (
                    <div key={e.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: ASISTE_PALETTE[e.name] ?? "#94a3b8" }} />
                        <span className="text-xs text-foreground capitalize">{e.name}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">
                        {e.value} <span className="text-muted-foreground font-normal">({pct(e.value, stats.total)})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </div>

          {/* ── Citas por mes ── */}
          {stats.byMesData.length > 1 && (
            <Section title="📅 Citas por mes">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={stats.byMesData} barSize={28}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="citas" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* ── Por día y por hora ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.byDowData.length > 0 && (
              <Section title="📆 Citas por día de semana">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.byDowData} barSize={32}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="citas" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}

            {stats.byHoraData.length > 0 && (
              <Section title="🕐 Citas por hora del día">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={stats.byHoraData} barSize={24}
                    margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="hora" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="citas" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Section>
            )}
          </div>

          {/* ── Quién agenda más ── */}
          {stats.byQuienData.length > 0 && (
            <Section title="👤 Citas agendadas por secretaria">
              <ResponsiveContainer width="100%" height={Math.max(120, stats.byQuienData.length * 36)}>
                <BarChart
                  layout="vertical"
                  data={stats.byQuienData}
                  barSize={20}
                  margin={{ top: 0, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="nombre" width={72}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="citas" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
          )}

          {/* ── Listado reciente ── */}
          <Section title="📋 Últimas 10 citas registradas">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left py-2 pr-3 font-semibold">Estudiante</th>
                    <th className="text-left py-2 pr-3 font-semibold">Fecha</th>
                    <th className="text-left py-2 pr-3 font-semibold">Hora</th>
                    <th className="text-left py-2 pr-3 font-semibold">Confirma</th>
                    <th className="text-left py-2 pr-3 font-semibold">Asiste</th>
                    <th className="text-left py-2 font-semibold">Agendada por</th>
                  </tr>
                </thead>
                <tbody>
                  {[...citas].reverse().slice(0, 10).map(c => (
                    <tr key={c.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="py-1.5 pr-3 font-medium text-foreground">{c.nombreEstudiante}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{c.fecha}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">{c.horaInicio}</td>
                      <td className="py-1.5 pr-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold capitalize ${
                          c.estadoConfirma === "confirma" ? "bg-green-100 text-green-700" :
                          c.estadoConfirma === "reagenda" ? "bg-blue-100 text-blue-700" :
                          c.estadoConfirma === "cancela"  ? "bg-red-100 text-red-700" :
                          c.estadoConfirma === "osorno"   ? "bg-purple-100 text-purple-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>{c.estadoConfirma}</span>
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full font-semibold capitalize ${
                          c.estadoAsiste === "asiste"     ? "bg-emerald-100 text-emerald-700" :
                          c.estadoAsiste === "no asiste"  ? "bg-rose-100 text-rose-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>{c.estadoAsiste}</span>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{c.agendadoPor || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
