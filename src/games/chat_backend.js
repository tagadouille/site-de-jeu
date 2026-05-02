/**
 * 
 * @param {*} server 
 */
export function runChat(server) {

    let app = server.app;
    let pool = server.pool;

    // Handle message sending :
    app.post('/api/message', async (req, res) => {

        if (req.session === undefined || req.session.user === undefined) {
            res.redirect("/signin");
        }

        const data = req.body;

        if (data) {

            // Retrieving the data of the message :
            const { senderId, receiverId, matchId, message } = req.body;

            let hasDatabaseError = false;

            try {
                await add_message(server.pool, senderId, receiverId, matchId, message);
                res.json({ success: true, message: 'Message sent successfully' });
            }
            catch (err) {
                hasDatabaseError = true;
                console.error(err);
                res.status(500).json({ success: false, error: err.message });
            }

        } else {
            res.status(400).json({ success: false, error: 'No data provided' });
        }
    });

    // Handle message update :
    app.get('/api/message/:matchId/status', async (req, res) => {

        if (req.session === undefined || req.session.user === undefined) {
            res.redirect("/signin");
        }

        const matchId = req.params.matchId;

        if (matchId === undefined || matchId === null) {
            return res.json({ messages: [] });
        }

        let messages = [];

        try {
            messages = await get_message(pool, matchId);
        }
        catch (err) {
            console.error(err);
        }
        finally {
            res.json({
                messages: messages
            });
        }
    });
}

/**
 * 
 * @param {*} pool 
 * @returns 
 */
async function add_message(pool, senderId, receiverId, matchId, message) {

    const client = await pool.connect();

    try {
        // Execute the query
        const res = await client.query(
            "INSERT INTO live_chats (sender, receiver, message, match_id) VALUES " +
            "($1, $2, $3, $4);",
            [senderId, receiverId, message, matchId]
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
async function get_message(pool, matchId) {

    const client = await pool.connect();

    try {

        // Get the messages from the databases :
        const res = await client.query(
            "SELECT * FROM live_chats WHERE match_id = $1 AND is_read = false " +
            "ORDER BY timestamp",
            [matchId]
        );

        // Update them as seen by the users :
        await client.query(
            "UPDATE live_chats SET is_read = true WHERE match_id = $1 AND is_read = false",
            [matchId]
        );

        return res.rows ? res.rows : [];

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}