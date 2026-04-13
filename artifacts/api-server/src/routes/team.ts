import { Router } from "express";
import { db } from "@workspace/db";
import { teamMembersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/team?horarioId=TEMUCO
router.get("/team", async (req, res) => {
  try {
    const { horarioId } = req.query as Record<string, string>;
    const members = horarioId && horarioId !== "ADMIN"
      ? await db.select().from(teamMembersTable).where(eq(teamMembersTable.horarioId, horarioId))
      : await db.select().from(teamMembersTable);
    res.json(members);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener equipo" });
  }
});

// POST /api/team
router.post("/team", async (req, res) => {
  try {
    const { name, role, horarioId, color } = req.body;
    if (!name || !horarioId) {
      return res.status(400).json({ error: "name y horarioId son requeridos" });
    }
    const [member] = await db.insert(teamMembersTable).values({
      name: name.trim(),
      role: role || "secretaria",
      horarioId,
      color: color || "violet",
    }).returning();
    res.status(201).json(member);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear miembro" });
  }
});

// PATCH /api/team/:id
router.patch("/team/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, role, color } = req.body;
    const [updated] = await db.update(teamMembersTable)
      .set({ ...(name && { name }), ...(role && { role }), ...(color && { color }) })
      .where(eq(teamMembersTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Miembro no encontrado" });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar miembro" });
  }
});

// DELETE /api/team/:id
router.delete("/team/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar miembro" });
  }
});

export default router;
