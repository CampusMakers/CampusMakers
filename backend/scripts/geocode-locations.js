// Fills in map coordinates for every location that has none, using
// OpenStreetMap Nominatim (one request per second). The API also does this
// on demand, but running it after seeding means the first map load is fast.
//   npm run db:geocode
// Pass --retry to also retry locations that could not be matched recently.

// Settings must be in process.env before config.js is evaluated, so app modules
// are imported dynamically after env.js has finished loading them.
await import("./env.js");
const { default: pool, many, query } = await import("../src/db/pool.js");
const { ensureLocationCoordinates } = await import("../src/lib/locationCoordinates.js");

try {
    if (process.argv.includes("--retry")) {
        await query("update locations set geocoded_at = null where latitude is null or longitude is null");
    }
    const rows = await many("select id, name from locations where latitude is null or longitude is null order by id");
    if (!rows.length) {
        console.log("Every location already has coordinates.");
    } else {
        console.log(`Geocoding ${rows.length} location(s) with OpenStreetMap Nominatim...`);
        const found = await ensureLocationCoordinates(
            rows.map((row) => row.id),
            { budgetMs: rows.length * 15000 }
        );
        for (const row of rows) {
            const result = found.get(row.id);
            console.log(
                result
                    ? `  ${row.name}: ${result.latitude}, ${result.longitude}${result.approximate ? " (approximate: campus only)" : ""}`
                    : `  ${row.name}: no match`
            );
        }
    }
} finally {
    await pool.end();
}
