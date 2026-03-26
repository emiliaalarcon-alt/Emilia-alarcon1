import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const scheduleClassesTable = pgTable("schedule_classes", {
  classCode: text("class_code").primaryKey(),
  horario: text("horario").notNull().default("TEMUCO"),
  day: text("day").notNull(),
  time: text("time").notNull(),
  sede: text("sede").notNull(),
  sala: integer("sala").notNull(),
  teacher: text("teacher").notNull(),
  course: text("course").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduleStudentsTable = pgTable("schedule_students", {
  id: serial("id").primaryKey(),
  classCode: text("class_code").notNull().references(() => scheduleClassesTable.classCode, { onDelete: "cascade" }),
  studentName: text("student_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduleHorariosTable = pgTable("schedule_horarios", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  emoji: text("emoji").notNull().default("🏢"),
  gradient: text("gradient").notNull().default("from-violet-500 to-purple-600"),
  accentColor: text("accent_color").notNull().default("violet"),
  sedesJson: text("sedes_json").notNull().default("[]"),
  isSystem: integer("is_system").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(99),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ScheduleClass = typeof scheduleClassesTable.$inferSelect;
export type ScheduleStudent = typeof scheduleStudentsTable.$inferSelect;
export type ScheduleHorario = typeof scheduleHorariosTable.$inferSelect;
