import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

let order = null;
mock.module("../../src/db/pool.js", { namedExports: { one: async () => order } });
mock.module("../../src/lib/selects.js", { namedExports: { orderSelect: () => "select * from orders o" } });

const { activeStatuses, assertPickupLocation, getOrder, pastStatuses } = await import("../../src/lib/orders.js");

const statusOf = async (promise) => {
    try {
        await promise;
        return "ok";
    } catch (error) {
        return error.status;
    }
};

describe("order statuses", () => {
    it("separates active and past statuses", () => {
        assert.deepEqual(activeStatuses, ["pending", "scheduled", "ready"]);
        assert.deepEqual(pastStatuses, ["completed", "cancelled"]);
    });
});

describe("getOrder", () => {
    it("404s when missing", async () => {
        order = null;
        assert.equal(await statusOf(getOrder(1, "u")), 404);
    });
    it("403s for outsiders", async () => {
        order = { buyer: { id: "b" }, store: { owner: { id: "s" } } };
        assert.equal(await statusOf(getOrder(1, "x")), 403);
    });
    it("returns the order without totalCount for the buyer and seller", async () => {
        order = { id: 1, totalCount: 3, buyer: { id: "b" }, store: { owner: { id: "s" } } };
        assert.equal((await getOrder(1, "b")).totalCount, undefined);
        assert.equal((await getOrder(1, "s")).id, 1);
    });
});

describe("assertPickupLocation", () => {
    const client = (result) => ({ query: async () => result });
    it("404s for unknown locations", async () => {
        assert.equal(await statusOf(assertPickupLocation(client({ rowCount: 0, rows: [] }), 1, 1)), 404);
    });
    it("403s for another campus", async () => {
        assert.equal(await statusOf(assertPickupLocation(client({ rowCount: 1, rows: [{ campus_id: 2 }] }), 1, 1)), 403);
    });
    it("passes for the store's campus", async () => {
        assert.equal(await statusOf(assertPickupLocation(client({ rowCount: 1, rows: [{ campus_id: 1 }] }), 1, 1)), "ok");
    });
});
