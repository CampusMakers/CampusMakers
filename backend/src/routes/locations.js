import { Router } from "express";
import { z } from "zod";
import { many, one } from "../db/pool.js";
import { forbidden, notFound } from "../lib/httpError.js";
import {
    addressForCoordinates,
    ensureLocationCoordinates
} from "../lib/locationCoordinates.js";
import { id, idParam } from "../lib/schemas.js";
import { requireSeller } from "../middleware/session.js";
import validate from "../middleware/validate.js";

const router = Router();

const columns = `
    id,
    campus_id as "campusId",
    name,
    address,
    city,
    state,
    zip,
    latitude,
    longitude,
    coalesce(coordinates_source = 'approximate', false) as approximate`;

// Geocode any listed locations that still lack coordinates, then re-read them.
const located = async (rows) => {
    const found = await ensureLocationCoordinates(rows.filter((row) => row.latitude === null).map((row) => row.id));
    return rows.map((row) => (found.has(row.id) ? { ...row, ...found.get(row.id) } : row));
};

router.get(
    "/",
    validate({ query: z.object({ campusId: id }) }),
    async (req, res) => {
        const rows = await many(`select ${columns} from locations where campus_id = $1 order by name`, [
            req.data.query.campusId
        ]);
        res.json({ data: await located(rows) });
    }
);

router.get("/:id", validate({ params: idParam }), async (req, res) => {
    const location = await one(`select ${columns} from locations where id = $1`, [req.data.params.id]);
    if (!location) throw notFound("Location not found");
    const [withCoordinates] = await located([location]);
    res.json({ data: withCoordinates });
});

router.post(
    "/",
    requireSeller,
    validate({
        body: z.object({
            campusId: id,
            name: z.string().trim().min(2).max(120),
            address: z.string().trim().max(200).nullable().optional(),
            city: z.string().trim().max(100).nullable().optional(),
            state: z.string().trim().max(100).nullable().optional(),
            zip: z.string().trim().max(20).nullable().optional(),
            latitude: z.number().min(-90).max(90).nullable().optional(),
            longitude: z.number().min(-180).max(180).nullable().optional()
        })
    }),
    async (req, res) => {
        const body = req.data.body;
        if (body.campusId !== req.store.campusId && req.user.role !== "admin") {
            throw forbidden("You can only add pickup locations on your store's campus");
        }
        const hasCoordinates = body.latitude != null && body.longitude != null;
        // A dropped pin without an address: look the address up from OpenStreetMap.
        if (hasCoordinates && !body.address) {
            Object.assign(body, Object.fromEntries(
                Object.entries((await addressForCoordinates(body.latitude, body.longitude)) ?? {}).filter(
                    ([field, value]) => value && !body[field]
                )
            ));
        }
        const inserted = await one(
            `insert into locations (campus_id, name, address, city, state, zip, latitude, longitude, coordinates_source)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             returning ${columns}`,
            [
                body.campusId,
                body.name,
                body.address ?? null,
                body.city ?? null,
                body.state ?? null,
                body.zip ?? null,
                hasCoordinates ? body.latitude : null,
                hasCoordinates ? body.longitude : null,
                hasCoordinates ? "provided" : null
            ]
        );
        // An address without coordinates: look the coordinates up instead.
        const [location] = hasCoordinates ? [inserted] : await located([inserted]);
        res.status(201).json({ data: location });
    }
);

export default router;
