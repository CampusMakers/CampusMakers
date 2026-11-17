await import("./env.js");
const { default: pool } = await import("../src/db/pool.js");
const usernames = process.argv
    .slice(2)
    .map((name) => name.replace(/^@/, "").toLowerCase());
try {
    if (!usernames.length)
        throw new Error("Provide registered usernames.");
    const result = await pool.query(
        "update users set role='admin', updated_at=now() where lower(username)=any($1::text[]) returning username",
        [usernames]
    );
    for (const row of result.rows)
        console.log(`Administrator enabled: @${row.username}`);
    for (const name of usernames)
        if (
            !result.rows.some(
                (row) => row.username.toLowerCase() === name
            )
        )
            console.log(`Account not found: @${name}`);
} finally {
    await pool.end();
}
