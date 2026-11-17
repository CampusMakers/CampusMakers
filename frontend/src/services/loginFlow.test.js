import test from "node:test";
import assert from "node:assert/strict";
import { requestLogin, finishLogin } from "./loginFlow.js";
const saved = new Map();
globalThis.sessionStorage = {
    getItem: (key) => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
    removeItem: (key) => saved.delete(key)
};
globalThis.window = {
    location: { hash: "#home" },
    confirm: () => true
};
test("declining login stays on the originating page", () => {
    window.location.hash = "#explore/post-4";
    window.confirm = () => false;
    requestLogin("comment", true);
    assert.equal(window.location.hash, "#explore/post-4");
});
test("canceling login returns to the exact originating route", () => {
    window.confirm = () => true;
    window.location.hash = "#explore/listing-2?from=home";
    requestLogin("rate", true);
    assert.equal(window.location.hash, "login");
    finishLogin(true);
    assert.equal(
        window.location.hash,
        "#explore/listing-2?from=home"
    );
});
test("contextual login returns to the item but ordinary login opens profile", () => {
    window.location.hash = "#explore/post-3";
    requestLogin("comment", true);
    finishLogin();
    assert.equal(window.location.hash, "#explore/post-3");
    requestLogin("like");
    finishLogin();
    assert.equal(window.location.hash, "#profile");
});
