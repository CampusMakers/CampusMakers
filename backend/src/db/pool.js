import pg from "pg";
import config from "../config.js";

pg.types.setTypeParser(pg.types.builtins.INT8, (value) => Number(value));
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number(value));

const pool = new pg.Pool({
    connectionString: config.db.url,
    max: config.db.poolMax,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false
});

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
