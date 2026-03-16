import { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";
import { Camera, Download, Loader2 } from "lucide-react";
import { DAYS, DAY_LABELS, TIME_SLOTS, type ClassEntry } from "@/data/schedule";
import { useHorario } from "@/context/HorarioContext";

// ─── plain hex colors per course (used in inline styles for png export) ───────
const COURSE_BG: Record<string, string> = {
  "M1":       "#fef9c3", "M1 INT":   "#fef08a", "M1 CONT":  "#fde047",
  "M2":       "#fef3c7", "M2 INT":   "#fde68a",
  "MT":       "#f0fdf4", "MS":       "#fef9c3", "MP":       "#fefce8",
  "LN":       "#fee2e2", "LN INT":   "#fecaca", "LN CONT":  "#fca5a5",
  "LT":       "#ffe4e6", "LS":       "#fecdd3", "LP":       "#fef2f2",
  "FIS":      "#ffedd5", "FIS INT":  "#fed7aa", "FIS CONT": "#fdba74",
  "QUI":      "#cffafe", "QUI INT":  "#a5f3fc", "QUI CONT": "#99f6e4",
  "BIO":      "#dcfce7", "BIO INT":  "#bbf7d0", "BIO CONT": "#a7f3d0",
  "HS":       "#f3f4f6", "HS INT":   "#e5e7eb", "HIS":      "#f3f4f6", "HIS INT": "#e5e7eb",
  "CS":       "#f1f5f9",
};
const COURSE_TEXT: Record<string, string> = {
  "M1": "#713f12", "M1 INT": "#713f12", "M1 CONT": "#713f12",
  "M2": "#92400e", "M2 INT": "#92400e",
  "MT": "#166534", "MS": "#78350f", "MP": "#854d0e",
  "LN": "#991b1b", "LN INT": "#991b1b", "LN CONT": "#7f1d1d",
  "LT": "#9f1239", "LS": "#881337", "LP": "#b91c1c",
  "FIS": "#9a3412", "FIS INT": "#9a3412", "FIS CONT": "#7c2d12",
  "QUI": "#164e63", "QUI INT": "#155e75", "QUI CONT": "#134e4a",
  "BIO": "#14532d", "BIO INT": "#166534", "BIO CONT": "#065f46",
  "HS": "#374151", "HS INT": "#374151", "HIS": "#374151", "HIS INT": "#374151",
  "CS": "#475569",
};

function cellBg(course: string) { return COURSE_BG[course] ?? "#f8fafc"; }
function cellText(course: string) { return COURSE_TEXT[course] ?? "#1e293b"; }

// ─── Fixed sala count per sede ────────────────────────────────────────────────
const SEDE_MAX_SALAS: Record<string, number> = {
  "INES DE SUAREZ": 5,
  "LAS ENCINAS":    7,
  "D. ALMAGRO":     6,
  "VILLARRICA":     4,
  "AV. ALEMANIA":   4,
};

// ─── The actual grid component — uses pure inline styles for clean png export ─
interface GridProps {
  classes: ClassEntry[];
  sede: string;
  day: string;
  dayLabel: string;
  sedeLabel: string;
}

function ScheduleGrid({ classes, sede, day, dayLabel, sedeLabel }: GridProps) {
  const maxSala = SEDE_MAX_SALAS[sede] ?? Math.max(...(classes.map(c => c.sala).concat([4])));
  const salas = Array.from({ length: maxSala }, (_, i) => i + 1);

  const byTimeAndSala: Record<string, Record<number, ClassEntry>> = {};
  for (const cls of classes) {
    if (!byTimeAndSala[cls.time]) byTimeAndSala[cls.time] = {};
    byTimeAndSala[cls.time][cls.sala] = cls;
  }

  // Only rows that have at least one active class
  const allTimes = TIME_SLOTS.filter(t =>
    salas.some(s => byTimeAndSala[t]?.[s])
  );

  const COL_W = 180;
  const TIME_W = 95;
  const ROW_H = 120;
  const HEADER_H = 42;
  const totalW = TIME_W + salas.length * COL_W;
  const totalH = HEADER_H + allTimes.length * ROW_H;

  return (
    <div
      style={{
        width: totalW,
        fontFamily: "'Arial', sans-serif",
        fontSize: 12,
        color: "#111",
        border: "1px solid #d1d5db",
        borderRadius: 4,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Top label */}
      <div style={{
        background: "#374151",
        color: "#fff",
        textAlign: "center",
        padding: "6px 0",
        fontWeight: 700,
        fontSize: 14,
        letterSpacing: 1,
      }}>
        {sedeLabel} — {dayLabel}
      </div>

      {/* Header row */}
      <div style={{ display: "flex", height: HEADER_H, borderBottom: "2px solid #9ca3af" }}>
        <div style={{
          width: TIME_W, minWidth: TIME_W, flexShrink: 0,
          background: "#f9fafb",
          borderRight: "1px solid #d1d5db",
        }} />
        {salas.map(s => (
          <div
            key={s}
            style={{
              flex: 1, minWidth: COL_W,
              background: "#f9fafb",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "#374151",
              borderRight: s < salas[salas.length - 1] ? "1px solid #d1d5db" : undefined,
            }}
          >
            SALA {s}
          </div>
        ))}
      </div>

      {/* Rows */}
      {allTimes.map((time, ri) => (
        <div
          key={time}
          style={{
            display: "flex",
            height: ROW_H,
            borderBottom: ri < allTimes.length - 1 ? "1px solid #e5e7eb" : undefined,
          }}
        >
          {/* Time cell */}
          <div style={{
            width: TIME_W, minWidth: TIME_W, flexShrink: 0,
            background: "#f9fafb",
            borderRight: "1px solid #d1d5db",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 600, color: "#6b7280",
            textAlign: "center",
            padding: "0 4px",
          }}>
            {time}
          </div>

          {/* Sala cells */}
          {salas.map(sala => {
            const cls = byTimeAndSala[time]?.[sala];
            const bg = cls ? cellBg(cls.course) : "#ffffff";
            const fg = cls ? cellText(cls.course) : "#374151";
            return (
              <div
                key={sala}
                style={{
                  flex: 1, minWidth: COL_W,
                  background: bg,
                  borderRight: sala < salas[salas.length - 1] ? "1px solid #e5e7eb" : undefined,
                  padding: "6px 8px",
                  overflow: "hidden",
                }}
              >
                {cls && (
                  <>
                    <div style={{
                      fontWeight: 700, fontSize: 12, color: fg,
                      marginBottom: 3, lineHeight: 1.2,
                    }}>
                      {cls.classCode}
                    </div>
                    <div style={{ fontSize: 10, lineHeight: 1.4, color: fg }}>
                      {cls.students.map((s, i) => (
                        <div key={i}>{s}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Sede display names ───────────────────────────────────────────────────────
const SEDE_LABELS: Record<string, string> = {
  "LAS ENCINAS": "Las Encinas",
  "INES DE SUAREZ": "Inés de Suárez",
  "D. ALMAGRO": "D. Almagro",
  "VILLARRICA": "Villarrica",
  "AV. ALEMANIA": "Av. Alemania",
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FotoPage() {
  const { horarioId, horario } = useHorario();
  const [allData, setAllData] = useState<ClassEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [selectedSede, setSelectedSede] = useState(horario.sedes[0]);
  const [downloading, setDownloading] = useState<string | null>(null);

  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setSelectedSede(horario.sedes[0]);
  }, [horario.sedes]);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule?horario=${horarioId}`);
      const data: ClassEntry[] = await res.json();
      setAllData(data);
    } catch {}
    finally { setLoading(false); }
  }, [horarioId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const dayClasses = allData.filter(c => c.day === selectedDay && c.sede === selectedSede);

  async function handleDownload(sede: string, day: string) {
    const key = `${sede}-${day}`;
    const el = gridRefs.current[key];
    if (!el) return;
    setDownloading(key);
    try {
      const dataUrl = await toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        quality: 1,
      });
      const link = document.createElement("a");
      link.download = `${(SEDE_LABELS[sede] ?? sede).replace(/\s+/g, "_")}_${DAY_LABELS[day]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 md:pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
          <Camera className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-extrabold text-foreground">Fotos de Horario</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Descarga la imagen del horario diario por sede</p>
        </div>
      </div>

      {/* Day selector */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {DAYS.map(d => (
          <button
            key={d}
            onClick={() => setSelectedDay(d)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              selectedDay === d
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {DAY_LABELS[d]}
          </button>
        ))}
      </div>

      {/* Sede tabs */}
      {horario.sedes.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {horario.sedes.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSede(s)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                selectedSede === s
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
              }`}
            >
              {SEDE_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Cargando clases…
        </div>
      ) : (
        <>
          {/* Grid preview + download */}
          {horario.sedes.map(sede => {
            if (sede !== selectedSede) return null;
            const key = `${sede}-${selectedDay}`;
            const sedeClasses = allData.filter(c => c.day === selectedDay && c.sede === sede);
            return (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-display font-bold text-foreground">
                      {SEDE_LABELS[sede] ?? sede} — {DAY_LABELS[selectedDay]}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sedeClasses.length} clase{sedeClasses.length !== 1 ? "s" : ""} · vista previa del horario
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(sede, selectedDay)}
                    disabled={!!downloading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {downloading === key
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</>
                      : <><Download className="w-4 h-4" /> Descargar PNG</>
                    }
                  </button>
                </div>

                {/* Scroll wrapper for preview */}
                <div className="overflow-x-auto rounded-2xl border border-border/50 shadow-xl shadow-black/5">
                  <div
                    ref={el => { gridRefs.current[key] = el; }}
                    style={{ display: "inline-block" }}
                  >
                    <ScheduleGrid
                      classes={sedeClasses}
                      sede={sede}
                      day={selectedDay}
                      dayLabel={DAY_LABELS[selectedDay]}
                      sedeLabel={SEDE_LABELS[sede] ?? sede}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
