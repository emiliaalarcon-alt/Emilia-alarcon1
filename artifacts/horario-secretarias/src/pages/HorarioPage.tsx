import { useState, useMemo } from "react";
import { Search, X, ChevronRight, Users, MapPin, Clock } from "lucide-react";
import {
  scheduleData,
  filterSchedule,
  getUniqueCourses,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  SEDES,
  COURSE_COLORS,
  COURSE_FULL_NAMES,
  type ClassEntry,
} from "@/data/schedule";

const SEDE_ROOMS: Record<string, number> = {
  "LAS ENCINAS": 7,
  "INES DE SUAREZ": 5,
};

const COURSE_BADGE_COLORS: Record<string, string> = {
  "M1": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",
  "M1 INT": "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",
  "M2": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "M2 INT": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "MT": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800/50",
  "MS": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800/50",
  "MP": "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "FIS": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  "FIS INT": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  "BIO": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  "BIO INT": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  "QUI": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  "QUI INT": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  "LN": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LN INT": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LT": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LS": "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LP": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "HS": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "HS INT": "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "CS": "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
};

function ClassCell({
  entry,
  onSelect,
  selected,
}: {
  entry: ClassEntry;
  onSelect: (e: ClassEntry) => void;
  selected: boolean;
}) {
  const badge = COURSE_BADGE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200";
  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full text-left rounded-2xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer bg-card ${
        selected ? "ring-2 ring-primary ring-offset-2 border-primary/30" : "border-border/60 hover:border-primary/30"
      }`}
    >
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border mb-1.5 ${badge}`}>
        {entry.course}
      </span>
      <div className="text-xs text-muted-foreground font-medium">Prof. {entry.teacher}</div>
      {entry.students.length > 0 && (
        <div className="flex items-center gap-1 mt-1">
          <Users className="w-3 h-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{entry.students.length}</span>
        </div>
      )}
    </button>
  );
}

function DetailPanel({ entry, onClose }: { entry: ClassEntry; onClose: () => void }) {
  const badge = COURSE_BADGE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200";
  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-card shadow-2xl border-l border-border z-50 flex flex-col">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold border mb-2 ${badge}`}>
                {entry.course}
              </span>
              <h2 className="text-2xl font-display font-bold text-foreground">
                {COURSE_FULL_NAMES[entry.course] ?? entry.course}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">{entry.classCode}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin, label: "Sede", value: entry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas" },
              { icon: MapPin, label: "Sala", value: `Sala ${entry.sala}` },
              { icon: Clock, label: "Horario", value: entry.time },
              { icon: Users, label: "Día", value: DAY_LABELS[entry.day] ?? entry.day },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-muted/50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground font-medium">{label}</span>
                </div>
                <div className="font-semibold text-sm text-foreground">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-4 border border-primary/20">
            <div className="text-xs text-muted-foreground mb-1 font-medium">Profesor</div>
            <div className="font-display font-bold text-lg text-foreground">{entry.teacher}</div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-foreground">Alumnos inscritos</h3>
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                {entry.students.length}
              </span>
            </div>
            {entry.students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sin alumnos registrados
              </div>
            ) : (
              <ul className="space-y-2">
                {entry.students.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm text-foreground">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function HorarioPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("LUNES");
  const [search, setSearch] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<ClassEntry | null>(null);
  const [activeSede, setActiveSede] = useState<string>("LAS ENCINAS");

  const courses = useMemo(() => getUniqueCourses(), []);

  const filtered = useMemo(
    () =>
      filterSchedule({
        course: selectedCourse || undefined,
        sede: selectedSede || undefined,
        day: selectedDay || undefined,
        search: search || undefined,
      }),
    [selectedCourse, selectedSede, selectedDay, search]
  );

  const hasFilters = selectedCourse || selectedSede || search;

  function clearFilters() {
    setSelectedCourse("");
    setSelectedSede("");
    setSearch("");
  }

  function getEntry(day: string, time: string, sede: string, sala: number): ClassEntry | undefined {
    return filtered.find(
      (e) => e.day === day && e.time === time && e.sede === sede && e.sala === sala
    );
  }

  const currentSede = selectedSede || activeSede;
  const numSalas = SEDE_ROOMS[currentSede];

  const totalStats = {
    classes: scheduleData.length,
    students: [...new Set(scheduleData.flatMap(e => e.students))].length,
    courses: [...new Set(scheduleData.map(e => e.course))].length,
  };

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground mb-1">Horarios</h1>
          <p className="text-muted-foreground text-sm">
            Haz clic en una celda para ver o gestionar alumnos.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Clases", value: totalStats.classes },
            { label: "Cursos", value: totalStats.courses },
            { label: "Alumnos", value: totalStats.students },
          ].map(({ label, value }) => (
            <div key={label} className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
              <div className="text-2xl font-display font-bold text-primary">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar alumno o curso..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-4 py-2.5 text-sm border border-border rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-w-40"
          >
            <option value="">Todos los cursos</option>
            {courses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-destructive border border-destructive/20 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                selectedDay === day
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-card border border-border text-foreground hover:border-primary/50 hover:text-primary"
              }`}
            >
              {DAY_LABELS[day]}
            </button>
          ))}
        </div>

        {!selectedSede && (
          <div className="flex rounded-2xl overflow-hidden border border-border/50 w-fit shadow-sm mb-4">
            {SEDES.map((sede) => (
              <button
                key={sede}
                onClick={() => setActiveSede(sede)}
                className={`px-6 py-2.5 text-sm font-semibold transition-colors ${
                  activeSede === sede
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
                <span className="ml-2 opacity-70 text-xs">
                  ({filtered.filter(e => e.sede === sede && e.day === selectedDay).length})
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-display font-bold text-foreground">
              {DAY_LABELS[selectedDay]} — {currentSede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {filtered.filter(e => e.day === selectedDay && e.sede === currentSede).length} clase{filtered.filter(e => e.day === selectedDay && e.sede === currentSede).length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-32 sticky left-0 bg-card z-10">
                    Horario
                  </th>
                  {Array.from({ length: numSalas }, (_, i) => (
                    <th key={i} className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px]">
                      Sala {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TIME_SLOTS.map((time, ti) => {
                  const rowEntries = Array.from({ length: numSalas }, (_, i) =>
                    getEntry(selectedDay, time, currentSede, i + 1)
                  );
                  return (
                    <tr
                      key={time}
                      className={`border-b border-border/20 ${ti % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-inherit z-10">
                        <span className="text-xs font-mono font-semibold text-muted-foreground whitespace-nowrap">
                          {time}
                        </span>
                      </td>
                      {rowEntries.map((entry, i) => (
                        <td key={i} className="px-2 py-2 align-top">
                          {entry ? (
                            <ClassCell
                              entry={entry}
                              onSelect={setSelectedEntry}
                              selected={
                                selectedEntry?.classCode === entry.classCode &&
                                selectedEntry.day === entry.day &&
                                selectedEntry.time === entry.time
                              }
                            />
                          ) : (
                            <div className="w-full h-16 rounded-2xl border border-dashed border-border/30" />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {selectedCourse && (
          <div className="mt-6 bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/50">
              <h2 className="font-display font-bold text-foreground">
                Todos los horarios de{" "}
                <span className="text-primary">{selectedCourse}</span>
              </h2>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {filtered.map((entry, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedEntry(entry)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/60 transition-colors text-left group"
                  >
                    <div className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${COURSE_BADGE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200"}`}>
                      {entry.course}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {DAY_LABELS[entry.day]} · {entry.time}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {entry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} · Sala {entry.sala} · Prof. {entry.teacher}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span className="text-sm">{entry.students.length}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No se encontraron clases
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedEntry && (
        <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
