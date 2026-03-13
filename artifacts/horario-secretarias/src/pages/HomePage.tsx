import { useLocation } from "wouter";
import { CalendarDays, MapPin, ArrowRight, Building2, School } from "lucide-react";
import { HORARIOS, type HorarioId } from "@/data/schedule";
import { useHorario } from "@/context/HorarioContext";

const CAMPUS_ICONS: Record<HorarioId, typeof CalendarDays> = {
  TEMUCO:      School,
  ALMAGRO:     Building2,
  VILLARRICA:  MapPin,
  AV_ALEMANIA: Building2,
};

const CAMPUS_COLORS: Record<HorarioId, { gradient: string; border: string; badge: string; text: string }> = {
  TEMUCO:      { gradient: "from-primary to-secondary", border: "border-primary/30", badge: "bg-primary/10 text-primary", text: "text-primary" },
  ALMAGRO:     { gradient: "from-violet-500 to-indigo-500", border: "border-violet-300/50", badge: "bg-violet-100 text-violet-700", text: "text-violet-600 dark:text-violet-400" },
  VILLARRICA:  { gradient: "from-teal-500 to-emerald-500", border: "border-teal-300/50", badge: "bg-teal-100 text-teal-700", text: "text-teal-600 dark:text-teal-400" },
  AV_ALEMANIA: { gradient: "from-orange-400 to-amber-500", border: "border-orange-300/50", badge: "bg-orange-100 text-orange-700", text: "text-orange-600 dark:text-orange-400" },
};

const CAMPUS_DESCRIPTIONS: Record<HorarioId, string> = {
  TEMUCO:      "Sedes Las Encinas e Inés de Suárez — grilla semanal colaborativa en tiempo real.",
  ALMAGRO:     "Sede Diego de Almagro — horarios y matrícula de alumnos en tiempo real.",
  VILLARRICA:  "Sede Villarrica — grilla semanal y gestión de inscripciones.",
  AV_ALEMANIA: "Sede Av. Alemania — horarios, salas y seguimiento de matrículas.",
};

const HORARIO_IDS = Object.keys(HORARIOS) as HorarioId[];

export default function HomePage() {
  const { setHorarioId } = useHorario();
  const [, navigate] = useLocation();

  function handleSelect(id: HorarioId) {
    setHorarioId(id);
    navigate("/horarios");
  }

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-5rem)] flex flex-col justify-center pb-24 md:pb-0">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8 text-center">
        <div className="inline-flex items-center gap-2 py-1 px-4 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-wide mb-6 border border-primary/20">
          <MapPin className="w-4 h-4" />
          Selecciona tu campus
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground mb-4 leading-tight">
          Sistema de{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Horarios
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
          Elige el campus que quieres gestionar para acceder a su grilla, matrícula y guías de impresión.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HORARIO_IDS.map(id => {
            const horario = HORARIOS[id];
            const colors   = CAMPUS_COLORS[id];
            const Icon     = CAMPUS_ICONS[id];
            return (
              <button
                key={id}
                onClick={() => handleSelect(id)}
                className={`group relative bg-card rounded-3xl p-7 border ${colors.border} shadow-xl shadow-black/5 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-left focus:outline-none focus:ring-2 focus:ring-primary/50`}
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-5 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>

                <h2 className="font-display font-extrabold text-xl text-foreground mb-1 leading-tight">
                  {horario.label}
                </h2>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {horario.sedes.map(s => (
                    <span key={s} className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colors.badge}`}>
                      {s}
                    </span>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
                  {CAMPUS_DESCRIPTIONS[id]}
                </p>

                <span className={`flex items-center gap-1.5 text-sm font-bold ${colors.text} group-hover:gap-2.5 transition-all`}>
                  Ir a horarios
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
