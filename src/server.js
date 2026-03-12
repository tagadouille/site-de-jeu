/*------------------------IMPORT-----------------------*/
import express from "express";
import { run } from "./connex.js";

/*------------------------SERVER CONFIG-----------------------*/
const app = express();
const port = 4321;

app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

/*------------------------ROUTES-----------------------*/
app.get("/", (req, res) => {
    res.redirect("signin");
});

app.post("/", (req, res) => {
    res.send("POST received");
});

run({ app: app, action: "localhost:" + port });

/*------------------------LISTEN-----------------------*/
app.listen(port, () => {
    console.log("Server launched on : http://localhost:" + port);
});