import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import config from "../config.js";
import { one } from "../db/pool.js";
import {
    badRequest,
    forbidden,
    notFound
} from "../lib/httpError.js";
import {
    isCurrentProfilePhoto,
    isProfilePhotoPath,
    profilePhotoKey,
    profilePhotoUrl
} from "../lib/profilePhotos.js";
import {
    deleteObject,
    getObject,
    putObject
} from "../lib/storage.js";
import {
    requireAuth,
    requireSeller
} from "../middleware/session.js";
import {
    isListingPhotoPath,
    listingPhotoKey,
    listingPhotoUrl
} from "../lib/listingPhotos.js";

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
        return done(
            badRequest(`Unsupported file type ${file.mimetype}`)
        );
    }
});

// Public avatar display, but only for the picture currently saved on that profile.
// Other objects in the private R2 bucket are never exposed by this endpoint.
router.get(
    "/profile-photos/:ownerId/:fileName",
    async (req, res) => {
        const { ownerId, fileName } = req.params;
        if (!isProfilePhotoPath(ownerId, fileName))
            throw notFound("Profile photo not found");

        const profile = await one(
            "select image from users where id = $1",
            [ownerId]
        );
        if (
            !isCurrentProfilePhoto(
                profile?.image,
                config.auth.url,
                ownerId,
                fileName
            )
        ) {
            throw notFound("Profile photo not found");
        }

        const bytes = await getObject(
            profilePhotoKey(ownerId, fileName)
        );
        const type = fileName.toLowerCase().endsWith(".png")
            ? "image/png"
            : fileName.toLowerCase().endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";
        res.set("Content-Type", type);
        res.set("Cache-Control", "public, max-age=60");
        res.set("X-Content-Type-Options", "nosniff");
        res.send(Buffer.from(bytes));
    }
);

/**
 * Serve private R2 listing photos.
 * Owners can preview their uploads; buyers can view photos
 * attached to active listings from active stores.
 */
router.get(
    "/listing-photos/:ownerId/:fileName",
    async (req, res) => {
        const { ownerId, fileName } = req.params;

        if (!isListingPhotoPath(ownerId, fileName)) {
            throw notFound("Listing photo not found");
        }

        const url = listingPhotoUrl(
            config.auth.url,
            ownerId,
            fileName
        );

        const isOwner = req.user?.id === ownerId;

        if (!isOwner) {
            // Never expose an unlisted photo to other users.
            const visible = await one(
                `select 1
                 from listing_images i
                 join listings l on l.id = i.listing_id
                 join stores s on s.id = l.store_id
                 where i.url = $1
                   and s.owner_id = $2
                   and l.inactive_since is null
                   and s.inactive_since is null
                 limit 1`,
                [url, ownerId]
            );

            if (!visible) {
                throw notFound("Listing photo not found");
            }
        }

        const bytes = await getObject(
            listingPhotoKey(ownerId, fileName)
        );

        const type = fileName.toLowerCase().endsWith(".png")
            ? "image/png"
            : fileName.toLowerCase().endsWith(".webp")
              ? "image/webp"
              : "image/jpeg";

        res.set("Content-Type", type);
        res.set("X-Content-Type-Options", "nosniff");
        res.set(
            "Cache-Control",
            isOwner ? "private, no-store" : "public, max-age=60"
        );

        res.send(Buffer.from(bytes));
    }
);

router.use(requireAuth);

/**
 * Upload listing photos to private R2 storage.
 * Only verified sellers can use this endpoint.
 */
router.post(
    "/listing-photos",
    requireSeller,
    upload.single("file"),
    async (req, res) => {
        if (!req.file) {
            throw badRequest("Select a listing photo.");
        }

        const allowedTypes = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        };

        const extension = allowedTypes[req.file.mimetype];

        if (!extension) {
            throw badRequest(
                "Listing photos must be JPG, PNG, or WebP."
            );
        }

        if (req.file.size > 4 * 1024 * 1024) {
            throw badRequest(
                "Listing photos must be 4 MB or smaller."
            );
        }

        const fileName = `${randomUUID()}.${extension}`;
        const key = listingPhotoKey(req.user.id, fileName);

        // Upload privately without enabling public bucket access.
        await putObject(
            key,
            req.file.buffer,
            req.file.mimetype,
            {
                publicUrl: false
            }
        );

        const url = listingPhotoUrl(
            config.auth.url,
            req.user.id,
            fileName
        );

        res.status(201).json({
            data: {
                key,
                url,
                contentType: req.file.mimetype,
                size: req.file.size
            }
        });
    }
);

router.post("/", upload.single("file"), async (req, res) => {
    if (!req.file)
        throw badRequest(
            'Attach a file in the "file" form field'
        );
    const kind = req.query.kind;
    if (kind !== undefined && kind !== "profile")
        throw badRequest("Unsupported upload kind");

    const profileUpload = kind === "profile";
    if (
        profileUpload &&
        !["image/jpeg", "image/png", "image/webp"].includes(
            req.file.mimetype
        )
    ) {
        throw badRequest(
            "Profile pictures must be JPEG, PNG or WebP images"
        );
    }

    const fileName = `${randomUUID()}.${extensions[req.file.mimetype]}`;
    const key = profileUpload
        ? profilePhotoKey(req.user.id, fileName)
        : `${req.user.id}/${fileName}`;
    const generalUrl = await putObject(
        key,
        req.file.buffer,
        req.file.mimetype,
        {
            publicUrl: !profileUpload
        }
    );
    const url = profileUpload
        ? profilePhotoUrl(
              config.auth.url,
              req.user.id,
              fileName
          )
        : generalUrl;

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
    if (
        !key.startsWith(`${req.user.id}/`) ||
        key.includes("..")
    ) {
        throw forbidden("You can only delete your own files");
    }
    await deleteObject(key);
    res.status(204).end();
});

export default router;
