import { verifyPassword } from "./hash.js";
import { sanitizeText } from "./sanitize.js";

/**
 * Backend for the connexion page
 * @param {*} server 
 * @author Elias
 */
export function runConnex(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/signin', (req, res, next) => {

        if (req.session && req.session.user) {
            return res.redirect('/profile');
        }
        res.render("Form/formConnex.ejs", { action: baseUrl });
    });

    app.post('/signin', async (req, res, next) => {

        if (req.session && req.session.user) {
            return res.redirect('/profile');
        }

        const username = sanitizeText(req.body.username).toLowerCase();
        const password = sanitizeText(req.body.password);

        if (!username || !password) {
            console.log("Error: Missing username or password");
            return res.status(400).send("Username and password are required.");
        }

        // Get the user account from the database
        try {
            const user = await get_account(server.pool, username);

            if (!user) {
                console.log("Error: User not found");
                return res.status(401).send("Username or password is incorrect.");
            }

            if (!(await verifyPassword(password, user.password))) {
                console.log("Error: Incorrect password");
                return res.status(401).send("Username or password is incorrect.");
            }

            await set_online(server.pool, username);

            console.log(`User ${user.username} logged in successfully!`);

            // Set the user session
            req.session.user = { id: user.id, username: user.username };

            res.redirect('/profile');
        }
        catch (err) {
            console.error('Unexpected error in POST /signin:', err);
            return next(err);
        }
    });
}

/**
 * Get the account information for a given username
 * @param {*} pool the pool to connect to the database
 * @param {*} username the username of the account to retrieve
 * @returns the account information for the given username
 * 
 * @author Elias Dai
 */
async function get_account(pool, username) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "SELECT id, username, password FROM users WHERE username = $1",
            [username]
        );

        return res.rows[0] ?? null;

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}

/**
 * Set the user as online
 * @param {*} pool the pool to connect to the database
 * @param {*} username the username of the account to retrieve
 * 
 * @author Elias Dai
 */
async function set_online(pool, username) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "UPDATE users SET is_connected = true WHERE username = $1",
            [username]
        );

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}