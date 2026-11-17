await import("./env.js");
const { default: config } = await import("../src/config.js");
const { S3Client, ListObjectsV2Command } =
    await import("@aws-sdk/client-s3");
const { endpoint, accessKeyId, secretAccessKey, bucket } =
    config.r2;
console.log("Storage settings:", {
    bucket,
    endpointConfigured: Boolean(endpoint),
    accessKeyConfigured: Boolean(accessKeyId),
    secretConfigured: Boolean(secretAccessKey),
    placeholder: [
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucket
    ].some((v) => /your-|YOUR_|replace-/i.test(v || ""))
});
try {
    const client = new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle: true
    });
    const result = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1 })
    );
    console.log("Bucket access succeeded.", {
        hasObjects: Boolean(result.Contents?.length)
    });
} catch (error) {
    console.log("Bucket access failed:", {
        code: error.name,
        status: error.$metadata?.httpStatusCode,
        message: error.message
    });
    process.exitCode = 1;
}
