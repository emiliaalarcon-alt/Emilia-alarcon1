import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const orientadorasTable = pgTable("orientadoras", {
  id: serial("id").primaryKey(),
  nombre: text("nombre").notNull(),
  titulo: text("titulo").notNull().default("Orientadora"),
  fotoUrl: text("foto_url").notNull().default(""),
  activa: integer("activa").notNull().default(1),
  orden: integer("orden").notNull().default(99),
  creadaEn: timestamp("creada_en").defaultNow(),
});

export const orientacionHorarioHabitualTable = pgTable("orientacion_horario_habitual", {
  id: serial("id").primaryKey(),
  orientadoraId: integer("orientadora_id").notNull(),
  diaSemana: text("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  activo: integer("activo").notNull().default(1),
});

export const orientacionBloqueoFechaTable = pgTable("orientacion_bloqueo_fecha", {
  id: serial("id").primaryKey(),
  orientadoraId: integer("orientadora_id").notNull(),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin").notNull(),
  horaInicio: text("hora_inicio"),
  motivo: text("motivo"),
});

export const orientacionDesbloqueoFechaTable = pgTable("orientacion_desbloqueo_fecha", {
  id: serial("id").primaryKey(),
  orientadoraId: integer("orientadora_id").notNull(),
  fecha: text("fecha").notNull(),
  horaInicio: text("hora_inicio").notNull(),
});

export const citasOrientacionTable = pgTable("citas_orientacion", {
  id: serial("id").primaryKey(),
  orientadoraId: integer("orientadora_id").notNull(),
  nombreEstudiante: text("nombre_estudiante").notNull(),
  agendadoPor: text("agendado_por").notNull().default(""),
  fecha: text("fecha").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  motivo: text("motivo"),
  estadoConfirma: text("estado_confirma").notNull().default("pendiente"),
  estadoAsiste: text("estado_asiste").notNull().default("pendiente"),
  notaRapida: text("nota_rapida"),
  creadaEn: timestamp("creada_en").defaultNow(),
});
