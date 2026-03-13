import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const scheduleClassesTable = pgTable("schedule_classes", {
  classCode: text("class_code").primaryKey(),
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

export type ScheduleClass = typeof scheduleClassesTable.$inferSelect;
export type ScheduleStudent = typeof scheduleStudentsTable.$inferSelect;
