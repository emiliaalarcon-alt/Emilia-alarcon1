import { useState, useMemo, Fragment } from "react";
import { Search, X, MapPin, Clock, Users, AlertTriangle } from "lucide-react";
import {
  scheduleData,
  filterSchedule,
  getUniqueCourses,
  getConflictsForEntry,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  SEDES,
  COURSE_FULL_NAMES,
  type ClassEntry,
  type DuplicateConflict,
} from "@/data/schedule";

const SEDE_ROOMS: Record<string, number> = {
  "LAS ENCINAS": 7,
  "INES DE SUAREZ": 5,
};

const MAX_STUDENTS = 7;

const COURSE_SOLID_COLORS: Record<string, string> = {
  "M1":      "bg-blue-600",
  "M1 INT":  "bg-blue-500",
  "M2":      "bg-violet-600",
  "M2 INT":  "bg-violet-500",
  "MT":      "bg-fuchsia-600",
  "MS":      "bg-fuchsia-500",
  "MP":      "bg-purple-600",
  "FIS":     "bg-emerald-600",
  "FIS INT": "bg-emerald-500",
  "BIO":     "bg-teal-600",
  "BIO INT": "bg-teal-500",
  "QUI":     "bg-amber-600",
  "QUI INT": "bg-amber-500",
  "LN":      "bg-orange-600",
  "LN INT":  "bg-orange-500",
  "LT":      "bg-orange-400",
  "LS":      "bg-orange-700",
  "LP":      "bg-red-500",
  "HS":      "bg-rose-600",
  "HS INT":  "bg-rose-500",
  "CS":      "bg-slate-500",
};

const COURSE_BADGE_COLORS: Record<string, string> = {
  "M1":      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",
  "M1 INT":  "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50",
  "M2":      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "M2 INT":  "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "MT":      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800/50",
  "MS":      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800/50",
  "MP":      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
  "FIS":     "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  "FIS INT": "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
  "BIO":     "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  "BIO INT": "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800/50",
  "QUI":     "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  "QUI INT": "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
  "LN":      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LN INT":  "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LT":      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LS":      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800/50",
  "LP":      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "HS":      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "HS INT":  "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50",
  "CS":      "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
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
  const solidBg = COURSE_SOLID_COLORS[entry.course] ?? "bg-slate-500";
  const count = entry.students.length;
  const isFull = count >= MAX_STUDENTS;

  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full h-full text-left align-top cursor-pointer transition-all duration-150 ${
        selected
          ? "bg-primary/5 outline outline-2 outline-primary outline-offset-[-2px]"
          : "hover:bg-muted/60"
      }`}
    >
      <div className="p-1.5">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`${solidBg} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight`}>
            {entry.course}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight ${
            isFull
              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
          }`}>
            {count}/{MAX_STUDENTS}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground font-medium mb-1 truncate">
          {entry.teacher}
        </div>
        <ul>
          {entry.students.map((s, i) => (
            <li key={i} className="text-[10px] text-foreground leading-4 truncate">
              {s}
            </li>
          ))}
          {Array.from({ length: MAX_STUDENTS - count }).map((_, i) => (
            <li key={`empty-${i}`} className="text-[10px] text-muted-foreground/30 leading-4">
              —
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function DetailPanel({ entry, onClose }: { entry: ClassEntry; onClose: () => void }) {
  const badge = COURSE_BADGE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200";

  const conflicts = useMemo(() => getConflictsForEntry(entry), [entry]);
  const conflictMap = useMemo(() => {
    const map = new Map<string, DuplicateConflict[]>();
    for (const c of conflicts) {
      if (!map.has(c.student)) map.set(c.student, []);
      map.get(c.student)!.push(c);
    }
    return map;
  }, [conflicts]);

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

          {conflictMap.size > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                  {conflictMap.size} alumno{conflictMap.size !== 1 ? "s" : ""} con inscripción duplicada
                </span>
              </div>
              <ul className="space-y-2">
                {Array.from(conflictMap.entries()).map(([student, cs]) =>
                  cs.map((c, ci) => (
                    <li key={`${student}-${ci}`} className="text-xs text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/30 rounded-xl px-3 py-2">
                      <span className="font-semibold">{student}</span> ya está en{" "}
                      <span className="font-bold">{c.otherEntry.course}</span>
                      {" · "}
                      {c.otherEntry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
                      {" · "}
                      Sala {c.otherEntry.sala}
                      {" · "}
                      {DAY_LABELS[c.otherEntry.day] ?? c.otherEntry.day} {c.otherEntry.time}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}

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
                {entry.students.map((s, i) => {
                  const hasConflict = conflictMap.has(s);
                  return (
                    <li
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${
                        hasConflict
                          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50"
                          : "bg-muted/40 hover:bg-muted/70"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                        hasConflict
                          ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {hasConflict ? <AlertTriangle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${hasConflict ? "text-amber-800 dark:text-amber-200" : "text-foreground"}`}>
                          {s}
                        </span>
                        {hasConflict && conflictMap.get(s)!.map((c, ci) => (
                          <div key={ci} className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                            También en {c.otherEntry.course} · {c.otherEntry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} Sala {c.otherEntry.sala}
                          </div>
                        ))}
                      </div>
                    </li>
                  );
                })}
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
  const [search, setSearch] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<ClassEntry | null>(null);
  const [activeSede, setActiveSede] = useState<string>("LAS ENCINAS");

  const courses = useMemo(() => getUniqueCourses(), []);

  const allData = useMemo(
    () =>
      filterSchedule({
        course: selectedCourse || undefined,
        sede: activeSede,
        search: search || undefined,
      }),
    [selectedCourse, activeSede, search]
  );

  const hasFilters = !!(selectedCourse || search);

  function clearFilters() {
    setSelectedCourse("");
    setSearch("");
  }

  function getEntry(day: string, time: string, sala: number): ClassEntry | undefined {
    return allData.find(
      (e) => e.day === day && e.time === time && e.sala === sala
    );
  }

  const numSalas = SEDE_ROOMS[activeSede];

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

        <div className="flex flex-wrap gap-3 mb-4">
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
            </button>
          ))}
        </div>

        <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-display font-bold text-foreground">
              {activeSede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} — Semana completa
            </span>
            <span className="ml-auto text-sm text-muted-foreground">
              {allData.length} clase{allData.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 bg-muted/80 border border-border px-2 py-2 text-center font-bold text-[11px] text-foreground min-w-[110px] w-[110px]">
                    Horario
                  </th>
                  {Array.from({ length: numSalas }, (_, i) => (
                    <th key={i} className="border border-border px-1 py-2 text-center font-semibold text-[10px] text-muted-foreground bg-muted/60 min-w-[110px] w-[110px]">
                      Sala {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <Fragment key={day}>
                    <tr>
                      <td
                        colSpan={numSalas + 1}
                        className="border border-border bg-primary/10 px-3 py-1.5 font-display font-bold text-[12px] text-primary sticky left-0"
                      >
                        {DAY_LABELS[day]}
                      </td>
                    </tr>
                    {TIME_SLOTS.map((time) => {
                      const rowEntries = Array.from({ length: numSalas }, (_, i) =>
                        getEntry(day, time, i + 1)
                      );
                      return (
                        <tr key={`${day}-${time}`}>
                          <td className="sticky left-0 z-10 bg-muted/60 border border-border px-2 py-1 text-center font-bold text-[10px] text-muted-foreground align-middle whitespace-nowrap min-w-[110px] w-[110px]">
                            {time}
                          </td>
                          {rowEntries.map((entry, i) => (
                            <td key={i} className="border border-border p-0 align-top">
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
                                <div className="p-1.5 text-center text-muted-foreground/20 text-[10px] select-none min-h-[28px]">
                                  —
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedEntry && (
        <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </div>
  );
}
