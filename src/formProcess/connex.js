import { verifyPassword } from "./hash.js";

import DOMpurify from "dompurify";

/**
 * Backend for the connexion page
 * @param {*} server 
 * @author Elias
 */
export function runConnex(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/signin', (req, res) => {
        res.render("Form/formConnex.ejs", { action: baseUrl });
    });

    app.post('/signin', async (req, res) => {
        const username = DOMpurify.sanitize(req.body.username ? req.body.username.trim().toLowerCase() : '');
        const password = DOMpurify.sanitize(req.body.password ? req.body.password.trim() : '');

        if (!username || !password) {
            console.log("Error: Missing username or password");
            return res.status(400).send("Username and password are required.");
        }

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

            console.log(`User ${user.username} logged in successfully!`);
            res.redirect('/profile');
        }
        catch (err) {
            console.log(err);
            return res.status(401).send("Username or password is incorrect.");
        }
    });
}

/**
 * Get the account information for a given username
 * @param {*} pool the pool to connect to the database
 * @param {*} username the username of the account to retrieve
 * @returns the account information for the given username
 */
async function get_account(pool, username) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "SELECT username, password FROM users WHERE username = $1",
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