import { readFile } from "node:fs/promises";
import pool from "../src/db/pool.js";

const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");

try {
    await pool.query(schema);
    console.log("Schema applied");
} finally {
    await pool.end();
}
