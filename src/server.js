/*------------------------IMPORT-----------------------*/
import express from "express";
import { runConnex } from "./formProcess/connex.js";
import { runSign } from "./formProcess/sign.js";
import { runProfile } from "./profile/profile.js";
import { runIndex } from "./indexManager.js";
import { runUsers } from "./users/users.js";

/*------------------------SERVER CONFIG-----------------------*/
const app = express();
const PORT = 4321;
const PATH = "http://localhost:" + PORT;

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/*------------------------ROUTES-----------------------*/

const app_obj = { app: app, action: PATH };

runIndex(app_obj);

app.post("/", (req, res) => {
    res.send("POST received");
});

runConnex(app_obj);
runSign(app_obj);
runProfile(app_obj);
runUsers(app_obj);

/*------------------------LISTEN-----------------------*/
app.listen(PORT, () => {
    console.log("Server launched on : " + PATH);
});