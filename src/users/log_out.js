/**
 * The runLogOut function sets up the routes for logging out a user. 
 * It defines a GET route to render the logout confirmation page and a 
 * POST route to handle the logout action by destroying the user's 
 * session and redirecting them to the sign-in page.
 * @param {*} server 
 */
export function runLogOut(server) {

    let app = server.app;
    let baseUrl = server.action;

    app.get('/logout', (req, res) => {
        res.render("users/log_out.ejs", { action: baseUrl });
    });

    app.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.log("Error destroying session:", err);
                return res.status(500).send("An error occurred while logging out.");
            }
            res.redirect('/');
        });
    });
}