import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Params, escapeLike, paginated, whereClause, withoutTotal } from "../../src/lib/sql.js";

describe("Params", () => {
    it("returns numbered placeholders and collects values", () => {
        const params = new Params();
        assert.equal(params.add("a"), "$1");
        assert.equal(params.add(2), "$2");
        assert.deepEqual(params.values, ["a", 2]);
    });
});

describe("whereClause", () => {
    it("is empty with no conditions", () => assert.equal(whereClause([]), ""));
    it("joins conditions with and", () => assert.equal(whereClause(["a = 1", "b = 2"]), "where a = 1 and b = 2"));
});

describe("escapeLike", () => {
    it("escapes %, _ and backslash", () => assert.equal(escapeLike("50%_a\\b"), "50\\%\\_a\\\\b"));
    it("leaves plain text alone", () => assert.equal(escapeLike("hello"), "hello"));
});

describe("withoutTotal", () => {
    it("removes totalCount", () => assert.deepEqual(withoutTotal({ id: 1, totalCount: 5 }), { id: 1 }));
    it("passes through null and undefined", () => {
        assert.equal(withoutTotal(null), null);
        assert.equal(withoutTotal(undefined), undefined);
    });
});

describe("paginated", () => {
    it("strips totals and reports the total from the first row", () => {
        const result = paginated([{ id: 1, totalCount: 7 }, { id: 2, totalCount: 7 }], { limit: 2, offset: 4 });
        assert.deepEqual(result, { data: [{ id: 1 }, { id: 2 }], pagination: { limit: 2, offset: 4, total: 7 } });
    });
    it("reports zero for an empty page", () => {
        assert.deepEqual(paginated([], { limit: 10, offset: 0 }).pagination.total, 0);
    });
});
