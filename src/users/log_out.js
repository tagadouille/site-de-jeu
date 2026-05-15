/**
 * The runLogOut function sets up the routes for logging out a user. 
 * It defines a GET route to render the logout confirmation page and a 
 * POST route to handle the logout action by destroying the user's 
 * session and redirecting them to the sign-in page.
 * @param {*} server 
 * 
 * @author Elias Dai
 */
export function runLogOut(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/logout', (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/signin');
        }
        res.render("users/log_out.ejs", { action: baseUrl });
    });

    app.post('/logout', async (req, res, next) => {

        if (!req.session || !req.session.user) {
            return res.redirect('/signin');
        }

        const username = req.session.user.username;

        req.session.destroy(async (err) => {
            if (err) {
                console.error('Error destroying session during logout:', err);
                return next(err);
            }

            try {
                await set_offline(server.pool, username);
            } catch (e) {
                console.error('Error setting user offline during logout:', e);
                return next(e);
            }

            res.clearCookie('connect.sid');
            res.redirect('/');
        });
    });
}

/**
 * Set the user as offline
 * @param {*} pool the pool to connect to the database
 * @param {*} username the username of the account to retrieve
 * 
 * @author Elias Dai
 */
async function set_offline(pool, username) {

    const client = await pool.connect();

    try {
        await client.query(
            "UPDATE users SET is_connected = false WHERE username = $1",
            [username]
        );

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}