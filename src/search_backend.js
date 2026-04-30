import { sanitizeText } from "./formProcess/sanitize.js";

/**
 * 
 * @param {*} server 
 */
export function runSeach(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get("/api/search", async (req, res) => {

        const query = sanitizeText(req.query.q);
        let games = [];

        let hasDatabaseError = false;

        try {
            games = await search(server.pool, query);
        }
        catch (err) {
            hasDatabaseError = true;
            console.error(err);
        }
        finally {
            const response = hasDatabaseError ? res.status(500) : res;

            res.json({games : games});
        }
    });

}

/**
 * 
 * @param {*} pool 
 * @param {*} query 
 * @returns 
 */
async function search(pool, query) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "SELECT name FROM games WHERE name ILIKE $1",
            [query + '%']
        );

        return res.rows ?? [];

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}