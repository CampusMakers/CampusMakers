import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentProfilePhoto, isProfilePhotoPath, profilePhotoKey, profilePhotoUrl } from "./profilePhotos.js";

const owner = "f1a2b3c4-d5e6-47aa-b8cc-1234567890ab";
const file = "0a1b2c3d-4e5f-4620-88aa-123456789abc.jpg";
const baseUrl = "http://localhost:8787";

test("generates a private R2 key and backend image URL", () => {
    assert.equal(profilePhotoKey(owner, file), `profile-photos/${owner}/${file}`);
    assert.equal(profilePhotoUrl(`${baseUrl}/`, owner, file),
        `${baseUrl}/api/uploads/profile-photos/${owner}/${file}`);
});

test("rejects traversal and arbitrary object keys", () => {
    for (const [id, name] of [
        ["../admin", file],
        [owner, "../../secret.txt"],
        [owner, "not-a-uuid.jpg"],
        [owner, `${file}/other`],
        [owner, "00000000-0000-0000-0000-000000000000.html"]
    ]) {
        assert.equal(isProfilePhotoPath(id, name), false);
        assert.throws(() => profilePhotoKey(id, name));
    }
});

test("only the currently saved profile URL is visible", () => {
    const url = profilePhotoUrl(baseUrl, owner, file);
    assert.equal(isCurrentProfilePhoto(url, baseUrl, owner, file), true);
    assert.equal(isCurrentProfilePhoto(null, baseUrl, owner, file), false);
    assert.equal(isCurrentProfilePhoto(url, baseUrl, "another-user", file), false);
    assert.equal(isCurrentProfilePhoto(url, baseUrl, owner, "12345678-0000-0000-0000-000000000000.jpg"), false);
});

test("external domains and URLs with extra parameters do not grant access", () => {
    const url = profilePhotoUrl(baseUrl, owner, file);
    assert.equal(isCurrentProfilePhoto(url.replace(baseUrl, "https://example.org"), baseUrl, owner, file), false);
    assert.equal(isCurrentProfilePhoto(`${url}?token=public`, baseUrl, owner, file), false);
    assert.equal(isCurrentProfilePhoto(`${url}#fragment`, baseUrl, owner, file), false);
    assert.equal(isCurrentProfilePhoto("not a url", baseUrl, owner, file), false);
});
