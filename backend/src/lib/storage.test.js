import test from "node:test";
import assert from "node:assert/strict";
test("R2 quota counts every page and rejects uploads past 10 GB before writing", async (t) => {
    let puts = 0,
        used = 9_999_999_999,
        locked = false;
    class Command {
        constructor(input) {
            this.input = input;
        }
    }
    class ListObjectsV2Command extends Command {}
    class PutObjectCommand extends Command {}
    t.mock.module("@aws-sdk/client-s3", {
        namedExports: {
            ListObjectsV2Command,
            PutObjectCommand,
            DeleteObjectCommand: Command,
            GetObjectCommand: Command,
            S3Client: class {
                async send(command) {
                    if (command instanceof PutObjectCommand) {
                        assert.equal(locked, true);
                        puts++;
                        return {};
                    }
                    return command.input.ContinuationToken
                        ? { Contents: [{ Size: used - 1 }] }
                        : {
                              Contents: [{ Size: 1 }],
                              IsTruncated: true,
                              NextContinuationToken: "next"
                          };
                }
            }
        }
    });
    t.mock.module("../config.js", {
        defaultExport: {
            r2: {
                endpoint: "https://example.invalid",
                bucket: "test",
                accessKeyId: "test",
                secretAccessKey: "test"
            }
        }
    });
    t.mock.module("../db/pool.js", {
        namedExports: {
            transaction: async (fn) => {
                try {
                    return await fn({
                        query: async (sql) => {
                            assert.match(
                                sql,
                                /pg_advisory_xact_lock/
                            );
                            locked = true;
                        }
                    });
                } finally {
                    locked = false;
                }
            }
        }
    });
    const { putObject, bucketUsage } =
        await import("./storage.js");
    assert.equal(await bucketUsage(), used);
    await assert.rejects(
        () =>
            putObject("image", Buffer.alloc(2), "image/png", {
                publicUrl: false
            }),
        (error) => error.status === 413
    );
    assert.equal(puts, 0);
    await putObject("image", Buffer.alloc(1), "image/png", {
        publicUrl: false
    });
    assert.equal(puts, 1);
    used = 10_000_000_000;
    await assert.rejects(
        () =>
            putObject("image", Buffer.alloc(1), "image/png", {
                publicUrl: false
            }),
        (error) => error.status === 413
    );
    assert.equal(puts, 1);
});
