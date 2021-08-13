import uWS from "uWebSockets.js";
import express from "express";
import path from "path";
import expressify from "../src";

const PORT = 8080;

// external express router
const users = express.Router();

users.get("/", (req, res) => res.json({
  path: req.path,
  originalUrl: req.originalUrl,
  baseUrl: req.baseUrl,
}));

users.get("/login", (req, res) => res.end("reached /users/login"));
users.post("/login", (req, res) => res.end("hello!"));

const app = expressify(uWS.App());
// const app = express();

app.use(express.static(path.join(__dirname, "static")));
app.use("/users", users);

app.get("/users/hey", (req, res) => res.json({
  path: req.path,
  originalUrl: req.originalUrl,
  baseUrl: req.baseUrl,
}));


const monitor = express.Router();
monitor.use(express.static(path.join(__dirname, "static")));
monitor.get("/api", (req, res) => res.json({ data: [1, 2, 3, 4, 5] }));
app.use("/monitor", monitor);


app.listen(PORT);
