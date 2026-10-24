import { Router } from "express";
import { z } from "zod";
import pool, { many, one } from "../db/pool.js";
import { campusColumns, campusInput, upsertCampus } from "../lib/campuses.js";
import { notFound } from "../lib/httpError.js";
import { idParam, pagination } from "../lib/schemas.js";
import { Params, escapeLike, paginated, whereClause } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.get(
    "/",
    validate({ query: z.object({ q: z.string().trim().max(100).optional(), ...pagination }) }),
    async (req, res) => {
        const { q, limit, offset } = req.data.query;
        const params = new Params();
        const conditions = [];
        if (q) {
            const like = params.add(`%${escapeLike(q)}%`);
            conditions.push(`(name ilike ${like} or email_domain ilike ${like})`);
        }
        const rows = await many(
            `select ${campusColumns}, count(*) over ()::int as "totalCount"
             from campuses ${whereClause(conditions)}
             order by name
             limit ${params.add(limit)} offset ${params.add(offset)}`,
            params.values
        );
        res.json(paginated(rows, { limit, offset }));
    }
);

router.get("/:id", validate({ params: idParam }), async (req, res) => {
    const campus = await one(`select ${campusColumns} from campuses where id = $1`, [req.data.params.id]);
    if (!campus) throw notFound("Campus not found");
    res.json({ data: campus });
});

router.put("/", requireAuth, validate({ body: campusInput }), async (req, res) => {
    res.json({ data: await upsertCampus(pool, req.data.body) });
});

export default router;
