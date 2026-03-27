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

export const scheduleTransfersTable = pgTable("schedule_transfers", {
  id: serial("id").primaryKey(),
  horarioId: text("horario_id").notNull(),
  studentName: text("student_name").notNull().default(""),
  teacherBefore: text("teacher_before").notNull().default(""),
  teacherAfter: text("teacher_after").notNull().default(""),
  sede: text("sede").notNull().default(""),
  subject: text("subject").notNull().default(""),
  leavesClass: text("leaves_class").notNull().default(""),
  entersClass: text("enters_class").notNull().default(""),
  transferDate: text("transfer_date").notNull().default(""),
  changeType: text("change_type").notNull().default("CAMBIO HORARIO"),
  changeReason: text("change_reason").notNull().default("NINGUNO"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ScheduleClass = typeof scheduleClassesTable.$inferSelect;
export type ScheduleStudent = typeof scheduleStudentsTable.$inferSelect;
export type ScheduleHorario = typeof scheduleHorariosTable.$inferSelect;
export type ScheduleTransfer = typeof scheduleTransfersTable.$inferSelect;
