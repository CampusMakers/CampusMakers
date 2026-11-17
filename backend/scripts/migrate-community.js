import { readFile } from "node:fs/promises";
await import("./env.js");
const { default: pool } = await import("../src/db/pool.js");
try {
    await pool.query(
        await readFile(
            new URL(
                "../supabase/community-migration.sql",
                import.meta.url
            ),
            "utf8"
        )
    );
    console.log(
        "Community moderation and interaction migration applied."
    );
} finally {
    await pool.end();
}
