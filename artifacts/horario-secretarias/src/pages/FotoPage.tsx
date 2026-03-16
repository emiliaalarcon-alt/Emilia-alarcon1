import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { Camera, Download, Loader2 } from "lucide-react";
import { DAYS, DAY_LABELS, TIME_SLOTS, type ClassEntry } from "@/data/schedule";
import { useHorario } from "@/context/HorarioContext";

// ─── Hex values matching EXACTLY the Tailwind classes in COURSE_COLORS ────────
// Each entry mirrors: schedule.ts COURSE_COLORS bg-*/text-* → Tailwind v3 hex
const COURSE_BG: Record<string, string> = {
  "M1":       "#fef9c3",  // bg-yellow-100
  "M1 INT":   "#fef08a",  // bg-yellow-200
  "M1 CONT":  "#fde047",  // bg-yellow-300
  "M2":       "#fef3c7",  // bg-amber-100
  "M2 INT":   "#fde68a",  // bg-amber-200
  "MT":       "#ecfccb",  // bg-lime-100
  "MS":       "#fef3c7",  // bg-amber-100
  "MP":       "#fefce8",  // bg-yellow-50
  "LN":       "#fee2e2",  // bg-red-100
  "LN INT":   "#fecaca",  // bg-red-200
  "LN CONT":  "#fca5a5",  // bg-red-300
  "LT":       "#ffe4e6",  // bg-rose-100
  "LS":       "#ffe4e6",  // bg-rose-100
  "LP":       "#fef2f2",  // bg-red-50
  "FIS":      "#ffedd5",  // bg-orange-100
  "FIS INT":  "#fed7aa",  // bg-orange-200
  "FIS CONT": "#fdba74",  // bg-orange-300
  "QUI":      "#cffafe",  // bg-cyan-100
  "QUI INT":  "#a5f3fc",  // bg-cyan-200
  "QUI CONT": "#ccfbf1",  // bg-teal-100
  "BIO":      "#dcfce7",  // bg-green-100
  "BIO INT":  "#bbf7d0",  // bg-green-200
  "BIO CONT": "#d1fae5",  // bg-emerald-100
  "HS":       "#f3f4f6",  // bg-gray-100
  "HS INT":   "#e5e7eb",  // bg-gray-200
  "HIS":      "#f3f4f6",  // bg-gray-100
  "HIS INT":  "#e5e7eb",  // bg-gray-200
  "CS":       "#f1f5f9",  // bg-slate-100
};
const COURSE_TEXT: Record<string, string> = {
  "M1":       "#854d0e",  // text-yellow-800
  "M1 INT":   "#713f12",  // text-yellow-900
  "M1 CONT":  "#713f12",  // text-yellow-900
  "M2":       "#92400e",  // text-amber-800
  "M2 INT":   "#78350f",  // text-amber-900
  "MT":       "#3f6212",  // text-lime-800
  "MS":       "#78350f",  // text-amber-900
  "MP":       "#a16207",  // text-yellow-700
  "LN":       "#991b1b",  // text-red-800
  "LN INT":   "#7f1d1d",  // text-red-900
  "LN CONT":  "#7f1d1d",  // text-red-900
  "LT":       "#9f1239",  // text-rose-800
  "LS":       "#881337",  // text-rose-900
  "LP":       "#b91c1c",  // text-red-700
  "FIS":      "#9a3412",  // text-orange-800
  "FIS INT":  "#7c2d12",  // text-orange-900
  "FIS CONT": "#7c2d12",  // text-orange-900
  "QUI":      "#155e75",  // text-cyan-800
  "QUI INT":  "#164e63",  // text-cyan-900
  "QUI CONT": "#115e59",  // text-teal-800
  "BIO":      "#166534",  // text-green-800
  "BIO INT":  "#14532d",  // text-green-900
  "BIO CONT": "#065f46",  // text-emerald-800
  "HS":       "#4b5563",  // text-gray-600
  "HS INT":   "#374151",  // text-gray-700
  "HIS":      "#374151",  // text-gray-700
  "HIS INT":  "#1f2937",  // text-gray-800
  "CS":       "#1e293b",  // text-slate-800
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

// ─── Show only "Primer Nombre Primer Apellido" ────────────────────────────────
function formatName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 2) return full;
  // Chilean naming: given1 given2 surname1 surname2 → show given1 + surname1
  return `${parts[0]} ${parts[2]}`;
}

// ─── 16:9 schedule grid (1920×1080) for TV/screen export ─────────────────────
const IMG_W = 1920;
const IMG_H = 1080;

interface GridProps {
  classes: ClassEntry[];
  sede: string;
  day: string;
  dayLabel: string;
  sedeLabel: string;
}

function ScheduleGrid({ classes, sede }: GridProps) {
  const numSalas = SEDE_MAX_SALAS[sede] ?? 5;
  const salas = Array.from({ length: numSalas }, (_, i) => i + 1);

  const byTimeAndSala: Record<string, Record<number, ClassEntry>> = {};
  for (const cls of classes) {
    if (!byTimeAndSala[cls.time]) byTimeAndSala[cls.time] = {};
    byTimeAndSala[cls.time][cls.sala] = cls;
  }

  // Always show all 7 time slots (including empty rows — matches reference image)
  const rows = TIME_SLOTS;

  const HEADER_H = Math.round(IMG_H * 0.055);  // ~59px
  const ROW_H    = Math.round((IMG_H - HEADER_H) / rows.length);
  const TIME_W   = Math.round(IMG_W * 0.064);   // ~123px
  const COL_W    = Math.floor((IMG_W - TIME_W) / numSalas);

  // Font sizes scale with column width
  const codeSize   = Math.max(12, Math.min(20, Math.floor(COL_W / 16)));
  const nameSize   = Math.max(10, Math.min(16, Math.floor(COL_W / 21)));
  const timeSize   = Math.max(10, Math.min(15, Math.floor(TIME_W / 9)));
  const headerSize = Math.max(13, Math.min(20, Math.floor(COL_W / 14)));

  const border      = "1px solid #c8c8c8";
  const headerBg    = "#ffffff";
  const timeBg      = "#f5f5f5";
  const emptyBg     = "#ffffff";

  return (
    <div style={{
      width: IMG_W,
      height: IMG_H,
      fontFamily: "Arial, Helvetica, sans-serif",
      background: "#ffffff",
      display: "flex",
      flexDirection: "column",
      border: "1px solid #c8c8c8",
      boxSizing: "border-box",
      overflow: "hidden",
    }}>

      {/* ── Column header row ── */}
      <div style={{
        display: "flex",
        height: HEADER_H,
        flexShrink: 0,
        borderBottom: "1.5px solid #999",
      }}>
        {/* blank top-left cell */}
        <div style={{
          width: TIME_W, minWidth: TIME_W, flexShrink: 0,
          background: headerBg,
          borderRight: border,
        }} />
        {salas.map((s, i) => (
          <div key={s} style={{
            width: COL_W, minWidth: COL_W, flexShrink: 0,
            background: headerBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700,
            fontSize: headerSize,
            color: "#111",
            borderRight: i < salas.length - 1 ? border : undefined,
          }}>
            SALA {s}
          </div>
        ))}
      </div>

      {/* ── Data rows — one per TIME_SLOT ── */}
      {rows.map((time, ri) => (
        <div key={time} style={{
          display: "flex",
          height: ROW_H,
          flexShrink: 0,
          borderBottom: ri < rows.length - 1 ? border : undefined,
        }}>
          {/* Time label */}
          <div style={{
            width: TIME_W, minWidth: TIME_W, flexShrink: 0,
            background: timeBg,
            borderRight: border,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: timeSize,
            fontWeight: 600,
            color: "#333",
            textAlign: "center",
            padding: "0 8px",
            lineHeight: 1.4,
            whiteSpace: "pre-line",
          }}>
            {time}
          </div>

          {/* Sala cells */}
          {salas.map((sala, si) => {
            const cls = byTimeAndSala[time]?.[sala];
            const hasStudents = cls && cls.students.length > 0;
            const bg = hasStudents ? cellBg(cls!.course) : emptyBg;
            const fg = hasStudents ? cellText(cls!.course) : "#111";
            return (
              <div key={sala} style={{
                width: COL_W, minWidth: COL_W, flexShrink: 0,
                background: bg,
                borderRight: si < salas.length - 1 ? border : undefined,
                padding: `${Math.round(ROW_H * 0.06)}px ${Math.round(COL_W * 0.03)}px`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
              }}>
                {hasStudents && (
                  <>
                    <div style={{
                      fontWeight: 700,
                      fontSize: codeSize,
                      color: fg,
                      marginBottom: Math.round(ROW_H * 0.03),
                      lineHeight: 1.2,
                      flexShrink: 0,
                    }}>
                      {cls!.classCode}
                    </div>
                    <div style={{
                      fontSize: nameSize,
                      lineHeight: 1.4,
                      color: fg,
                      overflow: "hidden",
                    }}>
                      {cls!.students.map((s, i) => (
                        <div key={i}>{formatName(s)}</div>
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

// ─── Responsive preview wrapper: scales 1920×1080 to fit any screen width ────
function PreviewWrapper({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / IMG_W);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      style={{ width: "100%", aspectRatio: "16 / 9", overflow: "hidden", position: "relative" }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: IMG_W, height: IMG_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}>
        {children}
      </div>
    </div>
  );
}

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

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const dayClasses = allData.filter(c => c.day === selectedDay && c.sede === selectedSede);

  async function handleDownload(sede: string, day: string) {
    const key = `${sede}-${day}`;
    const el = gridRefs.current[key];
    if (!el) return;
    setDownloading(key);
    try {
      // Grid is already 1920×1080 — capture at 1:1, no scaling needed
      const dataUrl = await toPng(el, {
        pixelRatio: 1,
        backgroundColor: "#ffffff",
        width: IMG_W,
        height: IMG_H,
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

                {/* 16:9 scaled preview — scales 1920×1080 to fit browser width */}
                <div className="rounded-2xl border border-border/50 shadow-xl shadow-black/5 overflow-hidden">
                  <PreviewWrapper>
                    <div ref={el => { gridRefs.current[key] = el; }}>
                      <ScheduleGrid
                        classes={sedeClasses}
                        sede={sede}
                        day={selectedDay}
                        dayLabel={DAY_LABELS[selectedDay]}
                        sedeLabel={SEDE_LABELS[sede] ?? sede}
                      />
                    </div>
                  </PreviewWrapper>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
