import { AsyncLocalStorage } from "node:async_hooks";
import pg from "pg";
import config from "../config.js";

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

const createPool = () =>
    new pg.Pool({
        connectionString: config.db.url,
        max: config.db.poolMax,
        ssl: config.db.ssl ? { rejectUnauthorized: false } : false
    });

// Cloudflare Workers cannot reuse a database socket across requests, so
// each request gets its own pool (see dbContext below). Outside a request
// (the Node migrate/seed scripts) a single shared pool is used instead.
const requestPools = new AsyncLocalStorage();
let sharedPool = null;

const currentPool = () => {
    const store = requestPools.getStore();
    if (store) return (store.pool ??= createPool());
    return (sharedPool ??= createPool());
};

// Express middleware: scope a lazily created pool to this request and
// close it once the response has been sent.
export const dbContext = (req, res, next) => {
    const store = { pool: null };
    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        store.pool?.end().catch(() => {});
    };
    res.once("finish", close);
    res.once("close", close);
    requestPools.run(store, next);
};

// Pool-shaped object that forwards to the current request's pool. Passed to
// Better Auth and used by the helpers below.
const pool = {
    query: (...args) => currentPool().query(...args),
    connect: (...args) => currentPool().connect(...args),
    end: async () => {
        const store = requestPools.getStore();
        if (store) {
            await store.pool?.end();
            store.pool = null;
        } else if (sharedPool) {
            await sharedPool.end();
            sharedPool = null;
        }
    }
};

export const query = (text, params) => pool.query(text, params);

export const one = async (text, params) => (await pool.query(text, params)).rows[0] ?? null;

export const many = async (text, params) => (await pool.query(text, params)).rows;

export const transaction = async (work) => {
    const client = await pool.connect();
    try {
        await client.query("begin");
        const result = await work(client);
        await client.query("commit");
        return result;
    } catch (error) {
        await client.query("rollback");
        throw error;
    } finally {
        client.release();
    }
};

export default pool;
