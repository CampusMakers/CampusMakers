import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import config from "../../src/config.js";

class Command {
    constructor(input) {
        this.input = input;
    }
}
class ListObjectsV2Command extends Command {}
class PutObjectCommand extends Command {}
class GetObjectCommand extends Command {}
class DeleteObjectCommand extends Command {}

let send = async () => ({});
const sent = [];
let locked = false;

mock.module("@aws-sdk/client-s3", {
    namedExports: {
        ListObjectsV2Command,
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand,
        S3Client: class {
            async send(command) {
                sent.push(command);
                return send(command);
            }
        }
    }
});
mock.module("../../src/db/pool.js", {
    namedExports: {
        transaction: async (work) =>
            work({
                query: async (sql) => {
                    if (sql.includes("pg_advisory_xact_lock")) locked = true;
                }
            })
    }
});

const { STORAGE_LIMIT_BYTES, bucketUsage, deleteObject, getObject, publicUrlFor, putObject } = await import(
    "../../src/lib/storage.js"
);

const configure = () =>
    Object.assign(config.r2, {
        endpoint: "https://r2.example",
        accessKeyId: "id",
        secretAccessKey: "secret",
        bucket: "bucket",
        publicUrl: "https://media.example//"
    });

const statusOf = async (promise) => {
    try {
        await promise;
        return "ok";
    } catch (error) {
        return error.status;
    }
};

beforeEach(() => {
    configure();
    sent.length = 0;
    locked = false;
    send = async () => ({});
});

describe("publicUrlFor", () => {
    it("joins the base URL and key", () => assert.equal(publicUrlFor("a/b.jpg"), "https://media.example/a/b.jpg"));
    it("503s when unset or still a placeholder", () => {
        config.r2.publicUrl = undefined;
        assert.throws(() => publicUrlFor("k"), { status: 503 });
        config.r2.publicUrl = "https://YOUR_PUBLIC_BUCKET_ID.r2.dev";
        assert.throws(() => publicUrlFor("k"), { status: 503 });
    });
});

describe("bucketUsage", () => {
    it("sums sizes across every page", async () => {
        send = async (command) =>
            command.input.ContinuationToken
                ? { Contents: [{ Size: 5 }] }
                : { Contents: [{ Size: 1 }, { Size: "2" }, {}], IsTruncated: true, NextContinuationToken: "next" };
        assert.equal(await bucketUsage(), 8);
        assert.equal(sent.length, 2);
    });

    it("503s when R2 is not configured", async () => {
        config.r2.bucket = undefined;
        assert.equal(await statusOf(bucketUsage()), 503);
    });
});

describe("putObject", () => {
    it("checks the quota under the lock, uploads and returns the public URL", async () => {
        send = async (command) => {
            if (command instanceof PutObjectCommand) assert.equal(locked, true);
            return { Contents: [] };
        };
        const url = await putObject("k.jpg", new Uint8Array(3), "image/jpeg");
        assert.equal(url, "https://media.example/k.jpg");
        const put = sent.find((c) => c instanceof PutObjectCommand);
        assert.deepEqual([put.input.Bucket, put.input.Key, put.input.ContentType], ["bucket", "k.jpg", "image/jpeg"]);
    });

    it("returns null for private uploads without needing a public URL", async () => {
        config.r2.publicUrl = undefined;
        send = async () => ({ Contents: [] });
        assert.equal(await putObject("k", new Uint8Array(1), "image/png", { publicUrl: false }), null);
    });

    it("rejects uploads past the storage limit before writing", async () => {
        send = async () => ({ Contents: [{ Size: STORAGE_LIMIT_BYTES }] });
        assert.equal(await statusOf(putObject("k", new Uint8Array(1), "image/png")), 413);
        assert.equal(sent.some((c) => c instanceof PutObjectCommand), false);
    });

    it("turns storage failures into a 502", async (t) => {
        t.mock.method(console, "error", () => {});
        send = async (command) => {
            if (command instanceof PutObjectCommand) throw new Error("denied");
            return { Contents: [] };
        };
        assert.equal(await statusOf(putObject("k", new Uint8Array(1), "image/png")), 502);
    });
});

describe("getObject", () => {
    it("returns the body bytes", async () => {
        send = async () => ({ Body: { transformToByteArray: async () => new Uint8Array([1, 2]) } });
        assert.deepEqual(await getObject("k"), new Uint8Array([1, 2]));
    });
    it("maps missing bodies, missing keys and other failures", async () => {
        send = async () => ({});
        assert.equal(await statusOf(getObject("k")), 502);
        send = async () => {
            throw Object.assign(new Error(), { name: "NoSuchKey" });
        };
        assert.equal(await statusOf(getObject("k")), 404);
        send = async () => {
            throw Object.assign(new Error(), { $metadata: { httpStatusCode: 404 } });
        };
        assert.equal(await statusOf(getObject("k")), 404);
        send = async () => {
            throw new Error("down");
        };
        assert.equal(await statusOf(getObject("k")), 502);
    });
});

describe("deleteObject", () => {
    it("deletes the key", async () => {
        await deleteObject("k");
        assert.ok(sent[0] instanceof DeleteObjectCommand);
        assert.deepEqual(sent[0].input, { Bucket: "bucket", Key: "k" });
    });
    it("maps failures to 502", async () => {
        send = async () => {
            throw new Error("down");
        };
        assert.equal(await statusOf(deleteObject("k")), 502);
    });
});
