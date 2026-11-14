export function getQuantityLimit(product) {
    const configured = Number(product.maxPerOrder);
    const limit = Number.isInteger(configured) && configured >= 1 && configured <= 1000 ? configured : 5;
    const stock = Number(product.quantity);
    return product.quantity != null && Number.isInteger(stock) && stock >= 0 ? Math.min(limit, stock) : limit;
}

export function getSuggestedProducts(product, products) {
    const unique = new Map();
    for (const item of products) {
        if (item?.type === "listing" && item.id !== product.id && !unique.has(item.id)) unique.set(item.id, item);
    }
    const tags = new Set((product.tags || []).map(tag => tag.toLowerCase()));
    const score = item => (item.category && item.category === product.category ? 2 : 0)
        + (item.creator === product.creator ? 1 : 0)
        + (item.tags || []).filter(tag => tags.has(tag.toLowerCase())).length;
    return [...unique.values()].sort((a, b) => score(b) - score(a)).slice(0, 4);
}
