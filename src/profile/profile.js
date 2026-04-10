import { hashPassword, verifyPassword } from '../formProcess/hash.js';

/**
 * Backend for the profile page
 * @param {*} server
 * @author Noa
 */
export function runProfile(server) {

    let app = server.app;
    let baseUrl = server.action;


    app.get('/profile', async(req, res) => {

        if(!req.session.user) {
            res.redirect('/');
        }

        let client;
        let allGames = [];
        let favGames = [];
        let currentStatus = "offline";
        try {
            client = await server.pool.connect();

            const currentUsername = req.session.user.username;
            
            const dbUser = await get_user_by_username(server.pool, currentUsername);
            
            if (!dbUser) {
                return res.redirect('/signin');
            }
            
            if (dbUser.is_connected) {
                currentStatus = dbUser.is_occupied ? "busy" : "online";
            }

            const formattedUser = {
                username: dbUser.username,
                email: dbUser.email,
                firstname: dbUser.firstname,
                lastname: dbUser.lastname,
                status: currentStatus
            };

            const dbAllGames = await get_all_games(server.pool);
            allGames = (Array.isArray(dbAllGames) ? dbAllGames : []).map((game) => ({
                id: game.name,
                name: game.name,
                description: game.description,
                image: "/game-images/" + game.name.toLowerCase().replace(/\s+/g, '_') + ".jpg"
            }));

            const dbFavGames = await get_fav_games(server.pool, dbUser.id);
            favGames = (Array.isArray(dbFavGames) ? dbFavGames : []).map((game) => ({
                id: game.name,
                name: game.name,
                image: "/game-images/" + game.name.toLowerCase().replace(/\s+/g, '_') + ".jpg"
            }));

            res.render("profile/profile.ejs", { 
                action: baseUrl, 
                user: formattedUser,
                games: favGames,
                allGames: allGames
            });

        } catch (err) {
            console.error("Erreur BDD (GET /profile) :", err);
            res.status(500).send("Erreur serveur.");
        } finally {
            if (client) client.release();
        }
    });

    app.post('/profile', async (req, res) => {

       const formType = req.body.formType;

       let client;
        try {
            client = await server.pool.connect();

            const currentUsername = req.session.user.username; 
            
            const userRes = await client.query("SELECT id, password FROM users WHERE username = $1", [currentUsername]);
            if (userRes.rows.length === 0) return res.redirect('/signin');
            
            const userId = userRes.rows[0].id;
            const storedPassword = userRes.rows[0].password;

        if (formType === 'updatePassword') {
            const currentPassword = req.body.currentPassword;
            const newPassword = req.body.newPassword;
            const confirmPassword = req.body.confirmPassword;
            console.log("Received password update request:", { currentPassword, newPassword, confirmPassword });
            
            if (newPassword !== confirmPassword) {
                console.log("Error: The new passwords do not match.");
                return res.redirect('/profile'); 
            }

            const isMatch = await verifyPassword(currentPassword, storedPassword);
            
            if (!isMatch) {
                console.log("Error: The current password is incorrect.");
                return res.redirect('/profile');
            }

            const newHash = await hashPassword(newPassword);

            await client.query("UPDATE users SET password = $1 WHERE id = $2", [newHash, userId]);
            console.log("Success: Password updated and hashed in DB with Argon2!");
        }
        else if (formType === 'updateStatus') {
            const newStatus = req.body.status;
            const isOccupied = (newStatus === 'busy');

            await client.query("UPDATE users SET is_occupied = $1 WHERE id = $2", [isOccupied, userId]);
            console.log("Success: Status updated in DB:", newStatus);
        } 
        else if (formType === 'updateGames') {
            let selected = req.body.selectedGames;
            if (!selected) {
                selected = []; 
            } 
            else if (!Array.isArray(selected)) {
                selected = [selected]; 
            }
            
            await client.query("BEGIN"); 
                
            await client.query("DELETE FROM fav_games WHERE user_id = $1", [userId]);
                
            for (const gameName of selected) {
                await client.query("INSERT INTO fav_games (user_id, game_name) VALUES ($1, $2)", [userId, gameName]);
            }
                
            await client.query("COMMIT"); 
            console.log("Success: Game list updated.");
        }

        res.redirect('/profile');
        } catch (err) {
            if (client) await client.query("ROLLBACK");
            console.error("Error BDD (POST /profile) :", err);
            res.redirect('/profile');
        } finally {
            if (client) client.release();
        }
    });

}

/**
 * The function to get user info from the database
 * @param {*} pool the pool to connect to the database
 * @param {string} username the username to look for
 * @returns the user object or null
 */
async function get_user_by_username(pool, username) {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT id, username, email, firstname, lastname, is_connected, is_occupied FROM users WHERE username = $1", [username]);
        return res.rows[0] ?? null;
    } catch (err) {
        console.error('Database error (get_user):', err.stack);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * The function to get all the games from the database
 * @param {*} pool the pool to connect to the database
 * @returns the list of all the games in the database
 */
async function get_all_games(pool) {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT name, description FROM games;");
        return res.rows ?? [];
    } catch (err) {
        console.error('Database error (get_all_games):', err.stack);
        throw err;
    } finally {
        client.release();
    }
}

/**
 * The function to get the favorite games of a specific user
 * @param {*} pool the pool to connect to the database
 * @param {number} userId the id of the user
 * @returns the list of favorite games
 */
async function get_fav_games(pool, userId) {
    const client = await pool.connect();
    try {
        const res = await client.query("SELECT game_name as name FROM fav_games WHERE user_id = $1", [userId]);
        return res.rows ?? [];
    } catch (err) {
        console.error('Database error (get_fav_games):', err.stack);
        throw err;
    } finally {
        client.release();
    }
}