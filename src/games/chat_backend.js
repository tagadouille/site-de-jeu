/**
 * 
 * @param {*} server 
 */
export function runChat(server) {

    let app = server.app;
    let pool = server.pool;

    // Handle message sending :
    app.post('/api/message', async (res, req) => {

        const data = req.body;

        if (data) {

            // Retrieving the data of the message :
            const { senderId, receiverId, matchId, message } = req.body;

            let hasDatabaseError = false;

            try {
                await add_message(server.pool, senderId, receiverId, matchId, message);
            }
            catch (err) {
                hasDatabaseError = true;
                console.error(err);
            }
            finally {
                const response = hasDatabaseError ? res.status(500) : res;
            }

        }
    });

    // Handle message update :
    app.get('/api/message/:matchId/status', async (res, req) => {

        const matchId = req.params.matchId;

        let messages = [];

        try {
            messages = await get_message(pool, matchId);
        }
        catch(err) {
            console.error(err);
        }
        finally {
            res.json({
                messages : messages
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
            "INSERT INTO live_chats (sender, receiver, message, matchId) VALUES " +
            "($1, $2, $3, $4);",
            [senderId],
            [receiverId],
            [message],
            [matchId]
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
        // Execute the query
        const res = await client.query(
            "SELECT * FROM live_chats WHERE match_id = $1 AND is_read = false" +
            "ORDER BY timestamp",
            [matchId],
        );

        return res ? res : [];

    } catch (err) {
        console.error('Database error:', err.stack);
        throw err;

    } finally {
        client.release();
    }
}