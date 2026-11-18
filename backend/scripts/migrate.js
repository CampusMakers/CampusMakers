import { readFile } from "node:fs/promises";

// Settings must be in process.env before config.js is evaluated, so app modules
// are imported dynamically after env.js has finished loading them.
await import("./env.js");
const { default: pool } = await import("../src/db/pool.js");

const schema = await readFile(new URL("../supabase/schema.sql", import.meta.url), "utf8");

try {
    await pool.query(schema);
    console.log("Schema applied");
} finally {
    await pool.end();
}
