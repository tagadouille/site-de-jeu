/*------------------------IMPORT-----------------------*/
import express from "express";
import { runConnex } from "./formProcess/connex.js";
import { runSign } from "./formProcess/sign.js";
import { runProfile } from "./profile/profile.js";

/*------------------------SERVER CONFIG-----------------------*/
const app = express();
const PORT = 4321;
const PATH = "http://localhost:" + PORT;

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/*------------------------ROUTES-----------------------*/
app.get("/", (req, res) => {
    res.render("index.ejs", {
        games : [
            { name: "Game 1", image : "/favicon.ico", description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit." },
            { name: "Game 2", image : "/favicon.ico", description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit." },
            { name: "Game 3", image : "/favicon.ico", description: "Lorem ipsum dolor sit, amet consectetur adipisicing elit." }
        ]
    });
});

app.post("/", (req, res) => {
    res.send("POST received");
});

runConnex({ app: app, action: PATH });
runSign({ app: app, action: PATH });
runProfile({ app: app, action: PATH });

/*------------------------LISTEN-----------------------*/
app.listen(PORT, () => {
    console.log("Server launched on : " + PATH);
});