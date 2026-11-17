import test from "node:test";
import assert from "node:assert/strict";
import { validateStockAndOrderLimit } from "./sellerListingValidation.js";

test("maximum per order cannot exceed current stock", () => {
    assert.match(validateStockAndOrderLimit("5", "20"), /cannot exceed/);
    assert.equal(validateStockAndOrderLimit("5", "5"), null);
    assert.match(validateStockAndOrderLimit("2", "3"), /cannot exceed/);
});

test("both values must be positive integers and max no more than 1000", () => {
    assert.match(validateStockAndOrderLimit("0", "1"), /Quantity/);
    assert.match(validateStockAndOrderLimit("5", "2.5"), /whole number/);
    assert.match(validateStockAndOrderLimit("2000", "1001"), /1,000/);
    assert.equal(validateStockAndOrderLimit("5", "2"), null);
});
