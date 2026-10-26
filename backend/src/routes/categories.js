import { Router } from "express";
import { many } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
    res.json({ data: await many("select id, name from categories order by name") });
});

export default router;
