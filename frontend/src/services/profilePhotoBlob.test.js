import test from "node:test";
import assert from "node:assert/strict";
import { photoToBlob } from "./profilePhotoBlob.js";

test("converts resized JPEG data URLs to uploadable image blobs", async () => {
    const input = "data:image/jpeg;base64," + Buffer.from("photo bytes").toString("base64");
    const result = photoToBlob(input);
    assert.equal(result.type, "image/jpeg");
    assert.equal(await result.text(), "photo bytes");
});

test("accepts a valid image blob unchanged", () => {
    const image = new Blob(["photo"], { type: "image/png" });
    assert.equal(photoToBlob(image), image);
});

test("rejects unsupported image and invalid data URLs", () => {
    assert.throws(() => photoToBlob(new Blob(["hi"], {type:"text/html"})), /JPEG, PNG or WebP/);
    assert.throws(() => photoToBlob("data:text/html;base64,aGk="), /Invalid profile image format/);
});
