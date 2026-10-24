import { Router } from "express";
import { z } from "zod";
import { many } from "../db/pool.js";
import { escapeLike } from "../lib/sql.js";
import validate from "../middleware/validate.js";

const router = Router();

router.get(
    "/",
    validate({ query: z.object({ q: z.string().trim().max(50).optional() }) }),
    async (req, res) => {
        const { q } = req.data.query;
        const rows = await many(
            `select t.id, t.name, count(pt.post_id)::int as "postCount"
             from tags t
             left join post_tags pt on pt.tag_id = t.id
             where $1::text is null or t.name ilike $1
             group by t.id
             order by "postCount" desc, t.name
             limit 50`,
            [q ? `%${escapeLike(q)}%` : null]
        );
        res.json({ data: rows });
    }
);

export default router;
