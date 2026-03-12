/**
 * Backend for the connexion page
 * @param {*} server 
 * @author Elias
 */
export function run(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/signin', (req, res) => {

        res.render("Form/formConnex.ejs", {action : baseUrl});
    });

    app.post('/signin', (req, res) => {

        console.log(req.body);
        res.send("POST received");
    });
}