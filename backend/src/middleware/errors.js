import { APIError } from "better-auth/api";
import multer from "multer";
import config from "../config.js";
import { HttpError } from "../lib/httpError.js";

const postgresErrors = {
    "23505": [409, "A record with these values already exists"],
    "23503": [409, "A referenced record does not exist or is still in use"],
    "23514": [400, "A value is outside the allowed range"],
    "23502": [400, "A required value is missing"],
    "22P02": [400, "A value has the wrong format"]
};

export const notFoundHandler = (req, res) => {
    res.status(404).json({ error: { message: `No route for ${req.method} ${req.path}` } });
};

export const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error instanceof HttpError) {
        return res.status(error.status).json({
            error: { message: error.message, details: error.details }
        });
    }

    if (error instanceof APIError) {
        return res.status(error.statusCode ?? 400).json({
            error: { message: error.body?.message ?? error.message, code: error.body?.code }
        });
    }

    if (error instanceof multer.MulterError) {
        return res.status(400).json({ error: { message: error.message } });
    }

    if (error?.type === "entity.parse.failed") {
        return res.status(400).json({ error: { message: "Request body is not valid JSON" } });
    }

    const mapped = postgresErrors[error?.code];
    if (mapped) {
        return res.status(mapped[0]).json({
            error: { message: mapped[1], details: config.env === "production" ? undefined : error.detail }
        });
    }

    console.error(error);
    return res.status(500).json({ error: { message: "Internal server error" } });
};
