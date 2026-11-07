import { Router } from "express";
import { one } from "../db/pool.js";

const router = Router();

router.get("/", async (req, res) => {
    try {
        await one("select 1");
        res.json({ data: { status: "ok", database: "up" } });
    } catch {
        res.status(503).json({ data: { status: "degraded", database: "down" } });
    }
});

export default router;
