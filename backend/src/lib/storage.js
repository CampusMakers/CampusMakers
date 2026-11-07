import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import config from "../config.js";
import { HttpError } from "./httpError.js";

let client = null;

const r2 = () => {
    const { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl } = config.r2;
    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
        throw new HttpError(503, "File storage is not configured");
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

export const publicUrlFor = (key) => `${config.r2.publicUrl.replace(/\/+$/, "")}/${key}`;

export const putObject = async (key, body, contentType) => {
    try {
        await r2().send(
            new PutObjectCommand({
                Bucket: config.r2.bucket,
                Key: key,
                Body: body,
                ContentType: contentType,
                CacheControl: "public, max-age=31536000, immutable"
            })
        );
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(502, `Upload failed: ${error.message}`);
    }
    return publicUrlFor(key);
};

export const deleteObject = async (key) => {
    try {
        await r2().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
    } catch (error) {
        if (error instanceof HttpError) throw error;
        throw new HttpError(502, `Delete failed: ${error.message}`);
    }
};
