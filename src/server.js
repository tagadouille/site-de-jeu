/*------------------------IMPORT-----------------------*/
import express from "express";
import { run } from "./connex.js";

/*------------------------SERVER CONFIG-----------------------*/
const app = express();
const PORT = 4321;
const PATH = "http://localhost:" + PORT;

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

run({ app: app, action: PATH });

/*------------------------LISTEN-----------------------*/
app.listen(PORT, () => {
    console.log("Server launched on : " + PATH);
});