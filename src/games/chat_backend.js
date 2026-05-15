/**
 * 
 * @param {*} server 
 */
export function runChat(server) {

    let app = server.app;
    let pool = server.pool;

    // Handle message sending :
    app.post('/api/message', async (req, res, next) => {

        if (req.session === undefined || req.session.user === undefined) {
            res.redirect("/signin");
            return;
        }

        const data = req.body;

        if (data) {

            // Retrieving the data of the message :
            const { senderId, receiverId, matchId, message } = req.body;

            let hasDatabaseError = false;

            try {
                console.log('add_message payload', { senderId, receiverId, matchId, message });
                await add_message(server.pool, senderId, receiverId, matchId, message);
                res.json({ success: true, message: 'Message sent successfully' });
            }
            catch (err) {
                console.error('Error in POST /api/message:', err);
                return next(err);
            }

        } else {
            res.status(400).json({ success: false, error: 'No data provided' });
        }
    });

    // Handle message update :
    app.get('/api/message/:matchId/status', async (req, res, next) => {

        if (req.session === undefined || req.session.user === undefined) {
            res.redirect("/signin");
            return;
        }

        const matchId = req.params.matchId;
        const currentUserId = req.session && req.session.user ? req.session.user.id : null;

        if (matchId === undefined || matchId === null) {
            return res.json({ messages: [] });
        }

        let messages = [];

        try {
            messages = await get_message(pool, matchId, currentUserId);
            res.json({ messages: messages });
        }
        catch (err) {
            console.error('Error in GET /api/message/:matchId/status:', err);
            return next(err);
        }
    });
}

/**
 * The function adds a message to the database for a given sender, receiver, match ID, and message content.
 * @param {*} pool the database connection pool
 * @param {number} senderId the ID of the user sending the message
 * @param {number} receiverId the ID of the user receiving the message
 * @param {number} matchId the ID of the match associated with the message
 * @param {string} message the content of the message to be added to the database
 */
async function add_message(pool, senderId, receiverId, matchId, message) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "INSERT INTO live_chats (sender, receiver, message, match_id, is_read) VALUES " +
            "($1, $2, $3, $4, $5);",
            [senderId, receiverId, message, matchId, false]
        );

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}

/**
 * 
 * @param {*} pool 
 * @param {*} matchId 
 */
async function get_message(pool, matchId, userId) {

    const client = await pool.connect();

    try {

        // Get the messages from the databases :
        // If userId is provided, only fetch messages addressed to that user
        if (userId === undefined || userId === null) {
            // fallback: no specific user, return empty
            return [];
        }

        const res = await client.query(
            "SELECT live_chats.id, receiver, sender, message, username as sender_username FROM live_chats " +
            "JOIN users ON (live_chats.sender = users.id) " +
            "WHERE match_id = $1 AND ((receiver = $2 AND is_read = false) OR sender = $2) " +
            "ORDER BY timestamp, live_chats.id",
            [matchId, userId]
        );

        // Update them as seen by this user :
        await client.query(
            "UPDATE live_chats SET is_read = true WHERE match_id = $1 AND receiver = $2 AND is_read = false",
            [matchId, userId]
        );

        return res.rows ? res.rows : [];

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}