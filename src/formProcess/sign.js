import { hashPassword } from './hash.js';

import DOMpurify from "dompurify";

/**
 
Backend for the connexion page
@param {*} server
@author Noa*/
export function runSign(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/signup', (req, res) => {
        res.render("Form/formSign.ejs", { action: baseUrl });
    });

    app.post('/signup', async (req, res) => {

        const username = DOMpurify.sanitize(req.body.username ? req.body.username.trim() : '');
        const email = DOMpurify.sanitize(req.body.email ? req.body.email.trim().toLowerCase() : '');
        const password = DOMpurify.sanitize(req.body.password ? req.body.password.trim() : '');
        const lastname = DOMpurify.sanitize(req.body.lastname ? req.body.lastname.trim() : '');
        const firstname = DOMpurify.sanitize(req.body.firstname ? req.body.firstname.trim() : '');

        if (!username || !email || !password) {
            console.log("Error: Missing username, email, or password");
            return res.status(400).send(" Username, email, and password are required.");
        }

        verifyField(username);
        verifyField(lastname);
        verifyField(firstname);


        if (password.length < 8) {
            console.log("Error: Password too short");
            return res.status(400).send("The password must be at least 8 characters long.");
        }

        try {
            const existingUser = await get_user(server.pool, username);

            if (existingUser.length != 0) {
                console.log("Error: username already exists");
                return res.status(400).send("This username is already in use.");
            }

            const passwordHash = await hashPassword(password);

            const newUser = {
                username: username,
                email: email,
                password: passwordHash,
                lastname: lastname,
                firstname: firstname
            };

            await add_user(newUser, server.pool);
            console.log("New user added to database:", newUser);
            res.redirect('/signin');

        } catch (err) {
            console.error("Error during signup:", err);
            return res.status(500).send("An error occurred while creating the account. Please try again later.");
        }
    });
}

/**
 * This function verifies if the text contains only letters, numbers, 
 * underscores and hyphens, and if it is between 3 and 20 characters long
 * @param {*} text the text to verify
 * @returns a 400 error if the text contains invalid characters, otherwise it returns nothing
 */
function verifyField(text) {

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(test)) {
        return res.status(400).send(`The ${text} contains invalide characters.`);
    }
}

/**
 * Retrieve all users username from the database
 * @param {*} pool the database connection pool
 * @returns all users username of the database
 */
async function get_user(pool, username) {

    const client = await pool.connect();

    try {

        const res = await client.query(
            "SELECT username FROM users WHERE username = $1",
            [username]
        );

        return res.rows;

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}

/**
 * Add a new user to the database
 * @param {*} user the user to add to the database
 * @param {*} pool the database connection pool
 */
async function add_user(user, pool) {

    const client = await pool.connect();

    try {
        await client.query(
            "INSERT INTO users (username, firstname, lastname, email, password, is_occupied, is_connected) VALUES ($1, $2, $3, $4, $5, false, false)",
            [user.username, user.firstname, user.lastname, user.email, user.password]
        );

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}