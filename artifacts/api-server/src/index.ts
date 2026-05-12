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
    await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'secretaria',
        horario_id TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT 'violet',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id SERIAL PRIMARY KEY,
        horario_id TEXT NOT NULL,
        sede TEXT NOT NULL,
        teacher TEXT NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        workshop_date TEXT NOT NULL DEFAULT '',
        workshop_time TEXT NOT NULL DEFAULT '',
        max_students INTEGER NOT NULL DEFAULT 8,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS workshop_students (
        id SERIAL PRIMARY KEY,
        workshop_id INTEGER NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
        student_name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE schedule_classes ADD COLUMN IF NOT EXISTS semester TEXT NOT NULL DEFAULT 'PRIMER'
    `);
    await client.query(`
      ALTER TABLE schedule_students ADD COLUMN IF NOT EXISTS class_semester TEXT NOT NULL DEFAULT 'PRIMER'
    `);
    await client.query(`
      UPDATE schedule_students ss
      SET class_semester = sc.semester
      FROM schedule_classes sc
      WHERE ss.class_code = sc.class_code
        AND ss.class_semester = 'PRIMER'
        AND sc.semester != 'PRIMER'
    `);
    await client.query(`
      DELETE FROM schedule_classes WHERE class_code LIKE '%\\_S2'
    `);
    await client.query(`
      DO $$ DECLARE r text; BEGIN
        FOR r IN
          SELECT c.conname FROM pg_constraint c
          JOIN pg_class t  ON t.oid  = c.conrelid
          JOIN pg_class ft ON ft.oid = c.confrelid
          WHERE t.relname = 'schedule_students'
            AND ft.relname = 'schedule_classes'
            AND c.contype = 'f'
        LOOP
          EXECUTE format('ALTER TABLE schedule_students DROP CONSTRAINT IF EXISTS %I', r);
        END LOOP;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'schedule_classes_pkey'
            AND conrelid = 'schedule_classes'::regclass
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'schedule_classes_class_code_semester_pk'
            AND conrelid = 'schedule_classes'::regclass
        ) THEN
          ALTER TABLE schedule_classes DROP CONSTRAINT schedule_classes_pkey;
          ALTER TABLE schedule_classes ADD CONSTRAINT schedule_classes_class_code_semester_pk PRIMARY KEY (class_code, semester);
        END IF;
      END $$;
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'schedule_students_class_fk'
        ) THEN
          ALTER TABLE schedule_students
            ADD CONSTRAINT schedule_students_class_fk
            FOREIGN KEY (class_code, class_semester)
            REFERENCES schedule_classes(class_code, semester) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log("Tables ensured (tasks, task_items, team_members, workshops, workshop_students, semester column, composite PK/FK)");
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
