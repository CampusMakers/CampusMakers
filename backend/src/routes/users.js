import { Router } from "express";
import { z } from "zod";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../auth.js";
import { one } from "../db/pool.js";
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

router.get("/me", requireAuth, async (req, res) => {
    res.json({ data: await one(profileSql("u.id", true), [req.user.id]) });
});

router.patch(
    "/me",
    requireAuth,
    validate({
        body: z
            .object({
                name: z.string().trim().min(1).max(80).optional(),
                username: username.optional(),
                image: z.url().nullable().optional(),
                bio: z.string().trim().max(500).nullable().optional(),
                campusId: id.nullable().optional()
            })
            .refine((body) => Object.keys(body).length > 0, "Provide at least one field to update")
    }),
    async (req, res) => {
        const body = { ...req.data.body };
        if (body.campusId) {
            const campus = await one("select id from campuses where id = $1", [body.campusId]);
            if (!campus) throw badRequest("Unknown campus");
        }
        if (body.username === req.user.username) delete body.username;
        else if (body.username) body.displayUsername = req.body.username.trim().replace(/^@/, "");
        await auth.api.updateUser({ headers: fromNodeHeaders(req.headers), body });
        res.json({ data: await one(profileSql("u.id", true), [req.user.id]) });
    }
);

router.get(
    "/:username",
    validate({ params: z.object({ username }) }),
    async (req, res) => {
        const profile = await one(profileSql("u.username", false), [req.data.params.username, req.user?.id ?? null]);
        if (!profile) throw notFound("User not found");
        res.json({ data: profile });
    }
);

export default router;
