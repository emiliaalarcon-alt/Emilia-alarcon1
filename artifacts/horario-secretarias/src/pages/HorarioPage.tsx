import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, MapPin, Clock, Users, AlertTriangle, Plus, Trash2, RefreshCw } from "lucide-react";
import {
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  SEDES,
  COURSE_FULL_NAMES,
  type ClassEntry,
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
  "M1":      "bg-blue-100 text-blue-800 border-blue-200",
  "M1 INT":  "bg-blue-100 text-blue-800 border-blue-200",
  "M2":      "bg-purple-100 text-purple-800 border-purple-200",
  "M2 INT":  "bg-purple-100 text-purple-800 border-purple-200",
  "MT":      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "MS":      "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "MP":      "bg-purple-100 text-purple-800 border-purple-200",
  "FIS":     "bg-emerald-100 text-emerald-800 border-emerald-200",
  "FIS INT": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "BIO":     "bg-teal-100 text-teal-800 border-teal-200",
  "BIO INT": "bg-teal-100 text-teal-800 border-teal-200",
  "QUI":     "bg-amber-100 text-amber-800 border-amber-200",
  "QUI INT": "bg-amber-100 text-amber-800 border-amber-200",
  "LN":      "bg-orange-100 text-orange-800 border-orange-200",
  "LN INT":  "bg-orange-100 text-orange-800 border-orange-200",
  "LT":      "bg-orange-100 text-orange-800 border-orange-200",
  "LS":      "bg-orange-100 text-orange-800 border-orange-200",
  "LP":      "bg-red-100 text-red-800 border-red-200",
  "HS":      "bg-red-100 text-red-800 border-red-200",
  "HS INT":  "bg-red-100 text-red-800 border-red-200",
  "CS":      "bg-slate-100 text-slate-800 border-slate-200",
};

function getBaseCourse(course: string): string {
  return course.split(" ")[0];
}

interface DuplicateConflict {
  student: string;
  otherEntry: ClassEntry;
}

function getConflicts(entry: ClassEntry, allData: ClassEntry[]): DuplicateConflict[] {
  const baseCourse = getBaseCourse(entry.course);
  const conflicts: DuplicateConflict[] = [];
  for (const student of entry.students) {
    const others = allData.filter(
      e => e.classCode !== entry.classCode &&
        getBaseCourse(e.course) === baseCourse &&
        e.students.includes(student)
    );
    for (const other of others) {
      conflicts.push({ student, otherEntry: other });
    }
  }
  return conflicts;
}

async function apiAddStudent(classCode: string, name: string): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const res = await fetch(`/api/schedule/${encodeURIComponent(classCode)}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return res.json();
}

async function apiRemoveStudent(classCode: string, name: string): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(
    `/api/schedule/${encodeURIComponent(classCode)}/students/${encodeURIComponent(name)}`,
    { method: "DELETE" }
  );
  return res.json();
}

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
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className={`${solidBg} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-tight`}>
            {COURSE_FULL_NAMES[entry.course] ?? entry.course}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight shrink-0 ${
            isFull
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
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
          {Array.from({ length: Math.max(0, MAX_STUDENTS - count) }).map((_, i) => (
            <li key={`empty-${i}`} className="text-[10px] text-muted-foreground/30 leading-4">
              —
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function DetailPanel({
  entry,
  allData,
  onClose,
  onStudentChange,
}: {
  entry: ClassEntry;
  allData: ClassEntry[];
  onClose: () => void;
  onStudentChange: () => void;
}) {
  const badge = COURSE_BADGE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200";
  const [newStudentName, setNewStudentName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const conflicts = useMemo(() => getConflicts(entry, allData), [entry, allData]);
  const conflictMap = useMemo(() => {
    const map = new Map<string, DuplicateConflict[]>();
    for (const c of conflicts) {
      if (!map.has(c.student)) map.set(c.student, []);
      map.get(c.student)!.push(c);
    }
    return map;
  }, [conflicts]);

  const isFull = entry.students.length >= MAX_STUDENTS;

  async function handleAdd() {
    const name = newStudentName.trim();
    if (!name) return;
    setAdding(true);
    setAddError("");
    try {
      const result = await apiAddStudent(entry.classCode, name);
      if (result.error === "class_full") {
        setAddError("La clase ya tiene 7 alumnos.");
      } else if (result.error) {
        setAddError(result.message ?? "Error al agregar alumno.");
      } else {
        setNewStudentName("");
        onStudentChange();
      }
    } catch {
      setAddError("Error de conexión.");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(studentName: string) {
    setRemovingStudent(studentName);
    try {
      await apiRemoveStudent(entry.classCode, studentName);
      onStudentChange();
    } catch {
      // silent
    } finally {
      setRemovingStudent(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

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
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-sm font-bold text-amber-800">
                  {conflictMap.size} alumno{conflictMap.size !== 1 ? "s" : ""} con inscripción duplicada
                </span>
              </div>
              <ul className="space-y-2">
                {Array.from(conflictMap.entries()).map(([student, cs]) =>
                  cs.map((c, ci) => (
                    <li key={`${student}-${ci}`} className="text-xs text-amber-700 bg-amber-100/60 rounded-xl px-3 py-2">
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
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                isFull ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
              }`}>
                {entry.students.length}/{MAX_STUDENTS}
              </span>
            </div>

            {!isFull && (
              <div className="mb-4">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newStudentName}
                    onChange={e => { setNewStudentName(e.target.value); setAddError(""); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Nombre del alumno..."
                    className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                    disabled={adding}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={adding || !newStudentName.trim()}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar
                  </button>
                </div>
                {addError && (
                  <p className="mt-2 text-xs text-destructive font-medium">{addError}</p>
                )}
              </div>
            )}

            {isFull && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-medium">
                Clase completa — máximo 7 alumnos alcanzado.
              </div>
            )}

            {entry.students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Sin alumnos registrados
              </div>
            ) : (
              <ul className="space-y-2">
                {entry.students.map((s, i) => {
                  const hasConflict = conflictMap.has(s);
                  const isRemoving = removingStudent === s;
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                        hasConflict
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-muted/40 hover:bg-muted/70"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        hasConflict
                          ? "bg-amber-100 text-amber-700"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {hasConflict ? <AlertTriangle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${hasConflict ? "text-amber-800" : "text-foreground"}`}>
                          {s}
                        </span>
                        {hasConflict && conflictMap.get(s)!.map((c, ci) => (
                          <div key={ci} className="text-[11px] text-amber-600 mt-0.5">
                            También en {c.otherEntry.course} · {c.otherEntry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} Sala {c.otherEntry.sala}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleRemove(s)}
                        disabled={isRemoving}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-30 shrink-0"
                        title="Eliminar alumno"
                      >
                        {isRemoving
                          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
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
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedDays, setSelectedDays] = useState<string[]>(DAYS);
  const [search, setSearch] = useState<string>("");
  const [selectedEntry, setSelectedEntry] = useState<ClassEntry | null>(null);
  const [activeSede, setActiveSede] = useState<string>("LAS ENCINAS");
  const [allData, setAllData] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule");
      if (!res.ok) throw new Error("API error");
      const data: ClassEntry[] = await res.json();
      setAllData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch schedule:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const sedeData = useMemo(
    () => allData.filter(e => e.sede === activeSede),
    [allData, activeSede]
  );

  const filteredData = useMemo(() => {
    return sedeData.filter(entry => {
      if (selectedCourse && entry.course !== selectedCourse) return false;
      if (selectedTeacher && entry.teacher !== selectedTeacher) return false;
      if (search) {
        const q = search.toLowerCase();
        const match =
          entry.course.toLowerCase().includes(q) ||
          entry.classCode.toLowerCase().includes(q) ||
          entry.teacher.toLowerCase().includes(q) ||
          entry.students.some(s => s.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [sedeData, selectedCourse, selectedTeacher, search]);

  const visibleDays = useMemo(
    () => DAYS.filter(d => selectedDays.includes(d)),
    [selectedDays]
  );

  const courses = useMemo(
    () => [...new Set(sedeData.map(e => e.course))].sort(),
    [sedeData]
  );

  const teachers = useMemo(
    () => [...new Set(sedeData.map(e => e.teacher))].sort(),
    [sedeData]
  );

  const hasFilters = !!(selectedCourse || selectedTeacher || search || selectedDays.length < DAYS.length);

  function clearFilters() {
    setSelectedCourse("");
    setSelectedTeacher("");
    setSearch("");
    setSelectedDays(DAYS);
  }

  function toggleDay(day: string) {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.length > 1 ? prev.filter(d => d !== day) : prev
        : [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b))
    );
  }

  function getEntry(day: string, time: string, sala: number): ClassEntry | undefined {
    return filteredData.find(
      e => e.day === day && e.time === time && e.sala === sala
    );
  }

  const liveSelectedEntry = useMemo(() => {
    if (!selectedEntry) return null;
    return allData.find(e => e.classCode === selectedEntry.classCode) ?? null;
  }, [selectedEntry, allData]);

  const numSalas = SEDE_ROOMS[activeSede];

  const totalStats = useMemo(() => ({
    classes: allData.length,
    students: [...new Set(allData.flatMap(e => e.students))].length,
    courses: [...new Set(allData.map(e => e.course))].length,
  }), [allData]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Horarios</h1>
            <p className="text-muted-foreground text-sm">
              Haz clic en una celda para ver o gestionar alumnos.
            </p>
          </div>
          {lastUpdated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
              <RefreshCw className="w-3 h-3" />
              Actualizado {lastUpdated.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </div>
          )}
        </div>

        {loading && allData.length === 0 ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            Cargando horarios...
          </div>
        ) : (
          <>
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

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 mb-4 space-y-3">
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar alumno o materia..."
                    className="w-full pl-9 pr-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                </div>

                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="px-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-w-44"
                >
                  <option value="">Todas las materias</option>
                  {courses.map((c) => (
                    <option key={c} value={c}>{COURSE_FULL_NAMES[c] ?? c}</option>
                  ))}
                </select>

                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="px-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground min-w-40"
                >
                  <option value="">Todos los profesores</option>
                  {teachers.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <div className="flex rounded-xl overflow-hidden border border-border/50 shadow-sm">
                  {SEDES.map((sede) => (
                    <button
                      key={sede}
                      onClick={() => setActiveSede(sede)}
                      className={`px-5 py-2.5 text-sm font-semibold transition-colors ${
                        activeSede === sede
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
                    </button>
                  ))}
                </div>

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

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Días:</span>
                {DAYS.map((day) => (
                  <button
                    key={day}
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                      selectedDays.includes(day)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/50 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-display font-bold text-foreground">
                  {activeSede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} — Semana completa
                </span>
                <span className="ml-auto text-sm text-muted-foreground">
                  {filteredData.length} clase{filteredData.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="border-collapse text-[11px]" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 bg-muted/90 border border-border px-2 py-2 text-center font-bold text-[11px] text-foreground w-[96px] min-w-[96px] align-middle"
                      >
                        Horario
                      </th>
                      {visibleDays.map((day) => (
                        <th
                          key={day}
                          colSpan={numSalas}
                          className="border border-border px-2 py-2 text-center font-display font-bold text-[12px] text-primary bg-primary/10"
                        >
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {visibleDays.map((day) =>
                        Array.from({ length: numSalas }, (_, i) => (
                          <th
                            key={`${day}-sala-${i}`}
                            className="border border-border px-1 py-1.5 text-center font-semibold text-[10px] text-muted-foreground bg-muted/60 w-[110px] min-w-[110px]"
                          >
                            Sala {i + 1}
                          </th>
                        ))
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {TIME_SLOTS.map((time) => {
                      const hasAny = visibleDays.some((day) =>
                        Array.from({ length: numSalas }, (_, i) => getEntry(day, time, i + 1)).some(Boolean)
                      );
                      if (!hasAny && hasFilters) return null;
                      return (
                        <tr key={time}>
                          <td className="sticky left-0 z-10 bg-muted/60 border border-border px-2 py-1 text-center font-bold text-[10px] text-muted-foreground align-middle whitespace-nowrap w-[96px] min-w-[96px]">
                            {time}
                          </td>
                          {visibleDays.map((day) =>
                            Array.from({ length: numSalas }, (_, i) => {
                              const entry = getEntry(day, time, i + 1);
                              return (
                                <td key={`${day}-${i}`} className="border border-border p-0 align-top w-[110px] min-w-[110px]">
                                  {entry ? (
                                    <ClassCell
                                      entry={entry}
                                      onSelect={setSelectedEntry}
                                      selected={liveSelectedEntry?.classCode === entry.classCode}
                                    />
                                  ) : (
                                    <div className="p-1.5 text-center text-muted-foreground/20 text-[10px] select-none min-h-[28px]">
                                      —
                                    </div>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {liveSelectedEntry && (
        <DetailPanel
          entry={liveSelectedEntry}
          allData={allData}
          onClose={() => setSelectedEntry(null)}
          onStudentChange={fetchData}
        />
      )}
    </div>
  );
}
