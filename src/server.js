/*------------------------IMPORT-----------------------*/
import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

import { runConnex } from "./formProcess/connex.js";
import { runSign } from "./formProcess/sign.js";
import { runProfile } from "./profile/profile.js";
import { runIndex } from "./indexManager.js";
import { runUsers } from "./users/users.js";

/*------------------------SERVER CONFIG-----------------------*/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4321;
const PATH = "http://localhost:" + PORT;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));

/*------------------------DATABASE CONFIG---------------------*/

const pool = new pg.Pool({
    user: 'site_admin',
    host: 'localhost',
    database: 'site_bdd',
    password: 'P@risCite2026', //TODO : le chercher dans un fichier
    port: 5432
});

/*-----------------------SESSION CONFIG------------------------------*/

app.use(session({
    secret: 'mon_secret_super_secure', // TODO MDP
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 60, // 1 hours
        httpOnly: true,
        secure: false // true in HTTPS
    }
}));

/*------------------------ROUTES-----------------------*/

const app_obj = { app: app, action: PATH, pool: pool };

runIndex(app_obj);

app.post("/", (req, res) => {
    res.send("POST received");
});

runConnex(app_obj);
runSign(app_obj);
runProfile(app_obj);
runUsers(app_obj);

/*------------------------LISTEN-----------------------*/
const httpServer = app.listen(PORT, () => {
    console.log("Server launched on : " + PATH);
});

httpServer.on("error", (err) => {

    console.error("Server startup error:", err);
    process.exitCode = 1;
});