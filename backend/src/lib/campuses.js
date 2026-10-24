import { z } from "zod";

export const campusColumns = `id, name, email_domain as "emailDomain", state`;

export const campusInput = z.object({
    name: z.string().trim().min(2).max(200),
    domain: z
        .string()
        .trim()
        .toLowerCase()
        .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Invalid domain"),
    state: z.string().trim().max(100).nullable().optional()
});

export const upsertCampus = async (db, { name, domain, state }) => {
    const result = await db.query(
        `insert into campuses (name, email_domain, state)
         values ($1, $2, $3)
         on conflict (email_domain) do update
             set name = excluded.name, state = coalesce(excluded.state, campuses.state)
         returning ${campusColumns}`,
        [name, domain, state ?? null]
    );
    return result.rows[0];
};
