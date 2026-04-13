import app from "./app";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        horario_id TEXT NOT NULL,
        assigned_to TEXT NOT NULL DEFAULT '',
        deadline TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'MEDIA',
        status TEXT NOT NULL DEFAULT 'PENDIENTE',
        created_by TEXT NOT NULL DEFAULT 'Admin',
        is_personal INTEGER NOT NULL DEFAULT 0,
        personal_owner TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_items (
        id SERIAL PRIMARY KEY,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Tables ensured (tasks, task_items)");
  } catch (err) {
    console.error("Error ensuring tables:", err);
  } finally {
    client.release();
  }
}

ensureTables().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
});
