import path from "path";
import express from "express";
import uWS from "uWebSockets.js";
import serveIndex from "serve-index";
import expressify from "../src";

const PORT = 8080;

const app = expressify(uWS.App());
app.use('/', serveIndex(path.join(__dirname, ".."), { icons: true, hidden: true }))
app.use('/', express.static(path.join(__dirname, "static")));

app.listen(PORT, () => console.log("Listening on", PORT));