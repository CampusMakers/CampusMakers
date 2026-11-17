import { Router } from "express";
import { z } from "zod";
import { many, one, transaction } from "../db/pool.js";
import { badRequest, notFound } from "../lib/httpError.js";
import { idParam, pagination, username } from "../lib/schemas.js";
import { postSelect } from "../lib/selects.js";
import { Params, escapeLike, paginated, whereClause, withoutTotal } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const postTypes = ["image", "video", "text"];

const sorts = {
    recent: "po.created_at desc, po.id desc",
    popular: `"likeCount" desc, po.created_at desc`,
    random: "random()"
};

const getPost = async (postId, viewerId) => {
    const params = new Params();
    const select = postSelect(params, viewerId);
    const post = await one(`${select} where po.id = ${params.add(postId)}`, params.values);
    if (!post) throw notFound("Post not found");
    return withoutTotal(post);
};

const tagName = z.string().trim().min(1).max(40);

router.get(
    "/",
    validate({
        query: z.object({
            q: z.string().trim().max(100).optional(),
            type: z.enum(postTypes).optional(),
            tag: tagName.optional(),
            author: username.optional(),
            following: z.stringbool().default(false),
            sort: z.enum(Object.keys(sorts)).default("recent"),
            ...pagination
        })
    }),
    async (req, res) => {
        const query = req.data.query;
        const params = new Params();
        const select = postSelect(params, req.user?.id);
        const conditions = [];

        if (query.q) {
            const like = params.add(`%${escapeLike(query.q)}%`);
            conditions.push(`(
                po.caption ilike ${like}
                or a.username ilike ${like}
                or exists (
                    select 1 from post_tags pt join tags t on t.id = pt.tag_id
                    where pt.post_id = po.id and t.name ilike ${like}
                )
            )`);
        }
        if (query.type) conditions.push(`po.type = ${params.add(query.type)}`);
        if (query.tag) {
            conditions.push(`exists (
                select 1 from post_tags pt join tags t on t.id = pt.tag_id
                where pt.post_id = po.id and lower(t.name) = lower(${params.add(query.tag)})
            )`);
        }
        if (query.author) conditions.push(`a.username = ${params.add(query.author)}`);
        if (query.following) {
            if (!req.user) throw badRequest("Sign in to see posts from people you follow");
            conditions.push(
                `exists (select 1 from follows f where f.followee_id = po.author_id and f.follower_id = ${params.add(req.user.id)})`
            );
        }

        const rows = await many(
            `${select} ${whereClause(conditions)}
             order by ${sorts[query.sort]}
             limit ${params.add(query.limit)} offset ${params.add(query.offset)}`,
            params.values
        );
        res.json(paginated(rows, query));
    }
);

router.get("/:id", validate({ params: idParam }), async (req, res) => {
    res.json({ data: await getPost(req.data.params.id, req.user?.id) });
});

router.get(
    "/:id/suggestions",
    validate({ params: idParam, query: z.object({ limit: z.coerce.number().int().min(1).max(20).default(4) }) }),
    async (req, res) => {
        const postId = req.data.params.id;
        const source = await one("select id, type from posts where id = $1", [postId]);
        if (!source) throw notFound("Post not found");

        const params = new Params();
        const select = postSelect(params, req.user?.id);
        const sourceId = params.add(postId);
        const rows = await many(
            `${select}
             cross join lateral (
                 select
                     (select count(*) from post_tags mine
                      join post_tags theirs on theirs.tag_id = mine.tag_id
                      where mine.post_id = ${sourceId} and theirs.post_id = po.id) * 2
                     + (po.type = ${params.add(source.type)}::post_type)::int as score
             ) relevance
             where po.id <> ${sourceId}
             order by relevance.score desc, po.created_at desc
             limit ${params.add(req.data.query.limit)}`,
            params.values
        );
        res.json({ data: rows.map(withoutTotal) });
    }
);

router.post(
    "/",
    requireAuth,
    validate({
        body: z
            .object({
                type: z.enum(postTypes),
                caption: z.string().trim().max(2200).nullable().optional(),
                mediaUrl: z.url().nullable().optional(),
                tags: z.array(tagName).max(10).default([])
            })
            .refine((body) => body.type === "text" || body.mediaUrl, "Image and video posts need a mediaUrl")
            .refine((body) => body.type !== "text" || body.caption, "Text posts need a caption")
    }),
    async (req, res) => {
        const body = req.data.body;
        const tags = [...new Set(body.tags.map((tag) => tag.trim()))];

        const postId = await transaction(async (client) => {
            const created = await client.query(
                `insert into posts (author_id, type, caption, media_url)
                 values ($1, $2, $3, $4)
                 returning id`,
                [req.user.id, body.type, body.caption ?? null, body.type === "text" ? null : body.mediaUrl]
            );
            const newId = created.rows[0].id;
            if (tags.length) {
                await client.query(
                    `insert into tags (name) select unnest($1::text[]) on conflict (name) do nothing`,
                    [tags]
                );
                await client.query(
                    `insert into post_tags (post_id, tag_id)
                     select $1, id from tags where name = any($2::text[])`,
                    [newId, tags]
                );
            }
            return newId;
        });

        res.status(201).location(`/api/posts/${postId}`).json({ data: await getPost(postId, req.user.id) });
    }
);

router.delete("/:id", requireAuth, validate({ params: idParam }), async (req, res) => {
    const deleted = await one("delete from posts where id = $1 and author_id = $2 returning id", [
        req.data.params.id,
        req.user.id
    ]);
    if (!deleted) throw notFound("Post not found");
    res.status(204).end();
});

export default router;
