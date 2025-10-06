import uWS from "uWebSockets.js";
import express from "express";
import expressify, { ServerResponse } from "../src";

// // @ts-ignore
// const res = new ServerResponse(undefined, undefined, undefined);
// // @ts-ignore
// res.setHeader("X-Test", "test");
// process.exit();

const PORT = 8080;

// external express router
const users = express.Router();
users.get("/", (req, res) => res.json({ username: "Jake Badlands" }));

const app = expressify(uWS.App());
app.use("/users", users);

app.get('/', function getRoot (req, res) {
  res.send("Hello world!");
});

app.listen(PORT, () => console.log(`Listening on http://localhost:${PORT}`));