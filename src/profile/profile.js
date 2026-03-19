/**
 * Backend for the profile page
 * @param {*} server
 * @author Noa
 */
export function runProfile(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/profile', (req, res) => {

        const dummyUser = {
            username: "user123",
            email: "user123@example.com",
            firstname: "user",
            lastname: "123"
        };

        const dummyGames = [
            {
                name: "Game 1",
                image : "/favicon.ico",
                description: "Description of Game 1."
            },
            {
                name: "Game 2", 
                image : "/favicon.ico",
                description: "Description of Game 2."
            },
            {
                name: "Game 3",
                image : "/favicon.ico",
                description: "Description of Game 3."
            }
        ];

        // 3. On envoie le tout à la vue EJS
        res.render("profile/profile.ejs", { 
            action: baseUrl, 
            user: dummyUser,
            games: dummyGames
        });
    });

    app.post('/profile', (req, res) => {

        console.log(req.body);
        res.send("POST received");
    });
}