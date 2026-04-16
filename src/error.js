/**
 * The function to run the error page
 * @param {*} serv 
 */
export function runError(serv) {

    serv.app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).render("error.ejs", { message: err });
    });
}