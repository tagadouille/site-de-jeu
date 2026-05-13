/*------------------------IMPORT-----------------------*/
import express from "express";
import session from "express-session";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from 'dotenv';

import { runConnex } from "./formProcess/connex.js";
import { runSign } from "./formProcess/sign.js";
import { runProfile } from "./profile/profile.js";
import { runIndex } from "./indexManager.js";
import { runUsers } from "./users/users.js";
import { runLogOut } from "./users/log_out.js";
import { runError } from "./error.js";
import { runTicTacToe } from "./games/tictactoe.js";
import { runChat } from "./games/chat_backend.js";
import { runStats } from "./profile/stats.js";
import { runSeach } from "./search_backend.js";
import { runPower4 } from "./games/power4.js";
import { runNotifications } from "./users/notifications.js";

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
app.use(express.json());

dotenv.config({ path: path.join(__dirname, '../config.env') });

/*------------------------DATABASE CONFIG---------------------*/

const pool = new pg.Pool({
    user: 'site_admin',
    host: 'localhost',
    database: 'site_bdd',
    password: process.env.DB_PASSWORD,
    port: 5432
});

/*-----------------------SESSION CONFIG------------------------------*/

app.use(session({
    secret: process.env.SECRET_SESSION_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 4 * (1000 * 60 * 60), // 4 hours
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
runLogOut(app_obj);
runTicTacToe(app_obj);
runPower4(app_obj);
runChat(app_obj);
runStats(app_obj);
runSeach(app_obj);
runNotifications(app_obj);

// Handle 404
app.use(function(req, res, next) {
    res.status(404).render("error.ejs", { message:  "Page not found" } );
});

runError(app_obj);
Promise.all([
    pool.query("UPDATE live_matches SET status = 'finished' WHERE status = 'ongoing'"),
    pool.query("UPDATE users SET is_connected = false")
])
.then(() => {
    console.log("BDD clean :");
    console.log("   - Ghost matches closed.");
    console.log("   - All users marked as offline.");
})
.catch(err => console.error("❌ Error :", err));

/*------------------------LISTEN-----------------------*/
const httpServer = app.listen(PORT, () => {
    console.log("Server launched on : " + PATH);
});

httpServer.on("error", (err) => {

    console.error("Server startup error:", err);
    process.exitCode = 1;
});

