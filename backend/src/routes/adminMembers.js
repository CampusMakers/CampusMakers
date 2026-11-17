import { Router } from "express";
import { z } from "zod";
import { many, transaction } from "../db/pool.js";
import {
    conflict,
    forbidden,
    notFound
} from "../lib/httpError.js";
import validate from "../middleware/validate.js";

// Mounted behind requireAdmin in the administration router.
const router = Router();
router.get(
    "/",
    validate({
        query: z.object({
            search: z.string().trim().max(100).default("")
        })
    }),
    async (req, res) => {
        const search = req.data.query.search.replace(/^@/, "");
        const term = search.replace(/[\\%_]/g, "\\$&");
        const users = await many(
            `select id, username, name, role from users
        where ($1 = '' and role='admin') or ($1 <> '' and (username ilike $2 or name ilike $2))
        order by role='admin' desc, username nulls last, id limit 100`,
            [search, `%${term}%`]
        );
        res.json({ data: users });
    }
);
router.patch(
    "/:userId",
    validate({
        params: z.object({
            userId: z.string().min(1).max(128)
        }),
        body: z.object({ role: z.enum(["user", "admin"]) })
    }),
    async (req, res) => {
        const member = await transaction(async (client) => {
            // Serialize role changes so simultaneous removals cannot remove all admins.
            await client.query(
                "select pg_advisory_xact_lock(773102402)"
            );
            const actor = (
                await client.query(
                    "select role from users where id=$1",
                    [req.user.id]
                )
            ).rows[0];
            if (actor?.role !== "admin")
                throw forbidden(
                    "Administrator access required"
                );
            const target = (
                await client.query(
                    "select id, username, name, role from users where id=$1 for update",
                    [req.data.params.userId]
                )
            ).rows[0];
            if (!target) throw notFound("Account not found");
            if (
                target.role === "admin" &&
                req.data.body.role === "user"
            ) {
                const { rows } = await client.query(
                    "select count(*)::int as count from users where role='admin'"
                );
                if (rows[0].count <= 1)
                    throw conflict(
                        "Keep at least one administrator. Add another admin before removing this role."
                    );
            }
            return (
                await client.query(
                    "update users set role=$2, updated_at=now() where id=$1 returning id, username, name, role",
                    [target.id, req.data.body.role]
                )
            ).rows[0];
        });
        res.json({ data: member });
    }
);
export default router;
