import { useState, useMemo } from "react";
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

function CourseTag({ course }: { course: string }) {
  const color = COURSE_COLORS[course] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold border ${color}`}>
      {course}
    </span>
  );
}

function ClassCard({
  entry,
  onSelect,
  selected,
}: {
  entry: ClassEntry;
  onSelect: (e: ClassEntry) => void;
  selected: boolean;
}) {
  const color = COURSE_COLORS[entry.course] ?? "bg-gray-50 border-gray-200";
  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full text-left rounded-lg border p-2 transition-all hover:shadow-md cursor-pointer ${color} ${selected ? "ring-2 ring-offset-1 ring-blue-500" : ""}`}
    >
      <div className="font-bold text-xs leading-tight">{entry.course}</div>
      <div className="text-[10px] text-gray-600 mt-0.5">Prof. {entry.teacher}</div>
      <div className="text-[10px] text-gray-500">Sala {entry.sala}</div>
    </button>
  );
}

function DetailPanel({ entry, onClose }: { entry: ClassEntry; onClose: () => void }) {
  const color = COURSE_COLORS[entry.course] ?? "bg-gray-50 border-gray-200";
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-gray-200 z-50 flex flex-col">
      <div className={`p-4 border-b ${color}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs text-gray-500 mb-1">{entry.sede}</div>
            <h2 className="text-lg font-bold">{entry.course}</h2>
            <div className="text-sm text-gray-600">{COURSE_FULL_NAMES[entry.course] ?? entry.course}</div>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded hover:bg-black/10 transition-colors text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Día</div>
            <div className="font-semibold text-sm">{DAY_LABELS[entry.day] ?? entry.day}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Horario</div>
            <div className="font-semibold text-sm">{entry.time}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Sala</div>
            <div className="font-semibold text-sm">Sala {entry.sala}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">Profesor</div>
            <div className="font-semibold text-sm">{entry.teacher}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Código de clase</div>
          <div className="font-mono text-sm bg-gray-100 rounded px-2 py-1">{entry.classCode}</div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-gray-700">Alumnos</div>
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {entry.students.length}
            </span>
          </div>
          {entry.students.length === 0 ? (
            <div className="text-sm text-gray-400 italic">Sin alumnos registrados</div>
          ) : (
            <ul className="space-y-1">
              {entry.students.map((s, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HorarioPage() {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedSede, setSelectedSede] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedEntry, setSelectedEntry] = useState<ClassEntry | null>(null);
  const [activeSede, setActiveSede] = useState<string>("LAS ENCINAS");

  const courses = useMemo(() => getUniqueCourses(), []);

  const filtered = useMemo(
    () =>
      filterSchedule({
        course: selectedCourse || undefined,
        sede: selectedSede || undefined,
        day: selectedDay || undefined,
        teacher: selectedTeacher || undefined,
        search: search || undefined,
      }),
    [selectedCourse, selectedSede, selectedDay, selectedTeacher, search]
  );

  const hasFilters = selectedCourse || selectedSede || selectedDay || selectedTeacher || search;

  function clearFilters() {
    setSelectedCourse("");
    setSelectedSede("");
    setSelectedDay("");
    setSelectedTeacher("");
    setSearch("");
  }

  function getEntry(day: string, time: string, sede: string, sala: number): ClassEntry | undefined {
    return filtered.find(
      (e) => e.day === day && e.time === time && e.sede === sede && e.sala === sala
    );
  }

  const activeDays = selectedDay ? [selectedDay] : DAYS;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-full px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Horario Temuco 2026</h1>
                <p className="text-xs text-gray-500">Gestión de clases por secretaría</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grilla
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Lista
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar alumno, curso..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
              />
            </div>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los cursos</option>
              {courses.map((c) => (
                <option key={c} value={c}>{c} {COURSE_FULL_NAMES[c] ? `- ${COURSE_FULL_NAMES[c]}` : ""}</option>
              ))}
            </select>

            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los días</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>

            <select
              value={selectedSede}
              onChange={(e) => setSelectedSede(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Ambas sedes</option>
              {SEDES.map((s) => (
                <option key={s} value={s}>{s === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpiar filtros
              </button>
            )}

            <span className="ml-auto text-xs text-gray-500">
              {filtered.length} clase{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        {viewMode === "grid" ? (
          <div className="space-y-6">
            {!selectedSede && (
              <div className="flex rounded-xl overflow-hidden border border-gray-200 w-fit shadow-sm">
                {SEDES.map((sede) => (
                  <button
                    key={sede}
                    onClick={() => setActiveSede(sede)}
                    className={`px-5 py-2 text-sm font-medium transition-colors ${activeSede === sede ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    {sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
                    <span className="ml-2 text-xs opacity-70">
                      ({filtered.filter(e => e.sede === sede).length})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {activeDays.map((day) => {
              const sedesShown = selectedSede ? [selectedSede] : [activeSede];
              const dayEntries = filtered.filter(e => e.day === day);
              if (dayEntries.length === 0 && hasFilters) return null;

              return (
                <div key={day} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                    <h2 className="font-bold text-base">{DAY_LABELS[day]}</h2>
                    <div className="text-blue-100 text-xs">{dayEntries.length} clase{dayEntries.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div className="overflow-x-auto">
                    {sedesShown.map((sede) => {
                      const numSalas = SEDE_ROOMS[sede];
                      const sedeEntries = filtered.filter(e => e.day === day && e.sede === sede);

                      return (
                        <div key={sede} className="mb-0">
                          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"} — {sedeEntries.length} clase{sedeEntries.length !== 1 ? "s" : ""}
                          </div>
                          <table className="min-w-full">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28 sticky left-0 bg-gray-50/80">Horario</th>
                                {Array.from({ length: numSalas }, (_, i) => (
                                  <th key={i} className="px-2 py-2 text-center text-xs font-medium text-gray-500 min-w-[90px]">
                                    Sala {i + 1}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {TIME_SLOTS.map((time) => {
                                const rowEntries = Array.from({ length: numSalas }, (_, i) =>
                                  getEntry(day, time, sede, i + 1)
                                );
                                const hasAny = rowEntries.some(Boolean);
                                if (!hasAny) return null;

                                return (
                                  <tr key={time} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                                    <td className="px-3 py-2 text-xs font-mono text-gray-500 whitespace-nowrap sticky left-0 bg-white">
                                      {time}
                                    </td>
                                    {rowEntries.map((entry, i) => (
                                      <td key={i} className="px-1.5 py-1.5 align-top">
                                        {entry ? (
                                          <ClassCard
                                            entry={entry}
                                            onSelect={setSelectedEntry}
                                            selected={selectedEntry?.classCode === entry.classCode}
                                          />
                                        ) : (
                                          <div className="w-full h-12 rounded-lg border border-dashed border-gray-100" />
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Curso</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Día</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Horario</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sede</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Sala</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Prof.</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Alumnos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                        No se encontraron clases con los filtros actuales
                      </td>
                    </tr>
                  ) : (
                    filtered.map((entry, idx) => (
                      <tr
                        key={idx}
                        onClick={() => setSelectedEntry(entry)}
                        className={`border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition-colors ${selectedEntry?.classCode === entry.classCode && selectedEntry.day === entry.day && selectedEntry.time === entry.time ? "bg-blue-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <CourseTag course={entry.course} />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{DAY_LABELS[entry.day] ?? entry.day}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600">{entry.time}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {entry.sede === "INES DE SUAREZ" ? "Inés de Suárez" : "Las Encinas"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">Sala {entry.sala}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-700">{entry.teacher}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{entry.students.length} alumnos</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {selectedEntry && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setSelectedEntry(null)}
          />
          <DetailPanel entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
        </>
      )}
    </div>
  );
}
