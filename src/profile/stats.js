import { get_image } from "../games/game_utils.js";

/**
 * 
 * @param {*} server 
 */
export function runStats(server) {
    let app = server.app;

    app.get('/profile/stats', async (req, res) => {

        if (!req.session || !req.session.user) {
            return res.redirect('/signin');
        }

        let client;

        const username = req.session.user.username;

        try {

            client = await server.pool.connect();

            // Obtain the user id from the database :
            const user_id = await get_user_id(client, username);

            if(user_id === 0) {
                return res.redirect('/signin');
            }

            // Obtain the global stats for the user :
            let rows = await get_stats(client, user_id);
            let global_stats = rows[0];

            let games_stats = await get_games_stats(client, user_id);

            games_stats.forEach(game => {
                game.image = get_image(game.game_name);
                game.winRate = get_win_rates(game.number_of_wins, game.number_of_matches);
            });

            // Render the stats page with the obtained stats :

            res.render('profile/stats.ejs', {
                title: 'User Stats',
                stats: {
                    totalGames: global_stats.number_of_matches,
                    totalWins: global_stats.number_of_wins,
                    winRate: get_win_rates(global_stats.number_of_wins, global_stats.number_of_matches)
                },
                games_stats,
            });
        }
        catch (err) {
            console.log(err);
            res.status(500);
        }
        finally {
            if (client) client.release();
        }
    });
}

/**
 * The function to get user global stats from the database
 * @param {*} client the client to connect to the database
 * @param {*} user_id the id of the user to get the stats for
 * @returns 
 */
async function get_stats(client, user_id) {

    const res = await client.query(
        "SELECT SUM(number_of_wins) as number_of_wins, SUM(number_of_matches) as number_of_matches " +
        "FROM played_games  WHERE user_id = $1"
        , [user_id]
    );
    return res.rows ?? [];
}

/**
 * The function to get the user id from the database
 * @param {*} client the client to connect to the database
 * @param {*} username the username to get the id for
 * @returns the user id or 0 if not found
 */
async function get_user_id(client, username) {

    const res = await client.query(
        "SELECT id FROM users WHERE username = $1"
        , [username]
    );
    return res.rows[0].id ?? 0;
}

async function get_games_stats(client, user_id) {
    const res = await client.query(
        "SELECT game_name, number_of_wins, number_of_matches FROM played_games" +
        " WHERE user_id = $1"
        , [user_id]
    );
    return res.rows ?? [];
}

/**
 * The function get the win rates 
 * @param {*} number_of_wins 
 * @param {*} number_of_matches 
 * @returns the winrates
 */
function get_win_rates(number_of_wins, number_of_matches) {
    return Number(((number_of_wins / number_of_matches) * 100).toFixed(2));
}