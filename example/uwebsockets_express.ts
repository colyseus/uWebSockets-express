import uWS from "uWebSockets.js";
import express from "express";
import expressify from "../src";

const PORT = 8080;

// external express router
const users = express.Router();
users.get("/", (req, res) => res.json({ username: "Jake Badlands" }));

const app = expressify(uWS.App());
app.use("/users", users);

app.get('/', (req, res) => res.send("Hello world!"));

app.listen(PORT);