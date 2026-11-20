import { describe, it, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

const pools = [];
let queryResult = { rows: [] };
const clientCalls = [];
let released = 0;

class FakePool {
    constructor(options) {
        this.options = options;
        this.ended = false;
        pools.push(this);
    }
    async query(text, params) {
        return { ...queryResult, text, params };
    }
    async connect() {
        return {
            query: async (sql) => clientCalls.push(sql),
            release: () => released++
        };
    }
    async end() {
        this.ended = true;
    }
}

mock.module("pg", {
    defaultExport: { Pool: FakePool, types: { builtins: { INT8: 20, NUMERIC: 1700 }, setTypeParser: () => {} } }
});

const { default: pool, dbContext, many, one, query, transaction } = await import("../../src/db/pool.js");

beforeEach(async () => {
    await pool.end();
    pools.length = 0;
    clientCalls.length = 0;
    released = 0;
    queryResult = { rows: [] };
});

describe("query helpers", () => {
    it("query forwards text and params", async () => {
        const result = await query("select 1", [2]);
        assert.deepEqual([result.text, result.params], ["select 1", [2]]);
    });
    it("one returns the first row or null", async () => {
        assert.equal(await one("q"), null);
        queryResult = { rows: [{ a: 1 }, { a: 2 }] };
        assert.deepEqual(await one("q"), { a: 1 });
    });
    it("many returns all rows", async () => {
        queryResult = { rows: [{ a: 1 }, { a: 2 }] };
        assert.deepEqual(await many("q"), [{ a: 1 }, { a: 2 }]);
    });
    it("reuses one shared pool outside requests", async () => {
        await query("a");
        await query("b");
        assert.equal(pools.length, 1);
    });
});

describe("transaction", () => {
    it("commits and releases on success", async () => {
        const result = await transaction(async (client) => {
            await client.query("work");
            return 42;
        });
        assert.equal(result, 42);
        assert.deepEqual(clientCalls, ["begin", "work", "commit"]);
        assert.equal(released, 1);
    });
    it("rolls back, releases and rethrows on failure", async () => {
        await assert.rejects(
            transaction(async () => {
                throw new Error("fail");
            }),
            /fail/
        );
        assert.deepEqual(clientCalls, ["begin", "rollback"]);
        assert.equal(released, 1);
    });
});

describe("dbContext", () => {
    it("gives each request its own pool and closes it once the response ends", async () => {
        const res = new EventEmitter();
        await new Promise((resolve) => dbContext({}, res, () => query("x").then(resolve)));
        assert.equal(pools.length, 1);
        res.emit("finish");
        res.emit("close");
        assert.equal(pools[0].ended, true);
    });

    it("does not create a pool for requests that never query", () => {
        const res = new EventEmitter();
        dbContext({}, res, () => {});
        res.emit("finish");
        assert.equal(pools.length, 0);
    });
});
