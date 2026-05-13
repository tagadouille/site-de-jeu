
import { activeGames, createLiveMatch, createGameState } from '../games/multiplayer_handler.js';
import nodemailer from 'nodemailer';


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'crunchblop@gmail.com',
        pass: 'osmd jwmg drgs kiyy' 
    }
});

export function runNotifications(server) {
    let app = server.app;
    let pool = server.pool;

    app.post('/api/invite', async (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');

        const senderId = req.session.user.id;
        const senderUsername = req.session.user.username;
        const { receiver_username, game_name, proposed_date } = req.body;

        try {
            const receiverRes = await pool.query("SELECT id, is_connected, email FROM users WHERE username = $1", [receiver_username]);
            if (receiverRes.rowCount === 0) return res.status(404).send("Utilisateur introuvable");
            
            const receiver = receiverRes.rows[0];

            if (receiver.is_connected) {
                const boardSize = game_name === 'Power 4' ? 42 : 9;
                const routeBase = game_name === 'Power 4' ? 'power4' : 'tictactoe';
                
                const new_game = createGameState({ 
                    game_name, 
                    boardSize, 
                    username: senderUsername, 
                    userId: senderId 
                });

                const dbRes = await createLiveMatch(pool, game_name, senderId);
                new_game.dbId = dbRes.rows[0].id;
                const gameId = new_game.dbId.toString();
                
                activeGames[gameId] = new_game;

                await pool.query(
                    `INSERT INTO invitations (sender_id, receiver_id, game_name, game_id, status) VALUES ($1, $2, $3, $4, 'pending')`,
                    [senderId, receiver.id, game_name, gameId]
                );

            
                return res.redirect('/users?msg=invite_sent');
            } 
            else {
                await pool.query(
                    `INSERT INTO invitations (sender_id, receiver_id, game_name, proposed_date, status) VALUES ($1, $2, $3, $4, 'pending')`,
                    [senderId, receiver.id, game_name, proposed_date]
                );

                const mailOptions = {
                    from: '"Projet Web Gaming" <crunchblop@gmail.com>',
                    to: receiver.email,
                    subject: `🎮 Invitation to play : ${game_name}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                            <h2 style="color: #007bff;">Hello ${receiver_username} !</h2>
                            <p><strong>${senderUsername}</strong> ask you to play !</p>
                            <hr>
                            <p><strong>Game proposed :</strong> ${game_name}</p>
                            <p><strong>Date and time proposed :</strong> ${new Date(proposed_date).toLocaleString('fr-FR')}</p>
                            <hr>
                            <p>Connect to the site quickly to accept or reject this invitation.</p>
                            <a href="http://localhost:4321/signin" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Connect to the site</a>
                        </div>
                    `
                };
                try {
                    await transporter.sendMail(mailOptions);
                    console.log(`✅ Email succesfully send to ${receiver.email}`);
                    return res.redirect('/users?msg=invite_sent_email');
                } catch (emailError) {
                    console.error("❌ Error :", emailError);
                    return res.redirect('/users?msg=invite_db_only');
                }
            }
        } catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur");
        }
    });

    app.post('/api/invite/:id/respond', async (req, res) => {
        if (!req.session || !req.session.user) return res.status(401).json({ success: false });
        
        const { action } = req.body; 
        const inviteId = req.params.id;
        const receiverUsername = req.session.user.username;
        const receiverId = req.session.user.id;

        try {
            const inviteRes = await pool.query("UPDATE invitations SET status = $1 WHERE id = $2 RETURNING *", [action === 'accept' ? 'accepted' : 'rejected', inviteId]);
            const invite = inviteRes.rows[0];

            if (action === 'accept' && invite.game_id) {
                if (invite.game_id) {
                    const game = activeGames[invite.game_id];
                    if (game && game.player2 === null) {
                        game.player2 = req.session.user.username;
                        game.player2_id = req.session.user.id;
                        
                        const futurePing = Date.now() + 60000;
                        game.lastPingPlayer1 = futurePing;
                        game.lastPingPlayer2 = futurePing;

                        await pool.query(`UPDATE live_matches SET player2_id = $1 WHERE id = $2`, [req.session.user.id, game.dbId]);
                        
                        const routeBase = game.game_name === 'Power 4' ? 'power4' : 'tictactoe';
                        return res.json({ 
                            success: true, 
                            type: 'live', 
                            redirect: `/games/${routeBase}/${invite.game_id}` 
                        });
                    }
                } 
        
                else {
                    return res.json({ 
                        success: true, 
                        type: 'scheduled',
                        message: "Invitation acceptée ! Rendez-vous à l'heure prévue." 
                    });
                }
            }
            else if (action === 'reject' && invite.game_id) {
                const game = activeGames[invite.game_id];
                if (game && game.player2 === null) {
                    game.invite_rejected = true;
                }
            }
            res.json({ success: true });
        } catch (err) {
            console.error(err);
            res.status(500).json({ success: false });
        }
    });

    // 1. PAGE DES NOTIFICATIONS
    app.get('/notifications', async (req, res) => {
        if (!req.session || !req.session.user) return res.redirect('/signin');

        try {
            const receivedQuery = `
                SELECT i.*, u.username as sender_name 
                FROM invitations i 
                JOIN users u ON i.sender_id = u.id 
                WHERE i.receiver_id = $1 AND i.status = 'pending'
                ORDER BY i.created_at DESC
            `;
            const receivedResult = await pool.query(receivedQuery, [req.session.user.id]);

            const sentQuery = `
                SELECT i.*, u.username as receiver_name 
                FROM invitations i 
                JOIN users u ON i.receiver_id = u.id 
                WHERE i.sender_id = $1 AND i.status = 'pending'
                ORDER BY i.created_at DESC
            `;
            const sentResult = await pool.query(sentQuery, [req.session.user.id]);

            res.render('profile/notifications.ejs', {
                is_connect: true,
                is_display_buttons: true, 
                invitationsReceived: receivedResult.rows,
                invitationsSent: sentResult.rows
            });
        } catch (err) {
            console.error(err);
            res.status(500).send("Erreur serveur");
        }
    });

    app.get('/api/notifications/check', async (req, res) => {
        if (!req.session || !req.session.user) return res.json({ newInvite: false });
        const userId = req.session.user.id;

        try {
            let responseData = { newInvite: false, acceptedSentInvite: false, rejectedSentInvite: false };

            const receivedRes = await pool.query(`SELECT i.id, u.username as sender_name, i.game_name FROM invitations i JOIN users u ON i.sender_id = u.id WHERE i.receiver_id = $1 AND i.status = 'pending' LIMIT 1`, [userId]);
            if (receivedRes.rowCount > 0) {
                responseData.newInvite = true;
                responseData.invite = receivedRes.rows[0];
            }
            const acceptedRes = await pool.query(`SELECT i.id, i.game_id, i.game_name, u.username as receiver_name FROM invitations i JOIN users u ON i.receiver_id = u.id WHERE i.sender_id = $1 AND i.status = 'accepted' LIMIT 1`, [userId]);
            if (acceptedRes.rowCount > 0) {
                responseData.acceptedSentInvite = true;
                responseData.accepted = acceptedRes.rows[0];
                await pool.query("UPDATE invitations SET status = 'joined' WHERE id = $1", [acceptedRes.rows[0].id]);
            }

            const rejectedRes = await pool.query(`SELECT i.id, i.status, u.username as receiver_name FROM invitations i JOIN users u ON i.receiver_id = u.id WHERE i.sender_id = $1 AND i.status IN ('rejected', 'expired') LIMIT 1`, [userId]);
            if (rejectedRes.rowCount > 0) {
                responseData.rejectedSentInvite = true;
                responseData.rejected = rejectedRes.rows[0];
                await pool.query("UPDATE invitations SET status = 'closed' WHERE id = $1", [rejectedRes.rows[0].id]);
            }

            res.json(responseData);
        } catch (err) { res.json({ newInvite: false }); }
    });
}