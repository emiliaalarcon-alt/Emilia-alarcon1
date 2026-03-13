import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, X, MapPin, Clock, Users, AlertTriangle, Plus, Trash2, RefreshCw, Pencil, Check } from "lucide-react";
import {
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  SEDES,
  COURSE_FULL_NAMES,
  type ClassEntry,
} from "@/data/schedule";

const SEDE_ROOMS_MIN: Record<string, number> = {
  "LAS ENCINAS": 1,
  "INES DE SUAREZ": 1,
};

const NORMAL_CAPACITY = 7;
const MAX_STUDENTS = 8;

const COURSE_SOLID_COLORS: Record<string, string> = {
  // Matemática → familia amarillo/ámbar (cada uno distinto)
  "M1":       "bg-yellow-400",
  "M1 INT":   "bg-yellow-500",
  "M1 CONT":  "bg-yellow-600",
  "M2":       "bg-amber-400",
  "M2 INT":   "bg-amber-500",
  "MT":       "bg-lime-600",
  "MS":       "bg-amber-700",
  "MP":       "bg-yellow-300",
  // Lenguaje → familia rojo/rosa (cada uno distinto)
  "LN":       "bg-red-500",
  "LN INT":   "bg-red-700",
  "LN CONT":  "bg-red-800",
  "LT":       "bg-rose-600",
  "LS":       "bg-rose-400",
  "LP":       "bg-red-400",
  // Física → familia naranja (cada uno distinto)
  "FIS":      "bg-orange-500",
  "FIS INT":  "bg-orange-700",
  "FIS CONT": "bg-orange-800",
  // Química → familia cyan/calipso (cada uno distinto)
  "QUI":      "bg-cyan-500",
  "QUI INT":  "bg-cyan-700",
  "QUI CONT": "bg-teal-600",
  // Biología → familia verde (cada uno distinto)
  "BIO":      "bg-green-500",
  "BIO INT":  "bg-green-700",
  "BIO CONT": "bg-emerald-600",
  // Historia → familia gris (cada uno distinto)
  "HS":       "bg-gray-400",
  "HS INT":   "bg-gray-600",
  "HIS":      "bg-gray-500",
  "HIS INT":  "bg-gray-700",
  // Otros
  "CS":       "bg-slate-500",
};

const COURSE_BADGE_COLORS: Record<string, string> = {
  // Matemática
  "M1":       "bg-yellow-100 text-yellow-800 border-yellow-200",
  "M1 INT":   "bg-yellow-200 text-yellow-900 border-yellow-300",
  "M1 CONT":  "bg-yellow-300 text-yellow-900 border-yellow-400",
  "M2":       "bg-amber-100 text-amber-800 border-amber-200",
  "M2 INT":   "bg-amber-200 text-amber-900 border-amber-300",
  "MT":       "bg-lime-100 text-lime-800 border-lime-200",
  "MS":       "bg-amber-100 text-amber-900 border-amber-300",
  "MP":       "bg-yellow-50 text-yellow-700 border-yellow-200",
  // Lenguaje
  "LN":       "bg-red-100 text-red-800 border-red-200",
  "LN INT":   "bg-red-200 text-red-900 border-red-300",
  "LN CONT":  "bg-red-300 text-red-900 border-red-400",
  "LT":       "bg-rose-100 text-rose-800 border-rose-200",
  "LS":       "bg-rose-100 text-rose-900 border-rose-300",
  "LP":       "bg-red-50 text-red-700 border-red-200",
  // Física
  "FIS":      "bg-orange-100 text-orange-800 border-orange-200",
  "FIS INT":  "bg-orange-200 text-orange-900 border-orange-300",
  "FIS CONT": "bg-orange-300 text-orange-900 border-orange-400",
  // Química
  "QUI":      "bg-cyan-100 text-cyan-800 border-cyan-200",
  "QUI INT":  "bg-cyan-200 text-cyan-900 border-cyan-300",
  "QUI CONT": "bg-teal-100 text-teal-800 border-teal-200",
  // Biología
  "BIO":      "bg-green-100 text-green-800 border-green-200",
  "BIO INT":  "bg-green-200 text-green-900 border-green-300",
  "BIO CONT": "bg-emerald-100 text-emerald-800 border-emerald-200",
  // Historia
  "HS":       "bg-gray-100 text-gray-600 border-gray-200",
  "HS INT":   "bg-gray-200 text-gray-700 border-gray-300",
  "HIS":      "bg-gray-100 text-gray-700 border-gray-200",
  "HIS INT":  "bg-gray-200 text-gray-800 border-gray-300",
  // Otros
  "CS":       "bg-slate-100 text-slate-800 border-slate-200",
};

function getBaseCourse(course: string): string {
  return course.split(" ")[0];
}

interface DuplicateConflict {
  student: string;
  otherEntry: ClassEntry;
}

function getConflicts(entry: ClassEntry, allData: ClassEntry[]): DuplicateConflict[] {
  const conflicts: DuplicateConflict[] = [];
  for (const student of entry.students) {
    const others = allData.filter(
      e => e.classCode !== entry.classCode &&
        e.course === entry.course &&
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

async function apiUpdateSala(classCode: string, sala: number): Promise<{ ok?: boolean; error?: string }> {
  const res = await fetch(`/api/schedule/classes/${encodeURIComponent(classCode)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sala }),
  });
  return res.json();
}

function ClassCell({
  entry,
  onSelect,
  selected,
  highlighted,
  dimmed,
}: {
  entry: ClassEntry;
  onSelect: (e: ClassEntry) => void;
  selected: boolean;
  highlighted?: boolean;
  dimmed?: boolean;
}) {
  const solidBg = COURSE_SOLID_COLORS[entry.course] ?? "bg-slate-500";
  const count = entry.students.length;
  const isFull = count >= MAX_STUDENTS;
  const isOverCapacity = count > NORMAL_CAPACITY;

  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full h-full text-left align-top cursor-pointer transition-all duration-150 ${
        selected
          ? "bg-primary/5 outline outline-2 outline-primary outline-offset-[-2px]"
          : highlighted
          ? "bg-yellow-50 outline outline-2 outline-yellow-400 outline-offset-[-2px] shadow-inner"
          : dimmed
          ? "opacity-30 grayscale-[60%]"
          : "hover:bg-muted/60"
      }`}
    >
      <div className="p-1.5">
        <div className="flex items-start justify-between gap-1 mb-1">
          <span className={`${solidBg} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md leading-tight`}>
            {entry.classCode}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md leading-tight shrink-0 ${
            isOverCapacity
              ? "bg-amber-200 text-amber-800 animate-pulse"
              : isFull
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
          {entry.students.slice(0, MAX_STUDENTS).map((s, i) => (
            <li key={i} className={`text-[10px] leading-4 truncate rounded px-0.5 ${
              i >= NORMAL_CAPACITY
                ? "bg-amber-200 text-amber-900 font-semibold"
                : "text-foreground"
            }`}>
              <span className={`font-semibold ${i >= NORMAL_CAPACITY ? "text-amber-700" : "text-muted-foreground"}`}>{i + 1}.</span> {s}
            </li>
          ))}
          {count > MAX_STUDENTS && (
            <li className="text-[10px] text-amber-700 font-semibold leading-4 bg-amber-100 rounded px-0.5">
              +{count - MAX_STUDENTS} más...
            </li>
          )}
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
  const [editingSala, setEditingSala] = useState(false);
  const [salaInput, setSalaInput] = useState(String(entry.sala));
  const [savingSala, setSavingSala] = useState(false);
  const [salaError, setSalaError] = useState("");

  async function handleSaveSala() {
    const num = parseInt(salaInput, 10);
    if (!num || num < 1 || num > 20) { setSalaError("Número inválido"); return; }
    setSavingSala(true);
    setSalaError("");
    try {
      const result = await apiUpdateSala(entry.classCode, num);
      if (result.error) { setSalaError(result.error); }
      else { setEditingSala(false); onStudentChange(); }
    } catch { setSalaError("Error de conexión"); }
    finally { setSavingSala(false); }
  }

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
  const isOverCapacity = entry.students.length > NORMAL_CAPACITY;

  // Detectar conflictos en tiempo real mientras se escribe
  const previewConflicts = useMemo(() => {
    const name = newStudentName.trim().toLowerCase();
    if (!name) return [];
    const results: { classEntry: ClassEntry; matchedName: string }[] = [];
    for (const e of allData) {
      if (e.classCode === entry.classCode) continue;
      if (e.course !== entry.course) continue;
      for (const s of e.students) {
        if (s.toLowerCase().includes(name)) {
          results.push({ classEntry: e, matchedName: s });
        }
      }
    }
    return results;
  }, [newStudentName, allData, entry]);

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

            {/* Sala — editable inline */}
            <div className="bg-muted/50 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Sala</span>
              </div>
              {editingSala ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={salaInput}
                    onChange={e => { setSalaInput(e.target.value); setSalaError(""); }}
                    onKeyDown={e => { if (e.key === "Enter") handleSaveSala(); if (e.key === "Escape") setEditingSala(false); }}
                    className="w-14 px-2 py-1 text-sm font-bold border border-primary rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveSala}
                    disabled={savingSala}
                    className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {savingSala ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditingSala(false); setSalaInput(String(entry.sala)); setSalaError(""); }}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm text-foreground">Sala {entry.sala}</span>
                  <button
                    onClick={() => { setEditingSala(true); setSalaInput(String(entry.sala)); }}
                    className="p-1 rounded-lg hover:bg-muted/80 transition-colors text-muted-foreground/60 hover:text-primary"
                    title="Cambiar sala"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
              {salaError && <p className="text-[10px] text-destructive mt-1">{salaError}</p>}
            </div>
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
                isOverCapacity ? "bg-amber-200 text-amber-800" : isFull ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary"
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
                    className={`flex-1 px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 placeholder:text-muted-foreground transition-colors ${
                      previewConflicts.length > 0
                        ? "border-amber-400 focus:ring-amber-300"
                        : "border-border focus:ring-primary/50"
                    }`}
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

                {/* Aviso en tiempo real: alumno ya inscrito en otra clase del mismo ramo */}
                {previewConflicts.length > 0 && (
                  <div className="mt-2 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="text-xs font-bold text-amber-800">
                        Ya inscrito en {entry.course}
                      </span>
                    </div>
                    {previewConflicts.map((pc, i) => (
                      <div key={i} className="text-xs text-amber-700 bg-amber-100/70 rounded-lg px-2.5 py-1.5 leading-snug">
                        <span className="font-semibold">{pc.matchedName}</span>
                        {" — "}
                        <span className="font-medium">{DAY_LABELS[pc.classEntry.day] ?? pc.classEntry.day}</span>
                        {" · "}
                        {pc.classEntry.time}
                        {" · "}
                        Sala {pc.classEntry.sala}
                        {" · "}
                        Profe {pc.classEntry.teacher}
                      </div>
                    ))}
                  </div>
                )}

                {addError && (
                  <p className="mt-2 text-xs text-destructive font-medium">{addError}</p>
                )}
              </div>
            )}

            {isOverCapacity && (
              <div className="mb-3 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 font-medium">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                Clase sobre el cupo — tiene {entry.students.length} alumnos (máximo {MAX_STUDENTS}). Los alumnos resaltados superan el cupo normal.
              </div>
            )}
            {!isOverCapacity && isFull && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-medium">
                Clase completa — máximo {MAX_STUDENTS} alumnos alcanzado.
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
                  const isExtraStudent = i >= NORMAL_CAPACITY;
                  return (
                    <li
                      key={i}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-colors group ${
                        isExtraStudent
                          ? "bg-amber-100 border border-amber-300"
                          : hasConflict
                          ? "bg-amber-50 border border-amber-200"
                          : "bg-muted/40 hover:bg-muted/70"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isExtraStudent
                          ? "bg-amber-400 text-white"
                          : hasConflict
                          ? "bg-amber-100 text-amber-700"
                          : "bg-primary/10 text-primary"
                      }`}>
                        {isExtraStudent ? "!" : hasConflict ? <AlertTriangle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-medium ${isExtraStudent ? "text-amber-900 font-semibold" : hasConflict ? "text-amber-800" : "text-foreground"}`}>
                          {s}
                        </span>
                        {isExtraStudent && (
                          <div className="text-[11px] text-amber-700 font-medium mt-0.5">Alumno #{i + 1} — fuera del cupo normal (7)</div>
                        )}
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

  const gridData = useMemo(() => {
    return sedeData.filter(entry => {
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
  }, [sedeData, selectedTeacher, search]);

  const filteredData = useMemo(() => {
    if (!selectedCourse) return gridData;
    return gridData.filter(entry => entry.course === selectedCourse);
  }, [gridData, selectedCourse]);

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
    setSelectedDays(prev => {
      const allSelected = prev.length === DAYS.length;
      if (allSelected) {
        return [day];
      }
      if (prev.includes(day)) {
        return prev.length > 1 ? prev.filter(d => d !== day) : DAYS;
      }
      return [...prev, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
    });
  }

  function getEntry(day: string, time: string, sala: number): ClassEntry | undefined {
    return gridData.find(
      e => e.day === day && e.time === time && e.sala === sala
    );
  }

  const liveSelectedEntry = useMemo(() => {
    if (!selectedEntry) return null;
    return allData.find(e => e.classCode === selectedEntry.classCode) ?? null;
  }, [selectedEntry, allData]);

  const salasPerDay = useMemo(() => {
    const map: Record<string, number> = {};
    const minSalas = SEDE_ROOMS_MIN[activeSede] ?? 1;
    for (const day of DAYS) {
      const dayEntries = sedeData.filter(e => e.day === day);
      const maxSala = dayEntries.reduce((mx, e) => Math.max(mx, e.sala), 0);
      map[day] = Math.max(maxSala, minSalas);
    }
    return map;
  }, [sedeData, activeSede]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartX = useRef(0);
  const hasMoved = useRef(false);

  function handleMouseDown(e: React.MouseEvent) {
    if (!scrollRef.current) return;
    isDragging.current = true;
    hasMoved.current = false;
    dragStartX.current = e.clientX;
    scrollStartX.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = "grabbing";
    scrollRef.current.style.userSelect = "none";
  }
  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging.current || !scrollRef.current) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > 4) hasMoved.current = true;
    scrollRef.current.scrollLeft = scrollStartX.current - dx;
  }
  function handleMouseUp() {
    if (!scrollRef.current) return;
    isDragging.current = false;
    scrollRef.current.style.cursor = "grab";
    scrollRef.current.style.removeProperty("user-select");
  }
  function handleClickCapture(e: React.MouseEvent) {
    if (hasMoved.current) {
      e.stopPropagation();
      e.preventDefault();
      hasMoved.current = false;
    }
  }

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

            <div className="bg-card rounded-2xl border border-border/50 shadow-sm mb-4 overflow-hidden">
              <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border/40">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar alumno o materia..."
                    className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                </div>
                <div className="flex rounded-xl overflow-hidden border border-border/60 shadow-sm shrink-0">
                  {SEDES.map((sede) => (
                    <button
                      key={sede}
                      onClick={() => setActiveSede(sede)}
                      className={`px-5 py-2 text-sm font-semibold transition-colors ${
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
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-destructive border border-destructive/20 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    Limpiar
                  </button>
                )}
              </div>

              <div className="divide-y divide-border/30">
                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pt-1 w-24 shrink-0">
                    Asignaturas
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {courses.map((c) => {
                      const colorClass = COURSE_SOLID_COLORS[c] ?? "bg-slate-500";
                      const isActive = selectedCourse === c;
                      return (
                        <button
                          key={c}
                          onClick={() => setSelectedCourse(isActive ? "" : c)}
                          title={COURSE_FULL_NAMES[c] ?? c}
                          className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all duration-150 ${
                            isActive
                              ? `${colorClass} text-white border-transparent shadow-md scale-105`
                              : "bg-background border-border text-foreground/70 hover:text-foreground hover:border-primary/40 hover:bg-muted/50"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4 px-4 py-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest w-24 shrink-0">
                    Días
                  </span>
                  <div className="flex gap-1.5 flex-wrap">
                    <button
                      onClick={() => setSelectedDays(DAYS)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
                        selectedDays.length === DAYS.length
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                      }`}
                    >
                      Todos
                    </button>
                    <span className="w-px bg-border/60 self-stretch mx-0.5" />
                    {DAYS.map((day) => {
                      const allActive = selectedDays.length === DAYS.length;
                      const highlighted = !allActive && selectedDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all duration-150 ${
                            highlighted
                              ? "bg-primary text-primary-foreground border-primary shadow-sm"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                          }`}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest pt-1 w-24 shrink-0">
                    Profesor
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {teachers.map((t) => {
                      const isActive = selectedTeacher === t;
                      return (
                        <button
                          key={t}
                          onClick={() => setSelectedTeacher(isActive ? "" : t)}
                          className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg border transition-all duration-150 ${
                            isActive
                              ? "bg-secondary text-secondary-foreground border-transparent shadow-md ring-2 ring-offset-1 ring-secondary"
                              : "bg-background text-muted-foreground border-border hover:border-secondary/60 hover:text-secondary"
                          }`}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>
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

              <div
                ref={scrollRef}
                className="overflow-x-auto cursor-grab"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClickCapture={handleClickCapture}
              >
                <table className="border-collapse text-[11px]" style={{ tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th
                        rowSpan={2}
                        className="sticky left-0 z-30 bg-card border border-border px-2 py-2 text-center font-bold text-[11px] text-foreground w-[96px] min-w-[96px] align-middle"
                      >
                        Horario
                      </th>
                      {visibleDays.map((day) => (
                        <th
                          key={day}
                          colSpan={salasPerDay[day] || 1}
                          className="border border-border px-2 py-2 text-center font-display font-bold text-[12px] text-primary bg-primary/10"
                        >
                          {DAY_LABELS[day]}
                        </th>
                      ))}
                    </tr>
                    <tr>
                      {visibleDays.map((day) =>
                        Array.from({ length: salasPerDay[day] || 1 }, (_, i) => (
                          <th
                            key={`${day}-sala-${i}`}
                            className="border border-border px-1 py-1.5 text-center font-semibold text-[10px] text-muted-foreground bg-muted w-[110px] min-w-[110px]"
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
                        Array.from({ length: salasPerDay[day] || 1 }, (_, i) => getEntry(day, time, i + 1)).some(Boolean)
                      );
                      if (!hasAny && hasFilters) return null;
                      return (
                        <tr key={time}>
                          <td className="sticky left-0 z-10 bg-card border border-border px-2 py-1 text-center font-bold text-[10px] text-muted-foreground align-middle whitespace-nowrap w-[96px] min-w-[96px]">
                            {time}
                          </td>
                          {visibleDays.map((day) =>
                            Array.from({ length: salasPerDay[day] || 1 }, (_, i) => {
                              const entry = getEntry(day, time, i + 1);
                              return (
                                <td key={`${day}-${i}`} className="border border-border p-0 align-top w-[110px] min-w-[110px]">
                                  {entry ? (
                                    <ClassCell
                                      entry={entry}
                                      onSelect={setSelectedEntry}
                                      selected={liveSelectedEntry?.classCode === entry.classCode}
                                      highlighted={!!selectedCourse && entry.course === selectedCourse}
                                      dimmed={!!selectedCourse && entry.course !== selectedCourse}
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
