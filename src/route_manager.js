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

/**
 * Route manager for the application. 
 * This file is responsible for defining all the routes and their corresponding handlers.
 */
export function routeManager(app, pool, PATH) {
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
    app.use(function (req, res, next) {
        res.status(404).render("error.ejs", { message: "Page not found" });
    });

    runError(app_obj);
}