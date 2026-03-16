import { useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { Camera, Download, Loader2 } from "lucide-react";
import { DAYS, DAY_LABELS, TIME_SLOTS, type ClassEntry } from "@/data/schedule";
import { useHorario } from "@/context/HorarioContext";

// ─── Pastel colors for photo export (TV display) ─────────────────────────────
// Horario view keeps vivid Tailwind colors; here everything is soft pastel.
// Groups: AMARILLO · ROJO · NARANJA · CALIPSO · VERDE · MORADO · GRIS

const AMARILLO_BG   = "#FFF9A3";   // soft golden yellow
const AMARILLO_TEXT = "#7B5B00";
const ROJO_BG       = "#FFCDD2";   // soft pink-red
const ROJO_TEXT     = "#8B1A1A";
const NARANJA_BG    = "#FFE0B2";   // soft peach-orange
const NARANJA_TEXT  = "#8B4000";
const CALIPSO_BG    = "#B2EBF2";   // soft turquoise/calypso
const CALIPSO_TEXT  = "#005F6B";
const VERDE_BG      = "#C8E6C9";   // soft mint-green
const VERDE_TEXT    = "#1A5E20";
const MORADO_BG     = "#E1BEE7";   // soft lavender-purple
const MORADO_TEXT   = "#5B1F7F";
const GRIS_BG       = "#EEEEEE";   // light gray
const GRIS_TEXT     = "#424242";

const COURSE_BG: Record<string, string> = {
  // Matemática → AMARILLO
  "M1":       AMARILLO_BG,
  "M1 INT":   AMARILLO_BG,
  "M1 CONT":  AMARILLO_BG,
  "M2":       AMARILLO_BG,
  "M2 INT":   AMARILLO_BG,
  "MT":       AMARILLO_BG,
  "MS":       AMARILLO_BG,
  "MP":       AMARILLO_BG,
  // Lenguaje → ROJO
  "LN":       ROJO_BG,
  "LN INT":   ROJO_BG,
  "LN CONT":  ROJO_BG,
  "LT":       ROJO_BG,
  "LS":       ROJO_BG,
  "LP":       ROJO_BG,
  // Física → NARANJA
  "FIS":      NARANJA_BG,
  "FIS INT":  NARANJA_BG,
  "FIS CONT": NARANJA_BG,
  // Química → CALIPSO
  "QUI":      CALIPSO_BG,
  "QUI INT":  CALIPSO_BG,
  "QUI CONT": CALIPSO_BG,
  // Biología → VERDE
  "BIO":      VERDE_BG,
  "BIO INT":  VERDE_BG,
  "BIO CONT": VERDE_BG,
  // Historia → MORADO CLARO
  "HS":       MORADO_BG,
  "HS INT":   MORADO_BG,
  "HIS":      MORADO_BG,
  "HIS INT":  MORADO_BG,
  // Otros
  "CS":       GRIS_BG,
};
const COURSE_TEXT: Record<string, string> = {
  "M1":       AMARILLO_TEXT, "M1 INT":   AMARILLO_TEXT, "M1 CONT":  AMARILLO_TEXT,
  "M2":       AMARILLO_TEXT, "M2 INT":   AMARILLO_TEXT,
  "MT":       AMARILLO_TEXT, "MS":       AMARILLO_TEXT, "MP":       AMARILLO_TEXT,
  "LN":       ROJO_TEXT,     "LN INT":   ROJO_TEXT,     "LN CONT":  ROJO_TEXT,
  "LT":       ROJO_TEXT,     "LS":       ROJO_TEXT,     "LP":       ROJO_TEXT,
  "FIS":      NARANJA_TEXT,  "FIS INT":  NARANJA_TEXT,  "FIS CONT": NARANJA_TEXT,
  "QUI":      CALIPSO_TEXT,  "QUI INT":  CALIPSO_TEXT,  "QUI CONT": CALIPSO_TEXT,
  "BIO":      VERDE_TEXT,    "BIO INT":  VERDE_TEXT,    "BIO CONT": VERDE_TEXT,
  "HS":       MORADO_TEXT,   "HS INT":   MORADO_TEXT,
  "HIS":      MORADO_TEXT,   "HIS INT":  MORADO_TEXT,
  "CS":       GRIS_TEXT,
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

  // Support multiple classes per (time, sala) — all stored in an array
  const byTimeAndSala: Record<string, Record<number, ClassEntry[]>> = {};
  for (const cls of classes) {
    if (!byTimeAndSala[cls.time]) byTimeAndSala[cls.time] = {};
    if (!byTimeAndSala[cls.time][cls.sala]) byTimeAndSala[cls.time][cls.sala] = [];
    byTimeAndSala[cls.time][cls.sala].push(cls);
  }

  // Always show all 7 time slots (including empty rows — matches reference image)
  const rows = TIME_SLOTS;

  const HEADER_H = Math.round(IMG_H * 0.055);
  const ROW_H    = Math.round((IMG_H - HEADER_H) / rows.length);
  const TIME_W   = Math.round(IMG_W * 0.064);
  const COL_W    = Math.floor((IMG_W - TIME_W) / numSalas);

  // Find the busiest cell: max total students + max classes in a single cell
  // This drives global font sizing so every cell fits without overflow
  let maxTotalStudents = 1;
  let maxClassesInCell = 1;
  for (const salaMap of Object.values(byTimeAndSala)) {
    for (const clsArr of Object.values(salaMap)) {
      const active = clsArr.filter(c => c.students.length > 0);
      const total  = active.reduce((s, c) => s + c.students.length, 0);
      maxTotalStudents = Math.max(maxTotalStudents, total);
      maxClassesInCell = Math.max(maxClassesInCell, active.length);
    }
  }

  const LINE_H_RATIO = 1.28;
  const cellPad   = Math.round(ROW_H * 0.06);
  const codeSize  = Math.max(11, Math.min(18, Math.floor(COL_W / 17)));
  const codeLineH = Math.ceil(codeSize * 1.25);
  const codeGap   = Math.round(ROW_H * 0.025);
  // separator between stacked classes
  const sepH      = maxClassesInCell > 1 ? 4 * (maxClassesInCell - 1) : 0;
  // total height used by code headers across all classes in the busiest cell
  const totalCodeH = (codeLineH + codeGap) * maxClassesInCell;
  const namesAreaH = ROW_H - 2 * cellPad - totalCodeH - sepH;

  const nameSizeByH = Math.floor(namesAreaH / (maxTotalStudents * LINE_H_RATIO));
  const nameSizeByW = Math.floor(COL_W / 20);
  const nameSize    = Math.max(8, Math.min(nameSizeByH, nameSizeByW));

  const timeSize   = Math.max(10, Math.min(15, Math.floor(TIME_W / 9)));
  const headerSize = Math.max(13, Math.min(20, Math.floor(COL_W / 14)));

  const border  = "1px solid #c8c8c8";
  const timeBg  = "#f5f5f5";
  const emptyBg = "#ffffff";

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
        <div style={{ width: TIME_W, minWidth: TIME_W, flexShrink: 0, borderRight: border }} />
        {salas.map((s, i) => (
          <div key={s} style={{
            width: COL_W, minWidth: COL_W, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: headerSize, color: "#111",
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
            fontSize: timeSize, fontWeight: 600, color: "#333",
            textAlign: "center", padding: "0 8px",
            lineHeight: 1.4, whiteSpace: "pre-line",
          }}>
            {time}
          </div>

          {/* Sala cells — each may contain 1 or more classes */}
          {salas.map((sala, si) => {
            const clsArr = byTimeAndSala[time]?.[sala] ?? [];
            const active = clsArr.filter(c => c.students.length > 0);

            // Cell background: use first active class color (or white if empty)
            const firstBg = active.length > 0 ? cellBg(active[0].course) : emptyBg;
            // For single class: full cell colored; for multi-class: white with per-block colors
            const cellBgColor = active.length === 1 ? firstBg : emptyBg;

            return (
              <div key={sala} style={{
                width: COL_W, minWidth: COL_W, flexShrink: 0,
                background: cellBgColor,
                borderRight: si < salas.length - 1 ? border : undefined,
                padding: `${cellPad}px ${Math.round(COL_W * 0.025)}px`,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-start",
                gap: active.length > 1 ? 4 : 0,
                boxSizing: "border-box",
              }}>
                {active.map((cls, ci) => {
                  const fg = cellText(cls.course);
                  // Single class: use transparent bg (cell already colored).
                  // Multi-class: each block has its own pastel background.
                  const blockBg = active.length > 1 ? cellBg(cls.course) : "transparent";
                  const blockPad = active.length > 1
                    ? `${Math.round(cellPad * 0.4)}px ${Math.round(COL_W * 0.02)}px`
                    : "0";
                  return (
                    <div key={ci} style={{
                      background: blockBg,
                      padding: blockPad,
                      borderRadius: active.length > 1 ? 2 : 0,
                      flexShrink: 0,
                    }}>
                      <div style={{
                        fontWeight: 700, fontSize: codeSize, color: fg,
                        marginBottom: codeGap, lineHeight: 1.2,
                      }}>
                        {cls.classCode}
                      </div>
                      <div style={{ fontSize: nameSize, lineHeight: LINE_H_RATIO, color: fg }}>
                        {cls.students.map((s, i) => (
                          <div key={i}>{formatName(s)}</div>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
