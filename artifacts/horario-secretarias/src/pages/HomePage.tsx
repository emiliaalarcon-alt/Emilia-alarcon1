import { Link } from "wouter";
import { ArrowRight, CalendarDays, Filter, Users } from "lucide-react";

const features = [
  {
    icon: CalendarDays,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Grilla Semanal",
    description:
      "Visualiza todos los horarios por sede y sala. Navega entre Las Encinas e Inés de Suárez con un clic.",
    link: "/horarios",
    linkLabel: "Ver grilla",
    linkColor: "text-primary",
  },
  {
    icon: Filter,
    iconBg: "bg-teal-100 dark:bg-teal-900/30",
    iconColor: "text-teal-600 dark:text-teal-400",
    title: "Filtrar por Asignatura",
    description:
      "Selecciona un curso (M1, LN, FIS, BIO...) y revisa todos los horarios disponibles en ambas sedes.",
    link: "/horarios",
    linkLabel: "Explorar cursos",
    linkColor: "text-secondary",
  },
  {
    icon: Users,
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconColor: "text-purple-600 dark:text-purple-400",
    title: "Gestión de Alumnos",
    description:
      "Haz clic en cualquier clase para ver la lista de alumnos inscritos, la sala y el profesor asignado.",
    link: "/horarios",
    linkLabel: "Ver alumnos",
    linkColor: "text-purple-600 dark:text-purple-400",
  },
];

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <div className="inline-block py-1 px-4 rounded-full bg-primary/10 text-primary text-sm font-bold tracking-wide mb-6 border border-primary/20">
          Las Encinas · Inés de Suárez
        </div>

        <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground mb-6 leading-tight">
          Sistema de{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Horarios
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Consulta la grilla semanal, filtra por asignatura y gestiona las inscripciones de alumnos desde un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/horarios"
            className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold bg-primary text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group"
          >
            Ver Horarios
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32 md:pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-card rounded-3xl p-8 border border-border/50 shadow-xl shadow-black/5 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 group"
            >
              <div
                className={`w-14 h-14 rounded-2xl ${f.iconBg} flex items-center justify-center ${f.iconColor} mb-6 group-hover:scale-110 transition-transform`}
              >
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-display font-bold mb-3 text-foreground">
                {f.title}
              </h3>
              <p className="text-muted-foreground mb-6">{f.description}</p>
              <Link
                href={f.link}
                className={`font-bold ${f.linkColor} flex items-center gap-1 hover:gap-2 transition-all`}
              >
                {f.linkLabel} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
