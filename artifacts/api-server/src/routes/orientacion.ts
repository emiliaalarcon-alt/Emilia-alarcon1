import { Router } from "express";
import { pool } from "@workspace/db";
import { db } from "@workspace/db";
import {
  orientadorasTable,
  orientacionHorarioHabitualTable,
  orientacionBloqueoFechaTable,
  orientacionDesbloqueoFechaTable,
  citasOrientacionTable,
} from "@workspace/db/schema";
import { eq, and, lte, gte, or } from "drizzle-orm";

const router = Router();

const DAY_NAMES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function dayOfWeek(year: number, month: number, day: number): string {
  return DAY_NAMES[new Date(year, month - 1, day).getDay()];
}

// ── GET /api/orientacion/orientadoras ────────────────────────────────────────
router.get("/orientacion/orientadoras", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(orientadorasTable)
      .orderBy(orientadorasTable.orden, orientadorasTable.nombre);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener orientadoras" });
  }
});

// ── POST /api/orientacion/orientadoras ──────────────────────────────────────
router.post("/orientacion/orientadoras", async (req, res) => {
  try {
    const { nombre, titulo, fotoUrl, orden } = req.body as {
      nombre: string; titulo?: string; fotoUrl?: string; orden?: number;
    };
    if (!nombre?.trim()) return res.status(400).json({ error: "nombre requerido" });
    const [row] = await db.insert(orientadorasTable).values({
      nombre: nombre.trim(),
      titulo: titulo?.trim() || "Orientadora",
      fotoUrl: fotoUrl?.trim() || "",
      orden: orden ?? 99,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear orientadora" });
  }
});

// ── PATCH /api/orientacion/orientadoras/:id ──────────────────────────────────
router.patch("/orientacion/orientadoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, titulo, fotoUrl, activa, orden } = req.body as {
      nombre?: string; titulo?: string; fotoUrl?: string; activa?: number; orden?: number;
    };
    const updates: Partial<typeof orientadorasTable.$inferInsert> = {};
    if (nombre !== undefined) updates.nombre = nombre.trim();
    if (titulo !== undefined) updates.titulo = titulo.trim();
    if (fotoUrl !== undefined) updates.fotoUrl = fotoUrl.trim();
    if (activa !== undefined) updates.activa = activa;
    if (orden !== undefined) updates.orden = orden;
    const [row] = await db.update(orientadorasTable).set(updates).where(eq(orientadorasTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "No encontrada" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar orientadora" });
  }
});

// ── DELETE /api/orientacion/orientadoras/:id ─────────────────────────────────
router.delete("/orientacion/orientadoras/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(orientadorasTable).where(eq(orientadorasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar orientadora" });
  }
});

// ── GET /api/orientacion/orientadoras/:id/horario ────────────────────────────
router.get("/orientacion/orientadoras/:id/horario", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select()
      .from(orientacionHorarioHabitualTable)
      .where(eq(orientacionHorarioHabitualTable.orientadoraId, id))
      .orderBy(orientacionHorarioHabitualTable.diaSemana, orientacionHorarioHabitualTable.horaInicio);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener horario" });
  }
});

// ── POST /api/orientacion/orientadoras/:id/horario ───────────────────────────
router.post("/orientacion/orientadoras/:id/horario", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { diaSemana, horaInicio } = req.body as { diaSemana: string; horaInicio: string };
    if (!diaSemana || !horaInicio) return res.status(400).json({ error: "diaSemana y horaInicio requeridos" });
    const [row] = await db.insert(orientacionHorarioHabitualTable).values({
      orientadoraId: id, diaSemana, horaInicio,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al agregar slot" });
  }
});

// ── DELETE /api/orientacion/horario/:slotId ──────────────────────────────────
router.delete("/orientacion/horario/:slotId", async (req, res) => {
  try {
    const id = parseInt(req.params.slotId);
    await db.delete(orientacionHorarioHabitualTable).where(eq(orientacionHorarioHabitualTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar slot" });
  }
});

// ── POST /api/orientacion/orientadoras/:id/bloqueo ───────────────────────────
router.post("/orientacion/orientadoras/:id/bloqueo", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fechaInicio, fechaFin, horaInicio, motivo } = req.body as {
      fechaInicio: string; fechaFin: string; horaInicio?: string; motivo?: string;
    };
    if (!fechaInicio || !fechaFin) return res.status(400).json({ error: "fechaInicio y fechaFin requeridos" });
    const [row] = await db.insert(orientacionBloqueoFechaTable).values({
      orientadoraId: id, fechaInicio, fechaFin,
      horaInicio: horaInicio || null,
      motivo: motivo || null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear bloqueo" });
  }
});

// ── DELETE /api/orientacion/bloqueo/:id ─────────────────────────────────────
router.delete("/orientacion/bloqueo/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(orientacionBloqueoFechaTable).where(eq(orientacionBloqueoFechaTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar bloqueo" });
  }
});

// ── POST /api/orientacion/orientadoras/:id/desbloqueo ────────────────────────
router.post("/orientacion/orientadoras/:id/desbloqueo", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { fecha, horaInicio } = req.body as { fecha: string; horaInicio: string };
    if (!fecha || !horaInicio) return res.status(400).json({ error: "fecha y horaInicio requeridos" });
    const [row] = await db.insert(orientacionDesbloqueoFechaTable).values({
      orientadoraId: id, fecha, horaInicio,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear desbloqueo" });
  }
});

// ── GET /api/orientacion/disponibilidad/:id?año=&mes= ────────────────────────
// Returns all slots for the month with status: available | booked | blocked
router.get("/orientacion/disponibilidad/:id", async (req, res) => {
  try {
    const orientadoraId = parseInt(req.params.id);
    const year = parseInt(req.query["año"] as string) || new Date().getFullYear();
    const month = parseInt(req.query["mes"] as string) || (new Date().getMonth() + 1);

    const first = dateStr(year, month, 1);
    const last = dateStr(year, month, daysInMonth(year, month));

    const [slots, citas, bloqueos, desbloqueos] = await Promise.all([
      db.select().from(orientacionHorarioHabitualTable)
        .where(and(eq(orientacionHorarioHabitualTable.orientadoraId, orientadoraId), eq(orientacionHorarioHabitualTable.activo, 1))),
      db.select().from(citasOrientacionTable)
        .where(and(
          eq(citasOrientacionTable.orientadoraId, orientadoraId),
          gte(citasOrientacionTable.fecha, first),
          lte(citasOrientacionTable.fecha, last),
        )),
      db.select().from(orientacionBloqueoFechaTable)
        .where(and(
          eq(orientacionBloqueoFechaTable.orientadoraId, orientadoraId),
          lte(orientacionBloqueoFechaTable.fechaInicio, last),
          gte(orientacionBloqueoFechaTable.fechaFin, first),
        )),
      db.select().from(orientacionDesbloqueoFechaTable)
        .where(and(
          eq(orientacionDesbloqueoFechaTable.orientadoraId, orientadoraId),
          gte(orientacionDesbloqueoFechaTable.fecha, first),
          lte(orientacionDesbloqueoFechaTable.fecha, last),
        )),
    ]);

    const totalDays = daysInMonth(year, month);
    const result: Array<{
      fecha: string; horaInicio: string;
      status: "available" | "booked" | "blocked";
      cita?: typeof citas[0];
    }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const fecha = dateStr(year, month, d);
      const dow = dayOfWeek(year, month, d);

      const regularHoras = slots
        .filter(s => s.diaSemana === dow)
        .map(s => s.horaInicio);

      const extraHoras = desbloqueos
        .filter(db => db.fecha === fecha)
        .map(db => db.horaInicio);

      const allHoras = [...new Set([...regularHoras, ...extraHoras])].sort();

      for (const hora of allHoras) {
        const isBlocked = bloqueos.some(b => {
          if (b.fechaInicio <= fecha && b.fechaFin >= fecha) {
            return !b.horaInicio || b.horaInicio === hora;
          }
          return false;
        });
        const isUnblocked = desbloqueos.some(db => db.fecha === fecha && db.horaInicio === hora);
        if (isBlocked && !isUnblocked) {
          result.push({ fecha, horaInicio: hora, status: "blocked" });
          continue;
        }
        const cita = citas.find(c => c.fecha === fecha && c.horaInicio === hora);
        result.push({ fecha, horaInicio: hora, status: cita ? "booked" : "available", cita });
      }
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener disponibilidad" });
  }
});

// ── GET /api/orientacion/citas (all for month, admin view) ───────────────────
router.get("/orientacion/citas", async (req, res) => {
  try {
    const { año, mes } = req.query as { año?: string; mes?: string };
    const year = parseInt(año || "") || new Date().getFullYear();
    const month = parseInt(mes || "") || (new Date().getMonth() + 1);
    const first = dateStr(year, month, 1);
    const last = dateStr(year, month, daysInMonth(year, month));
    const rows = await db.select().from(citasOrientacionTable)
      .where(and(gte(citasOrientacionTable.fecha, first), lte(citasOrientacionTable.fecha, last)))
      .orderBy(citasOrientacionTable.fecha, citasOrientacionTable.horaInicio);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// ── POST /api/orientacion/citas ──────────────────────────────────────────────
router.post("/orientacion/citas", async (req, res) => {
  try {
    const { orientadoraId, nombreEstudiante, agendadoPor, fecha, horaInicio, motivo } = req.body as {
      orientadoraId: number; nombreEstudiante: string; agendadoPor?: string;
      fecha: string; horaInicio: string; motivo?: string;
    };
    if (!orientadoraId || !nombreEstudiante || !fecha || !horaInicio)
      return res.status(400).json({ error: "Faltan campos requeridos" });

    const existing = await db.select().from(citasOrientacionTable)
      .where(and(
        eq(citasOrientacionTable.orientadoraId, orientadoraId),
        eq(citasOrientacionTable.fecha, fecha),
        eq(citasOrientacionTable.horaInicio, horaInicio),
      )).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "Ese horario ya está ocupado" });

    const [row] = await db.insert(citasOrientacionTable).values({
      orientadoraId, nombreEstudiante: nombreEstudiante.trim(),
      agendadoPor: agendadoPor?.trim() || "",
      fecha, horaInicio,
      motivo: motivo?.trim() || null,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear cita" });
  }
});

// ── PATCH /api/orientacion/citas/:id ─────────────────────────────────────────
router.patch("/orientacion/citas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { estadoConfirma, estadoAsiste, nombreEstudiante, motivo, notaRapida } = req.body as {
      estadoConfirma?: string; estadoAsiste?: string;
      nombreEstudiante?: string; motivo?: string; notaRapida?: string | null;
    };
    const updates: Partial<typeof citasOrientacionTable.$inferInsert> = {};
    if (estadoConfirma !== undefined) updates.estadoConfirma = estadoConfirma;
    if (estadoAsiste !== undefined) updates.estadoAsiste = estadoAsiste;
    if (nombreEstudiante !== undefined) updates.nombreEstudiante = nombreEstudiante.trim();
    if (motivo !== undefined) updates.motivo = motivo.trim() || null;
    if (notaRapida !== undefined) updates.notaRapida = notaRapida?.trim() || null;
    const [row] = await db.update(citasOrientacionTable).set(updates)
      .where(eq(citasOrientacionTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Cita no encontrada" });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar cita" });
  }
});

// ── DELETE /api/orientacion/citas/:id ────────────────────────────────────────
router.delete("/orientacion/citas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(citasOrientacionTable).where(eq(citasOrientacionTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar cita" });
  }
});

// ── GET /api/orientacion/citas/all ───────────────────────────────────────────
// Returns all citas for stats (no month filter). Optional: orientadoraId, año
router.get("/orientacion/citas/all", async (req, res) => {
  try {
    const { orientadoraId, año } = req.query as { orientadoraId?: string; año?: string };
    let query = `SELECT * FROM citas_orientacion`;
    const params: (string | number)[] = [];
    const conds: string[] = [];

    if (orientadoraId) {
      params.push(parseInt(orientadoraId));
      conds.push(`orientadora_id = $${params.length}`);
    }
    if (año) {
      params.push(`${año}-%`);
      conds.push(`fecha LIKE $${params.length}`);
    }
    if (conds.length) query += ` WHERE ${conds.join(" AND ")}`;
    query += ` ORDER BY fecha, hora_inicio`;

    const { rows } = await pool.query(query, params);
    // Camel-case the rows
    const mapped = rows.map((r: Record<string, unknown>) => ({
      id: r.id,
      orientadoraId: r.orientadora_id,
      nombreEstudiante: r.nombre_estudiante,
      agendadoPor: r.agendado_por,
      fecha: r.fecha,
      horaInicio: r.hora_inicio,
      motivo: r.motivo,
      estadoConfirma: r.estado_confirma,
      estadoAsiste: r.estado_asiste,
      notaRapida: r.nota_rapida,
      creadaEn: r.creada_en,
    }));
    res.json(mapped);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener citas" });
  }
});

// ── GET /api/orientacion/orientadoras/:id/bloqueos ───────────────────────────
router.get("/orientacion/orientadoras/:id/bloqueos", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select().from(orientacionBloqueoFechaTable)
      .where(eq(orientacionBloqueoFechaTable.orientadoraId, id))
      .orderBy(orientacionBloqueoFechaTable.fechaInicio);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener bloqueos" });
  }
});

// ── GET /api/orientacion/estados ─────────────────────────────────────────────
router.get("/orientacion/estados", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orientacion_estados ORDER BY tipo, orden, id`
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error" }); }
});

// ── POST /api/orientacion/estados ────────────────────────────────────────────
router.post("/orientacion/estados", async (req, res) => {
  try {
    const { tipo, label, color, orden } = req.body as {
      tipo: string; label: string; color?: string; orden?: number;
    };
    if (!tipo || !label?.trim()) return res.status(400).json({ error: "tipo y label requeridos" });
    const { rows } = await pool.query(
      `INSERT INTO orientacion_estados (tipo, label, color, orden) VALUES ($1,$2,$3,$4) RETURNING *`,
      [tipo, label.trim(), color ?? "#94a3b8", orden ?? 99]
    );
    res.status(201).json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error" }); }
});

// ── PATCH /api/orientacion/estados/:id ───────────────────────────────────────
router.patch("/orientacion/estados/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { label, color, orden } = req.body as {
      label?: string; color?: string; orden?: number;
    };
    const sets: string[] = [];
    const params: (string | number)[] = [];
    if (label !== undefined) { params.push(label.trim()); sets.push(`label=$${params.length}`); }
    if (color !== undefined) { params.push(color); sets.push(`color=$${params.length}`); }
    if (orden !== undefined) { params.push(orden); sets.push(`orden=$${params.length}`); }
    if (!sets.length) return res.status(400).json({ error: "Nada que actualizar" });
    params.push(id);
    const { rows } = await pool.query(
      `UPDATE orientacion_estados SET ${sets.join(",")} WHERE id=$${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(rows[0]);
  } catch (err) { console.error(err); res.status(500).json({ error: "Error" }); }
});

// ── DELETE /api/orientacion/estados/:id ──────────────────────────────────────
router.delete("/orientacion/estados/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query(`DELETE FROM orientacion_estados WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: "Error" }); }
});

export default router;
