import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { badRequest, notFound } from "../lib/httpError.js";
import { pagination, username } from "../lib/schemas.js";
import { paginated } from "../lib/sql.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const findUser = async (name) => {
    const user = await one("select id from users where username = $1", [name]);
    if (!user) throw notFound("User not found");
    return user;
};

router.get(
    "/",
    requireAuth,
    validate({
        query: z.object({ direction: z.enum(["following", "followers"]).default("following"), ...pagination })
    }),
    async (req, res) => {
        const { direction, limit, offset } = req.data.query;
        const [mine, theirs] = direction === "following" ? ["follower_id", "followee_id"] : ["followee_id", "follower_id"];
        const rows = await many(
            `select u.id, u.username, u.name, u.image, f.created_at as "followedAt", count(*) over ()::int as "totalCount"
             from follows f
             join users u on u.id = f.${theirs}
             where f.${mine} = $1
             order by f.created_at desc
             limit $2 offset $3`,
            [req.user.id, limit, offset]
        );
        res.json(paginated(rows, { limit, offset }));
    }
);

router.put(
    "/:username",
    requireAuth,
    validate({ params: z.object({ username }) }),
    async (req, res) => {
        const target = await findUser(req.data.params.username);
        if (target.id === req.user.id) throw badRequest("You cannot follow yourself");
        await one(
            "insert into follows (follower_id, followee_id) values ($1, $2) on conflict do nothing",
            [req.user.id, target.id]
        );
        res.status(204).end();
    }
);

router.delete(
    "/:username",
    requireAuth,
    validate({ params: z.object({ username }) }),
    async (req, res) => {
        const target = await findUser(req.data.params.username);
        await one("delete from follows where follower_id = $1 and followee_id = $2", [req.user.id, target.id]);
        res.status(204).end();
    }
);

export default router;
