import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { notFound } from "../lib/httpError.js";
import { id, pagination, username } from "../lib/schemas.js";
import { messageColumns } from "../lib/selects.js";
import { paginated } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

const findPartner = async (name) => {
    const partner = await one(
        `select id, username, name, image from users where username = $1`,
        [name]
    );
    if (!partner) throw notFound("User not found");
    return partner;
};

router.get("/", validate({ query: z.object(pagination) }), async (req, res) => {
    const { limit, offset } = req.data.query;
    const rows = await many(
        `with mine as (
             select m.*, case when m.sender_id = $1 then m.receiver_id else m.sender_id end as partner_id
             from messages m
             where m.sender_id = $1 or m.receiver_id = $1
         ),
         latest as (
             select distinct on (partner_id) *
             from mine
             order by partner_id, created_at desc, id desc
         )
         select
             json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'image', u.image) as partner,
             json_build_object(
                 'id', latest.id,
                 'senderId', latest.sender_id,
                 'content', latest.content,
                 'createdAt', latest.created_at,
                 'readAt', latest.read_at
             ) as "lastMessage",
             (select count(*) from mine where mine.partner_id = latest.partner_id
                 and mine.receiver_id = $1 and mine.read_at is null)::int as "unreadCount",
             count(*) over ()::int as "totalCount"
         from latest
         join users u on u.id = latest.partner_id
         order by latest.created_at desc
         limit $2 offset $3`,
        [req.user.id, limit, offset]
    );
    res.json(paginated(rows, { limit, offset }));
});

router.get(
    "/:username",
    validate({
        params: z.object({ username }),
        query: z.object({ before: id.optional(), limit: pagination.limit })
    }),
    async (req, res) => {
        const partner = await findPartner(req.data.params.username);
        const { before, limit } = req.data.query;
        const rows = await many(
            `select ${messageColumns}
             from messages m
             where ((m.sender_id = $1 and m.receiver_id = $2) or (m.sender_id = $2 and m.receiver_id = $1))
               and ($3::bigint is null or m.id < $3)
             order by m.id desc
             limit $4`,
            [req.user.id, partner.id, before ?? null, limit]
        );
        res.json({ data: { partner, messages: rows.reverse(), hasMore: rows.length === limit } });
    }
);

router.put(
    "/:username/read",
    validate({ params: z.object({ username }) }),
    async (req, res) => {
        const partner = await findPartner(req.data.params.username);
        await one(
            `update messages set read_at = now()
             where sender_id = $1 and receiver_id = $2 and read_at is null`,
            [partner.id, req.user.id]
        );
        res.status(204).end();
    }
);

export default router;
