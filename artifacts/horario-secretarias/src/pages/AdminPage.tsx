import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  Plus, Trash2, RefreshCw, AlertTriangle, BookOpen,
  Search, X, CheckCircle, ChevronDown, Upload, FileSpreadsheet,
  Pencil, Check,
} from "lucide-react";
import {
  DAYS, DAY_LABELS, TIME_SLOTS, COURSE_FULL_NAMES,
  type ClassEntry,
} from "@/data/schedule";
import { useHorario } from "@/context/HorarioContext";

const SEDE_DISPLAY: Record<string, string> = {
  "LAS ENCINAS": "Las Encinas",
  "INES DE SUAREZ": "Inés de Suárez",
  "D. ALMAGRO": "D. Almagro",
  "VILLARRICA": "Villarrica",
  "AV. ALEMANIA": "Av. Alemania",
};
function displaySede(sede: string): string {
  return SEDE_DISPLAY[sede] ?? sede;
}

const COURSES = Object.keys(COURSE_FULL_NAMES);

const COURSE_COLORS: Record<string, string> = {
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

const DAY_SHORT: Record<string, string> = {
  LUNES: "LUN", MARTES: "MAR", MIERCOLES: "MIE", JUEVES: "JUE", VIERNES: "VIE",
};

function generateClassCode(course: string, day: string, time: string, teacher: string) {
  const dayShort = DAY_SHORT[day] ?? day.slice(0, 3);
  const timeShort = time.split(/[\s\-–]+/)[0].replace(":", ".");
  return `${course} ${dayShort} ${timeShort} ${teacher}`.toUpperCase();
}

async function apiCreateClass(data: {
  day: string; time: string; sede: string; sala: number; course: string; teacher: string; horario: string;
}) {
  const res = await fetch("/api/schedule/classes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiUpdateClass(classCode: string, data: {
  course?: string; day?: string; time?: string; teacher?: string; sede?: string; sala?: number;
}) {
  const res = await fetch(`/api/schedule/classes/${encodeURIComponent(classCode)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

async function apiDeleteClass(classCode: string) {
  const res = await fetch(`/api/schedule/classes/${encodeURIComponent(classCode)}`, {
    method: "DELETE",
  });
  return res.json();
}

async function apiResetAll(horarioId: string) {
  const res = await fetch(`/api/schedule/classes?horario=${horarioId}`, { method: "DELETE" });
  return res.json();
}

const emptyForm = {
  sede: "LAS ENCINAS" as string,
  course: "",
  day: "",
  time: "",
  sala: "",
  teacher: "",
};

export default function AdminPage() {
  const { horarioId, horario } = useHorario();
  const [allData, setAllData] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => ({ ...emptyForm, sede: horario.sedes[0] }));
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterSede, setFilterSede] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; updated: number; skipped: number; totalStudents: number; parseErrors: string[];
    perCampus?: Record<string, { students: number; created: number; updated: number }>;
  } | null>(null);
  const [importError, setImportError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm, sede: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule?horario=${horarioId}`);
      const json = await res.json();
      setAllData(json);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [horarioId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    setAllData([]);
    setLoading(true);
    setForm({ ...emptyForm, sede: horario.sedes[0] });
    setSearch("");
    setFilterSede("");
    setFilterCourse("");
  }, [horarioId, horario.sedes]);

  const preview = useMemo(() => {
    if (!form.course || !form.day || !form.time || !form.teacher) return "";
    return generateClassCode(form.course, form.day, form.time, form.teacher);
  }, [form.course, form.day, form.time, form.teacher]);

  const filteredList = useMemo(() => {
    return allData.filter(e => {
      if (filterSede && e.sede !== filterSede) return false;
      if (filterCourse && e.course !== filterCourse) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !e.classCode.toLowerCase().includes(q) &&
          !e.course.toLowerCase().includes(q) &&
          !e.teacher.toLowerCase().includes(q) &&
          !DAY_LABELS[e.day]?.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [allData, filterSede, filterCourse, search]);

  const statsBySede = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of allData) {
      map[e.sede] = (map[e.sede] ?? 0) + 1;
    }
    return map;
  }, [allData]);

  const existingCourses = useMemo(
    () => [...new Set(allData.map(e => e.course))].sort(),
    [allData]
  );

  function setField(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
    setFormError("");
    setFormSuccess("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.course || !form.day || !form.time || !form.teacher || !form.sala) {
      setFormError("Completa todos los campos.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    setFormSuccess("");
    try {
      const result = await apiCreateClass({
        day: form.day,
        time: form.time,
        sede: form.sede,
        sala: Number(form.sala),
        course: form.course,
        teacher: form.teacher,
        horario: horarioId,
      });
      if (result.error === "duplicate") {
        setFormError(`Ya existe la clase "${result.message?.split('"')[1] ?? preview}".`);
      } else if (result.error) {
        setFormError(result.message ?? "Error al crear la clase.");
      } else {
        setFormSuccess(`Clase "${result.classCode}" creada correctamente.`);
        setForm(f => ({ ...f, course: "", teacher: "", sala: "" }));
        fetchData();
      }
    } catch {
      setFormError("Error de conexión.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(classCode: string) {
    setDeletingCode(classCode);
    try {
      await apiDeleteClass(classCode);
      fetchData();
    } finally {
      setDeletingCode(null);
    }
  }

  function handleStartEdit(entry: ClassEntry) {
    if (editingCode === entry.classCode) {
      setEditingCode(null);
      return;
    }
    setEditForm({
      sede: entry.sede,
      course: entry.course,
      day: entry.day,
      time: entry.time,
      sala: String(entry.sala),
      teacher: entry.teacher,
    });
    setEditError("");
    setEditingCode(entry.classCode);
  }

  async function handleSaveEdit() {
    if (!editingCode) return;
    if (!editForm.course || !editForm.day || !editForm.time || !editForm.teacher || !editForm.sala) {
      setEditError("Completa todos los campos.");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      const result = await apiUpdateClass(editingCode, {
        course: editForm.course,
        day: editForm.day,
        time: editForm.time,
        teacher: editForm.teacher,
        sede: editForm.sede,
        sala: Number(editForm.sala),
      });
      if (result.error) {
        setEditError(result.error);
      } else {
        setEditingCode(null);
        fetchData();
      }
    } catch {
      setEditError("Error de conexión.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await apiResetAll(horarioId);
      setConfirmReset(false);
      fetchData();
    } finally {
      setResetting(false);
    }
  }

  async function handleImportFile(file: File) {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setImportError("Solo se aceptan archivos Excel (.xlsx)");
      return;
    }
    setImporting(true);
    setImportResult(null);
    setImportError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/schedule/import", { method: "POST", body: formData });
      const json = await res.json();
      if (json.error) {
        setImportError(json.error);
      } else {
        setImportResult(json);
        fetchData();
      }
    } catch {
      setImportError("Error de conexión al importar.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground mb-1">Panel Administrativo</h1>
            <p className="text-muted-foreground text-sm">Crea y gestiona los cursos del año académico.</p>
          </div>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-destructive border border-destructive/30 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar todo — Nuevo año
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2.5">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-sm font-medium text-destructive">¿Eliminar TODAS las clases?</span>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="ml-2 px-3 py-1 text-xs font-bold bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-60"
              >
                {resetting ? "Eliminando..." : "Confirmar"}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1 text-xs font-bold bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
            <div className="text-2xl font-display font-bold text-primary">{allData.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Clases totales</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
            <div className="text-2xl font-display font-bold text-secondary">{statsBySede["LAS ENCINAS"] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Las Encinas</div>
          </div>
          <div className="bg-card rounded-2xl border border-border/50 p-4 text-center shadow-sm">
            <div className="text-2xl font-display font-bold text-secondary">{statsBySede["INES DE SUAREZ"] ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">Inés de Suárez</div>
          </div>
        </div>

        {/* Importar desde Excel */}
        <div className="mb-6">
          <div
            className={`bg-card rounded-3xl border-2 border-dashed shadow-sm transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border/60"
            }`}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleImportFile(file);
            }}
          >
            <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-foreground">Importar desde Excel</h2>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200">
                    Todos los campus
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sube el exportado del sistema y se cargan automáticamente Temuco, D. Almagro, Villarrica y Av. Alemania.
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleImportFile(file);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {importing
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importando...</>
                    : <><Upload className="w-4 h-4" /> Seleccionar archivo</>
                  }
                </button>
              </div>
            </div>

            {/* Resultado de importación */}
            {importResult && (
              <div className="px-6 pb-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-sm font-bold text-emerald-800">Importación completada — todos los campus</span>
                  </div>
                  <div className="flex flex-wrap gap-5 text-sm">
                    <div><span className="font-bold text-emerald-700">{importResult.totalStudents}</span><span className="text-emerald-600"> alumnos procesados</span></div>
                    {importResult.created > 0 && (
                      <div><span className="font-bold text-emerald-700">{importResult.created}</span><span className="text-emerald-600"> clases nuevas</span></div>
                    )}
                    <div><span className="font-bold text-emerald-700">{importResult.updated}</span><span className="text-emerald-600"> clases actualizadas</span></div>
                    {importResult.skipped > 0 && (
                      <div><span className="font-bold text-amber-700">{importResult.skipped}</span><span className="text-amber-600"> omitidas</span></div>
                    )}
                  </div>
                  {importResult.perCampus && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                      {Object.entries(importResult.perCampus).map(([id, data]) => {
                        const labels: Record<string, string> = { TEMUCO: "Temuco", ALMAGRO: "D. Almagro", VILLARRICA: "Villarrica", AV_ALEMANIA: "Av. Alemania" };
                        return (
                          <div key={id} className="bg-white border border-emerald-200 rounded-xl px-3 py-2">
                            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">{labels[id] ?? id}</p>
                            <p className="text-lg font-display font-bold text-foreground">{data.students}</p>
                            <p className="text-[10px] text-muted-foreground">alumnos</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {importResult.parseErrors.length > 0 && (
                    <details className="w-full">
                      <summary className="text-xs text-amber-700 cursor-pointer font-medium">
                        Ver clases omitidas ({importResult.parseErrors.length})
                      </summary>
                      <ul className="mt-2 space-y-0.5">
                        {importResult.parseErrors.map((c, i) => (
                          <li key={i} className="text-xs text-amber-600 font-mono">{c}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            )}
            {importError && (
              <div className="px-6 pb-5">
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="text-sm text-red-700 font-medium">{importError}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          <div className="lg:col-span-1">
            <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden sticky top-24">
              <div className="px-6 py-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Nueva Clase</h2>
                    <p className="text-xs text-muted-foreground">Completa los campos para agregar</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sede</label>
                  <div className="flex rounded-xl overflow-hidden border border-border/60">
                    {horario.sedes.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setField("sede", s)}
                        className={`flex-1 py-2 text-xs font-bold transition-colors ${
                          form.sede === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {displaySede(s)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Asignatura</label>
                  <div className="relative">
                    <select
                      value={form.course}
                      onChange={e => setField("course", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground appearance-none pr-8"
                    >
                      <option value="">Seleccionar asignatura...</option>
                      {COURSES.map(c => (
                        <option key={c} value={c}>{c} — {COURSE_FULL_NAMES[c]}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Día</label>
                    <div className="relative">
                      <select
                        value={form.day}
                        onChange={e => setField("day", e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground appearance-none pr-8"
                      >
                        <option value="">Día...</option>
                        {DAYS.map(d => (
                          <option key={d} value={d}>{DAY_LABELS[d]}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Sala</label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={form.sala}
                      onChange={e => setField("sala", e.target.value)}
                      placeholder="Nº sala"
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Horario</label>
                  <div className="relative">
                    <select
                      value={form.time}
                      onChange={e => setField("time", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground appearance-none pr-8"
                    >
                      <option value="">Seleccionar horario...</option>
                      {TIME_SLOTS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Profesor (iniciales)</label>
                  <input
                    type="text"
                    value={form.teacher}
                    onChange={e => setField("teacher", e.target.value.toUpperCase())}
                    placeholder="Ej: JR, PF, DE..."
                    maxLength={4}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground uppercase"
                  />
                </div>

                {preview && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Código generado</div>
                    <div className="font-display font-bold text-primary text-sm">{preview}</div>
                  </div>
                )}

                {formError && (
                  <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2.5 text-xs text-destructive">
                    <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {formError}
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 text-xs text-emerald-700">
                    <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {formSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                >
                  {submitting ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Creando...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Crear clase</>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card rounded-3xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
              <div className="px-6 py-5 border-b border-border/50 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-display font-bold text-foreground">Todas las clases</h2>
                    <p className="text-xs text-muted-foreground">{filteredList.length} de {allData.length}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-b border-border/30 flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar clase, profesor, día..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                  />
                </div>
                <select
                  value={filterSede}
                  onChange={e => setFilterSede(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option value="">Todas las sedes</option>
                  {horario.sedes.map(s => (
                    <option key={s} value={s}>{displaySede(s)}</option>
                  ))}
                </select>
                <select
                  value={filterCourse}
                  onChange={e => setFilterCourse(e.target.value)}
                  className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                >
                  <option value="">Todos los cursos</option>
                  {existingCourses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                {(search || filterSede || filterCourse) && (
                  <button
                    onClick={() => { setSearch(""); setFilterSede(""); setFilterCourse(""); }}
                    className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Cargando...
                </div>
              ) : filteredList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <BookOpen className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No hay clases aún</p>
                  <p className="text-xs mt-1">Usa el formulario para crear las clases del año.</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[640px]">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-muted/70 border-b border-border/50 text-left">
                        <th className="px-4 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Código</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sede</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Día</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Horario</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Sala</th>
                        <th className="px-3 py-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Prof.</th>
                        <th className="px-3 py-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredList.map(entry => {
                        const badge = COURSE_COLORS[entry.course] ?? "bg-slate-100 text-slate-800 border-slate-200";
                        const isDeleting = deletingCode === entry.classCode;
                        const isEditing = editingCode === entry.classCode;
                        return (
                          <React.Fragment key={entry.classCode}>
                          <tr className={`hover:bg-muted/30 transition-colors ${isDeleting ? "opacity-40" : ""} ${isEditing ? "bg-primary/5" : ""}`}>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold border ${badge}`}>
                                {entry.course}
                              </span>
                              <div className="text-xs text-muted-foreground mt-0.5 font-mono">{entry.classCode}</div>
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {displaySede(entry.sede)}
                            </td>
                            <td className="px-3 py-3 text-xs font-medium text-foreground whitespace-nowrap">
                              {DAY_LABELS[entry.day] ?? entry.day}
                            </td>
                            <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{entry.time}</td>
                            <td className="px-3 py-3 text-xs text-center font-semibold text-foreground">{entry.sala}</td>
                            <td className="px-3 py-3">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-muted text-xs font-bold text-foreground">
                                {entry.teacher}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleStartEdit(entry)}
                                  disabled={isDeleting}
                                  className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${isEditing ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                                  title="Editar clase"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(entry.classCode)}
                                  disabled={isDeleting}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                                  title="Eliminar clase"
                                >
                                  {isDeleting
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                  }
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isEditing && (
                            <tr className="bg-primary/5 border-b border-primary/20">
                              <td colSpan={7} className="px-4 py-3">
                                <div className="flex flex-wrap gap-2 items-end">
                                  {horario.sedes.length > 1 && (
                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sede</label>
                                      <select value={editForm.sede} onChange={e => setEditForm(f => ({ ...f, sede: e.target.value }))}
                                        className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground">
                                        {horario.sedes.map(s => <option key={s} value={s}>{displaySede(s)}</option>)}
                                      </select>
                                    </div>
                                  )}
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Curso</label>
                                    <select value={editForm.course} onChange={e => setEditForm(f => ({ ...f, course: e.target.value }))}
                                      className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground">
                                      <option value="">Curso...</option>
                                      {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Día</label>
                                    <select value={editForm.day} onChange={e => setEditForm(f => ({ ...f, day: e.target.value }))}
                                      className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground">
                                      <option value="">Día...</option>
                                      {DAYS.map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Horario</label>
                                    <select value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))}
                                      className="px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground">
                                      <option value="">Horario...</option>
                                      {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Sala</label>
                                    <input type="number" min={1} max={10} value={editForm.sala}
                                      onChange={e => setEditForm(f => ({ ...f, sala: e.target.value }))}
                                      className="w-16 px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Prof.</label>
                                    <input type="text" value={editForm.teacher} maxLength={4}
                                      onChange={e => setEditForm(f => ({ ...f, teacher: e.target.value.toUpperCase() }))}
                                      className="w-16 px-2 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 uppercase" />
                                  </div>
                                  <div className="flex gap-1 ml-1">
                                    <button onClick={handleSaveEdit} disabled={savingEdit}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
                                      {savingEdit ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                      Guardar
                                    </button>
                                    <button onClick={() => setEditingCode(null)}
                                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors">
                                      <X className="w-3 h-3" /> Cancelar
                                    </button>
                                  </div>
                                  {editError && (
                                    <div className="w-full text-xs text-destructive font-medium flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> {editError}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
