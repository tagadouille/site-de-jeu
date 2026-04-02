/**
 * Backend for the users directory page
 * @param {*} server
 */
export function runUsers(server) {
    let app = server.app;

    //Fausse BDD pour les utilisateurs et les jeux
    const allGames = [
        { id: "g1", name: "Game 1" },
        { id: "g2", name: "Game 2" },
        { id: "g3", name: "Game 3" }
    ];

    const allUsers = [
        {
            username: "user123",
            isConnected: true,
            status: "online", 
            playingGame: null,
            playingWith: null,
            acceptedGames: [
                { id: "g1", name: "Game 1", played: 10, won: 5 },
                { id: "g2", name: "Game 2", played: 3, won: 1 }
            ]
        },
        {
            username: "test1",
            isConnected: true,
            status: "busy", // Occupé car en train de jouer
            playingGame: "Game 1",
            playingWith: "test2",
            acceptedGames: [
                { id: "g1", name: "Game 1", played: 50, won: 30 }
            ]
        },
        {
            username: "test2",
            isConnected: true,
            status: "busy", 
            playingGame: "Game 1",
            playingWith: "test1",
            acceptedGames: [
                { id: "g1", name: "Game 1", played: 100, won: 80 },
                { id: "g3", name: "Game 3", played: 12, won: 10 }
            ]
        }
    ];

    app.get('/users', (req, res) => {
        //Récupération des filtres depuis l'URL
        const searchQuery = req.query.search || "";
        const gameQuery = req.query.game || "all";
        const statusQuery = req.query.status || "all";

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
    });
}