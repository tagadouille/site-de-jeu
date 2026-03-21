/**
 * Back-end manager for the index page
 * @param {*} app the express app object
 */
export function runIndex(app) {

    app.app.get("/", (req, res) => {

        // Loading the game (temporary)
        let games = [];

        for (let index = 0; index < 10; index++) {
            games.push(
                { name: "Game " + (index + 1), image : "/favicon.ico", description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit." }
            );
        }
        res.render("index.ejs", {
            games: games,
            is_connect : true, //TODO SESSION
            is_display_buttons : true //TODO SESSION
        });
    });
}