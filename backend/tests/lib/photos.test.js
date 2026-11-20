import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isListingPhotoPath, listingPhotoKey, listingPhotoUrl } from "../../src/lib/listingPhotos.js";
import {
    isCurrentProfilePhoto,
    isProfilePhotoPath,
    profilePhotoKey,
    profilePhotoUrl
} from "../../src/lib/profilePhotos.js";

const file = "0123abcd-0123-4567-89ab-0123456789ab.webp";
const base = "https://api.example.com/some/path?x=1";

describe("listing photos", () => {
    it("validates owner ids and generated file names", () => {
        assert.equal(isListingPhotoPath("user_1", file), true);
        assert.equal(isListingPhotoPath("../etc", file), false);
        assert.equal(isListingPhotoPath("user", "photo.jpg"), false);
        assert.equal(isListingPhotoPath("user", file.replace(".webp", ".gif")), false);
    });
    it("builds keys and URLs from the base origin", () => {
        assert.equal(listingPhotoKey("u1", file), `listing-photos/u1/${file}`);
        assert.equal(listingPhotoUrl(base, "u1", file), `https://api.example.com/api/uploads/listing-photos/u1/${file}`);
    });
    it("throws on invalid paths", () => {
        assert.throws(() => listingPhotoKey("u/1", file), /Invalid listing photo path/);
        assert.throws(() => listingPhotoUrl(base, "u1", "x.jpg"), /Invalid listing photo path/);
    });
});

describe("profile photos", () => {
    it("validates paths and builds keys and URLs", () => {
        assert.equal(isProfilePhotoPath("u1", file), true);
        assert.equal(isProfilePhotoPath("", file), false);
        assert.equal(profilePhotoKey("u1", file), `profile-photos/u1/${file}`);
        assert.equal(profilePhotoUrl(base, "u1", file), `https://api.example.com/api/uploads/profile-photos/u1/${file}`);
        assert.throws(() => profilePhotoKey("u1", "nope.png"), /Invalid profile photo path/);
    });

    describe("isCurrentProfilePhoto", () => {
        const stored = `https://api.example.com/api/uploads/profile-photos/u1/${file}`;
        it("matches the exact stored URL", () => assert.equal(isCurrentProfilePhoto(stored, base, "u1", file), true));
        it("rejects missing, different, query or hash URLs", () => {
            assert.equal(isCurrentProfilePhoto(null, base, "u1", file), false);
            assert.equal(isCurrentProfilePhoto(stored, base, "u2", file), false);
            assert.equal(isCurrentProfilePhoto(`${stored}?v=2`, base, "u1", file), false);
            assert.equal(isCurrentProfilePhoto(`${stored}#x`, base, "u1", file), false);
            assert.equal(isCurrentProfilePhoto(stored.replace("api.example", "evil.example"), base, "u1", file), false);
        });
        it("returns false for invalid paths and unparsable URLs", () => {
            assert.equal(isCurrentProfilePhoto(stored, base, "u1", "bad.jpg"), false);
            assert.equal(isCurrentProfilePhoto("not a url", base, "u1", file), false);
        });
    });
});
