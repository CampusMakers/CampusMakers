import { transaction } from "../db/pool.js";
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    ListObjectsV2Command,
    S3Client
} from "@aws-sdk/client-s3";
import config from "../config.js";
import { HttpError, notFound } from "./httpError.js";

let client = null;

const r2 = () => {
    const { endpoint, accessKeyId, secretAccessKey, bucket } =
        config.r2;
    if (
        !endpoint ||
        !accessKeyId ||
        !secretAccessKey ||
        !bucket
    ) {
        throw new HttpError(
            503,
            "File storage is not configured"
        );
    }
    client ??= new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED"
    });
    return client;
};

// General marketplace uploads still require a separately approved public-media URL.
export const publicUrlFor = (key) => {
    const base = config.r2.publicUrl;
    if (!base || base.includes("YOUR_PUBLIC_BUCKET_ID")) {
        throw new HttpError(
            503,
            "Public media URL is not configured"
        );
    }
    return `${base.replace(/\/+$/, "")}/${key}`;
};

export const STORAGE_LIMIT_BYTES = 10_000_000_000;
export async function bucketUsage() {
    let used = 0,
        token;
    do {
        const page = await r2().send(
            new ListObjectsV2Command({
                Bucket: config.r2.bucket,
                ContinuationToken: token
            })
        );
        used += (page.Contents || []).reduce(
            (sum, object) => sum + Number(object.Size || 0),
            0
        );
        token = page.IsTruncated
            ? page.NextContinuationToken
            : undefined;
    } while (token);
    return used;
}
export const putObject = async (
    key,
    body,
    contentType,
    { publicUrl = true } = {}
) => {
    // Fail before uploading when a general public-media URL isn't configured.
    if (publicUrl) publicUrlFor(key);
    try {
        await transaction(async (db) => {
            // A database-wide transaction lock serializes quota checks and writes
            // across all Worker instances. Count every object, including old uploads.
            await db.query(
                "select pg_advisory_xact_lock(773102401)"
            );
            if (
                (await bucketUsage()) + body.byteLength >
                STORAGE_LIMIT_BYTES
            ) {
                throw new HttpError(
                    413,
                    "Community storage has reached its 10 GB limit. Remove unused photos before uploading more."
                );
            }
            await r2().send(
                new PutObjectCommand({
                    Bucket: config.r2.bucket,
                    Key: key,
                    Body: body,
                    ContentType: contentType,
                    CacheControl:
                        "public, max-age=31536000, immutable"
                })
            );
        });
    } catch (error) {
        if (error instanceof HttpError) throw error;
        console.error("R2 upload error", {
            code: error.name,
            message: error.message,
            status: error.$metadata?.httpStatusCode,
            cause: error.cause?.code
        });
        throw new HttpError(
            502,
            "Upload failed. Check R2 credentials and bucket access."
        );
    }
    return publicUrl ? publicUrlFor(key) : null;
};

export const getObject = async (key) => {
    try {
        const object = await r2().send(
            new GetObjectCommand({
                Bucket: config.r2.bucket,
                Key: key
            })
        );
        if (!object.Body)
            throw new HttpError(
                502,
                "Profile photo is unavailable"
            );
        return await object.Body.transformToByteArray();
    } catch (error) {
        if (error instanceof HttpError) throw error;
        if (
            error?.name === "NoSuchKey" ||
            error?.$metadata?.httpStatusCode === 404
        ) {
            throw notFound("Profile photo not found");
        }
        throw new HttpError(
            502,
            "Could not retrieve the profile photo from storage"
        );
    }
};

export const deleteObject = async (key) => {
    try {
        await r2().send(
            new DeleteObjectCommand({
                Bucket: config.r2.bucket,
                Key: key
            })
        );
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(
            502,
            "Could not delete the file from storage"
        );
    }
};
