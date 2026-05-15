/**
 * Backend for the users directory page
 * @param {*} server
 */
export function runUsers(server) {
    let app = server.app;

    

    app.get('/users', async (req, res) => {
        //Récupération des filtres depuis l'URL
        const searchQuery = req.query.search || "";
        const gameQuery = req.query.game || "all";
        const statusQuery = req.query.status || "all";

        let client;
        try {
            client = await server.pool.connect();

            const gamesRes = await client.query("SELECT name FROM games");
            const usersRes = await client.query("SELECT id, username, is_connected, is_occupied FROM users");
            const playedGamesRes = await client.query("SELECT user_id, game_name, number_of_matches, number_of_wins FROM played_games");
            const favGamesRes = await client.query("SELECT user_id, game_name FROM fav_games");

            const liveMatchesRes = await client.query(`
                SELECT game_name, player1_id, player2_id 
                FROM live_matches 
                WHERE status = 'ongoing' AND player2_id IS NOT NULL
            `);

         
            const allGames = gamesRes.rows.map(g => ({ 
                id: g.name, 
                name: g.name 
            }));

            const usernameMap = {};
            usersRes.rows.forEach(u => usernameMap[u.id] = u.username);

            const allUsers = usersRes.rows.map(dbUser => {
                
                let currentStatus = "offline";
                if (dbUser.is_connected) {
                    currentStatus = dbUser.is_occupied ? "busy" : "online";
                }

                const userStats = playedGamesRes.rows.filter(pg => pg.user_id === dbUser.id);
                
                const acceptedGames = userStats.map(stat => ({
                    id: stat.game_name,
                    name: stat.game_name,
                    played: stat.number_of_matches,
                    won: stat.number_of_wins
                }));

                const userFavs = favGamesRes.rows.filter(fg => fg.user_id === dbUser.id);
                const favoriteGames = userFavs.map(fav => fav.game_name);
                let playingGame = null;
                let playingWith = null;
                const activeMatch = liveMatchesRes.rows.find(match => 
                    match.player1_id === dbUser.id || match.player2_id === dbUser.id
                );

                if (activeMatch) {
                    playingGame = activeMatch.game_name;
                    const opponentId = activeMatch.player1_id === dbUser.id ? activeMatch.player2_id : activeMatch.player1_id;
                    playingWith = usernameMap[opponentId];
                    currentStatus = "busy"; 
                }

                return {
                    username: dbUser.username,
                    isConnected: dbUser.is_connected,
                    status: currentStatus,
                    playingGame: playingGame,
                    playingWith: playingWith,
                    acceptedGames: acceptedGames,
                    favorite_games: favoriteGames
                };
            });

        // Filtrage
        let filteredUsers = allUsers;

        // Filtre par nom d'utilisateur
        if (searchQuery) {
            filteredUsers = filteredUsers.filter(u => 
                u.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Filtre par jeu
        if (gameQuery !== "all") {
            filteredUsers = filteredUsers.filter(u => 
                u.acceptedGames.some(g => g.id === gameQuery)
            );
        }

        // Filtre par statut de connexion
        if (statusQuery !== "all") {
            if (statusQuery === "connected") {
                filteredUsers = filteredUsers.filter(u => u.isConnected); // Tous ceux en ligne ou occupés
            } else {
                filteredUsers = filteredUsers.filter(u => u.status === statusQuery); //Strictement online, busy, ou offline
            }
        }

        let is_connected = false;
        let session_username = null;

        if(req.session && req.session.user) {
            is_connected = true;
            session_username = req.session.user.username;
        }

        //On envoie les données filtrées à la vue
        res.render("users/users.ejs", { 
            users: filteredUsers,
            games: allGames,
            is_connect: is_connected,
            session_username: session_username,
            filters: { search: searchQuery, game: gameQuery, status: statusQuery }
        });

        } catch (err) {
            console.error('Error retrieving users:', err);
            res.status(500).send("Error retrieving users. Please try again later.");
        } finally {
            if (client) {
                client.release(); 
            }
        }
    });
}