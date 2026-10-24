import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import config from "../config.js";
import { badRequest, forbidden } from "../lib/httpError.js";
import { deleteObject, putObject } from "../lib/storage.js";
import { requireAuth } from "../middleware/session.js";

const router = Router();

const extensions = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm"
};

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.uploads.maxBytes, files: 1 },
    fileFilter: (req, file, done) => {
        if (extensions[file.mimetype]) return done(null, true);
        return done(badRequest(`Unsupported file type ${file.mimetype}`));
    }
});

router.use(requireAuth);

router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file) throw badRequest('Attach a file in the "file" form field');
    const key = `${req.user.id}/${randomUUID()}.${extensions[req.file.mimetype]}`;
    const url = await putObject(key, req.file.buffer, req.file.mimetype);
    res.status(201).json({
        data: {
            key,
            url,
            contentType: req.file.mimetype,
            size: req.file.size
        }
    });
});

router.delete("/{*key}", async (req, res) => {
    const key = [req.params.key ?? []].flat().join("/");
    if (!key) throw badRequest("Provide the file key");
    if (!key.startsWith(`${req.user.id}/`) || key.includes("..")) throw forbidden("You can only delete your own files");
    await deleteObject(key);
    res.status(204).end();
});

export default router;
