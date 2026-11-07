import { Router } from "express";
import { z } from "zod";
import { one } from "../db/pool.js";
import { badRequest, notFound } from "../lib/httpError.js";
import { id, username } from "../lib/schemas.js";
import { messageColumns } from "../lib/selects.js";
import { requireAuth } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

router.use(requireAuth);

router.post(
    "/",
    validate({
        body: z
            .object({
                recipientId: z.string().min(1).optional(),
                recipientUsername: username.optional(),
                content: z.string().trim().min(1).max(4000)
            })
            .refine((body) => body.recipientId || body.recipientUsername, "Provide recipientId or recipientUsername")
    }),
    async (req, res) => {
        const { recipientId, recipientUsername, content } = req.data.body;
        const recipient = await one(
            recipientId ? "select id from users where id = $1" : "select id from users where username = $1",
            [recipientId ?? recipientUsername]
        );
        if (!recipient) throw notFound("Recipient not found");
        if (recipient.id === req.user.id) throw badRequest("You cannot message yourself");

        const message = await one(
            `insert into messages as m (sender_id, receiver_id, content)
             values ($1, $2, $3)
             returning ${messageColumns}`,
            [req.user.id, recipient.id, content]
        );
        res.status(201).json({ data: message });
    }
);

router.delete("/:id", validate({ params: z.object({ id }) }), async (req, res) => {
    const deleted = await one("delete from messages where id = $1 and sender_id = $2 returning id", [
        req.data.params.id,
        req.user.id
    ]);
    if (!deleted) throw notFound("Message not found");
    res.status(204).end();
});

export default router;
