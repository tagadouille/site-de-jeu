import { get_image } from "./games/game_utils.js";

/**
 * Back-end manager for the index page
 * @param {*} app the express app object
 * 
 * @author Elias Dai
 */
export function runIndex(app) {

    app.app.get("/", async (req, res, next) => {

        try {
            const dbGames = await get_all_games(app.pool);
            const games = (Array.isArray(dbGames) ? dbGames : []).map((game) => ({
                ...game,
                image: get_image(game.name),
            }));

            let is_connect = false;
            if (req.session && req.session.user) {
                is_connect = true;
            }

            res.render("index.ejs", {
                games: games,
                is_connect: is_connect,
                is_display_buttons: true //TODO SESSION
            });
        } catch (err) {
            console.error('Error in GET /:', err);
            return next(err);
        }
    });
}

/**
 * The function to get all the games from the database
 * @param {*} pool  the pool to connect to the database
 * @returns  the list of all the games in the database
 * @throws an error if the database query fails
 * 
 * @author Elias Dai
 */
async function get_all_games(pool) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query("SELECT name, description FROM games;");

        return res.rows ?? [];

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}