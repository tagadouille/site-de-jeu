/**
 
Backend for the connexion page
@param {*} server
@author Noa*/
export function runSign(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/signup', (req, res) => {

        res.render("Form/formSign.ejs", {action : baseUrl});
    });

    app.post('/signup', (req, res) => {

        console.log(req.body);
        res.send("POST received");
    });
}