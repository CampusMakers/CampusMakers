// Use the same stock/maximum rule when creating and editing a listing.
export function validateStockAndOrderLimit(quantity, maxPerOrder) {
    const count = String(quantity).trim();
    const limit = String(maxPerOrder).trim();
    if (!/^[1-9]\d*$/.test(count)) {
        return "Quantity must be a whole number of at least 1.";
    }
    if (!/^[1-9]\d*$/.test(limit) || Number(limit) > 1000) {
        return "The maximum per order must be a whole number between 1 and 1,000.";
    }
    if (Number(limit) > Number(count)) {
        return "The maximum per order cannot exceed the quantity in stock.";
    }
    return null;
}
