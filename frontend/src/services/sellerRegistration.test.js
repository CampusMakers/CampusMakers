import { test } from "node:test";
import assert from "node:assert/strict";
import {
    schoolEmailMatchesCampus,
    validateSellerRegistration
} from "./sellerRegistration.js";

const campuses = [
    { id: "calpoly", emailDomain: "calpoly.edu" },
    { id: "ucla", emailDomain: "ucla.edu" }
];

test("accepts a campus email ignoring letter case and whitespace", () => {
    assert.equal(
        schoolEmailMatchesCampus(
            " Student@CALPOLY.EDU ",
            "calpoly.edu"
        ),
        true
    );
});

test("accepts subdomains of the exact campus domain", () => {
    assert.equal(
        schoolEmailMatchesCampus(
            "student@students.calpoly.edu",
            "calpoly.edu"
        ),
        true
    );
});

test("does not confuse one university with another", () => {
    assert.equal(
        schoolEmailMatchesCampus(
            "student@ucla.edu",
            "calpoly.edu"
        ),
        false
    );
    assert.equal(
        schoolEmailMatchesCampus(
            "student@fakecalpoly.edu",
            "calpoly.edu"
        ),
        false
    );
    assert.equal(
        schoolEmailMatchesCampus(
            "student@calpoly.edu.evil.org",
            "calpoly.edu"
        ),
        false
    );
});

test("rejects missing school domains and invalid email addresses", () => {
    assert.equal(
        schoolEmailMatchesCampus("student@calpoly.edu", ""),
        false
    );
    assert.equal(
        schoolEmailMatchesCampus(
            "student@@calpoly.edu",
            "calpoly.edu"
        ),
        false
    );
    assert.equal(
        schoolEmailMatchesCampus("", "calpoly.edu"),
        false
    );
});

test("seller registration works without campus selection", () => {
    const result = validateSellerRegistration({
        name: "Campus Creations",
        schoolEmail: "student@calpoly.edu"
    });

    assert.equal(result, null);
});

test("validates store names and university emails", () => {
    // Store names must contain 2–80 characters.
    assert.match(
        validateSellerRegistration({
            name: "A",
            schoolEmail: "student@calpoly.edu"
        }),
        /Store name/
    );

    assert.match(
        validateSellerRegistration({
            name: "A".repeat(81),
            schoolEmail: "student@calpoly.edu"
        }),
        /Store name/
    );

    // Personal email addresses cannot be used for registration.
    assert.match(
        validateSellerRegistration({
            name: "Campus Creations",
            schoolEmail: "student@gmail.com"
        }),
        /university email/
    );

    // Valid university email formats pass frontend validation.
    assert.equal(
        validateSellerRegistration({
            name: "Campus Creations",
            schoolEmail: "student@calpoly.edu"
        }),
        null
    );
});
