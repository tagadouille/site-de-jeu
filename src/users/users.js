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

         
            const allGames = gamesRes.rows.map(g => ({ 
                id: g.name, 
                name: g.name 
            }));

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

                return {
                    username: dbUser.username,
                    isConnected: dbUser.is_connected,
                    status: currentStatus,
                    playingGame: null,
                    playingWith: null, 
                    acceptedGames: acceptedGames
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

        //On envoie les données filtrées à la vue
        res.render("users/users.ejs", { 
            users: filteredUsers,
            games: allGames,
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