export class Params {
    constructor() {
        this.values = [];
    }

    add(value) {
        this.values.push(value);
        return `$${this.values.length}`;
    }
}

export const whereClause = (conditions) =>
    conditions.length ? `where ${conditions.join(" and ")}` : "";

export const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const withoutTotal = (row) => {
    if (!row) return row;
    const { totalCount: _totalCount, ...rest } = row;
    return rest;
};

export const paginated = (rows, { limit, offset }) => ({
    data: rows.map(withoutTotal),
    pagination: {
        limit,
        offset,
        total: rows[0]?.totalCount ?? 0
    }
});
