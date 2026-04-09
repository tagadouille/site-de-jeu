/**
 * Back-end manager for the index page
 * @param {*} app the express app object
 */
export function runIndex(app) {

    app.app.get("/", async (req, res) => {

        let games = [];
        let hasDatabaseError = false;

        try {
            const dbGames = await get_all_games(app.pool);
            games = (Array.isArray(dbGames) ? dbGames : []).map((game) => ({
                ...game,
                image: "/game-images/" + game.name.toLowerCase().replace(/\s+/g, '_') + ".jpg"
            }));
        }
        catch (err) {
            hasDatabaseError = true;
            console.error(err);
            games = [{
                name: "Error",
                image: "/favicon.ico",
                description: "Error while loading the games"
            }];
        }
        finally {
            const response = hasDatabaseError ? res.status(500) : res;

            response.render("index.ejs", {
                games: games,
                is_connect: false, //TODO SESSION
                is_display_buttons: true //TODO SESSION
            });
        }
    });
}

/**
 * The function to get all the games from the database
 * @param {*} pool  the pool to connect to the database
 * @returns  the list of all the games in the database
 * @throws an error if the database query fails
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