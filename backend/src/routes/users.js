import { Router } from "express";
import { z } from "zod";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { many, one, transaction } from "../db/pool.js";
import { badRequest, notFound } from "../lib/httpError.js";
import { id, username } from "../lib/schemas.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const profileSql = (whereColumn, includePrivate) => `
    select
        u.id,
        u.username,
        coalesce(u.display_username, u.username) as "displayUsername",
        u.name,
        u.image,
        u.bio,
        ${includePrivate ? `u.email, u.email_verified as "emailVerified", u.role,` : ""}
        u.created_at as "createdAt",
        case when c.id is null then null
            else json_build_object('id', c.id, 'name', c.name, 'emailDomain', c.email_domain, 'state', c.state) end as campus,
        case when s.id is null then null
            else json_build_object(
                'id', s.id,
                'name', s.name,
                'description', s.description,
                'verified', s.verified_at is not null,
                'active', s.inactive_since is null
                ${includePrivate ? `, 'schoolEmail', s.school_email` : ""}
            ) end as store,
        (select count(*) from follows f where f.followee_id = u.id)::int as "followerCount",
        (select count(*) from follows f where f.follower_id = u.id)::int as "followingCount",
        (select count(*) from posts p where p.author_id = u.id)::int as "postCount",
        ${includePrivate ? "false" : "exists (select 1 from follows f where f.followee_id = u.id and f.follower_id = $2)"} as "isFollowing"
    from users u
    left join campuses c on c.id = u.campus_id
    left join stores s on s.owner_id = u.id
    where ${whereColumn} = $1`;

router.get(
    "/",
    requireAuth,
    validate({
        query: z.object({
            search: z.string().trim().min(1).max(100),
            limit: z.coerce
                .number()
                .int()
                .min(1)
                .max(30)
                .default(8)
        })
    }),
    async (req, res) => {
        const term = req.data.query.search.replace(
            /[\\%_]/g,
            "\\$&"
        );
        const rows = await many(
            `select id, username, name, image from users
        where id <> $1 and username is not null
        and (username ilike $2 or name ilike $2)
        order by username limit $3`,
            [req.user.id, `%${term}%`, req.data.query.limit]
        );
        res.json({ data: rows });
    }
);

router.get(
    "/by-id/:userId/connections",
    validate({
        params: z.object({ userId: z.string().min(1).max(128) })
    }),
    async (req, res) => {
        const userId = req.data.params.userId;
        const profile = await one(
            "select username from users where id=$1",
            [userId]
        );
        if (!profile) throw notFound("User not found");
        const following = await many(
            `select u.id,u.username,u.name,u.image from follows f join users u on u.id=f.followee_id where f.follower_id=$1 order by f.created_at desc limit 100`,
            [userId]
        );
        const followers = await many(
            `select u.id,u.username,u.name,u.image from follows f join users u on u.id=f.follower_id where f.followee_id=$1 order by f.created_at desc limit 100`,
            [userId]
        );
        const counts = await one(
            `select (select count(*)::int from follows where follower_id=$1) as "followingCount",
        (select count(*)::int from follows where followee_id=$1) as "followerCount",
        exists(select 1 from follows where follower_id=$2 and followee_id=$1) as "isFollowing"`,
            [userId, req.user?.id ?? null]
        );
        res.json({
            data: {
                profileId: userId,
                username: profile.username,
                following,
                followers,
                ...counts
            }
        });
    }
);

router.get("/me", requireAuth, async (req, res) => {
    res.json({
        data: await one(profileSql("u.id", true), [req.user.id])
    });
});

router.patch(
    "/me",
    requireAuth,
    validate({
        body: z
            .object({
                name: z
                    .string()
                    .trim()
                    .min(1)
                    .max(80)
                    .optional(),
                username: username.optional(),
                image: z.url().nullable().optional(),
                bio: z
                    .string()
                    .trim()
                    .max(500)
                    .nullable()
                    .optional(),
                campusId: id.nullable().optional()
            })
            .refine(
                (body) => Object.keys(body).length > 0,
                "Provide at least one field to update"
            )
    }),
    async (req, res) => {
        const body = { ...req.data.body };
        if (body.campusId) {
            const campus = await one(
                "select id from campuses where id = $1",
                [body.campusId]
            );
            if (!campus) throw badRequest("Unknown campus");
        }
        if (body.username === req.user.username)
            delete body.username;
        else if (body.username)
            body.displayUsername = req.body.username
                .trim()
                .replace(/^@/, "");
        await auth.api.updateUser({
            headers: fromNodeHeaders(req.headers),
            body
        });
        res.json({
            data: await one(profileSql("u.id", true), [
                req.user.id
            ])
        });
    }
);

router.delete("/me", requireAuth, async (req, res) => {
        const userId = req.user.id;
        const account = await one(
            "select email from users where id = $1",
            [userId]
        );
        if (!account) throw notFound("User not found");

        await transaction(async (client) => {
            await client.query(
                `update orders set status = 'cancelled', updated_at = now()
                 where status in ('pending', 'scheduled', 'ready')
                 and (buyer_id = $1
                      or store_id in (select id from stores where owner_id = $1))`,
                [userId]
            );

            await client.query("delete from sessions where user_id = $1", [userId]);
            await client.query("delete from accounts where user_id = $1", [userId]);
            await client.query("delete from verifications where identifier = $1", [
                account.email
            ]);

            await client.query(
                "delete from follows where follower_id = $1 or followee_id = $1",
                [userId]
            );
            await client.query(
                "delete from messages where sender_id = $1 or receiver_id = $1",
                [userId]
            );
            await client.query("delete from post_likes where user_id = $1", [userId]);
            await client.query("delete from post_comments where author_id = $1", [userId]);
            await client.query("delete from posts where author_id = $1", [userId]);
            await client.query("delete from saved_listings where user_id = $1", [userId]);
            await client.query("delete from listing_ratings where user_id = $1", [userId]);
            await client.query("delete from listing_likes where user_id = $1", [userId]);
            await client.query("delete from listing_comments where author_id = $1", [userId]);
            await client.query("delete from event_rsvps where user_id = $1", [userId]);
            await client.query("delete from stores where owner_id = $1", [userId]);
            await client.query("delete from users where id = $1", [userId]);
        });

        res.status(204).end();
});

router.get(
    "/:username",
    validate({ params: z.object({ username }) }),
    async (req, res) => {
        const profile = await one(
            profileSql("u.username", false),
            [req.data.params.username, req.user?.id ?? null]
        );
        if (!profile) throw notFound("User not found");
        res.json({ data: profile });
    }
);

export default router;